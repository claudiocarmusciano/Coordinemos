import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'
import { materializeRecurringBookings } from '@/lib/recurring'

const DAY_NAMES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
const TIME_RE = /^\d{2}:\d{2}$/

// GET /api/club/recurring-bookings — Lista las reservas fijas activas del club
export async function GET(request: Request) {
  try {
    const clubUser = await getUserFromRequest(request)
    if (!clubUser || clubUser.role !== 'CLUB') {
      return NextResponse.json({ message: 'Unauthorized: Club access required' }, { status: 403 })
    }
    const club = await db.club.findUnique({ where: { userId: clubUser.id } })
    if (!club) return NextResponse.json({ message: 'Club not found' }, { status: 404 })

    const recurrings = await db.recurringBooking.findMany({
      where: { clubId: club.id, active: true },
      include: {
        court: { select: { id: true, name: true } },
        player: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    })

    return NextResponse.json(recurrings)
  } catch (error) {
    console.error('Error fetching recurring bookings:', error)
    return NextResponse.json({ message: 'An error occurred while fetching recurring bookings' }, { status: 500 })
  }
}

// POST /api/club/recurring-bookings — Crea una reserva fija semanal
// Body: { courtId, dayOfWeek, startTime, endTime, playerId? | customerName?+customerPhone? }
export async function POST(request: Request) {
  try {
    const clubUser = await getUserFromRequest(request)
    if (!clubUser || clubUser.role !== 'CLUB') {
      return NextResponse.json({ message: 'Unauthorized: Club access required' }, { status: 403 })
    }
    const club = await db.club.findUnique({ where: { userId: clubUser.id } })
    if (!club) return NextResponse.json({ message: 'Club not found' }, { status: 404 })

    const body = await request.json()
    const { courtId, dayOfWeek, startTime, endTime, playerId, customerName, customerPhone } = body

    if (!courtId || typeof courtId !== 'string') {
      return NextResponse.json({ message: 'La cancha es requerida' }, { status: 400 })
    }
    if (typeof dayOfWeek !== 'number' || dayOfWeek < 0 || dayOfWeek > 6) {
      return NextResponse.json({ message: 'Día de la semana inválido' }, { status: 400 })
    }
    if (!TIME_RE.test(startTime || '') || !TIME_RE.test(endTime || '')) {
      return NextResponse.json({ message: 'Horario inválido (HH:mm)' }, { status: 400 })
    }
    const hasPlayer = !!playerId
    const hasWalkin = !!(customerName && customerName.trim())
    if (hasPlayer === hasWalkin) {
      return NextResponse.json(
        { message: 'Indicá un jugador o un nombre de cliente (no ambos)' },
        { status: 400 }
      )
    }

    const court = await db.court.findUnique({ where: { id: courtId } })
    if (!court || court.clubId !== club.id) {
      return NextResponse.json({ message: 'Cancha no encontrada o no pertenece a este club' }, { status: 400 })
    }

    const player = hasPlayer
      ? await db.player.findUnique({ where: { id: playerId }, include: { user: { select: { id: true } } } })
      : null
    if (hasPlayer && !player) {
      return NextResponse.json({ message: 'Jugador no encontrado' }, { status: 404 })
    }

    const recurring = await db.recurringBooking.create({
      data: {
        clubId: club.id,
        courtId,
        dayOfWeek,
        startTime,
        endTime,
        playerId: hasPlayer ? playerId : null,
        customerName: hasWalkin ? customerName.trim() : null,
        customerPhone: hasWalkin && customerPhone ? customerPhone.trim() : null,
      },
    })

    // Materialize the upcoming occurrences right away
    const materialized = await materializeRecurringBookings(club.id)

    // Notify the player (if registered)
    if (player?.user) {
      await db.notification.create({
        data: {
          userId: player.user.id,
          message: `Tenés una reserva fija todos los ${DAY_NAMES[dayOfWeek]} a las ${startTime} en ${court.name}.`,
          type: 'BOOKING_CONFIRMED',
          relatedId: recurring.id,
        },
      })
    }
    // Notify the club (summary)
    const beneficiary = player
      ? `${player.firstName} ${player.lastName}`
      : customerName.trim()
    await db.notification.create({
      data: {
        userId: clubUser.id,
        message: `Reserva fija creada: ${beneficiary}, ${DAY_NAMES[dayOfWeek]} ${startTime} en ${court.name}.` +
          (materialized.conflicts.length > 0 ? ` (${materialized.conflicts.length} conflicto/s desplazado/s)` : ''),
        type: 'BOOKING_CONFIRMED',
        relatedId: recurring.id,
      },
    })

    return NextResponse.json(
      { recurringBooking: recurring, created: materialized.created, conflicts: materialized.conflicts },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating recurring booking:', error)
    return NextResponse.json({ message: 'An error occurred while creating the recurring booking' }, { status: 500 })
  }
}
