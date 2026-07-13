import { db } from '@/lib/db'

const HORIZON_WEEKS = 8
const DAY_NAMES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

function fmtDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// All dates (YYYY-MM-DD) from today (inclusive) up to horizon that fall on dayOfWeek.
function upcomingDatesForDay(dayOfWeek: number): string[] {
  const today = new Date()
  today.setHours(12, 0, 0, 0)
  const horizon = new Date(today)
  horizon.setDate(horizon.getDate() + HORIZON_WEEKS * 7)
  const out: string[] = []
  const cur = new Date(today)
  while (cur <= horizon) {
    if (cur.getDay() === dayOfWeek) out.push(fmtDate(cur))
    cur.setDate(cur.getDate() + 1)
  }
  return out
}

export interface MaterializeResult {
  created: number
  conflicts: { day: string; displaced: 'BOOKING' | 'MATCH' }[]
}

/**
 * Ensures every active recurring booking of a club has its future occurrences
 * materialized as RESERVED slots + Booking rows, over a rolling 8-week horizon.
 * Idempotent: a date already claimed by the recurring booking is skipped.
 * On conflict the recurring booking has priority and displaces the occupant,
 * notifying the displaced party and the club.
 */
export async function materializeRecurringBookings(clubId: string): Promise<MaterializeResult> {
  const result: MaterializeResult = { created: 0, conflicts: [] }

  const club = await db.club.findUnique({ where: { id: clubId }, select: { userId: true } })
  if (!club) return result

  const recurrings = await db.recurringBooking.findMany({
    where: { clubId, active: true },
    include: { player: { select: { id: true, firstName: true, lastName: true } } },
  })
  if (recurrings.length === 0) return result

  for (const rb of recurrings) {
    const beneficiary = rb.player
      ? `${rb.player.firstName} ${rb.player.lastName}`
      : rb.customerName || 'cliente'

    for (const day of upcomingDatesForDay(rb.dayOfWeek)) {
      // Already materialized for this date?
      const already = await db.booking.findFirst({
        where: { recurringBookingId: rb.id, slot: { day } },
        select: { id: true },
      })
      if (already) continue

      const slot = await db.slot.findFirst({
        where: { courtId: rb.courtId, day, startTime: rb.startTime },
        include: {
          booking: { include: { player: { select: { userId: true } } } },
          matchAssignment: {
            include: {
              match: {
                include: {
                  couple1: { include: { player1: { select: { userId: true } }, player2: { select: { userId: true } } } },
                  couple2: { include: { player1: { select: { userId: true } }, player2: { select: { userId: true } } } },
                },
              },
            },
          },
        },
      })

      const bookingData = {
        playerId: rb.playerId,
        customerName: rb.customerName,
        customerPhone: rb.customerPhone,
        createdByRole: 'CLUB',
        recurringBookingId: rb.id,
        price: slot?.price ?? null,
      }

      // Case A: no slot yet — create it reserved
      if (!slot) {
        await db.$transaction(async (tx) => {
          const newSlot = await tx.slot.create({
            data: {
              day,
              startTime: rb.startTime,
              endTime: rb.endTime,
              courtId: rb.courtId,
              clubId,
              status: 'RESERVED',
            },
          })
          await tx.booking.create({ data: { ...bookingData, slotId: newSlot.id, price: null } })
        })
        result.created++
        continue
      }

      // Case B: slot AVAILABLE — claim it
      if (slot.status === 'AVAILABLE') {
        await db.$transaction(async (tx) => {
          await tx.slot.update({ where: { id: slot.id }, data: { status: 'RESERVED' } })
          await tx.booking.create({ data: { ...bookingData, slotId: slot.id } })
        })
        result.created++
        continue
      }

      // Case C: slot RESERVED by a one-off/other booking — displace it (priority)
      if (slot.status === 'RESERVED' && slot.booking) {
        const displacedUserId = slot.booking.player?.userId ?? null
        await db.$transaction(async (tx) => {
          await tx.booking.delete({ where: { id: slot.booking!.id } })
          await tx.booking.create({ data: { ...bookingData, slotId: slot.id } })
          if (displacedUserId) {
            await tx.notification.create({
              data: {
                userId: displacedUserId,
                message: `Tu reserva del ${day} a las ${slot.startTime} fue cancelada porque el turno pasó a ser una reserva fija.`,
                type: 'SLOT_CANCELLED',
                relatedId: slot.id,
              },
            })
          }
          await tx.notification.create({
            data: {
              userId: club.userId,
              message: `Reserva fija de ${beneficiary}: se desplazó una reserva eventual el ${day} a las ${slot.startTime} (${DAY_NAMES[rb.dayOfWeek]}).`,
              type: 'SLOT_CANCELLED',
              relatedId: slot.id,
            },
          })
        })
        result.created++
        result.conflicts.push({ day, displaced: 'BOOKING' })
        continue
      }

      // Case D: slot CONFIRMED (tournament match) — displace it (priority), notify the 4 players
      if (slot.status === 'CONFIRMED' && slot.matchAssignment) {
        const m = slot.matchAssignment.match
        const playerUserIds = [
          m.couple1.player1.userId,
          m.couple1.player2.userId,
          m.couple2.player1.userId,
          m.couple2.player2.userId,
        ]
        await db.$transaction(async (tx) => {
          await tx.matchAssignment.delete({ where: { id: slot.matchAssignment!.id } })
          await tx.booking.create({ data: { ...bookingData, slotId: slot.id } })
          await tx.notification.createMany({
            data: playerUserIds.map((userId) => ({
              userId,
              message: `El turno confirmado del ${day} a las ${slot.startTime} fue cancelado porque el club lo asignó como reserva fija. Deberás seleccionar un nuevo turno.`,
              type: 'SLOT_CANCELLED',
              relatedId: slot.id,
            })),
          })
          await tx.notification.create({
            data: {
              userId: club.userId,
              message: `Reserva fija de ${beneficiary}: se desplazó un partido confirmado el ${day} a las ${slot.startTime} (${DAY_NAMES[rb.dayOfWeek]}). Los jugadores deberán recoordinar.`,
              type: 'SLOT_CANCELLED',
              relatedId: slot.id,
            },
          })
        })
        result.created++
        result.conflicts.push({ day, displaced: 'MATCH' })
        continue
      }
    }
  }

  return result
}
