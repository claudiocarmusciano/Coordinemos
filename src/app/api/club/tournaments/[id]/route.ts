import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'

type RouteParams = { params: Promise<{ id: string }> }

// PUT /api/club/tournaments/[id] — Update tournament
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
    const { name, startDate, endDate } = body

    if (name === undefined && startDate === undefined && endDate === undefined) {
      return NextResponse.json(
        { message: 'At least one field (name, startDate, endDate) must be provided' },
        { status: 400 }
      )
    }

    // Verify tournament belongs to this club
    const tournament = await db.tournament.findUnique({ where: { id } })
    if (!tournament || tournament.clubId !== club.id) {
      return NextResponse.json(
        { message: 'Tournament not found or does not belong to this club' },
        { status: 404 }
      )
    }

    // Validate dates if provided
    const parsedStart = startDate ? new Date(startDate) : tournament.startDate
    const parsedEnd = endDate ? new Date(endDate) : tournament.endDate

    if (startDate && isNaN(parsedStart.getTime())) {
      return NextResponse.json(
        { message: 'Invalid start date' },
        { status: 400 }
      )
    }

    if (endDate && isNaN(parsedEnd.getTime())) {
      return NextResponse.json(
        { message: 'Invalid end date' },
        { status: 400 }
      )
    }

    if (parsedEnd < parsedStart) {
      return NextResponse.json(
        { message: 'End date must be after start date' },
        { status: 400 }
      )
    }

    const updatedTournament = await db.tournament.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(startDate !== undefined && { startDate: parsedStart }),
        ...(endDate !== undefined && { endDate: parsedEnd }),
      },
    })

    return NextResponse.json({ tournament: updatedTournament })
  } catch (error) {
    console.error('Error updating tournament:', error)
    return NextResponse.json(
      { message: 'An error occurred while updating the tournament' },
      { status: 500 }
    )
  }
}

// DELETE /api/club/tournaments/[id] — Delete tournament (only if belongs to the club)
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

    // Verify tournament belongs to this club
    const tournament = await db.tournament.findUnique({ where: { id } })
    if (!tournament || tournament.clubId !== club.id) {
      return NextResponse.json(
        { message: 'Tournament not found or does not belong to this club' },
        { status: 404 }
      )
    }

    // Cascade will handle tournamentPlayers, couples, matches, etc.
    await db.tournament.delete({ where: { id } })

    return NextResponse.json({ success: true, message: 'Tournament deleted successfully' })
  } catch (error) {
    console.error('Error deleting tournament:', error)
    return NextResponse.json(
      { message: 'An error occurred while deleting the tournament' },
      { status: 500 }
    )
  }
}
