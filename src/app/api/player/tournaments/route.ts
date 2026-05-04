import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'

// GET /api/player/tournaments — Return all tournaments the player is enrolled in
export async function GET(request: Request) {
  try {
    const authUser = await getUserFromRequest(request)
    if (!authUser || authUser.role !== 'PLAYER') {
      return NextResponse.json(
        { message: 'Unauthorized: Player access required' },
        { status: 403 }
      )
    }

    const player = await db.player.findUnique({ where: { userId: authUser.id } })
    if (!player) {
      return NextResponse.json(
        { message: 'Player not found' },
        { status: 404 }
      )
    }

    // Find all tournaments the player is enrolled in
    const tournamentPlayers = await db.tournamentPlayer.findMany({
      where: { playerId: player.id },
      include: {
        tournament: {
          include: {
            club: {
              select: { id: true, name: true },
            },
          },
        },
      },
      orderBy: { tournament: { startDate: 'desc' } },
    })

    const tournaments = await Promise.all(
      tournamentPlayers.map(async (tp) => {
        const tournament = tp.tournament

        // Find all matches where the player is in couple1 or couple2
        const matches = await db.match.findMany({
          where: {
            tournamentId: tournament.id,
            OR: [
              {
                couple1: {
                  OR: [
                    { player1Id: player.id },
                    { player2Id: player.id },
                  ],
                },
              },
              {
                couple2: {
                  OR: [
                    { player1Id: player.id },
                    { player2Id: player.id },
                  ],
                },
              },
            ],
          },
          include: {
            couple1: {
              include: {
                player1: { select: { id: true, firstName: true, lastName: true, phone: true } },
                player2: { select: { id: true, firstName: true, lastName: true, phone: true } },
              },
            },
            couple2: {
              include: {
                player1: { select: { id: true, firstName: true, lastName: true, phone: true } },
                player2: { select: { id: true, firstName: true, lastName: true, phone: true } },
              },
            },
            matchAssignment: {
              include: {
                slot: {
                  include: {
                    court: { select: { id: true, name: true } },
                  },
                },
              },
            },
            slotPreferences: {
              where: { playerId: player.id },
              select: {
                id: true,
                day: true,
                startTime: true,
                endTime: true,
              },
            },
          },
          orderBy: { id: 'asc' },
        })

        // Get available slots for the club
        const availableSlots = await db.slot.findMany({
          where: {
            clubId: tournament.clubId,
            status: 'AVAILABLE',
          },
          include: {
            court: { select: { id: true, name: true } },
          },
          orderBy: [{ day: 'asc' }, { startTime: 'asc' }],
        })

        return {
          id: tournament.id,
          name: tournament.name,
          startDate: tournament.startDate,
          endDate: tournament.endDate,
          club: tournament.club,
          matches: matches.map((match) => ({
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
            mySlotPreferences: match.slotPreferences,
          })),
          availableSlots: availableSlots.map((slot) => ({
            id: slot.id,
            day: slot.day,
            startTime: slot.startTime,
            endTime: slot.endTime,
            courtId: slot.courtId,
            court: slot.court,
          })),
        }
      })
    )

    return NextResponse.json({ tournaments })
  } catch (error) {
    console.error('Error fetching player tournaments:', error)
    return NextResponse.json(
      { message: 'An error occurred while fetching tournaments' },
      { status: 500 }
    )
  }
}
