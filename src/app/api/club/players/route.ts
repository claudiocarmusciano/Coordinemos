import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest, hashPassword } from '@/lib/auth'

// GET /api/club/players — Return all players for the club
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
      where: { clubId: club.id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            role: true,
            mustChangePassword: true,
          },
        },
        _count: {
          select: {
            tournamentPlayers: true,
          },
        },
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    })

    const result = players.map((player) => ({
      id: player.id,
      firstName: player.firstName,
      lastName: player.lastName,
      phone: player.phone,
      clubId: player.clubId,
      userId: player.userId,
      user: player.user,
      tournamentsCount: player._count.tournamentPlayers,
    }))

    return NextResponse.json({ players: result })
  } catch (error) {
    console.error('Error fetching players:', error)
    return NextResponse.json(
      { message: 'An error occurred while fetching players' },
      { status: 500 }
    )
  }
}

// POST /api/club/players — Create a User with role PLAYER and a Player linked to the club
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
    const { firstName, lastName, phone, username, password } = body

    if (!firstName || typeof firstName !== 'string' || !firstName.trim()) {
      return NextResponse.json(
        { message: 'First name is required' },
        { status: 400 }
      )
    }

    if (!lastName || typeof lastName !== 'string' || !lastName.trim()) {
      return NextResponse.json(
        { message: 'Last name is required' },
        { status: 400 }
      )
    }

    if (!username || typeof username !== 'string' || !username.trim()) {
      return NextResponse.json(
        { message: 'Username is required' },
        { status: 400 }
      )
    }

    if (!password || typeof password !== 'string' || !password.trim()) {
      return NextResponse.json(
        { message: 'Password is required' },
        { status: 400 }
      )
    }

    // Check if username already exists
    const existingUser = await db.user.findUnique({ where: { username: username.trim() } })
    if (existingUser) {
      return NextResponse.json(
        { message: 'Username already exists' },
        { status: 409 }
      )
    }

    const hashedPasswordValue = await hashPassword(password)

    // Create User + Player in a transaction
    const player = await db.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          username: username.trim(),
          password: hashedPasswordValue,
          role: 'PLAYER',
          mustChangePassword: true,
        },
      })

      return tx.player.create({
        data: {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: phone?.trim() ?? '',
          clubId: club.id,
          userId: newUser.id,
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              role: true,
              mustChangePassword: true,
            },
          },
        },
      })
    })

    return NextResponse.json({ player }, { status: 201 })
  } catch (error) {
    console.error('Error creating player:', error)
    return NextResponse.json(
      { message: 'An error occurred while creating the player' },
      { status: 500 }
    )
  }
}
