import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'

// GET /api/club/courts — Return all courts for the club
export async function GET(request: Request) {
  try {
    const clubUser = await getUserFromRequest(request)
    if (!clubUser || clubUser.role !== 'CLUB') {
      return NextResponse.json(
        { message: 'Unauthorized: Club access required' },
        { status: 403 }
      )
    }

    const club = await db.club.findUnique({ where: { userId: clubUser.id } })
    if (!club) {
      return NextResponse.json(
        { message: 'Club not found' },
        { status: 404 }
      )
    }

    const courts = await db.court.findMany({
      where: { clubId: club.id },
      include: {
        _count: {
          select: { slots: true },
        },
      },
      orderBy: { name: 'asc' },
    })

    const mapped = courts.map((c) => ({
      id: c.id,
      name: c.name,
      clubId: c.clubId,
      _count: { slots: c._count.slots },
    }))

    return NextResponse.json(mapped)
  } catch (error) {
    console.error('Error fetching courts:', error)
    return NextResponse.json(
      { message: 'An error occurred while fetching courts' },
      { status: 500 }
    )
  }
}

// POST /api/club/courts — Create a court for the club
export async function POST(request: Request) {
  try {
    const clubUser = await getUserFromRequest(request)
    if (!clubUser || clubUser.role !== 'CLUB') {
      return NextResponse.json(
        { message: 'Unauthorized: Club access required' },
        { status: 403 }
      )
    }

    const club = await db.club.findUnique({ where: { userId: clubUser.id } })
    if (!club) {
      return NextResponse.json(
        { message: 'Club not found' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const { name } = body

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { message: 'Court name is required' },
        { status: 400 }
      )
    }

    const court = await db.court.create({
      data: {
        name: name.trim(),
        clubId: club.id,
      },
    })

    return NextResponse.json({ court }, { status: 201 })
  } catch (error) {
    console.error('Error creating court:', error)
    return NextResponse.json(
      { message: 'An error occurred while creating the court' },
      { status: 500 }
    )
  }
}
