import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'

type RouteParams = { params: Promise<{ id: string }> }

// PUT /api/player/memberships/[id] — Player confirms or rejects a club membership request
// Body: { action: 'CONFIRM' | 'REJECT' }
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const playerUser = await getUserFromRequest(request)
    if (!playerUser || playerUser.role !== 'PLAYER') {
      return NextResponse.json(
        { message: 'Unauthorized: Player access required' },
        { status: 403 }
      )
    }

    const player = await db.player.findUnique({ where: { userId: playerUser.id } })
    if (!player) {
      return NextResponse.json(
        { message: 'Player not found' },
        { status: 404 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const { action } = body

    if (action !== 'CONFIRM' && action !== 'REJECT') {
      return NextResponse.json(
        { message: 'action must be CONFIRM or REJECT' },
        { status: 400 }
      )
    }

    const membership = await db.clubMembership.findUnique({ where: { id } })
    if (!membership || membership.playerId !== player.id) {
      return NextResponse.json(
        { message: 'Membership not found' },
        { status: 404 }
      )
    }

    if (membership.status !== 'PENDING') {
      return NextResponse.json(
        { message: 'Only PENDING memberships can be confirmed or rejected' },
        { status: 409 }
      )
    }

    const newStatus = action === 'CONFIRM' ? 'CONFIRMED' : 'REJECTED'

    const updated = await db.clubMembership.update({
      where: { id },
      data: { status: newStatus },
      include: { club: { select: { id: true, name: true, address: true } } },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating membership:', error)
    return NextResponse.json(
      { message: 'An error occurred while updating the membership' },
      { status: 500 }
    )
  }
}
