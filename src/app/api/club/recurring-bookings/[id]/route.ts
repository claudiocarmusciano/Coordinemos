import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'

type RouteParams = { params: Promise<{ id: string }> }

// DELETE /api/club/recurring-bookings/[id] — Cancela una reserva fija.
// Libera solo las ocurrencias futuras (día >= hoy); las pasadas quedan como historial.
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const clubUser = await getUserFromRequest(request)
    if (!clubUser || clubUser.role !== 'CLUB') {
      return NextResponse.json({ message: 'Unauthorized: Club access required' }, { status: 403 })
    }
    const club = await db.club.findUnique({ where: { userId: clubUser.id } })
    if (!club) return NextResponse.json({ message: 'Club not found' }, { status: 404 })

    const { id } = await params
    const recurring = await db.recurringBooking.findUnique({
      where: { id },
      include: { player: { include: { user: { select: { id: true } } } } },
    })
    if (!recurring || recurring.clubId !== club.id) {
      return NextResponse.json({ message: 'Reserva fija no encontrada' }, { status: 404 })
    }

    const today = new Date()
    today.setHours(12, 0, 0, 0)
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

    // Future occurrences (slot.day >= today) → free the slot, delete the booking
    const futureOccurrences = await db.booking.findMany({
      where: { recurringBookingId: id, slot: { day: { gte: todayStr } } },
      include: { slot: { select: { id: true } } },
    })

    await db.$transaction(async (tx) => {
      for (const occ of futureOccurrences) {
        await tx.booking.delete({ where: { id: occ.id } })
        await tx.slot.update({ where: { id: occ.slotId }, data: { status: 'AVAILABLE' } })
      }
      // Deactivate the template (kept for history of past occurrences)
      await tx.recurringBooking.update({ where: { id }, data: { active: false } })
    })

    if (recurring.player?.user) {
      await db.notification.create({
        data: {
          userId: recurring.player.user.id,
          message: `Tu reserva fija fue cancelada por el club. Las fechas futuras quedaron libres.`,
          type: 'SLOT_CANCELLED',
          relatedId: recurring.id,
        },
      })
    }

    return NextResponse.json({ success: true, freed: futureOccurrences.length })
  } catch (error) {
    console.error('Error cancelling recurring booking:', error)
    return NextResponse.json({ message: 'An error occurred while cancelling the recurring booking' }, { status: 500 })
  }
}
