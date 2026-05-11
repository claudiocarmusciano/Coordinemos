import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'

type RouteParams = { params: Promise<{ id: string }> }

// PUT /api/club/players/[id] — Update player info (only CONFIRMED members)
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

    // Verify player has a CONFIRMED membership with this club
    const membership = await db.clubMembership.findUnique({
      where: { clubId_playerId: { clubId: club.id, playerId: id } },
    })
    if (!membership || membership.status !== 'CONFIRMED') {
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

// DELETE /api/club/players/[id] — Remove the ClubMembership (does NOT delete the user)
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

    // Verify player has a membership with this club
    const membership = await db.clubMembership.findUnique({
      where: { clubId_playerId: { clubId: club.id, playerId: id } },
    })
    if (!membership) {
      return NextResponse.json(
        { message: 'Player not found or does not belong to this club' },
        { status: 404 }
      )
    }

    // Only remove the membership — do NOT delete the user or player
    await db.clubMembership.delete({
      where: { clubId_playerId: { clubId: club.id, playerId: id } },
    })

    return NextResponse.json({ success: true, message: 'Jugador eliminado del club' })
  } catch (error) {
    console.error('Error removing player from club:', error)
    return NextResponse.json(
      { message: 'An error occurred while removing the player' },
      { status: 500 }
    )
  }
}
