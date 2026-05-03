import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'

// GET /api/club/couples — Return all couples for a tournament
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

    const couples = await db.couple.findMany({
      where: { tournamentId },
      include: {
        player1: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        player2: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        _count: {
          select: {
            matchAsCouple1: true,
            matchAsCouple2: true,
          },
        },
      },
      orderBy: { id: 'asc' },
    })

    const result = couples.map((couple) => ({
      id: couple.id,
      tournamentId: couple.tournamentId,
      player1Id: couple.player1Id,
      player2Id: couple.player2Id,
      player1: couple.player1,
      player2: couple.player2,
      matchesCount: couple._count.matchAsCouple1 + couple._count.matchAsCouple2,
    }))

    return NextResponse.json({ couples: result })
  } catch (error) {
    console.error('Error fetching couples:', error)
    return NextResponse.json(
      { message: 'An error occurred while fetching couples' },
      { status: 500 }
    )
  }
}

// POST /api/club/couples — Create a couple
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
    const { tournamentId, player1Id, player2Id } = body

    if (!tournamentId) {
      return NextResponse.json(
        { message: 'Tournament ID is required' },
        { status: 400 }
      )
    }

    if (!player1Id) {
      return NextResponse.json(
        { message: 'Player 1 ID is required' },
        { status: 400 }
      )
    }

    if (!player2Id) {
      return NextResponse.json(
        { message: 'Player 2 ID is required' },
        { status: 400 }
      )
    }

    // Validate: player1Id !== player2Id
    if (player1Id === player2Id) {
      return NextResponse.json(
        { message: 'A couple must consist of two different players' },
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

    // Validate: Both players belong to the club
    const player1 = await db.player.findUnique({ where: { id: player1Id } })
    if (!player1 || player1.clubId !== club.id) {
      return NextResponse.json(
        { message: 'Player 1 not found or does not belong to this club' },
        { status: 400 }
      )
    }

    const player2 = await db.player.findUnique({ where: { id: player2Id } })
    if (!player2 || player2.clubId !== club.id) {
      return NextResponse.json(
        { message: 'Player 2 not found or does not belong to this club' },
        { status: 400 }
      )
    }

    // Validate: Both players are in the tournament (TournamentPlayer exists)
    const tp1 = await db.tournamentPlayer.findUnique({
      where: { tournamentId_playerId: { tournamentId, playerId: player1Id } },
    })
    if (!tp1) {
      return NextResponse.json(
        { message: 'Player 1 is not registered in this tournament' },
        { status: 400 }
      )
    }

    const tp2 = await db.tournamentPlayer.findUnique({
      where: { tournamentId_playerId: { tournamentId, playerId: player2Id } },
    })
    if (!tp2) {
      return NextResponse.json(
        { message: 'Player 2 is not registered in this tournament' },
        { status: 400 }
      )
    }

    // Validate: Neither player is already in another couple in this tournament
    const existingCoupleP1 = await db.couple.findFirst({
      where: {
        tournamentId,
        OR: [
          { player1Id },
          { player2Id: player1Id },
        ],
      },
    })
    if (existingCoupleP1) {
      return NextResponse.json(
        { message: 'Player 1 is already part of a couple in this tournament' },
        { status: 409 }
      )
    }

    const existingCoupleP2 = await db.couple.findFirst({
      where: {
        tournamentId,
        OR: [
          { player1Id: player2Id },
          { player2Id },
        ],
      },
    })
    if (existingCoupleP2) {
      return NextResponse.json(
        { message: 'Player 2 is already part of a couple in this tournament' },
        { status: 409 }
      )
    }

    const couple = await db.couple.create({
      data: {
        tournamentId,
        player1Id,
        player2Id,
      },
      include: {
        player1: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        player2: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
      },
    })

    return NextResponse.json({ couple }, { status: 201 })
  } catch (error) {
    console.error('Error creating couple:', error)
    return NextResponse.json(
      { message: 'An error occurred while creating the couple' },
      { status: 500 }
    )
  }
}
