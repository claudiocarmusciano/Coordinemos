import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'

type RouteParams = { params: Promise<{ id: string }> }

// DELETE /api/club/couples/[id] — Delete a couple
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

    // Find the couple with tournament info
    const couple = await db.couple.findUnique({
      where: { id },
      include: {
        tournament: {
          select: { clubId: true },
        },
      },
    })

    if (!couple) {
      return NextResponse.json(
        { message: 'Couple not found' },
        { status: 404 }
      )
    }

    // Verify the couple belongs to a tournament of this club
    if (couple.tournament.clubId !== club.id) {
      return NextResponse.json(
        { message: 'Couple does not belong to a tournament of this club' },
        { status: 403 }
      )
    }

    // Check if the couple is part of any match
    const matchCount = await db.match.count({
      where: {
        OR: [
          { couple1Id: id },
          { couple2Id: id },
        ],
      },
    })

    if (matchCount > 0) {
      return NextResponse.json(
        { message: 'Cannot delete a couple that is part of a match. Remove the match first.' },
        { status: 400 }
      )
    }

    await db.couple.delete({ where: { id } })

    return NextResponse.json({ success: true, message: 'Couple deleted successfully' })
  } catch (error) {
    console.error('Error deleting couple:', error)
    return NextResponse.json(
      { message: 'An error occurred while deleting the couple' },
      { status: 500 }
    )
  }
}
