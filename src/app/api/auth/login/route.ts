import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyPassword, createToken } from '@/lib/auth'
import type { AuthUser } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { username, password } = body

    if (!username || !password) {
      return NextResponse.json(
        { message: 'Username and password are required' },
        { status: 400 }
      )
    }

    // Accept either an email (players) or a username/DNI (players, clubs, admin)
    const identifier = String(username).trim()
    const user = identifier.includes('@')
      ? await db.user.findUnique({ where: { email: identifier.toLowerCase() } })
      : await db.user.findUnique({ where: { username: identifier } })

    if (!user) {
      return NextResponse.json(
        { message: 'Invalid username or password' },
        { status: 401 }
      )
    }

    const isValid = await verifyPassword(password, user.password)

    if (!isValid) {
      return NextResponse.json(
        { message: 'Invalid username or password' },
        { status: 401 }
      )
    }

    const authUser: AuthUser = {
      id: user.id,
      username: user.username,
      role: user.role as AuthUser['role'],
      mustChangePassword: user.mustChangePassword,
    }

    const token = await createToken(authUser)

    return NextResponse.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
        emailVerified: user.emailVerified,
        email: user.email,
      },
    })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { message: 'An error occurred during login' },
      { status: 500 }
    )
  }
}
