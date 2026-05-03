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
            role: true,
            mustChangePassword: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            courts: true,
            players: true,
            tournaments: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    })

    const result = clubs.map((club) => ({
      id: club.id,
      name: club.name,
      address: club.address,
      phone: club.phone,
      userId: club.userId,
      user: club.user,
      courtsCount: club._count.courts,
      playersCount: club._count.players,
      tournamentsCount: club._count.tournaments,
    }))

    return NextResponse.json({ clubs: result })
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
