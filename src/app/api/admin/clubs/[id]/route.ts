import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'

type RouteParams = { params: Promise<{ id: string }> }

// PUT /api/admin/clubs/[id] — Update club info
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const user = await getUserFromRequest(request)
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json(
        { message: 'Unauthorized: Admin access required' },
        { status: 403 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const { name, address, phone } = body

    // Ensure at least one field is provided
    if (name === undefined && address === undefined && phone === undefined) {
      return NextResponse.json(
        { message: 'At least one field (name, address, phone) must be provided' },
        { status: 400 }
      )
    }

    const existingClub = await db.club.findUnique({ where: { id } })
    if (!existingClub) {
      return NextResponse.json(
        { message: 'Club not found' },
        { status: 404 }
      )
    }

    const updatedClub = await db.club.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(address !== undefined && { address }),
        ...(phone !== undefined && { phone }),
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            role: true,
            mustChangePassword: true,
          },
        },
      },
    })

    return NextResponse.json({ club: updatedClub })
  } catch (error) {
    console.error('Error updating club:', error)
    return NextResponse.json(
      { message: 'An error occurred while updating the club' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/clubs/[id] — Delete a club (cascade handles related records)
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const user = await getUserFromRequest(request)
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json(
        { message: 'Unauthorized: Admin access required' },
        { status: 403 }
      )
    }

    const { id } = await params

    const existingClub = await db.club.findUnique({ where: { id } })
    if (!existingClub) {
      return NextResponse.json(
        { message: 'Club not found' },
        { status: 404 }
      )
    }

    // Deleting the club cascades to courts, tournaments, players, slots, etc.
    // Deleting the user cascades to the club as well, but we delete the club directly
    await db.club.delete({ where: { id } })

    return NextResponse.json({ success: true, message: 'Club deleted successfully' })
  } catch (error) {
    console.error('Error deleting club:', error)
    return NextResponse.json(
      { message: 'An error occurred while deleting the club' },
      { status: 500 }
    )
  }
}
