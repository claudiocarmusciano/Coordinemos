import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest, hashPassword } from '@/lib/auth'

// GET /api/admin/clubs — List all clubs with counts
export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request)
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json(
        { message: 'Unauthorized: Admin access required' },
        { status: 403 }
      )
    }

    const clubs = await db.club.findMany({
      include: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
        _count: {
          select: {
            courts: true,
            memberships: true,
            tournaments: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    })

    const mapped = clubs.map((c) => ({
      id: c.id,
      name: c.name,
      address: c.address,
      phone: c.phone,
      userId: c.userId,
      user: c.user ? { id: c.user.id, username: c.user.username } : null,
      _count: { courts: c._count.courts, memberships: c._count.memberships, tournaments: c._count.tournaments },
    }))

    return NextResponse.json(mapped)
  } catch (error) {
    console.error('Error fetching clubs:', error)
    return NextResponse.json(
      { message: 'An error occurred while fetching clubs' },
      { status: 500 }
    )
  }
}

// POST /api/admin/clubs — Create a new club with its user
export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request)
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json(
        { message: 'Unauthorized: Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, address, phone, username, password } = body

    if (!name || !username || !password) {
      return NextResponse.json(
        { message: 'Name, username, and password are required' },
        { status: 400 }
      )
    }

    // Check if username already exists
    const existingUser = await db.user.findUnique({ where: { username } })
    if (existingUser) {
      return NextResponse.json(
        { message: 'Username already exists' },
        { status: 409 }
      )
    }

    const hashedPassword = await hashPassword(password)

    // Create User + Club in a transaction
    const club = await db.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          username,
          password: hashedPassword,
          role: 'CLUB',
          mustChangePassword: true,
        },
      })

      return tx.club.create({
        data: {
          name,
          address: address ?? '',
          phone: phone ?? '',
          userId: newUser.id,
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              role: true,
              mustChangePassword: true,
              createdAt: true,
            },
          },
        },
      })
    })

    return NextResponse.json({ club }, { status: 201 })
  } catch (error) {
    console.error('Error creating club:', error)
    return NextResponse.json(
      { message: 'An error occurred while creating the club' },
      { status: 500 }
    )
  }
}
