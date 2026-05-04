import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'

type RouteParams = { params: Promise<{ id: string }> }

// PUT /api/club/players/[id] — Update player info
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
    const { firstName, lastName, phone } = body

    if (firstName === undefined && lastName === undefined && phone === undefined) {
      return NextResponse.json(
        { message: 'At least one field (firstName, lastName, phone) must be provided' },
        { status: 400 }
      )
    }

    // Verify player belongs to this club
    const player = await db.player.findUnique({ where: { id } })
    if (!player || player.clubId !== club.id) {
      return NextResponse.json(
        { message: 'Player not found or does not belong to this club' },
        { status: 404 }
      )
    }

    const updatedPlayer = await db.player.update({
      where: { id },
      data: {
        ...(firstName !== undefined && { firstName: firstName.trim() }),
        ...(lastName !== undefined && { lastName: lastName.trim() }),
        ...(phone !== undefined && { phone: phone.trim() }),
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

    return NextResponse.json({ player: updatedPlayer })
  } catch (error) {
    console.error('Error updating player:', error)
    return NextResponse.json(
      { message: 'An error occurred while updating the player' },
      { status: 500 }
    )
  }
}

// DELETE /api/club/players/[id] — Delete player and associated User
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

    // Verify player belongs to this club
    const player = await db.player.findUnique({
      where: { id },
      include: { user: true },
    })
    if (!player || player.clubId !== club.id) {
      return NextResponse.json(
        { message: 'Player not found or does not belong to this club' },
        { status: 404 }
      )
    }

    // Delete the user (cascade will handle the player and related records)
    // Player has onDelete: Cascade on userId, so deleting the User will delete the Player
    await db.user.delete({ where: { id: player.userId } })

    return NextResponse.json({ success: true, message: 'Player deleted successfully' })
  } catch (error) {
    console.error('Error deleting player:', error)
    return NextResponse.json(
      { message: 'An error occurred while deleting the player' },
      { status: 500 }
    )
  }
}
