import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'

const HH_MM_RE = /^([01]\d|2[0-3]):([0-5]\d)$/

// PUT /api/club/schedule/[id] — Edit a ScheduleBand (must belong to the club)
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const clubUser = await getUserFromRequest(request)
    if (!clubUser || clubUser.role !== 'CLUB') {
      return NextResponse.json({ message: 'Unauthorized: Club access required' }, { status: 403 })
    }

    const club = await db.club.findUnique({ where: { userId: clubUser.id } })
    if (!club) {
      return NextResponse.json({ message: 'Club not found' }, { status: 404 })
    }

    const { id } = await params
    const band = await db.scheduleBand.findUnique({ where: { id } })
    if (!band || band.clubId !== club.id) {
      return NextResponse.json({ message: 'Schedule band not found' }, { status: 404 })
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

    const updated = await db.scheduleBand.update({
      where: { id },
      data: { dayOfWeek, startTime, endTime, slotDuration },
    })
    return NextResponse.json(updated)
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'P2002') {
      return NextResponse.json(
        { message: 'Ya existe una franja para ese día con ese mismo horario de inicio' },
        { status: 409 }
      )
    }
    console.error('Error updating schedule band:', error)
    return NextResponse.json({ message: 'An error occurred while updating the schedule band' }, { status: 500 })
  }
}

// DELETE /api/club/schedule/[id] — Remove a ScheduleBand by id (must belong to the club).
// Without ?force=true, refuses (409) when the band's time window on that weekday has
// dependent reservas fijas (recurring bookings) or reserved/confirmed slots, so the
// club is warned before removing the schedule those turnos rely on.
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const clubUser = await getUserFromRequest(request)
    if (!clubUser || clubUser.role !== 'CLUB') {
      return NextResponse.json({ message: 'Unauthorized: Club access required' }, { status: 403 })
    }

    const club = await db.club.findUnique({ where: { userId: clubUser.id } })
    if (!club) {
      return NextResponse.json({ message: 'Club not found' }, { status: 404 })
    }

    const { id } = await params

    const band = await db.scheduleBand.findUnique({ where: { id } })
    if (!band || band.clubId !== club.id) {
      return NextResponse.json({ message: 'Schedule band not found' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const force = searchParams.get('force') === 'true'

    if (!force) {
      // HH:mm is zero-padded, so lexicographic comparison matches chronological order.
      const inWindow = (t: string) => t >= band.startTime && t <= band.endTime

      // Reservas fijas activas en ese día de semana, cuyo inicio cae dentro de la franja
      const recurrings = await db.recurringBooking.findMany({
        where: { clubId: club.id, active: true, dayOfWeek: band.dayOfWeek },
        select: { startTime: true },
      })
      const recurringCount = recurrings.filter((r) => inWindow(r.startTime)).length

      // Turnos futuros reservados/confirmados en ese día de semana, dentro de la franja
      const today = new Date().toISOString().split('T')[0]
      const occupiedSlots = await db.slot.findMany({
        where: { clubId: club.id, status: { in: ['RESERVED', 'CONFIRMED'] }, day: { gte: today } },
        select: { day: true, startTime: true },
      })
      const occupiedCount = occupiedSlots.filter((s) => {
        if (!inWindow(s.startTime)) return false
        return new Date(s.day + 'T12:00:00').getDay() === band.dayOfWeek
      }).length

      if (recurringCount > 0 || occupiedCount > 0) {
        const parts: string[] = []
        if (recurringCount > 0) {
          parts.push(`${recurringCount} reserva${recurringCount !== 1 ? 's' : ''} fija${recurringCount !== 1 ? 's' : ''}`)
        }
        if (occupiedCount > 0) {
          parts.push(`${occupiedCount} turno${occupiedCount !== 1 ? 's' : ''} reservado${occupiedCount !== 1 ? 's' : ''}/confirmado${occupiedCount !== 1 ? 's' : ''}`)
        }
        return NextResponse.json(
          {
            message: `Esta franja tiene ${parts.join(' y ')} en ese horario. Si la eliminás, esos turnos seguirán existiendo pero no se generarán nuevos turnos disponibles en ese horario.`,
            requiresConfirm: true,
            recurringCount,
            occupiedCount,
          },
          { status: 409 }
        )
      }
    }

    await db.scheduleBand.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting schedule band:', error)
    return NextResponse.json({ message: 'An error occurred while deleting the schedule band' }, { status: 500 })
  }
}
