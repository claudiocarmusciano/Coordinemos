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
    const explicitClubId = searchParams.get('clubId')

    // Determine which club's slots to show:
    // If tournamentId provided, use that tournament's club (with date range).
    // Else if clubId provided explicitly → una reserva eventual puede ser en CUALQUIER club
    //   (no se exige membresía), así que se usa directamente.
    // Otherwise fall back to first CONFIRMED membership's club.
    let clubId: string | null = null
    let dateRange: { gte: string; lte: string } | null = null

    if (tournamentId) {
      const tournament = await db.tournament.findUnique({ where: { id: tournamentId } })
      if (tournament) {
        clubId = tournament.clubId
        const startDate = tournament.startDate.toISOString().split('T')[0]
        const endDate = tournament.endDate.toISOString().split('T')[0]
        dateRange = { gte: startDate, lte: endDate }
      }
    } else if (explicitClubId) {
      clubId = explicitClubId
    }

    if (!clubId) {
      // Fall back to first CONFIRMED membership
      const firstMembership = await db.clubMembership.findFirst({
        where: { playerId: player.id, status: 'CONFIRMED' },
        orderBy: { createdAt: 'asc' },
      })
      clubId = firstMembership?.clubId ?? null
    }

    if (!clubId) {
      return NextResponse.json({ slotsByDay: [] })
    }

    // Player-facing view: show available slots (selectable) plus taken ones
    // (RESERVED/CONFIRMED) shown only as "Reservado" — never the name of who booked (privacy).
    const today = new Date().toISOString().split('T')[0]
    const where: Record<string, unknown> = {
      clubId,
      status: { in: ['AVAILABLE', 'RESERVED', 'CONFIRMED'] },
      day: dateRange ?? { gte: today },
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
          price: slot.price,
          available: slot.status === 'AVAILABLE', // taken slots (RESERVED/CONFIRMED) show only as "Reservado"
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
