import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'

type RouteParams = { params: Promise<{ id: string }> }

// DELETE /api/club/matches/[id] — Delete a match
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

    // Find the match with tournament info
    const match = await db.match.findUnique({
      where: { id },
      include: {
        tournament: {
          select: { clubId: true },
        },
      },
    })

    if (!match) {
      return NextResponse.json(
        { message: 'Match not found' },
        { status: 404 }
      )
    }

    // Verify the match belongs to a tournament of this club
    if (match.tournament.clubId !== club.id) {
      return NextResponse.json(
        { message: 'Match does not belong to a tournament of this club' },
        { status: 403 }
      )
    }

    // Delete related SlotPreferences, MatchAssignment, and then the Match in a transaction
    await db.$transaction(async (tx) => {
      // Delete slot preferences
      await tx.slotPreference.deleteMany({
        where: { matchId: id },
      })

      // Delete match assignment if exists
      await tx.matchAssignment.deleteMany({
        where: { matchId: id },
      })

      // Delete the match
      await tx.match.delete({
        where: { id },
      })
    })

    return NextResponse.json({ success: true, message: 'Match deleted successfully' })
  } catch (error) {
    console.error('Error deleting match:', error)
    return NextResponse.json(
      { message: 'An error occurred while deleting the match' },
      { status: 500 }
    )
  }
}
