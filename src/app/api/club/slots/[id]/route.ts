import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'

type RouteParams = { params: Promise<{ id: string }> }

// PUT /api/club/slots/[id] — Update slot (with special CANCELLED handling)
export async function PUT(request: Request, { params }: RouteParams) {
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
    const body = await request.json()
    const { status } = body

    if (!status || typeof status !== 'string') {
      return NextResponse.json(
        { message: 'Status is required' },
        { status: 400 }
      )
    }

    const validStatuses = ['AVAILABLE', 'CONFIRMED', 'CANCELLED']
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      )
    }

    // Find the slot
    const slot = await db.slot.findUnique({
      where: { id },
      include: {
        matchAssignment: {
          include: {
            match: {
              include: {
                couple1: {
                  include: {
                    player1: { include: { user: { select: { id: true } } } },
                    player2: { include: { user: { select: { id: true } } } },
                  },
                },
                couple2: {
                  include: {
                    player1: { include: { user: { select: { id: true } } } },
                    player2: { include: { user: { select: { id: true } } } },
                  },
                },
              },
            },
          },
        },
      },
    })

    if (!slot || slot.clubId !== club.id) {
      return NextResponse.json(
        { message: 'Slot not found or does not belong to this club' },
        { status: 404 }
      )
    }

    // Special handling for CANCELLED status
    if (status === 'CANCELLED' && slot.matchAssignment) {
      const match = slot.matchAssignment.match
      const matchAssignmentId = slot.matchAssignment.id

      // Collect all 4 player user IDs
      const playerUserIds = [
        match.couple1.player1.user.id,
        match.couple1.player2.user.id,
        match.couple2.player1.user.id,
        match.couple2.player2.user.id,
      ]

      // Use transaction to handle everything atomically
      await db.$transaction(async (tx) => {
        // Delete the MatchAssignment
        await tx.matchAssignment.delete({
          where: { id: matchAssignmentId },
        })

        // Set slot status back to AVAILABLE (not CANCELLED, as per spec)
        await tx.slot.update({
          where: { id },
          data: { status: 'AVAILABLE' },
        })

        // Create notifications for each player
        const playerMessage = `El turno del ${slot.day} a las ${slot.startTime} ha sido cancelado por el club. Deberás seleccionar un nuevo turno.`

        await tx.notification.createMany({
          data: playerUserIds.map((userId) => ({
            userId,
            message: playerMessage,
            type: 'SLOT_CANCELLED',
            relatedId: slot.id,
          })),
        })

        // Create notification for the club user
        const couple1Names = `${match.couple1.player1.firstName} ${match.couple1.player1.lastName} / ${match.couple1.player2.firstName} ${match.couple1.player2.lastName}`
        const couple2Names = `${match.couple2.player1.firstName} ${match.couple2.player1.lastName} / ${match.couple2.player2.firstName} ${match.couple2.player2.lastName}`
        const clubMessage = `Turno cancelado para el partido ${couple1Names} vs ${couple2Names} del ${slot.day} a las ${slot.startTime}`

        await tx.notification.create({
          data: {
            userId: clubUser.id,
            message: clubMessage,
            type: 'SLOT_CANCELLED',
            relatedId: slot.id,
          },
        })
      })

      // Return the updated slot
      const updatedSlot = await db.slot.findUnique({
        where: { id },
        include: {
          court: { select: { id: true, name: true } },
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
      })

      return NextResponse.json({ slot: updatedSlot })
    }

    // Normal status update (not CANCELLED with assignment, or CANCELLED without assignment)
    const updatedSlot = await db.slot.update({
      where: { id },
      data: { status },
      include: {
        court: { select: { id: true, name: true } },
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
    })

    return NextResponse.json({ slot: updatedSlot })
  } catch (error) {
    console.error('Error updating slot:', error)
    return NextResponse.json(
      { message: 'An error occurred while updating the slot' },
      { status: 500 }
    )
  }
}

// DELETE /api/club/slots/[id] — Delete a slot (only if AVAILABLE)
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

    // Find the slot
    const slot = await db.slot.findUnique({ where: { id } })

    if (!slot || slot.clubId !== club.id) {
      return NextResponse.json(
        { message: 'Slot not found or does not belong to this club' },
        { status: 404 }
      )
    }

    // Only allow deletion if status is AVAILABLE
    if (slot.status !== 'AVAILABLE') {
      return NextResponse.json(
        { message: 'Only slots with AVAILABLE status can be deleted' },
        { status: 400 }
      )
    }

    await db.slot.delete({ where: { id } })

    return NextResponse.json({ success: true, message: 'Slot deleted successfully' })
  } catch (error) {
    console.error('Error deleting slot:', error)
    return NextResponse.json(
      { message: 'An error occurred while deleting the slot' },
      { status: 500 }
    )
  }
}
