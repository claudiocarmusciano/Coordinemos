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
        matchAssignment: {
          include: {
            slot: {
              include: {
                court: {
                  select: { id: true, name: true },
                },
              },
            },
          },
        },
        slotPreferences: {
          include: {
            player: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
      },
      orderBy: { id: 'asc' },
    })

    const result = matches.map((match) => ({
      id: match.id,
      tournamentId: match.tournamentId,
      couple1Id: match.couple1Id,
      couple2Id: match.couple2Id,
      couple1: match.couple1,
      couple2: match.couple2,
      matchAssignment: match.matchAssignment
        ? {
            id: match.matchAssignment.id,
            confirmedAt: match.matchAssignment.confirmedAt,
            cancelledAt: match.matchAssignment.cancelledAt,
            slot: match.matchAssignment.slot,
          }
        : null,
      slotPreferences: match.slotPreferences,
    }))

    return NextResponse.json({ matches: result })
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
