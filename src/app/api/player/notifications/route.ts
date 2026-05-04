import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'

// GET /api/player/notifications — Return notifications for the player's user.
// Query params:
//   - unread=true: Only return unread notifications (default: all)
//   - count=true: Return only the count of unread notifications
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

    const { searchParams } = new URL(request.url)
    const countOnly = searchParams.get('count') === 'true'
    const unreadOnly = searchParams.get('unread') === 'true'

    // Count mode: return just the number of unread notifications
    if (countOnly) {
      const count = await db.notification.count({
        where: {
          userId: authUser.id,
          read: false,
        },
      })
      return NextResponse.json({ count })
    }

    // List mode: return notifications
    const where: Record<string, unknown> = { userId: authUser.id }
    if (unreadOnly) {
      where.read = false
    }

    const notifications = await db.notification.findMany({
      where,
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

    return NextResponse.json(notifications)
  } catch (error) {
    console.error('Error fetching player notifications:', error)
    return NextResponse.json(
      { message: 'An error occurred while fetching notifications' },
      { status: 500 }
    )
  }
}

// PUT /api/player/notifications — Mark notifications as read
// Body: { notificationIds: string[] } or { markAllRead: true }
export async function PUT(request: Request) {
  try {
    const authUser = await getUserFromRequest(request)
    if (!authUser || authUser.role !== 'PLAYER') {
      return NextResponse.json(
        { message: 'Unauthorized: Player access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { notificationIds, markAllRead } = body as {
      notificationIds?: string[]
      markAllRead?: boolean
    }

    if (markAllRead) {
      await db.notification.updateMany({
        where: {
          userId: authUser.id,
          read: false,
        },
        data: { read: true },
      })
      return NextResponse.json({ success: true, message: 'All notifications marked as read' })
    }

    if (notificationIds && Array.isArray(notificationIds) && notificationIds.length > 0) {
      // Only mark notifications that belong to this user
      await db.notification.updateMany({
        where: {
          id: { in: notificationIds },
          userId: authUser.id,
        },
        data: { read: true },
      })
      return NextResponse.json({ success: true, message: 'Notifications marked as read' })
    }

    return NextResponse.json(
      { message: 'Provide notificationIds array or markAllRead: true' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Error marking notifications as read:', error)
    return NextResponse.json(
      { message: 'An error occurred while marking notifications as read' },
      { status: 500 }
    )
  }
}
