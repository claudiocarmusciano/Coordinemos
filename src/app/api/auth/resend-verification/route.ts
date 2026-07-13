import { NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { db } from '@/lib/db'
import { sendEmail, buildVerificationEmail } from '@/lib/email'

const APP_URL = process.env.APP_URL || 'https://coordinemos.com.ar'
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000

// POST /api/auth/resend-verification — Reenvía el correo de verificación
// Body: { email }
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email } = body
    const generic = NextResponse.json({
      message: 'Si el email corresponde a una cuenta sin verificar, te reenviamos el correo.',
    })

    if (!email || typeof email !== 'string') return generic

    const user = await db.user.findFirst({ where: { email: email.trim().toLowerCase() } })
    if (!user || user.emailVerified) return generic

    const token = randomBytes(32).toString('hex')
    await db.user.update({
      where: { id: user.id },
      data: {
        verificationToken: token,
        verificationTokenExpiry: new Date(Date.now() + TOKEN_TTL_MS),
      },
    })

    const player = await db.player.findUnique({ where: { userId: user.id } })
    const link = `${APP_URL}/?verify=${token}`
    const tpl = buildVerificationEmail(player?.firstName || 'jugador', link)
    sendEmail({ to: user.email!, ...tpl }).catch((err) =>
      console.error('[email] Failed to resend verification email:', err)
    )

    return generic
  } catch (error) {
    console.error('Error resending verification:', error)
    return NextResponse.json({ message: 'An error occurred' }, { status: 500 })
  }
}
