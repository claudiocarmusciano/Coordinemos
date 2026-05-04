import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request)

    if (!user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const result: Record<string, unknown> = {
      id: user.id,
      username: user.username,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
    }

    if (user.role === 'CLUB') {
      const club = await db.club.findUnique({ where: { userId: user.id } })
      if (club) {
        result.clubId = club.id
      }
    }

    if (user.role === 'PLAYER') {
      const player = await db.player.findUnique({
        where: { userId: user.id },
      })
      if (player) {
        result.playerId = player.id
        result.clubId = player.clubId
      }
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Me error:', error)
    return NextResponse.json(
      { message: 'An error occurred while fetching user info' },
      { status: 500 }
    )
  }
}
