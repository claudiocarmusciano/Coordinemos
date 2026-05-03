import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'

// GET /api/club/dashboard — Return dashboard data for the club
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
    const [totalTournaments, totalPlayers, totalCourts, availableSlotsCount] = await Promise.all([
      db.tournament.count({ where: { clubId: club.id } }),
      db.player.count({ where: { clubId: club.id } }),
      db.court.count({ where: { clubId: club.id } }),
      db.slot.count({ where: { clubId: club.id, status: 'AVAILABLE' } }),
    ])

    // Get tournaments with couple and match counts
    const tournaments = await db.tournament.findMany({
      where: { clubId: club.id },
      include: {
        _count: {
          select: {
            couples: true,
            matches: true,
          },
        },
        matches: {
          include: {
            matchAssignment: true,
          },
        },
      },
      orderBy: { startDate: 'desc' },
    })

    const tournamentsData = tournaments.map((tournament) => {
      const totalMatches = tournament._count.matches
      const matchesWithConfirmedSlots = tournament.matches.filter(
        (m) => m.matchAssignment && !m.matchAssignment.cancelledAt
      ).length
      const matchesPending = totalMatches - matchesWithConfirmedSlots

      return {
        id: tournament.id,
        name: tournament.name,
        startDate: tournament.startDate,
        endDate: tournament.endDate,
        totalCouples: tournament._count.couples,
        totalMatches,
        matchesWithConfirmedSlots,
        matchesPending,
      }
    })

    // Get recent match assignments (last 10)
    const recentAssignments = await db.matchAssignment.findMany({
      where: {
        slot: { clubId: club.id },
      },
      include: {
        match: {
          include: {
            couple1: {
              include: {
                player1: { select: { id: true, firstName: true, lastName: true } },
                player2: { select: { id: true, firstName: true, lastName: true } },
              },
            },
            couple2: {
              include: {
                player1: { select: { id: true, firstName: true, lastName: true } },
                player2: { select: { id: true, firstName: true, lastName: true } },
              },
            },
          },
        },
        slot: {
          include: {
            court: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { confirmedAt: 'desc' },
      take: 10,
    })

    const recentAssignmentsData = recentAssignments.map((assignment) => ({
      id: assignment.id,
      matchId: assignment.matchId,
      slotId: assignment.slotId,
      confirmedAt: assignment.confirmedAt,
      cancelledAt: assignment.cancelledAt,
      match: {
        id: assignment.match.id,
        couple1: assignment.match.couple1,
        couple2: assignment.match.couple2,
      },
      slot: {
        id: assignment.slot.id,
        day: assignment.slot.day,
        startTime: assignment.slot.startTime,
        endTime: assignment.slot.endTime,
        status: assignment.slot.status,
        court: assignment.slot.court,
      },
    }))

    return NextResponse.json({
      dashboard: {
        totalTournaments,
        totalPlayers,
        totalCourts,
        availableSlotsCount,
        tournaments: tournamentsData,
        recentAssignments: recentAssignmentsData,
      },
    })
  } catch (error) {
    console.error('Error fetching dashboard data:', error)
    return NextResponse.json(
      { message: 'An error occurred while fetching dashboard data' },
      { status: 500 }
    )
  }
}
