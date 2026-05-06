import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'

// GET /api/club/available-players — Return players enrolled in a tournament who are NOT already in a couple
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

    // Get all couples in this tournament to find coupled player IDs
    const couples = await db.couple.findMany({
      where: { tournamentId },
      select: { player1Id: true, player2Id: true },
    })

    const coupledPlayerIds = new Set(
      couples.flatMap((c) => [c.player1Id, c.player2Id])
    )

    // Get all players enrolled in this tournament
    const tournamentPlayers = await db.tournamentPlayer.findMany({
      where: { tournamentId },
      include: {
        player: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    })

    // Filter out players already in a couple
    const availablePlayers = tournamentPlayers
      .filter((tp) => !coupledPlayerIds.has(tp.playerId))
      .map((tp) => ({
        id: tp.player.id,
        firstName: tp.player.firstName,
        lastName: tp.player.lastName,
      }))

    return NextResponse.json(availablePlayers)
  } catch (error) {
    console.error('Error fetching available players:', error)
    return NextResponse.json(
      { message: 'An error occurred while fetching available players' },
      { status: 500 }
    )
  }
}
