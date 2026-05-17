import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/auth'

// POST /api/auth/forgot-password
// Body: { dni: string }
// Resets the player's password to their DNI, sets mustChangePassword=true,
// and notifies all clubs where the player has CONFIRMED membership.
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { dni } = body

    if (!dni || typeof dni !== 'string' || !dni.trim()) {
      return NextResponse.json({ message: 'DNI es requerido' }, { status: 400 })
    }
    if (!/^\d+$/.test(dni.trim())) {
      return NextResponse.json({ message: 'El DNI debe ser numérico' }, { status: 400 })
    }

    const dniValue = dni.trim()
    const genericOk = { message: 'Si el DNI está registrado, los clubes serán notificados y podrás ingresar con tu DNI como contraseña.' }

    const user = await db.user.findUnique({ where: { username: dniValue } })
    if (!user || user.role !== 'PLAYER') {
      // Don't reveal whether the DNI exists
      return NextResponse.json(genericOk)
    }

    // Reset password to DNI and force change on next login
    const hashed = await hashPassword(dniValue)
    await db.user.update({
      where: { id: user.id },
      data: { password: hashed, mustChangePassword: true },
    })

    // Notify all clubs with CONFIRMED membership
    const player = await db.player.findUnique({
      where: { userId: user.id },
      include: {
        memberships: {
          where: { status: 'CONFIRMED' },
          include: { club: { select: { userId: true, name: true } } },
        },
      },
    })

    if (player && player.memberships.length > 0) {
      const notifications = player.memberships.map((m) => ({
        userId: m.club.userId,
        message: `El jugador ${player.firstName} ${player.lastName} (DNI: ${dniValue}) solicitó restablecer su contraseña. La contraseña fue reseteada a su DNI y deberá cambiarla al ingresar.`,
        type: 'PASSWORD_RESET',
        relatedId: player.id,
        read: false,
      }))
      await db.notification.createMany({ data: notifications })
    }

    return NextResponse.json(genericOk)
  } catch (error) {
    console.error('Error in forgot-password:', error)
    return NextResponse.json({ message: 'Error al procesar la solicitud' }, { status: 500 })
  }
}
