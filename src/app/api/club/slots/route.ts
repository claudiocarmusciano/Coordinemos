import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'
import { materializeRecurringBookings } from '@/lib/recurring'

// GET /api/club/slots — Return all slots for the club
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

    const { searchParams } = new URL(request.url)

    const today = new Date().toISOString().split('T')[0]

    // Clean up past AVAILABLE slots (they are no longer useful)
    await db.slot.deleteMany({
      where: {
        clubId: club.id,
        status: 'AVAILABLE',
        day: { lt: today },
      },
    })

    // Materialize upcoming occurrences of any active weekly recurring bookings
    await materializeRecurringBookings(club.id)

    const where: Record<string, unknown> = {
      clubId: club.id,
      status: { in: ['AVAILABLE', 'CONFIRMED', 'RESERVED'] },
      day: { gte: today },
    }
    const statusParam = searchParams.get('status')
    if (statusParam) {
      where.status = statusParam
    }

    const slots = await db.slot.findMany({
      where,
      include: {
        court: {
          select: {
            id: true,
            name: true,
          },
        },
        matchAssignment: {
          include: {
            match: {
              include: {
                couple1: {
                  include: {
                    player1: { select: { firstName: true, lastName: true } },
                    player2: { select: { firstName: true, lastName: true } },
                  },
                },
                couple2: {
                  include: {
                    player1: { select: { firstName: true, lastName: true } },
                    player2: { select: { firstName: true, lastName: true } },
                  },
                },
              },
            },
          },
        },
        booking: {
          include: {
            player: { select: { firstName: true, lastName: true } },
          },
        },
      },
      orderBy: [{ day: 'asc' }, { startTime: 'asc' }],
    })

    const mapped = slots.map((s) => {
      const result: Record<string, unknown> = {
        id: s.id,
        day: s.day,
        startTime: s.startTime,
        endTime: s.endTime,
        courtId: s.courtId,
        clubId: s.clubId,
        status: s.status,
        price: s.price,
        court: { id: s.court.id, name: s.court.name },
      }
      if (s.matchAssignment) {
        const ma = s.matchAssignment
        result.matchAssignment = {
          id: ma.id,
          match: {
            couple1: {
              player1: { firstName: ma.match.couple1.player1.firstName, lastName: ma.match.couple1.player1.lastName },
              player2: { firstName: ma.match.couple1.player2.firstName, lastName: ma.match.couple1.player2.lastName },
            },
            couple2: {
              player1: { firstName: ma.match.couple2.player1.firstName, lastName: ma.match.couple2.player1.lastName },
              player2: { firstName: ma.match.couple2.player2.firstName, lastName: ma.match.couple2.player2.lastName },
            },
          },
        }
      }
      if (s.booking) {
        result.booking = {
          id: s.booking.id,
          createdByRole: s.booking.createdByRole,
          customerName: s.booking.customerName,
          isRecurring: !!s.booking.recurringBookingId,
          player: s.booking.player
            ? { firstName: s.booking.player.firstName, lastName: s.booking.player.lastName }
            : null,
        }
      }
      return result
    })

    return NextResponse.json(mapped)
  } catch (error) {
    console.error('Error fetching slots:', error)
    return NextResponse.json(
      { message: 'An error occurred while fetching slots' },
      { status: 500 }
    )
  }
}

// POST /api/club/slots — Create a slot
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
    const { day, startTime, endTime, courtId, price } = body
    const priceValue =
      price === undefined || price === null || price === '' ? null : Number(price)
    if (priceValue !== null && (!Number.isFinite(priceValue) || priceValue < 0)) {
      return NextResponse.json({ message: 'Precio inválido' }, { status: 400 })
    }

    if (!day || typeof day !== 'string' || !day.trim()) {
      return NextResponse.json(
        { message: 'Day is required' },
        { status: 400 }
      )
    }

    if (!startTime || typeof startTime !== 'string' || !startTime.trim()) {
      return NextResponse.json(
        { message: 'Start time is required' },
        { status: 400 }
      )
    }

    if (!endTime || typeof endTime !== 'string' || !endTime.trim()) {
      return NextResponse.json(
        { message: 'End time is required' },
        { status: 400 }
      )
    }

    if (!courtId || typeof courtId !== 'string' || !courtId.trim()) {
      return NextResponse.json(
        { message: 'Court ID is required' },
        { status: 400 }
      )
    }

    // Validate: The court belongs to the club
    const court = await db.court.findUnique({ where: { id: courtId } })
    if (!court || court.clubId !== club.id) {
      return NextResponse.json(
        { message: 'Court not found or does not belong to this club' },
        { status: 400 }
      )
    }

    // Validate: No overlapping slot exists for the same court on the same day.
    // Special case: endTime "00:00" means midnight (end of day) — treat as "24:00" for comparison.
    const toMinutes = (t: string) => {
      if (t === '00:00') return 24 * 60
      const [h, m] = t.split(':').map(Number)
      return h * 60 + m
    }
    const newStart = toMinutes(startTime.trim())
    const newEnd = toMinutes(endTime.trim())

    const sameCourtDaySlots = await db.slot.findMany({
      where: { courtId, day: day.trim() },
      select: { startTime: true, endTime: true },
    })

    const overlappingSlot = sameCourtDaySlots.find((s) => {
      const sStart = toMinutes(s.startTime)
      const sEnd = toMinutes(s.endTime)
      return newStart < sEnd && newEnd > sStart
    })

    if (overlappingSlot) {
      return NextResponse.json(
        { message: 'Ya existe un turno que se superpone con ese horario en esta cancha' },
        { status: 409 }
      )
    }

    const slot = await db.slot.create({
      data: {
        day: day.trim(),
        startTime: startTime.trim(),
        endTime: endTime.trim(),
        courtId,
        clubId: club.id,
        status: 'AVAILABLE',
        price: priceValue,
      },
      include: {
        court: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    return NextResponse.json({ slot }, { status: 201 })
  } catch (error) {
    console.error('Error creating slot:', error)
    return NextResponse.json(
      { message: 'An error occurred while creating the slot' },
      { status: 500 }
    )
  }
}
