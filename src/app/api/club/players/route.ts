import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest, hashPassword } from '@/lib/auth'

// GET /api/club/players — Return all CONFIRMED players for the club
export async function GET(request: Request) {
  try {
    const clubUser = await getUserFromRequest(request)
    if (!clubUser || clubUser.role !== 'CLUB') {
      return NextResponse.json(
        { message: 'Unauthorized: Club access required' },
        { status: 403 }
      )
    }

    const club = await db.club.findUnique({ where: { userId: clubUser.id } })
    if (!club) {
      return NextResponse.json(
        { message: 'Club not found' },
        { status: 404 }
      )
    }

    const players = await db.player.findMany({
      where: {
        memberships: {
          some: { clubId: club.id, status: 'CONFIRMED' },
        },
      },
      include: {
        user: { select: { id: true, username: true } },
        memberships: { where: { clubId: club.id }, select: { id: true, status: true } },
        tournamentPlayers: {
          include: {
            tournament: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    })

    const mapped = players.map((p) => ({
      id: p.id,
      firstName: p.firstName,
      lastName: p.lastName,
      phone: p.phone,
      userId: p.userId,
      user: p.user ? { id: p.user.id, username: p.user.username } : null,
      membership: p.memberships[0] ?? null,
      tournamentPlayers: p.tournamentPlayers.map((tp) => ({
        id: tp.id,
        tournamentId: tp.tournamentId,
        tournament: { name: tp.tournament.name },
      })),
    }))

    return NextResponse.json(mapped)
  } catch (error) {
    console.error('Error fetching players:', error)
    return NextResponse.json(
      { message: 'An error occurred while fetching players' },
      { status: 500 }
    )
  }
}

// POST /api/club/players — Add or create a player for the club
// Body: { dni, firstName?, lastName?, phone?, password? }
// Case A (player exists): creates/updates a PENDING ClubMembership and notifies player
// Case B (player not found): creates User + Player + CONFIRMED ClubMembership
export async function POST(request: Request) {
  try {
    const clubUser = await getUserFromRequest(request)
    if (!clubUser || clubUser.role !== 'CLUB') {
      return NextResponse.json(
        { message: 'Unauthorized: Club access required' },
        { status: 403 }
      )
    }

    const club = await db.club.findUnique({ where: { userId: clubUser.id } })
    if (!club) {
      return NextResponse.json(
        { message: 'Club not found' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const { dni, firstName, lastName, phone, password } = body

    // Validate DNI
    if (!dni || typeof dni !== 'string' || !dni.trim()) {
      return NextResponse.json(
        { message: 'DNI es requerido' },
        { status: 400 }
      )
    }
    if (!/^\d+$/.test(dni.trim())) {
      return NextResponse.json(
        { message: 'El DNI debe ser numérico' },
        { status: 400 }
      )
    }

    const dniValue = dni.trim()

    // Check if a user with this DNI exists
    const existingUser = await db.user.findUnique({ where: { username: dniValue } })

    if (existingUser) {
      // Case A: player exists — find the Player record
      const player = await db.player.findUnique({ where: { userId: existingUser.id } })
      if (!player) {
        return NextResponse.json(
          { message: 'El usuario existe pero no tiene perfil de jugador' },
          { status: 409 }
        )
      }

      // Check existing membership
      const existingMembership = await db.clubMembership.findUnique({
        where: { clubId_playerId: { clubId: club.id, playerId: player.id } },
      })

      if (existingMembership) {
        if (existingMembership.status === 'CONFIRMED') {
          return NextResponse.json(
            { message: 'El jugador ya es miembro de este club' },
            { status: 409 }
          )
        }
        if (existingMembership.status === 'PENDING') {
          return NextResponse.json(
            { message: 'Ya hay una solicitud pendiente para este jugador' },
            { status: 409 }
          )
        }
        // REJECTED → reopen as PENDING
        const membership = await db.clubMembership.update({
          where: { clubId_playerId: { clubId: club.id, playerId: player.id } },
          data: { status: 'PENDING' },
        })

        await db.notification.create({
          data: {
            userId: existingUser.id,
            message: `El club ${club.name} quiere agregarte como jugador`,
            type: 'CLUB_REQUEST',
            relatedId: membership.id,
          },
        })

        return NextResponse.json({
          status: 'PENDING',
          player: { firstName: player.firstName, lastName: player.lastName },
        })
      }

      // No membership yet — create PENDING
      const membership = await db.clubMembership.create({
        data: { clubId: club.id, playerId: player.id, status: 'PENDING' },
      })

      await db.notification.create({
        data: {
          userId: existingUser.id,
          message: `El club ${club.name} quiere agregarte como jugador`,
          type: 'CLUB_REQUEST',
          relatedId: membership.id,
        },
      })

      return NextResponse.json({
        status: 'PENDING',
        player: { firstName: player.firstName, lastName: player.lastName },
      })
    }

    // Case B: player does not exist — create User + Player + CONFIRMED membership
    if (!firstName || typeof firstName !== 'string' || !firstName.trim()) {
      return NextResponse.json({ message: 'El nombre es requerido' }, { status: 400 })
    }
    if (!lastName || typeof lastName !== 'string' || !lastName.trim()) {
      return NextResponse.json({ message: 'El apellido es requerido' }, { status: 400 })
    }
    if (!password || typeof password !== 'string' || !password.trim()) {
      return NextResponse.json({ message: 'La contraseña es requerida' }, { status: 400 })
    }

    const hashedPasswordValue = await hashPassword(password)

    const player = await db.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          username: dniValue,
          password: hashedPasswordValue,
          role: 'PLAYER',
          mustChangePassword: true,
        },
      })

      const newPlayer = await tx.player.create({
        data: {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: phone?.trim() ?? '',
          userId: newUser.id,
        },
      })

      await tx.clubMembership.create({
        data: { clubId: club.id, playerId: newPlayer.id, status: 'CONFIRMED' },
      })

      return {
        id: newPlayer.id,
        firstName: newPlayer.firstName,
        lastName: newPlayer.lastName,
        phone: newPlayer.phone,
        userId: newUser.id,
        user: { id: newUser.id, username: newUser.username },
      }
    })

    return NextResponse.json({ status: 'CREATED', player }, { status: 201 })
  } catch (error) {
    console.error('Error creating player:', error)
    return NextResponse.json(
      { message: 'An error occurred while creating the player' },
      { status: 500 }
    )
  }
}
