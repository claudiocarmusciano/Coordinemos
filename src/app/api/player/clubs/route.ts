import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'

// GET /api/player/clubs — Lista todos los clubes (para que el jugador elija dónde reservar).
// Una reserva eventual puede hacerse en cualquier club, sin ser miembro.
export async function GET(request: Request) {
  try {
    const authUser = await getUserFromRequest(request)
    if (!authUser || authUser.role !== 'PLAYER') {
      return NextResponse.json({ message: 'Unauthorized: Player access required' }, { status: 403 })
    }

    const clubs = await db.club.findMany({
      select: { id: true, name: true, address: true },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(clubs)
  } catch (error) {
    console.error('Error fetching clubs for player:', error)
    return NextResponse.json(
      { message: 'An error occurred while fetching clubs' },
      { status: 500 }
    )
  }
}
