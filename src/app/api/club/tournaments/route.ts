import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'

// GET /api/club/tournaments — Return all tournaments for the club
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

    const tournaments = await db.tournament.findMany({
      where: { clubId: club.id },
      include: {
        _count: {
          select: {
            couples: true,
            matches: true,
          },
        },
        tournamentPlayers: {
          include: {
            tournament: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { startDate: 'desc' },
    })

    const mapped = tournaments.map((t) => ({
      id: t.id,
      name: t.name,
      startDate: t.startDate,
      endDate: t.endDate,
      clubId: t.clubId,
      _count: { couples: t._count.couples, matches: t._count.matches },
      tournamentPlayers: t.tournamentPlayers.map((tp) => ({
        id: tp.id,
        playerId: tp.playerId,
        tournamentId: tp.tournamentId,
        tournament: { name: tp.tournament.name },
      })),
    }))

    return NextResponse.json(mapped)
  } catch (error) {
    console.error('Error fetching tournaments:', error)
    return NextResponse.json(
      { message: 'An error occurred while fetching tournaments' },
      { status: 500 }
    )
  }
}

// POST /api/club/tournaments — Create a tournament for the club
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
    const { name, startDate, endDate } = body

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { message: 'Tournament name is required' },
        { status: 400 }
      )
    }

    if (!startDate) {
      return NextResponse.json(
        { message: 'Start date is required' },
        { status: 400 }
      )
    }

    if (!endDate) {
      return NextResponse.json(
        { message: 'End date is required' },
        { status: 400 }
      )
    }

    const parsedStart = new Date(startDate)
    const parsedEnd = new Date(endDate)

    if (isNaN(parsedStart.getTime())) {
      return NextResponse.json(
        { message: 'Invalid start date' },
        { status: 400 }
      )
    }

    if (isNaN(parsedEnd.getTime())) {
      return NextResponse.json(
        { message: 'Invalid end date' },
        { status: 400 }
      )
    }

    if (parsedEnd < parsedStart) {
      return NextResponse.json(
        { message: 'End date must be after start date' },
        { status: 400 }
      )
    }

    const tournament = await db.tournament.create({
      data: {
        name: name.trim(),
        startDate: parsedStart,
        endDate: parsedEnd,
        clubId: club.id,
      },
    })

    return NextResponse.json({ tournament }, { status: 201 })
  } catch (error) {
    console.error('Error creating tournament:', error)
    return NextResponse.json(
      { message: 'An error occurred while creating the tournament' },
      { status: 500 }
    )
  }
}
