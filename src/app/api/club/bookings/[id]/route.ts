import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'

type RouteParams = { params: Promise<{ id: string }> }

// DELETE /api/club/bookings/[id] — Cancel a reserva eventual (solo el club puede cancelar)
export async function DELETE(request: Request, { params }: RouteParams) {
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

    const { id } = await params

    const booking = await db.booking.findUnique({
      where: { id },
      include: {
        slot: true,
        player: { include: { user: { select: { id: true } } } },
      },
    })

    if (!booking || booking.slot.clubId !== club.id) {
      return NextResponse.json(
        { message: 'Reserva no encontrada o no pertenece a este club' },
        { status: 404 }
      )
    }

    await db.$transaction(async (tx) => {
      await tx.booking.delete({ where: { id } })
      await tx.slot.update({
        where: { id: booking.slotId },
        data: { status: 'AVAILABLE' },
      })

      if (booking.player) {
        await tx.notification.create({
          data: {
            userId: booking.player.user.id,
            message: `Tu reserva del ${booking.slot.day} a las ${booking.slot.startTime} fue cancelada por el club.`,
            type: 'SLOT_CANCELLED',
            relatedId: booking.slotId,
          },
        })
      }
    })

    return NextResponse.json({ success: true, message: 'Reserva cancelada' })
  } catch (error) {
    console.error('Error cancelling booking:', error)
    return NextResponse.json(
      { message: 'An error occurred while cancelling the booking' },
      { status: 500 }
    )
  }
}
