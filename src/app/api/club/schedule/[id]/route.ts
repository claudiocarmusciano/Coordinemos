import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'

// DELETE /api/club/schedule/[id] — Remove a ScheduleBand by id (must belong to the club)
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const clubUser = await getUserFromRequest(request)
    if (!clubUser || clubUser.role !== 'CLUB') {
      return NextResponse.json({ message: 'Unauthorized: Club access required' }, { status: 403 })
    }

    const club = await db.club.findUnique({ where: { userId: clubUser.id } })
    if (!club) {
      return NextResponse.json({ message: 'Club not found' }, { status: 404 })
    }

    const { id } = await params

    const band = await db.scheduleBand.findUnique({ where: { id } })
    if (!band || band.clubId !== club.id) {
      return NextResponse.json({ message: 'Schedule band not found' }, { status: 404 })
    }

    await db.scheduleBand.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting schedule band:', error)
    return NextResponse.json({ message: 'An error occurred while deleting the schedule band' }, { status: 500 })
  }
}
