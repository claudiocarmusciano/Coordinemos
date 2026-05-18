import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'
import { generateTimesFromBands } from '@/lib/scheduleUtils'

// GET /api/club/schedule/preview?date=YYYY-MM-DD
export async function GET(request: Request) {
  try {
    const clubUser = await getUserFromRequest(request)
    if (!clubUser || clubUser.role !== 'CLUB') {
      return NextResponse.json({ message: 'Unauthorized: Club access required' }, { status: 403 })
    }

    const club = await db.club.findUnique({
      where: { userId: clubUser.id },
      include: { courts: { orderBy: { name: 'asc' } } },
    })
    if (!club) {
      return NextResponse.json({ message: 'Club not found' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ message: 'date param must be YYYY-MM-DD' }, { status: 400 })
    }

    const dayOfWeek = new Date(date + 'T12:00:00').getDay()

    const bands = await db.scheduleBand.findMany({
      where: { clubId: club.id, dayOfWeek },
      orderBy: { startTime: 'asc' },
    })

    if (bands.length === 0) {
      return NextResponse.json({ date, dayOfWeek, bands: [], courts: [] })
    }

    const times = generateTimesFromBands(bands)

    // For each court, for each generated time, check if a slot already exists
    const courts = await Promise.all(
      club.courts.map(async (court) => {
        const existingSlots = await db.slot.findMany({
          where: {
            courtId: court.id,
            day: date,
          },
          select: { startTime: true, status: true },
        })

        const slots = times.map((t) => {
          const existing = existingSlots.find((s) => s.startTime === t.startTime)
          return {
            startTime: t.startTime,
            endTime: t.endTime,
            exists: !!existing,
            existingStatus: existing?.status ?? null,
          }
        })

        return { id: court.id, name: court.name, slots }
      })
    )

    return NextResponse.json({ date, dayOfWeek, bands, courts })
  } catch (error) {
    console.error('Error fetching schedule preview:', error)
    return NextResponse.json({ message: 'An error occurred while fetching the preview' }, { status: 500 })
  }
}
