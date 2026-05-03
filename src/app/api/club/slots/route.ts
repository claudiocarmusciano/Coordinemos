import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'

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
    const status = searchParams.get('status')

    const where: Record<string, unknown> = { clubId: club.id }
    if (status) {
      where.status = status
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
          },
        },
      },
      orderBy: [{ day: 'asc' }, { startTime: 'asc' }],
    })

    const result = slots.map((slot) => ({
      id: slot.id,
      day: slot.day,
      startTime: slot.startTime,
      endTime: slot.endTime,
      courtId: slot.courtId,
      clubId: slot.clubId,
      status: slot.status,
      court: slot.court,
      matchAssignment: slot.matchAssignment,
    }))

    return NextResponse.json({ slots: result })
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
    const { day, startTime, endTime, courtId } = body

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

    // Validate: No overlapping slot exists for the same court on the same day
    // A slot overlaps if: startTime < existing.endTime AND endTime > existing.startTime
    const overlappingSlot = await db.slot.findFirst({
      where: {
        courtId,
        day: day.trim(),
        startTime: { lt: endTime.trim() },
        endTime: { gt: startTime.trim() },
      },
    })

    if (overlappingSlot) {
      return NextResponse.json(
        { message: 'A slot already exists that overlaps with the specified time range on this court and day' },
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
