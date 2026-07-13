import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'

// GET /api/club/bookings — List walk-in + self-service bookings for the club
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

    const bookings = await db.booking.findMany({
      where: { slot: { clubId: club.id } },
      include: {
        slot: { include: { court: { select: { id: true, name: true } } } },
        player: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: [{ slot: { day: 'asc' } }, { slot: { startTime: 'asc' } }],
    })

    return NextResponse.json(bookings)
  } catch (error) {
    console.error('Error fetching bookings:', error)
    return NextResponse.json(
      { message: 'An error occurred while fetching bookings' },
      { status: 500 }
    )
  }
}

// POST /api/club/bookings — Create a walk-in reserva eventual (sin cuenta de jugador)
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
    const { slotId, customerName, customerPhone } = body

    if (!slotId || typeof slotId !== 'string') {
      return NextResponse.json({ message: 'slotId es requerido' }, { status: 400 })
    }
    if (!customerName || typeof customerName !== 'string' || !customerName.trim()) {
      return NextResponse.json({ message: 'El nombre del cliente es requerido' }, { status: 400 })
    }

    const slot = await db.slot.findUnique({ where: { id: slotId } })
    if (!slot || slot.clubId !== club.id) {
      return NextResponse.json(
        { message: 'Turno no encontrado o no pertenece a este club' },
        { status: 404 }
      )
    }

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
            customerName: customerName.trim(),
            customerPhone: customerPhone?.trim() || null,
            createdByRole: 'CLUB',
            price: slot.price,
          },
        })
      })

      return NextResponse.json({ booking }, { status: 201 })
    } catch (err) {
      if (err instanceof Error && err.message === 'SLOT_TAKEN') {
        return NextResponse.json({ message: 'Ese turno ya no está disponible' }, { status: 409 })
      }
      throw err
    }
  } catch (error) {
    console.error('Error creating booking:', error)
    return NextResponse.json(
      { message: 'An error occurred while creating the booking' },
      { status: 500 }
    )
  }
}
