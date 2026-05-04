import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'

// GET /api/player/slots — Return available slots for the player's club, grouped by day.
// Optional query param: tournamentId (to filter slots relevant to a tournament's date range)
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

    const { searchParams } = new URL(request.url)
    const tournamentId = searchParams.get('tournamentId')

    const where: Record<string, unknown> = {
      clubId: player.clubId,
      status: 'AVAILABLE',
    }

    // If tournamentId is provided, filter slots to the tournament's date range
    if (tournamentId) {
      const tournament = await db.tournament.findUnique({
        where: { id: tournamentId },
      })

      if (tournament && tournament.clubId === player.clubId) {
        // Get the date range as YYYY-MM-DD strings
        const startDate = tournament.startDate.toISOString().split('T')[0]
        const endDate = tournament.endDate.toISOString().split('T')[0]

        // Filter slots whose day falls within the tournament date range
        // SQLite stores day as string, so we can compare lexicographically for ISO dates
        where.day = {
          gte: startDate,
          lte: endDate,
        }
      }
    }

    const slots = await db.slot.findMany({
      where,
      include: {
        court: { select: { id: true, name: true } },
      },
      orderBy: [{ day: 'asc' }, { startTime: 'asc' }],
    })

    // Group by day
    const groupedByDay: Record<string, typeof slots> = {}
    for (const slot of slots) {
      if (!groupedByDay[slot.day]) {
        groupedByDay[slot.day] = []
      }
      groupedByDay[slot.day].push(slot)
    }

    // Format the grouped result
    const result = Object.entries(groupedByDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, daySlots]) => ({
        day,
        slots: daySlots.map((slot) => ({
          id: slot.id,
          startTime: slot.startTime,
          endTime: slot.endTime,
          courtId: slot.courtId,
          court: slot.court,
        })),
      }))

    return NextResponse.json({ slotsByDay: result })
  } catch (error) {
    console.error('Error fetching player slots:', error)
    return NextResponse.json(
      { message: 'An error occurred while fetching available slots' },
      { status: 500 }
    )
  }
}
