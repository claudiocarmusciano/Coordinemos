import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

// PATCH /api/player/profile — El jugador completa/edita su propio perfil (onboarding)
// Body: { firstName?, lastName?, phone?, birthDate? }
export async function PATCH(request: Request) {
  try {
    const authUser = await getUserFromRequest(request)
    if (!authUser || authUser.role !== 'PLAYER') {
      return NextResponse.json({ message: 'Unauthorized: Player access required' }, { status: 403 })
    }

    const player = await db.player.findUnique({ where: { userId: authUser.id } })
    if (!player) {
      return NextResponse.json({ message: 'Player not found' }, { status: 404 })
    }

    const body = await request.json()
    const { firstName, lastName, phone, birthDate } = body
    const data: Record<string, unknown> = {}

    if (typeof firstName === 'string' && firstName.trim()) data.firstName = firstName.trim()
    if (typeof lastName === 'string' && lastName.trim()) data.lastName = lastName.trim()
    if (typeof phone === 'string') data.phone = phone.trim()
    if (birthDate !== undefined) {
      if (birthDate === null || birthDate === '') {
        data.birthDate = null
      } else if (typeof birthDate === 'string' && DATE_RE.test(birthDate)) {
        data.birthDate = birthDate
      } else {
        return NextResponse.json({ message: 'Fecha de nacimiento inválida' }, { status: 400 })
      }
    }

    const updated = await db.player.update({ where: { id: player.id }, data })
    return NextResponse.json({
      player: {
        id: updated.id,
        firstName: updated.firstName,
        lastName: updated.lastName,
        phone: updated.phone,
        birthDate: updated.birthDate,
      },
    })
  } catch (error) {
    console.error('Error updating player profile:', error)
    return NextResponse.json({ message: 'An error occurred while updating the profile' }, { status: 500 })
  }
}
