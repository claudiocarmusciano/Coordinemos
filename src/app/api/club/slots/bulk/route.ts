import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'
import { generateTimesFromBands } from '@/lib/scheduleUtils'

// POST /api/club/slots/bulk — Bulk-create slots from schedule bands for a date
export async function POST(request: Request) {
  try {
    const clubUser = await getUserFromRequest(request)
    if (!clubUser || clubUser.role !== 'CLUB') {
      return NextResponse.json({ message: 'Unauthorized: Club access required' }, { status: 403 })
    }

    const club = await db.club.findUnique({
      where: { userId: clubUser.id },
      include: { courts: true },
    })
    if (!club) {
      return NextResponse.json({ message: 'Club not found' }, { status: 404 })
    }

    const body = await request.json()
    const { date, price } = body
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ message: 'date must be YYYY-MM-DD' }, { status: 400 })
    }
    const priceValue =
      price === undefined || price === null || price === '' ? null : Number(price)
    if (priceValue !== null && (!Number.isFinite(priceValue) || priceValue < 0)) {
      return NextResponse.json({ message: 'Precio inválido' }, { status: 400 })
    }

    const dayOfWeek = new Date(date + 'T12:00:00').getDay()

    const bands = await db.scheduleBand.findMany({
      where: { clubId: club.id, dayOfWeek },
      orderBy: { startTime: 'asc' },
    })

    if (bands.length === 0) {
      return NextResponse.json({ created: 0, skipped: 0 })
    }

    const times = generateTimesFromBands(bands)

    let created = 0
    let skipped = 0

    for (const court of club.courts) {
      // Fetch existing slots for this court+day in one query
      const existingSlots = await db.slot.findMany({
        where: { courtId: court.id, day: date },
        select: { startTime: true },
      })
      const existingStartTimes = new Set(existingSlots.map((s) => s.startTime))

      for (const t of times) {
        if (existingStartTimes.has(t.startTime)) {
          skipped++
        } else {
          await db.slot.create({
            data: {
              day: date,
              startTime: t.startTime,
              endTime: t.endTime,
              courtId: court.id,
              clubId: club.id,
              status: 'AVAILABLE',
              price: priceValue,
            },
          })
          created++
        }
      }
    }

    return NextResponse.json({ created, skipped })
  } catch (error) {
    console.error('Error bulk-creating slots:', error)
    return NextResponse.json({ message: 'An error occurred while creating slots' }, { status: 500 })
  }
}
