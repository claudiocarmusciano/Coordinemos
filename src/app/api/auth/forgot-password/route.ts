import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/auth'
import { generateTempPassword, sendEmail, buildPasswordResetEmail } from '@/lib/email'

// POST /api/auth/forgot-password
// Body: { dni: string }
// Generates a temp password and sends it to the player's registered email.
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

    const user = await db.user.findUnique({ where: { username: dniValue } })

    // Always return the same message to avoid revealing whether the DNI exists
    const genericOk = {
      message: 'Si el DNI está registrado y tiene un email asociado, recibirás una contraseña temporal en tu correo.',
    }

    if (!user || user.role !== 'PLAYER') {
      return NextResponse.json(genericOk)
    }

    if (!user.email) {
      // Player exists but has no email — tell them to contact their club
      return NextResponse.json({
        message: 'Tu cuenta no tiene un correo registrado. Contactá a tu club para recuperar el acceso.',
        noEmail: true,
      })
    }

    // Generate temp password, update DB, send email
    const tempPassword = generateTempPassword()
    const hashed = await hashPassword(tempPassword)

    await db.user.update({
      where: { id: user.id },
      data: { password: hashed, mustChangePassword: true },
    })

    // Get player name for the email
    const player = await db.player.findUnique({ where: { userId: user.id } })
    const firstName = player?.firstName ?? 'Jugador'

    const emailTemplate = buildPasswordResetEmail(firstName, tempPassword)
    await sendEmail({ to: user.email, ...emailTemplate })

    return NextResponse.json(genericOk)
  } catch (error) {
    console.error('Error in forgot-password:', error)
    return NextResponse.json({ message: 'Error al procesar la solicitud' }, { status: 500 })
  }
}
