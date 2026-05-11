import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'

// GET /api/player/memberships — Player sees all their club memberships
export async function GET(request: Request) {
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

    const memberships = await db.clubMembership.findMany({
      where: { playerId: player.id },
      include: {
        club: { select: { id: true, name: true, address: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(memberships)
  } catch (error) {
    console.error('Error fetching memberships:', error)
    return NextResponse.json(
      { message: 'An error occurred while fetching memberships' },
      { status: 500 }
    )
  }
}
