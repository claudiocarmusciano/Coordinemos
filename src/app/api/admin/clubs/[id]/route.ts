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

    const existingClub = await db.club.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            courts: true,
            tournaments: true,
            memberships: true,
          },
        },
      },
    })
    if (!existingClub) {
      return NextResponse.json(
        { message: 'Club not encontrado' },
        { status: 404 }
      )
    }

    const { courts, tournaments, memberships } = existingClub._count
    if (courts > 0 || tournaments > 0 || memberships > 0) {
      const items = [
        courts > 0 ? `${courts} cancha${courts > 1 ? 's' : ''}` : '',
        tournaments > 0 ? `${tournaments} torneo${tournaments > 1 ? 's' : ''}` : '',
        memberships > 0 ? `${memberships} jugador${memberships > 1 ? 'es' : ''}` : '',
      ].filter(Boolean).join(', ')
      return NextResponse.json(
        { message: `No se puede eliminar el club porque tiene ${items}. Eliminá primero esos datos.` },
        { status: 409 }
      )
    }

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
