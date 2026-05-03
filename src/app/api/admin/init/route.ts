import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest, hashPassword } from '@/lib/auth'

// POST /api/admin/init — Seed the initial admin user if it doesn't exist
export async function POST(request: Request) {
  try {
    // Check if any admin exists already
    const existingAdmin = await db.user.findFirst({
      where: { role: 'ADMIN' },
    })

    if (existingAdmin) {
      // If admin exists, require admin auth
      const user = await getUserFromRequest(request)
      if (!user || user.role !== 'ADMIN') {
        return NextResponse.json(
          { created: false, message: 'Admin user already exists' },
          { status: 200 }
        )
      }
      return NextResponse.json({
        created: false,
        message: 'Admin user already exists',
      })
    }

    // No admin exists yet - create one (this is the bootstrap)
    const hashedPassword = await hashPassword('admin123')

    await db.user.create({
      data: {
        username: 'admin',
        password: hashedPassword,
        role: 'ADMIN',
        mustChangePassword: true,
      },
    })

    return NextResponse.json({
      created: true,
      message: 'Admin user created successfully',
    })
  } catch (error) {
    console.error('Error seeding admin user:', error)
    return NextResponse.json(
      { message: 'An error occurred while initializing the admin user' },
      { status: 500 }
    )
  }
}
