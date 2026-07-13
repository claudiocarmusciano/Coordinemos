import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword, createToken } from '@/lib/auth'
import type { UserRole } from '@/lib/auth'

// POST /api/auth/verify-email — Confirma el email (y en modo reclamo, define la contraseña)
// Body: { token, password? }
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { token, password } = body

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ message: 'Token requerido' }, { status: 400 })
    }

    const user = await db.user.findUnique({ where: { verificationToken: token } })
    if (!user || !user.verificationTokenExpiry || user.verificationTokenExpiry < new Date()) {
      return NextResponse.json({ message: 'El enlace es inválido o venció' }, { status: 400 })
    }

    const data: Record<string, unknown> = {
      emailVerified: true,
      verificationToken: null,
      verificationTokenExpiry: null,
    }

    // Modo reclamo: define la contraseña propia
    if (typeof password === 'string' && password.length > 0) {
      if (password.length < 8) {
        return NextResponse.json({ message: 'La contraseña debe tener al menos 8 caracteres' }, { status: 400 })
      }
      data.password = await hashPassword(password)
      data.mustChangePassword = false
    }

    const updated = await db.user.update({ where: { id: user.id }, data })

    const authToken = await createToken({
      id: updated.id,
      username: updated.username,
      role: updated.role as UserRole,
      mustChangePassword: updated.mustChangePassword,
    })

    return NextResponse.json({
      token: authToken,
      user: {
        id: updated.id,
        username: updated.username,
        role: updated.role,
        mustChangePassword: updated.mustChangePassword,
        emailVerified: updated.emailVerified,
        email: updated.email,
      },
    })
  } catch (error) {
    console.error('Error verifying email:', error)
    return NextResponse.json({ message: 'An error occurred during verification' }, { status: 500 })
  }
}
