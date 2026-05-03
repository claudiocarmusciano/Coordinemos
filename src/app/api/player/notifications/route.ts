import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'

// GET /api/player/notifications — Return all unread notifications for the player's user,
// then mark them as read after returning.
export async function GET(request: Request) {
  try {
    const authUser = await getUserFromRequest(request)
    if (!authUser || authUser.role !== 'PLAYER') {
      return NextResponse.json(
        { message: 'Unauthorized: Player access required' },
        { status: 403 }
      )
    }

    const player = await db.player.findUnique({ where: { userId: authUser.id } })
    if (!player) {
      return NextResponse.json(
        { message: 'Player not found' },
        { status: 404 }
      )
    }

    // Fetch unread notifications for this user
    const notifications = await db.notification.findMany({
      where: {
        userId: authUser.id,
        read: false,
      },
      select: {
        id: true,
        message: true,
        type: true,
        createdAt: true,
        read: true,
        relatedId: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    // Mark them as read after retrieving
    if (notifications.length > 0) {
      await db.notification.updateMany({
        where: {
          id: { in: notifications.map((n) => n.id) },
        },
        data: { read: true },
      })
    }

    return NextResponse.json(notifications)
  } catch (error) {
    console.error('Error fetching player notifications:', error)
    return NextResponse.json(
      { message: 'An error occurred while fetching notifications' },
      { status: 500 }
    )
  }
}
