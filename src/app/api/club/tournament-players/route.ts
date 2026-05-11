import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'

// POST /api/club/tournament-players — Add a player to a tournament
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
    const { tournamentId, playerId } = body

    if (!tournamentId) {
      return NextResponse.json(
        { message: 'Tournament ID is required' },
        { status: 400 }
      )
    }

    if (!playerId) {
      return NextResponse.json(
        { message: 'Player ID is required' },
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

    // Verify player has a CONFIRMED membership with this club
    const membership = await db.clubMembership.findUnique({
      where: { clubId_playerId: { clubId: club.id, playerId } },
    })
    if (!membership || membership.status !== 'CONFIRMED') {
      return NextResponse.json(
        { message: 'Player not found or does not belong to this club' },
        { status: 404 }
      )
    }

    // Check if player is already in the tournament
    const existingEntry = await db.tournamentPlayer.findUnique({
      where: {
        tournamentId_playerId: { tournamentId, playerId },
      },
    })

    if (existingEntry) {
      return NextResponse.json(
        { message: 'Player is already in this tournament' },
        { status: 409 }
      )
    }

    const tournamentPlayer = await db.tournamentPlayer.create({
      data: {
        tournamentId,
        playerId,
      },
      include: {
        player: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
      },
    })

    return NextResponse.json({ tournamentPlayer }, { status: 201 })
  } catch (error) {
    console.error('Error adding player to tournament:', error)
    return NextResponse.json(
      { message: 'An error occurred while adding the player to the tournament' },
      { status: 500 }
    )
  }
}

// DELETE /api/club/tournament-players — Remove a player from a tournament
export async function DELETE(request: Request) {
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
    const { tournamentId, playerId } = body

    if (!tournamentId) {
      return NextResponse.json(
        { message: 'Tournament ID is required' },
        { status: 400 }
      )
    }

    if (!playerId) {
      return NextResponse.json(
        { message: 'Player ID is required' },
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

    // Verify player has a CONFIRMED membership with this club
    const membershipCheck = await db.clubMembership.findUnique({
      where: { clubId_playerId: { clubId: club.id, playerId } },
    })
    if (!membershipCheck || membershipCheck.status !== 'CONFIRMED') {
      return NextResponse.json(
        { message: 'Player not found or does not belong to this club' },
        { status: 404 }
      )
    }

    // Find and delete the TournamentPlayer record
    const tournamentPlayer = await db.tournamentPlayer.findUnique({
      where: {
        tournamentId_playerId: { tournamentId, playerId },
      },
    })

    if (!tournamentPlayer) {
      return NextResponse.json(
        { message: 'Player is not in this tournament' },
        { status: 404 }
      )
    }

    await db.tournamentPlayer.delete({
      where: {
        tournamentId_playerId: { tournamentId, playerId },
      },
    })

    return NextResponse.json({ success: true, message: 'Player removed from tournament successfully' })
  } catch (error) {
    console.error('Error removing player from tournament:', error)
    return NextResponse.json(
      { message: 'An error occurred while removing the player from the tournament' },
      { status: 500 }
    )
  }
}
