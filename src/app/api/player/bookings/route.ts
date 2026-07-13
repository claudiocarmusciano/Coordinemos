import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'

// GET /api/player/bookings — List the player's own reservas eventuales
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
      return NextResponse.json({ message: 'Player not found' }, { status: 404 })
    }

    const bookings = await db.booking.findMany({
      where: { playerId: player.id },
      include: {
        slot: {
          include: {
            court: { select: { id: true, name: true } },
            club: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: [{ slot: { day: 'asc' } }, { slot: { startTime: 'asc' } }],
    })

    return NextResponse.json(bookings)
  } catch (error) {
    console.error('Error fetching player bookings:', error)
    return NextResponse.json(
      { message: 'An error occurred while fetching bookings' },
      { status: 500 }
    )
  }
}

// POST /api/player/bookings — Reserva eventual de autoservicio (el jugador reserva para sí mismo)
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
      return NextResponse.json({ message: 'Player not found' }, { status: 404 })
    }

    const body = await request.json()
    const { slotId } = body
    if (!slotId || typeof slotId !== 'string') {
      return NextResponse.json({ message: 'slotId es requerido' }, { status: 400 })
    }

    // Email verification is required before a player can make a reservation
    const dbUser = await db.user.findUnique({
      where: { id: authUser.id },
      select: { emailVerified: true },
    })
    if (!dbUser?.emailVerified) {
      return NextResponse.json(
        { message: 'Verificá tu email antes de reservar' },
        { status: 403 }
      )
    }

    const slot = await db.slot.findUnique({
      where: { id: slotId },
      include: { court: { select: { name: true } }, club: { select: { id: true, name: true, userId: true } } },
    })
    if (!slot) {
      return NextResponse.json({ message: 'Turno no encontrado' }, { status: 404 })
    }

    // Any registered + verified player can book any club's available slot (no membership required)
    try {
      const booking = await db.$transaction(async (tx) => {
        const claimed = await tx.slot.updateMany({
          where: { id: slotId, status: 'AVAILABLE' },
          data: { status: 'RESERVED' },
        })
        if (claimed.count === 0) {
          throw new Error('SLOT_TAKEN')
        }
        return tx.booking.create({
          data: {
            slotId,
            playerId: player.id,
            createdByRole: 'PLAYER',
            price: slot.price,
          },
        })
      })

      await db.notification.create({
        data: {
          userId: slot.club.userId,
          message: `${player.firstName} ${player.lastName} reservó el turno del ${slot.day} a las ${slot.startTime} en ${slot.court.name}.`,
          type: 'BOOKING_CONFIRMED',
          relatedId: booking.id,
        },
      })

      return NextResponse.json({ booking }, { status: 201 })
    } catch (err) {
      if (err instanceof Error && err.message === 'SLOT_TAKEN') {
        return NextResponse.json({ message: 'Ese turno ya no está disponible' }, { status: 409 })
      }
      throw err
    }
  } catch (error) {
    console.error('Error creating player booking:', error)
    return NextResponse.json(
      { message: 'An error occurred while creating the booking' },
      { status: 500 }
    )
  }
}
