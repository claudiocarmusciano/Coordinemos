import { NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/auth'
import { sendEmail, buildVerificationEmail, buildClaimEmail } from '@/lib/email'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const APP_URL = process.env.APP_URL || 'https://coordinemos.com.ar'
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000 // 24h

function newToken() {
  return randomBytes(32).toString('hex')
}

// POST /api/auth/register — Auto-registro público de jugadores
// Body: { email, password, dni, firstName, lastName, phone? }
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password, dni, firstName, lastName, phone } = body

    // ── Validaciones ──
    if (!email || typeof email !== 'string' || !EMAIL_RE.test(email.trim())) {
      return NextResponse.json({ message: 'El email no es válido' }, { status: 400 })
    }
    if (!password || typeof password !== 'string' || password.length < 8) {
      return NextResponse.json({ message: 'La contraseña debe tener al menos 8 caracteres' }, { status: 400 })
    }
    if (!dni || typeof dni !== 'string' || !/^\d+$/.test(dni.trim())) {
      return NextResponse.json({ message: 'El DNI debe ser numérico' }, { status: 400 })
    }
    if (!firstName || typeof firstName !== 'string' || !firstName.trim()) {
      return NextResponse.json({ message: 'El nombre es requerido' }, { status: 400 })
    }
    if (!lastName || typeof lastName !== 'string' || !lastName.trim()) {
      return NextResponse.json({ message: 'El apellido es requerido' }, { status: 400 })
    }

    const emailValue = email.trim().toLowerCase()
    const dniValue = dni.trim()

    const existing = await db.user.findUnique({ where: { username: dniValue } })

    // ── Modo reclamo: el DNI ya tiene cuenta (creada por un club) ──
    if (existing) {
      // Only players can be claimed this way
      if (existing.role !== 'PLAYER' || !existing.email) {
        // Generic response to avoid leaking account existence / non-claimable accounts
        return NextResponse.json({
          message: 'Si ese DNI tiene una cuenta, te enviamos un correo al email registrado para activarla. Si el problema persiste, contactá al club.',
        })
      }

      const token = newToken()
      await db.user.update({
        where: { id: existing.id },
        data: {
          verificationToken: token,
          verificationTokenExpiry: new Date(Date.now() + TOKEN_TTL_MS),
        },
      })

      const player = await db.player.findUnique({ where: { userId: existing.id } })
      const link = `${APP_URL}/?claim=${token}`
      const tpl = buildClaimEmail(player?.firstName || 'jugador', link)
      // Send to the email ON FILE, never the one typed by the claimer (security)
      sendEmail({ to: existing.email, ...tpl }).catch((err) =>
        console.error('[email] Failed to send claim email:', err)
      )

      return NextResponse.json({
        message: 'Si ese DNI tiene una cuenta, te enviamos un correo al email registrado para activarla.',
      })
    }

    // ── Registro nuevo ──
    // Email must not be taken by another account
    const emailTaken = await db.user.findFirst({ where: { email: emailValue } })
    if (emailTaken) {
      return NextResponse.json({ message: 'Ese email ya está registrado' }, { status: 409 })
    }

    const hashed = await hashPassword(password)
    const token = newToken()

    await db.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          username: dniValue,
          password: hashed,
          role: 'PLAYER',
          mustChangePassword: false,
          email: emailValue,
          emailVerified: false,
          verificationToken: token,
          verificationTokenExpiry: new Date(Date.now() + TOKEN_TTL_MS),
        },
      })
      await tx.player.create({
        data: {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: typeof phone === 'string' ? phone.trim() : '',
          userId: user.id,
        },
      })
    })

    const link = `${APP_URL}/?verify=${token}`
    const tpl = buildVerificationEmail(firstName.trim(), link)
    sendEmail({ to: emailValue, ...tpl }).catch((err) =>
      console.error('[email] Failed to send verification email:', err)
    )

    return NextResponse.json(
      { message: 'Revisá tu correo para verificar tu cuenta.' },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error in register:', error)
    return NextResponse.json({ message: 'An error occurred during registration' }, { status: 500 })
  }
}
