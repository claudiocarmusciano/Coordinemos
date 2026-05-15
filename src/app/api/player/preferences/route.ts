import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'

// ─── MATCHING LOGIC ──────────────────────────────────────────
// When all 4 players in a match agree on a day+startTime+endTime,
// confirm the match by creating a MatchAssignment and updating the slot.
async function checkAndConfirmMatch(matchId: string) {
  // Get the match with all 4 players
  const match = await db.match.findUnique({
    where: { id: matchId },
    include: {
      couple1: { include: { player1: true, player2: true } },
      couple2: { include: { player1: true, player2: true } },
      slotPreferences: true,
    },
  })
  if (!match) return

  const players = [
    match.couple1.player1,
    match.couple1.player2,
    match.couple2.player1,
    match.couple2.player2,
  ]

  // For each unique day+startTime+endTime that has preferences
  const slotTimes = new Map<string, Set<string>>() // "day|startTime|endTime" -> Set of playerIds
  for (const pref of match.slotPreferences) {
    const key = `${pref.day}|${pref.startTime}|${pref.endTime}`
    if (!slotTimes.has(key)) slotTimes.set(key, new Set())
    slotTimes.get(key)!.add(pref.playerId)
  }

  // Find a day+time where ALL 4 players agree
  for (const [slotTime, playerIds] of slotTimes) {
    if (playerIds.size === 4) {
      const [day, startTime, endTime] = slotTime.split('|')

      // Find the club via the tournament
      const matchTournament = await db.tournament.findUnique({
        where: { id: match.tournamentId },
        select: { clubId: true },
      })
      if (!matchTournament) continue

      // Find an available slot for this day+time in the club
      const availableSlot = await db.slot.findFirst({
        where: {
          clubId: matchTournament.clubId,
          day,
          startTime,
          endTime,
          status: 'AVAILABLE',
        },
        include: { court: { select: { name: true } } },
      })

      if (availableSlot) {
        // Confirm the match
        await db.$transaction([
          db.matchAssignment.create({
            data: {
              matchId: match.id,
              slotId: availableSlot.id,
            },
          }),
          db.slot.update({
            where: { id: availableSlot.id },
            data: { status: 'CONFIRMED' },
          }),
        ])

        // Create notifications for all 4 players
        const tournament = await db.tournament.findUnique({
          where: { id: match.tournamentId },
          select: { name: true, club: { select: { name: true, userId: true } } },
        })
        const tournamentName = tournament?.name || 'Torneo'
        const clubName = tournament?.club?.name || 'Club'
        const courtName = availableSlot.court?.name || 'cancha asignada'
        const msg = `¡Turno confirmado! Torneo: ${tournamentName} | Club: ${clubName} | Cancha: ${courtName} | ${day} de ${startTime} a ${endTime} | ${match.couple1.player1.firstName} ${match.couple1.player1.lastName} & ${match.couple1.player2.firstName} ${match.couple1.player2.lastName} vs ${match.couple2.player1.firstName} ${match.couple2.player1.lastName} & ${match.couple2.player2.firstName} ${match.couple2.player2.lastName}`

        for (const p of players) {
          await db.notification.create({
            data: {
              userId: p.userId,
              message: msg,
              type: 'SLOT_CONFIRMED',
              relatedId: match.id,
            },
          })
        }

        // Notify club
        const clubUserId = tournament?.club?.userId
        if (clubUserId) {
          await db.notification.create({
            data: {
              userId: clubUserId,
              message: `Turno confirmado para partido: ${match.couple1.player1.firstName} & ${match.couple1.player2.firstName} vs ${match.couple2.player1.firstName} & ${match.couple2.player2.firstName} - ${day} ${startTime}-${endTime}`,
              type: 'SLOT_CONFIRMED',
              relatedId: match.id,
            },
          })
        }

        break // Only confirm one slot per match
      }
    }
  }
}

// ─── POST /api/player/preferences ────────────────────────────
// Set the player's slot preferences for a match.
// This replaces ALL existing preferences for this player+match.
export async function POST(request: Request) {
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

    const body = await request.json()
    const { matchId, slots }: { matchId: string; slots: { day: string; startTime: string; endTime: string }[] } = body

    // ── Basic validation ──
    if (!matchId || typeof matchId !== 'string') {
      return NextResponse.json(
        { message: 'matchId is required' },
        { status: 400 }
      )
    }

    if (!Array.isArray(slots)) {
      return NextResponse.json(
        { message: 'slots must be an array' },
        { status: 400 }
      )
    }

    for (let i = 0; i < slots.length; i++) {
      const s = slots[i]
      if (!s.day || !s.startTime || !s.endTime) {
        return NextResponse.json(
          { message: `Slot at index ${i} is missing day, startTime, or endTime` },
          { status: 400 }
        )
      }
    }

    // ── Validation (a): Player must be part of the match ──
    const match = await db.match.findUnique({
      where: { id: matchId },
      include: {
        couple1: { include: { player1: true, player2: true } },
        couple2: { include: { player1: true, player2: true } },
        matchAssignment: true,
      },
    })

    if (!match) {
      return NextResponse.json(
        { message: 'Match not found' },
        { status: 404 }
      )
    }

    const allPlayerIds = [
      match.couple1.player1Id,
      match.couple1.player2Id,
      match.couple2.player1Id,
      match.couple2.player2Id,
    ]

    if (!allPlayerIds.includes(player.id)) {
      return NextResponse.json(
        { message: 'You are not part of this match' },
        { status: 403 }
      )
    }

    // ── Validation (b): Match must NOT have a confirmed MatchAssignment ──
    if (match.matchAssignment && !match.matchAssignment.cancelledAt) {
      return NextResponse.json(
        { message: 'Cannot change preferences: this match already has a confirmed slot assignment' },
        { status: 409 }
      )
    }

    // Resolve the club for this match's tournament
    const matchTournamentInfo = await db.tournament.findUnique({
      where: { id: match.tournamentId },
      select: { clubId: true },
    })
    if (!matchTournamentInfo) {
      return NextResponse.json({ message: 'Tournament not found' }, { status: 404 })
    }
    const matchClubId = matchTournamentInfo.clubId

    // ── Validation (d): Each slot day+startTime+endTime must correspond to at least one AVAILABLE slot in the club ──
    for (let i = 0; i < slots.length; i++) {
      const s = slots[i]
      const availableSlot = await db.slot.findFirst({
        where: {
          clubId: matchClubId,
          day: s.day,
          startTime: s.startTime,
          endTime: s.endTime,
          status: 'AVAILABLE',
        },
      })
      if (!availableSlot) {
        return NextResponse.json(
          { message: `No available slot found for ${s.day} ${s.startTime}-${s.endTime} at your club` },
          { status: 400 }
        )
      }
    }

    // ── Validation (c): Cross-tournament blocking ──
    // For each slot preference, check if the player already has a preference for
    // the same day+startTime+endTime in a DIFFERENT tournament of the same club.
    const conflicts: string[] = []

    for (const s of slots) {
      const conflictingPrefs = await db.slotPreference.findMany({
        where: {
          playerId: player.id,
          day: s.day,
          startTime: s.startTime,
          endTime: s.endTime,
          match: {
            tournamentId: { not: match.tournamentId },
            tournament: { clubId: matchClubId },
          },
        },
        include: {
          match: {
            include: {
              tournament: { select: { name: true } },
            },
          },
        },
      })

      for (const cp of conflictingPrefs) {
        conflicts.push(
          `${s.day} ${s.startTime}-${s.endTime} conflicts with tournament "${cp.match.tournament.name}"`
        )
      }
    }

    if (conflicts.length > 0) {
      return NextResponse.json(
        {
          message: 'Cross-tournament scheduling conflict detected',
          conflicts,
        },
        { status: 409 }
      )
    }

    // ── Replace all existing preferences for this player+match with new ones ──
    await db.$transaction(async (tx) => {
      // Delete existing preferences
      await tx.slotPreference.deleteMany({
        where: {
          matchId,
          playerId: player.id,
        },
      })

      // Create new preferences
      if (slots.length > 0) {
        await tx.slotPreference.createMany({
          data: slots.map((s) => ({
            matchId,
            playerId: player.id,
            day: s.day,
            startTime: s.startTime,
            endTime: s.endTime,
          })),
        })
      }
    })

    // ── Call matching logic ──
    await checkAndConfirmMatch(matchId)

    // Return updated preferences
    const updatedPreferences = await db.slotPreference.findMany({
      where: { matchId, playerId: player.id },
      orderBy: [{ day: 'asc' }, { startTime: 'asc' }],
    })

    return NextResponse.json({ preferences: updatedPreferences })
  } catch (error) {
    console.error('Error setting slot preferences:', error)
    return NextResponse.json(
      { message: 'An error occurred while setting slot preferences' },
      { status: 500 }
    )
  }
}
