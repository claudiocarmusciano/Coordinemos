import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'

// GET /api/club/notifications?count=true  — just unread count
// GET /api/club/notifications              — full list (last 50)
export async function GET(request: Request) {
  try {
    const clubUser = await getUserFromRequest(request)
    if (!clubUser || clubUser.role !== 'CLUB') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    if (searchParams.get('count') === 'true') {
      const count = await db.notification.count({
        where: { userId: clubUser.id, read: false },
      })
      return NextResponse.json({ count })
    }

    const notifications = await db.notification.findMany({
      where: { userId: clubUser.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    return NextResponse.json(notifications)
  } catch (error) {
    console.error('Error fetching club notifications:', error)
    return NextResponse.json({ message: 'Error al obtener notificaciones' }, { status: 500 })
  }
}

// PUT /api/club/notifications
// Body: { markAllRead: true } or { notificationIds: string[] }
export async function PUT(request: Request) {
  try {
    const clubUser = await getUserFromRequest(request)
    if (!clubUser || clubUser.role !== 'CLUB') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 403 })
    }

    const body = await request.json()

    if (body.markAllRead) {
      await db.notification.updateMany({
        where: { userId: clubUser.id, read: false },
        data: { read: true },
      })
    } else if (Array.isArray(body.notificationIds) && body.notificationIds.length > 0) {
      await db.notification.updateMany({
        where: { userId: clubUser.id, id: { in: body.notificationIds } },
        data: { read: true },
      })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error updating club notifications:', error)
    return NextResponse.json({ message: 'Error al actualizar notificaciones' }, { status: 500 })
  }
}
