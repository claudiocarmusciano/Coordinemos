import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'

// GET /api/club/dashboard — Return dashboard data for the club (lightweight)
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

    // Run counts in parallel
    const [totalTournaments, totalPlayers, totalCourts, availableSlots] = await Promise.all([
      db.tournament.count({ where: { clubId: club.id } }),
      db.player.count({ where: { clubId: club.id } }),
      db.court.count({ where: { clubId: club.id } }),
      db.slot.count({ where: { clubId: club.id, status: 'AVAILABLE' } }),
    ])

    // Get tournaments with counts (lightweight)
    const tournaments = await db.tournament.findMany({
      where: { clubId: club.id },
      select: {
        id: true,
        name: true,
        startDate: true,
        endDate: true,
        _count: {
          select: {
            couples: true,
            matches: true,
          },
        },
        matches: {
          select: {
            matchAssignment: {
              select: { id: true, cancelledAt: true },
            },
          },
        },
      },
      orderBy: { startDate: 'desc' },
    })

    const tournamentsData = tournaments.map((t) => {
      const totalMatches = t._count.matches
      const confirmedMatches = t.matches.filter(
        (m) => m.matchAssignment && !m.matchAssignment.cancelledAt
      ).length
      return {
        id: t.id,
        name: t.name,
        startDate: t.startDate,
        endDate: t.endDate,
        totalCouples: t._count.couples,
        totalMatches,
        confirmedMatches,
        pendingMatches: totalMatches - confirmedMatches,
      }
    })

    return NextResponse.json({
      totalTournaments,
      totalPlayers,
      totalCourts,
      availableSlots,
      tournaments: tournamentsData,
    })
  } catch (error) {
    console.error('Error fetching dashboard data:', error)
    return NextResponse.json(
      { message: 'An error occurred while fetching dashboard data' },
      { status: 500 }
    )
  }
}
