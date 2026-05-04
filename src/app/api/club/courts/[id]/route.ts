import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'

type RouteParams = { params: Promise<{ id: string }> }

// PUT /api/club/courts/[id] — Update court
export async function PUT(request: Request, { params }: RouteParams) {
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

    const { id } = await params
    const body = await request.json()
    const { name } = body

    if (name === undefined) {
      return NextResponse.json(
        { message: 'At least one field (name) must be provided' },
        { status: 400 }
      )
    }

    // Verify court belongs to this club
    const court = await db.court.findUnique({ where: { id } })
    if (!court || court.clubId !== club.id) {
      return NextResponse.json(
        { message: 'Court not found or does not belong to this club' },
        { status: 404 }
      )
    }

    const updatedCourt = await db.court.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
      },
    })

    return NextResponse.json({ court: updatedCourt })
  } catch (error) {
    console.error('Error updating court:', error)
    return NextResponse.json(
      { message: 'An error occurred while updating the court' },
      { status: 500 }
    )
  }
}

// DELETE /api/club/courts/[id] — Delete court (only if it belongs to the club)
export async function DELETE(request: Request, { params }: RouteParams) {
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

    const { id } = await params

    // Verify court belongs to this club
    const court = await db.court.findUnique({ where: { id } })
    if (!court || court.clubId !== club.id) {
      return NextResponse.json(
        { message: 'Court not found or does not belong to this club' },
        { status: 404 }
      )
    }

    // Cascade will handle related slots
    await db.court.delete({ where: { id } })

    return NextResponse.json({ success: true, message: 'Court deleted successfully' })
  } catch (error) {
    console.error('Error deleting court:', error)
    return NextResponse.json(
      { message: 'An error occurred while deleting the court' },
      { status: 500 }
    )
  }
}
