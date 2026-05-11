import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'

// GET /api/club/players/lookup?dni=... — Check if a DNI exists before adding
export async function GET(request: Request) {
  try {
    const clubUser = await getUserFromRequest(request)
    if (!clubUser || clubUser.role !== 'CLUB') {
      return NextResponse.json(
        { message: 'Unauthorized: Club access required' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const dni = searchParams.get('dni')

    if (!dni || !/^\d+$/.test(dni.trim())) {
      return NextResponse.json(
        { message: 'DNI inválido' },
        { status: 400 }
      )
    }

    const user = await db.user.findUnique({
      where: { username: dni.trim() },
      include: { player: { select: { firstName: true, lastName: true, phone: true } } },
    })

    if (!user || !user.player) {
      return NextResponse.json({ found: false })
    }

    return NextResponse.json({
      found: true,
      player: {
        firstName: user.player.firstName,
        lastName: user.player.lastName,
        phone: user.player.phone,
      },
    })
  } catch (error) {
    console.error('Error looking up player by DNI:', error)
    return NextResponse.json(
      { message: 'An error occurred during lookup' },
      { status: 500 }
    )
  }
}
