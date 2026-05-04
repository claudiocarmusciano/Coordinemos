import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest, verifyPassword, hashPassword, createToken } from '@/lib/auth'
import type { AuthUser } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request)

    if (!user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { currentPassword, newPassword } = body

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { message: 'Current password and new password are required' },
        { status: 400 }
      )
    }

    // Fetch the full user record to get the stored password hash
    const dbUser = await db.user.findUnique({ where: { id: user.id } })

    if (!dbUser) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      )
    }

    const isValid = await verifyPassword(currentPassword, dbUser.password)

    if (!isValid) {
      return NextResponse.json(
        { message: 'Current password is incorrect' },
        { status: 401 }
      )
    }

    const hashedNewPassword = await hashPassword(newPassword)

    await db.user.update({
      where: { id: user.id },
      data: {
        password: hashedNewPassword,
        mustChangePassword: false,
      },
    })

    const updatedAuthUser: AuthUser = {
      id: user.id,
      username: user.username,
      role: user.role,
      mustChangePassword: false,
    }

    const token = await createToken(updatedAuthUser)

    return NextResponse.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        mustChangePassword: false,
      },
    })
  } catch (error) {
    console.error('Change password error:', error)
    return NextResponse.json(
      { message: 'An error occurred while changing password' },
      { status: 500 }
    )
  }
}
