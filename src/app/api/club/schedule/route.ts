import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'

const HH_MM_RE = /^([01]\d|2[0-3]):([0-5]\d)$/

// GET /api/club/schedule — Returns all bands grouped by dayOfWeek
export async function GET(request: Request) {
  try {
    const clubUser = await getUserFromRequest(request)
    if (!clubUser || clubUser.role !== 'CLUB') {
      return NextResponse.json({ message: 'Unauthorized: Club access required' }, { status: 403 })
    }

    const club = await db.club.findUnique({ where: { userId: clubUser.id } })
    if (!club) {
      return NextResponse.json({ message: 'Club not found' }, { status: 404 })
    }

    const bands = await db.scheduleBand.findMany({
      where: { clubId: club.id },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    })

    return NextResponse.json(bands)
  } catch (error) {
    console.error('Error fetching schedule bands:', error)
    return NextResponse.json({ message: 'An error occurred while fetching schedule bands' }, { status: 500 })
  }
}

// POST /api/club/schedule — Create a schedule band
export async function POST(request: Request) {
  try {
    const clubUser = await getUserFromRequest(request)
    if (!clubUser || clubUser.role !== 'CLUB') {
      return NextResponse.json({ message: 'Unauthorized: Club access required' }, { status: 403 })
    }

    const club = await db.club.findUnique({ where: { userId: clubUser.id } })
    if (!club) {
      return NextResponse.json({ message: 'Club not found' }, { status: 404 })
    }

    const body = await request.json()
    const { dayOfWeek, startTime, endTime, slotDuration } = body

    if (typeof dayOfWeek !== 'number' || dayOfWeek < 0 || dayOfWeek > 6) {
      return NextResponse.json({ message: 'dayOfWeek must be an integer 0-6' }, { status: 400 })
    }
    if (!startTime || !HH_MM_RE.test(startTime)) {
      return NextResponse.json({ message: 'startTime must be in HH:mm format' }, { status: 400 })
    }
    if (!endTime || !HH_MM_RE.test(endTime)) {
      return NextResponse.json({ message: 'endTime must be in HH:mm format' }, { status: 400 })
    }
    if (typeof slotDuration !== 'number' || slotDuration <= 0) {
      return NextResponse.json({ message: 'slotDuration must be a positive number' }, { status: 400 })
    }

    const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
    if (toMin(startTime) > toMin(endTime)) {
      return NextResponse.json({ message: 'startTime must be <= endTime' }, { status: 400 })
    }

    const band = await db.scheduleBand.create({
      data: { clubId: club.id, dayOfWeek, startTime, endTime, slotDuration },
    })

    return NextResponse.json(band, { status: 201 })
  } catch (error: unknown) {
    // Unique constraint violation
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code: string }).code === 'P2002'
    ) {
      return NextResponse.json(
        { message: 'Ya existe una franja para ese día con ese mismo horario de inicio' },
        { status: 409 }
      )
    }
    console.error('Error creating schedule band:', error)
    return NextResponse.json({ message: 'An error occurred while creating the schedule band' }, { status: 500 })
  }
}
