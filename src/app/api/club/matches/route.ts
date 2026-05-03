import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'

// GET /api/club/matches — Return all matches for a tournament
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

    const { searchParams } = new URL(request.url)
    const tournamentId = searchParams.get('tournamentId')

    if (!tournamentId) {
      return NextResponse.json(
        { message: 'tournamentId query parameter is required' },
        { status: 400 }
      )
    }

    // Verify tournament belongs to this club
    const tournament = await db.tournament.findUnique({ where: { id: tournamentId } })
    if (!tournament || tournament.clubId !== club.id) {
      return NextResponse.json(
        { message: 'Tournament not found or does not belong to this club' },
        { status: 404 }
      )
    }

    const matches = await db.match.findMany({
      where: { tournamentId },
      include: {
        couple1: {
          include: {
            player1: {
              select: { firstName: true, lastName: true },
            },
            player2: {
              select: { firstName: true, lastName: true },
            },
          },
        },
        couple2: {
          include: {
            player1: {
              select: { firstName: true, lastName: true },
            },
            player2: {
              select: { firstName: true, lastName: true },
            },
          },
        },
        matchAssignment: {
          include: {
            slot: {
              include: {
                court: {
                  select: { name: true },
                },
              },
            },
          },
        },
        _count: {
          select: { slotPreferences: true },
        },
      },
      orderBy: { id: 'asc' },
    })

    const mapped = matches.map((m) => ({
      id: m.id,
      tournamentId: m.tournamentId,
      couple1Id: m.couple1Id,
      couple2Id: m.couple2Id,
      couple1: {
        player1: { firstName: m.couple1.player1.firstName, lastName: m.couple1.player1.lastName },
        player2: { firstName: m.couple1.player2.firstName, lastName: m.couple1.player2.lastName },
      },
      couple2: {
        player1: { firstName: m.couple2.player1.firstName, lastName: m.couple2.player1.lastName },
        player2: { firstName: m.couple2.player2.firstName, lastName: m.couple2.player2.lastName },
      },
      matchAssignment: m.matchAssignment
        ? {
            id: m.matchAssignment.id,
            confirmedAt: m.matchAssignment.confirmedAt,
            cancelledAt: m.matchAssignment.cancelledAt,
            slot: {
              day: m.matchAssignment.slot.day,
              startTime: m.matchAssignment.slot.startTime,
              endTime: m.matchAssignment.slot.endTime,
              court: { name: m.matchAssignment.slot.court.name },
            },
          }
        : null,
      slotPreferences: m._count.slotPreferences,
    }))

    return NextResponse.json(mapped)
  } catch (error) {
    console.error('Error fetching matches:', error)
    return NextResponse.json(
      { message: 'An error occurred while fetching matches' },
      { status: 500 }
    )
  }
}

// POST /api/club/matches — Create a match
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
    const { tournamentId, couple1Id, couple2Id } = body

    if (!tournamentId) {
      return NextResponse.json(
        { message: 'Tournament ID is required' },
        { status: 400 }
      )
    }

    if (!couple1Id) {
      return NextResponse.json(
        { message: 'Couple 1 ID is required' },
        { status: 400 }
      )
    }

    if (!couple2Id) {
      return NextResponse.json(
        { message: 'Couple 2 ID is required' },
        { status: 400 }
      )
    }

    // Validate: couple1Id !== couple2Id
    if (couple1Id === couple2Id) {
      return NextResponse.json(
        { message: 'A match must consist of two different couples' },
        { status: 400 }
      )
    }

    // Verify tournament belongs to this club
    const tournament = await db.tournament.findUnique({ where: { id: tournamentId } })
    if (!tournament || tournament.clubId !== club.id) {
      return NextResponse.json(
        { message: 'Tournament not found or does not belong to this club' },
        { status: 404 }
      )
    }

    // Validate: Both couples belong to the tournament
    const couple1 = await db.couple.findUnique({
      where: { id: couple1Id },
      include: {
        player1: { select: { id: true } },
        player2: { select: { id: true } },
      },
    })
    if (!couple1 || couple1.tournamentId !== tournamentId) {
      return NextResponse.json(
        { message: 'Couple 1 not found or does not belong to this tournament' },
        { status: 400 }
      )
    }

    const couple2 = await db.couple.findUnique({
      where: { id: couple2Id },
      include: {
        player1: { select: { id: true } },
        player2: { select: { id: true } },
      },
    })
    if (!couple2 || couple2.tournamentId !== tournamentId) {
      return NextResponse.json(
        { message: 'Couple 2 not found or does not belong to this tournament' },
        { status: 400 }
      )
    }

    // Validate: The two couples don't share any players
    const couple1PlayerIds = [couple1.player1Id, couple1.player2Id]
    const couple2PlayerIds = [couple2.player1Id, couple2.player2Id]
    const sharedPlayers = couple1PlayerIds.filter((pid) => couple2PlayerIds.includes(pid))

    if (sharedPlayers.length > 0) {
      return NextResponse.json(
        { message: 'The two couples share one or more players. A player cannot play on both sides.' },
        { status: 400 }
      )
    }

    const match = await db.match.create({
      data: {
        tournamentId,
        couple1Id,
        couple2Id,
      },
      include: {
        couple1: {
          include: {
            player1: {
              select: { id: true, firstName: true, lastName: true, phone: true },
            },
            player2: {
              select: { id: true, firstName: true, lastName: true, phone: true },
            },
          },
        },
        couple2: {
          include: {
            player1: {
              select: { id: true, firstName: true, lastName: true, phone: true },
            },
            player2: {
              select: { id: true, firstName: true, lastName: true, phone: true },
            },
          },
        },
      },
    })

    return NextResponse.json({ match }, { status: 201 })
  } catch (error) {
    console.error('Error creating match:', error)
    return NextResponse.json(
      { message: 'An error occurred while creating the match' },
      { status: 500 }
    )
  }
}
