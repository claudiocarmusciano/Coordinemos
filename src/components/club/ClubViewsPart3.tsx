'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useAuthStore, apiFetch } from '@/store/auth'
import { generateTimesFromBands } from '@/lib/scheduleUtils'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Users,
  Calendar,
  Clock,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  XCircle,
  CalendarDays,
  Repeat,
  Pencil,
} from 'lucide-react'

import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

/* ─── CLUB COUPLES ────────────────────────────── */
export function ClubCouples() {
  const { token } = useAuthStore()
  const [tournaments, setTournaments] = useState<any[]>([])
  const [selectedTournament, setSelectedTournament] = useState('')
  const [couples, setCouples] = useState<any[]>([])
  const [availablePlayers, setAvailablePlayers] = useState<any[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [player1Id, setPlayer1Id] = useState('')
  const [player2Id, setPlayer2Id] = useState('')
  const [loading, setLoading] = useState(true)
  const [playersLoading, setPlayersLoading] = useState(false)

  const loadTournaments = useCallback(async () => {
    try {
      const data = await apiFetch('/api/club/tournaments', token)
      setTournaments(data)
      if (data.length > 0 && !selectedTournament) {
        setSelectedTournament(data[0].id)
      }
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Error') }
    finally { setLoading(false) }
  }, [token])

  useEffect(() => { loadTournaments() }, [loadTournaments])

  const loadData = useCallback(async () => {
    if (!selectedTournament) return
    setPlayersLoading(true)
    try {
      const [coupleData, playerData] = await Promise.all([
        apiFetch(`/api/club/couples?tournamentId=${selectedTournament}`, token),
        apiFetch(`/api/club/available-players?tournamentId=${selectedTournament}`, token),
      ])
      setCouples(coupleData)
      setAvailablePlayers(playerData)
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Error') }
    finally { setPlayersLoading(false) }
  }, [token, selectedTournament])

  useEffect(() => { if (selectedTournament) loadData() }, [loadData])

  const handleCreate = async () => {
    try {
      await apiFetch('/api/club/couples', token, {
        method: 'POST',
        body: JSON.stringify({ tournamentId: selectedTournament, player1Id, player2Id }),
      })
      toast.success('Pareja creada')
      setDialogOpen(false)
      setPlayer1Id('')
      setPlayer2Id('')
      loadData()
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Error') }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta pareja?')) return
    try {
      await apiFetch(`/api/club/couples/${id}`, token, { method: 'DELETE' })
      toast.success('Pareja eliminada')
      loadData()
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Error') }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Parejas</h2>
        <p className="text-sm text-muted-foreground">Armá las parejas para cada torneo</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Select value={selectedTournament} onValueChange={setSelectedTournament}>
          <SelectTrigger className="bg-input border-border text-foreground w-full sm:w-64">
            <SelectValue placeholder="Seleccioná un torneo" />
          </SelectTrigger>
          <SelectContent>
            {tournaments.map((t) => (
              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedTournament && (
          <Dialog modal={false} open={dialogOpen} onOpenChange={(open) => {
            if (open && availablePlayers.length < 2 && !playersLoading) {
              toast.error('No hay suficientes jugadores disponibles para crear una pareja')
              return
            }
            setDialogOpen(open)
            if (!open) { setPlayer1Id(''); setPlayer2Id('') }
          }}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground" disabled={playersLoading || availablePlayers.length < 2}>
                <Plus className="w-4 h-4 mr-2" /> Nueva Pareja
              </Button>
            </DialogTrigger>
            <DialogContent
              className="bg-card border-border"
              onPointerDownOutside={(e) => {
                // Prevent closing when interacting with select dropdown
                const target = e.detail.originalEvent.target as HTMLElement
                if (target.closest('[data-radix-select-content]')) {
                  e.preventDefault()
                }
              }}
            >
              <DialogHeader>
                <DialogTitle className="text-foreground">Nueva Pareja</DialogTitle>
              </DialogHeader>
              {availablePlayers.length < 2 ? (
                <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 text-center">
                  <AlertCircle className="w-8 h-8 text-primary mx-auto mb-2" />
                  <p className="text-sm text-primary font-medium">No hay jugadores disponibles</p>
                  <p className="text-xs text-muted-foreground mt-1">Todos los jugadores inscriptos ya tienen pareja en este torneo.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Jugador 1</Label>
                    <Select value={player1Id} onValueChange={setPlayer1Id}>
                      <SelectTrigger className="bg-input border-border text-foreground w-full">
                        <SelectValue placeholder="Seleccioná jugador" />
                      </SelectTrigger>
                      <SelectContent>
                        {availablePlayers
                          .filter((p) => p.id !== player2Id)
                          .map((p) => (
                            <SelectItem key={p.id} value={p.id}>{p.firstName} {p.lastName}</SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Jugador 2</Label>
                    <Select value={player2Id} onValueChange={setPlayer2Id}>
                      <SelectTrigger className="bg-input border-border text-foreground w-full">
                        <SelectValue placeholder="Seleccioná jugador" />
                      </SelectTrigger>
                      <SelectContent>
                        {availablePlayers
                          .filter((p) => p.id !== player1Id)
                          .map((p) => (
                            <SelectItem key={p.id} value={p.id}>{p.firstName} {p.lastName}</SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    onClick={handleCreate}
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                    disabled={!player1Id || !player2Id}
                  >
                    Crear Pareja
                  </Button>
                </div>
              )}
            </DialogContent>
          </Dialog>
        )}
      </div>

      {playersLoading ? (
        <Card className="bg-card border-border">
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">Cargando...</p>
          </CardContent>
        </Card>
      ) : couples.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="p-8 text-center">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No hay parejas en este torneo</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {couples.map((c) => (
            <Card key={c.id} className="bg-card border-border">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{c.player1?.firstName} {c.player1?.lastName}</p>
                    <p className="text-sm text-muted-foreground">& {c.player2?.firstName} {c.player2?.lastName}</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}


/* ─── CLUB MATCHES ────────────────────────────── */
export function ClubMatches() {
  const { token } = useAuthStore()
  const [tournaments, setTournaments] = useState<any[]>([])
  const [selectedTournament, setSelectedTournament] = useState('')
  const [matches, setMatches] = useState<any[]>([])
  const [couples, setCouples] = useState<any[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [couple1Id, setCouple1Id] = useState('')
  const [couple2Id, setCouple2Id] = useState('')
  const [loading, setLoading] = useState(true)

  const loadTournaments = useCallback(async () => {
    try {
      const data = await apiFetch('/api/club/tournaments', token)
      setTournaments(data)
      if (data.length > 0 && !selectedTournament) setSelectedTournament(data[0].id)
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Error') }
    finally { setLoading(false) }
  }, [token])

  useEffect(() => { loadTournaments() }, [loadTournaments])

  const loadData = useCallback(async () => {
    if (!selectedTournament) return
    try {
      const [matchData, coupleData] = await Promise.all([
        apiFetch(`/api/club/matches?tournamentId=${selectedTournament}`, token),
        apiFetch(`/api/club/couples?tournamentId=${selectedTournament}`, token),
      ])
      setMatches(matchData)
      setCouples(coupleData)
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Error') }
  }, [token, selectedTournament])

  useEffect(() => { if (selectedTournament) loadData() }, [loadData])

  const handleCreate = async () => {
    try {
      await apiFetch('/api/club/matches', token, {
        method: 'POST',
        body: JSON.stringify({ tournamentId: selectedTournament, couple1Id, couple2Id }),
      })
      toast.success('Partido creado')
      setDialogOpen(false)
      setCouple1Id('')
      setCouple2Id('')
      loadData()
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Error') }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este partido?')) return
    try {
      await apiFetch(`/api/club/matches/${id}`, token, { method: 'DELETE' })
      toast.success('Partido eliminado')
      loadData()
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Error') }
  }

  const getStatusBadge = (match: any) => {
    if (match.matchAssignment && !match.matchAssignment.cancelledAt) {
      return <Badge className="bg-green-500/10 text-green-500 text-xs"><CheckCircle2 className="w-3 h-3 mr-1" />Confirmado</Badge>
    }
    const prefs = match.slotPreferences || []
    if (prefs.length > 0) {
      return <Badge className="bg-yellow-500/10 text-yellow-500 text-xs"><AlertCircle className="w-3 h-3 mr-1" />En proceso</Badge>
    }
    return <Badge className="bg-muted text-muted-foreground text-xs"><XCircle className="w-3 h-3 mr-1" />Sin preferencias</Badge>
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Partidos</h2>
        <p className="text-sm text-muted-foreground">Gestioná los partidos de cada torneo</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Select value={selectedTournament} onValueChange={setSelectedTournament}>
          <SelectTrigger className="bg-input border-border text-foreground w-full sm:w-64">
            <SelectValue placeholder="Seleccioná un torneo" />
          </SelectTrigger>
          <SelectContent>
            {tournaments.map((t) => (
              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedTournament && (
          <Dialog modal={false} open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                <Plus className="w-4 h-4 mr-2" /> Nuevo Partido
              </Button>
            </DialogTrigger>
            <DialogContent
              className="bg-card border-border"
              onPointerDownOutside={(e) => {
                const target = e.detail.originalEvent.target as HTMLElement
                if (target.closest('[data-radix-select-content]')) {
                  e.preventDefault()
                }
              }}
            >
              <DialogHeader>
                <DialogTitle className="text-foreground">Nuevo Partido</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Pareja 1</Label>
                  <Select value={couple1Id} onValueChange={setCouple1Id}>
                    <SelectTrigger className="bg-input border-border text-foreground w-full">
                      <SelectValue placeholder="Seleccioná pareja" />
                    </SelectTrigger>
                    <SelectContent>
                      {couples.filter((c) => c.id !== couple2Id).map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.player1?.firstName} {c.player1?.lastName} & {c.player2?.firstName} {c.player2?.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Pareja 2</Label>
                  <Select value={couple2Id} onValueChange={setCouple2Id}>
                    <SelectTrigger className="bg-input border-border text-foreground w-full">
                      <SelectValue placeholder="Seleccioná pareja" />
                    </SelectTrigger>
                    <SelectContent>
                      {couples.filter((c) => c.id !== couple1Id).map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.player1?.firstName} {c.player1?.lastName} & {c.player2?.firstName} {c.player2?.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleCreate} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" disabled={!couple1Id || !couple2Id}>
                  Crear Partido
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {matches.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="p-8 text-center">
            <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No hay partidos en este torneo</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {matches.map((m) => (
            <Card key={m.id} className="bg-card border-border">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-foreground font-medium">
                        {m.couple1?.player1?.firstName} {m.couple1?.player1?.lastName} & {m.couple1?.player2?.firstName} {m.couple1?.player2?.lastName}
                      </span>
                      <span className="text-muted-foreground text-sm">vs</span>
                      <span className="text-foreground font-medium">
                        {m.couple2?.player1?.firstName} {m.couple2?.player1?.lastName} & {m.couple2?.player2?.firstName} {m.couple2?.player2?.lastName}
                      </span>
                    </div>
                    {m.matchAssignment && !m.matchAssignment.cancelledAt && (
                      <p className="text-sm text-green-500 mt-1 flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" />
                        {m.matchAssignment.slot?.day} {m.matchAssignment.slot?.startTime}–{m.matchAssignment.slot?.endTime} · {m.matchAssignment.slot?.court?.name}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(m)}
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(m.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─── CLUB SLOTS ────────────────────────────── */


function getUpcomingDays(count = 14): string[] {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() + i)
    return d.toISOString().split('T')[0]
  })
}

const ALL_COURTS = 'all'

export function ClubSlots() {
  const { token } = useAuthStore()
  const [slots, setSlots] = useState<any[]>([])
  const [courts, setCourts] = useState<any[]>([])
  const [tournaments, setTournaments] = useState<any[]>([])
  const [scheduleBands, setScheduleBands] = useState<any[]>([])
  const [selectedTournamentId, setSelectedTournamentId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [selectedCourtId, setSelectedCourtId] = useState<string>(ALL_COURTS)
  const [selectedDay, setSelectedDay] = useState(() => new Date().toISOString().split('T')[0])
  const [processing, setProcessing] = useState<Set<string>>(new Set())
  // Timeline: celda seleccionada (cancha + franja) para el panel de detalle/acciones
  const [selectedCell, setSelectedCell] = useState<{ courtId: string; start: string; end: string } | null>(null)

  // Bulk generate dialog state
  const [generateOpen, setGenerateOpen] = useState(false)
  const [generateDate, setGenerateDate] = useState(() => new Date().toISOString().split('T')[0])
  const [generatePrice, setGeneratePrice] = useState('')
  const [preview, setPreview] = useState<any>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [generating, setGenerating] = useState(false)

  // Reserva eventual (walk-in booking) dialog state
  const [bookingSlot, setBookingSlot] = useState<any>(null)
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [creatingBooking, setCreatingBooking] = useState(false)

  const loadData = useCallback(async () => {
    try {
      const [slotData, courtData, tournamentData, bandData] = await Promise.all([
        apiFetch('/api/club/slots', token),
        apiFetch('/api/club/courts', token),
        apiFetch('/api/club/tournaments', token),
        apiFetch('/api/club/schedule', token),
      ])
      setSlots(slotData)
      setCourts(courtData)
      setTournaments(tournamentData)
      setScheduleBands(bandData)
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Error') }
    finally { setLoading(false) }
  }, [token])

  useEffect(() => { loadData() }, [loadData])

  // Fetch preview whenever generateDate changes and dialog is open
  const fetchPreview = useCallback(async (date: string) => {
    if (!date) return
    setPreviewLoading(true)
    setPreview(null)
    try {
      const data = await apiFetch(`/api/club/schedule/preview?date=${date}`, token)
      setPreview(data)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al cargar vista previa')
    } finally {
      setPreviewLoading(false)
    }
  }, [token])

  useEffect(() => {
    if (generateOpen) fetchPreview(generateDate)
  }, [generateDate, generateOpen])

  const handleBulkGenerate = async () => {
    setGenerating(true)
    try {
      const data = await apiFetch('/api/club/slots/bulk', token, {
        method: 'POST',
        body: JSON.stringify({ date: generateDate, price: generatePrice || null }),
      })
      toast.success(`${data.created} turno${data.created !== 1 ? 's' : ''} creado${data.created !== 1 ? 's' : ''} · ${data.skipped} omitido${data.skipped !== 1 ? 's' : ''}`)
      setGenerateOpen(false)
      setPreview(null)
      loadData()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al generar turnos')
    } finally {
      setGenerating(false)
    }
  }

  const selectedTournament = tournaments.find(t => t.id === selectedTournamentId)
  const days = selectedTournament
    ? (() => {
        const start = new Date(selectedTournament.startDate)
        const end = new Date(selectedTournament.endDate)
        const result: string[] = []
        const cur = new Date(start)
        while (cur <= end) {
          result.push(cur.toISOString().split('T')[0])
          cur.setDate(cur.getDate() + 1)
        }
        return result
      })()
    : getUpcomingDays(14)

  useEffect(() => {
    if (days.length > 0) setSelectedDay(days[0])
  }, [selectedTournamentId])

  const isAllCourts = selectedCourtId === ALL_COURTS

  // Al cambiar de día o de cancha, cerrar el panel de detalle de la celda
  useEffect(() => { setSelectedCell(null) }, [selectedDay, selectedCourtId])

  const findSlot = (courtId: string, day: string, start: string) =>
    slots.find((s) => s.courtId === courtId && s.day === day && s.startTime === start)

  const handleToggleAll = async (time: { start: string; end: string }) => {
    const hasConfirmed = courts.some(c => findSlot(c.id, selectedDay, time.start)?.status === 'CONFIRMED')
    const hasReserved = courts.some(c => findSlot(c.id, selectedDay, time.start)?.status === 'RESERVED')
    if (hasConfirmed || hasReserved) {
      toast.error('Hay un turno confirmado o reservado en alguna cancha, no se puede modificar')
      return
    }

    const allHaveIt = courts.every(c => findSlot(c.id, selectedDay, time.start)?.status === 'AVAILABLE')

    courts.forEach(c => {
      const key = `${c.id}-${selectedDay}-${time.start}`
      setProcessing(prev => new Set(prev).add(key))
    })

    try {
      await Promise.all(courts.map(async (court) => {
        const existing = findSlot(court.id, selectedDay, time.start)
        if (allHaveIt && existing) {
          await apiFetch(`/api/club/slots/${existing.id}`, token, { method: 'DELETE' })
        } else if (!existing) {
          await apiFetch('/api/club/slots', token, {
            method: 'POST',
            body: JSON.stringify({ day: selectedDay, startTime: time.start, endTime: time.end, courtId: court.id }),
          })
        }
      }))
      await loadData()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error')
      await loadData()
    } finally {
      courts.forEach(c => {
        const key = `${c.id}-${selectedDay}-${time.start}`
        setProcessing(prev => { const s = new Set(prev); s.delete(key); return s })
      })
    }
  }

  const handleToggle = async (time: { start: string; end: string }, courtIdForToggle?: string) => {
    const targetCourtId = courtIdForToggle ?? selectedCourtId
    if (!targetCourtId || targetCourtId === ALL_COURTS) return
    const existing = findSlot(targetCourtId, selectedDay, time.start)
    const key = `${targetCourtId}-${selectedDay}-${time.start}`
    if (processing.has(key)) return

    if (existing?.status === 'CONFIRMED') {
      toast.error('No podés eliminar un turno ya confirmado')
      return
    }
    if (existing?.status === 'RESERVED') {
      toast.error('No podés eliminar un turno ya reservado')
      return
    }

    setProcessing((prev) => new Set(prev).add(key))
    try {
      if (existing) {
        await apiFetch(`/api/club/slots/${existing.id}`, token, { method: 'DELETE' })
      } else {
        await apiFetch('/api/club/slots', token, {
          method: 'POST',
          body: JSON.stringify({ day: selectedDay, startTime: time.start, endTime: time.end, courtId: targetCourtId }),
        })
      }
      await loadData()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error')
    } finally {
      setProcessing((prev) => { const s = new Set(prev); s.delete(key); return s })
    }
  }

  const handleCancelSlot = async (slotId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('¿Cancelar este turno? Los jugadores serán notificados.')) return
    try {
      await apiFetch(`/api/club/slots/${slotId}`, token, {
        method: 'PUT',
        body: JSON.stringify({ status: 'CANCELLED' }),
      })
      toast.success('Turno cancelado')
      loadData()
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Error') }
  }

  const openBookingDialog = (slot: any, e: React.MouseEvent) => {
    e.stopPropagation()
    setBookingSlot(slot)
    setCustomerName('')
    setCustomerPhone('')
  }

  const handleCreateBooking = async () => {
    if (!bookingSlot || !customerName.trim()) return
    setCreatingBooking(true)
    try {
      await apiFetch('/api/club/bookings', token, {
        method: 'POST',
        body: JSON.stringify({
          slotId: bookingSlot.id,
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim() || undefined,
        }),
      })
      toast.success('Reserva creada')
      setBookingSlot(null)
      loadData()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error')
    } finally {
      setCreatingBooking(false)
    }
  }

  const handleCancelBooking = async (bookingId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('¿Cancelar esta reserva?')) return
    try {
      await apiFetch(`/api/club/bookings/${bookingId}`, token, { method: 'DELETE' })
      toast.success('Reserva cancelada')
      loadData()
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Error') }
  }

  const formatDay = (iso: string) => {
    const d = new Date(iso + 'T12:00:00')
    return {
      weekday: d.toLocaleDateString('es-AR', { weekday: 'short' }).replace('.', '').toUpperCase(),
      num: d.getDate(),
    }
  }

  const todayIso = new Date().toISOString().split('T')[0]

  // Compute times for the selected day from configured schedule bands
  const dayOfWeek = new Date(selectedDay + 'T12:00:00').getDay()
  const bandsForDay = scheduleBands.filter((b) => b.dayOfWeek === dayOfWeek)
  const dayTimes = generateTimesFromBands(bandsForDay).map((t) => ({ start: t.startTime, end: t.endTime }))

  // Count available slots for the selected court (or all courts) per day
  const enabledCount = days.reduce((acc, day) => {
    let count: number
    if (isAllCourts) {
      count = slots.filter((s) => s.day === day && s.status === 'AVAILABLE').length
    } else {
      count = slots.filter((s) => s.courtId === selectedCourtId && s.day === day && s.status === 'AVAILABLE').length
    }
    acc[day] = count
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Turnos</h2>
          <p className="text-sm text-muted-foreground">Tocá un horario para habilitarlo o quitarlo</p>
        </div>
        <Dialog open={generateOpen} onOpenChange={(open) => { setGenerateOpen(open); if (!open) setPreview(null) }}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground flex-shrink-0">
              <CalendarDays className="w-4 h-4 mr-1.5" />
              Generar turnos
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-foreground">Generar turnos en lote</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-1">
              <div className="flex flex-wrap gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm text-muted-foreground">Fecha</label>
                  <input
                    type="date"
                    value={generateDate}
                    onChange={(e) => setGenerateDate(e.target.value)}
                    className="w-full sm:w-48 bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm text-muted-foreground">Precio (opcional)</label>
                  <input
                    type="number"
                    min="0"
                    inputMode="numeric"
                    value={generatePrice}
                    onChange={(e) => setGeneratePrice(e.target.value)}
                    placeholder="$"
                    className="w-full sm:w-32 bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground"
                  />
                </div>
              </div>

              {previewLoading && (
                <p className="text-sm text-muted-foreground">Cargando vista previa...</p>
              )}

              {!previewLoading && preview && preview.bands.length === 0 && (
                <div className="bg-muted/40 border border-border rounded-lg p-4 text-center">
                  <p className="text-sm text-muted-foreground">No hay horario configurado para ese día</p>
                  <p className="text-xs text-muted-foreground mt-1">Configurá franjas en la sección Horario</p>
                </div>
              )}

              {!previewLoading && preview && preview.courts.length > 0 && (() => {
                const allSlots = preview.courts[0]?.slots ?? []
                const totalNew = preview.courts.reduce((acc: number, c: any) => acc + c.slots.filter((s: any) => !s.exists).length, 0)
                const totalExisting = preview.courts.reduce((acc: number, c: any) => acc + c.slots.filter((s: any) => s.exists).length, 0)
                return (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      <span className="text-foreground font-medium">{totalNew}</span> turno{totalNew !== 1 ? 's' : ''} nuevos
                      {' · '}
                      <span className="text-muted-foreground">{totalExisting} ya existen</span>
                    </p>
                    {/* Grid: rows = times, cols = courts */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs border-collapse">
                        <thead>
                          <tr>
                            <th className="text-left py-2 pr-3 text-muted-foreground font-semibold uppercase tracking-wide">Horario</th>
                            {preview.courts.map((c: any) => (
                              <th key={c.id} className="py-2 px-2 text-center text-muted-foreground font-semibold">{c.name}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {allSlots.map((_: any, i: number) => {
                            const time = preview.courts[0].slots[i]
                            return (
                              <tr key={i} className="border-t border-border/40">
                                <td className="py-2 pr-3 font-medium text-foreground whitespace-nowrap">
                                  {time.startTime} → {time.endTime}
                                </td>
                                {preview.courts.map((c: any) => {
                                  const s = c.slots[i]
                                  return (
                                    <td key={c.id} className="py-2 px-2 text-center">
                                      {s.exists ? (
                                        <span className="text-green-500 font-bold" title={s.existingStatus ?? ''}>✓</span>
                                      ) : (
                                        <span className="text-primary font-bold">+</span>
                                      )}
                                    </td>
                                  )
                                })}
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                    <Button
                      onClick={handleBulkGenerate}
                      disabled={generating || totalNew === 0}
                      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                      {generating ? 'Generando...' : `Confirmar — crear ${totalNew} turno${totalNew !== 1 ? 's' : ''}`}
                    </Button>
                  </div>
                )
              })()}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">Cargando...</p>
      ) : courts.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="p-8 text-center">
            <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No tenés canchas. Creá una primero en la sección Canchas.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* ── Tournament selector ── */}
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">Torneo</p>
            <Select value={selectedTournamentId} onValueChange={setSelectedTournamentId}>
              <SelectTrigger className="bg-input border-border text-foreground w-full sm:w-64">
                <SelectValue placeholder="Todos los días (14 próximos)" />
              </SelectTrigger>
              <SelectContent>
                {tournaments.map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* ── Court selector ── */}
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">Cancha</p>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {/* "Todas" option */}
              <button
                onClick={() => setSelectedCourtId(ALL_COURTS)}
                className={`flex-shrink-0 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                  isAllCourts
                    ? 'bg-primary text-primary-foreground border-primary shadow-[0_0_12px_rgba(155,255,0,0.35)]'
                    : 'bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground'
                }`}
              >
                Todas
              </button>
              {courts.map((court) => (
                <button
                  key={court.id}
                  onClick={() => setSelectedCourtId(court.id)}
                  className={`flex-shrink-0 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                    selectedCourtId === court.id
                      ? 'bg-primary text-primary-foreground border-primary shadow-[0_0_12px_rgba(155,255,0,0.35)]'
                      : 'bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground'
                  }`}
                >
                  {court.name}
                </button>
              ))}
            </div>
          </div>

          {/* ── Day selector ── */}
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">Día</p>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {days.map((day) => {
                const { weekday, num } = formatDay(day)
                const isSelected = day === selectedDay
                const isToday = day === todayIso
                const count = enabledCount[day] || 0
                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(day)}
                    className={`flex-shrink-0 flex flex-col items-center px-3 py-2 rounded-xl border transition-all min-w-[52px] relative ${
                      isSelected
                        ? 'bg-primary text-primary-foreground border-primary shadow-[0_0_12px_rgba(155,255,0,0.35)]'
                        : isToday
                        ? 'bg-primary/10 text-primary border-primary/30'
                        : 'bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground'
                    }`}
                  >
                    <span className="text-[10px] font-semibold">{weekday}</span>
                    <span className="text-lg font-bold leading-tight">{num}</span>
                    {count > 0 && (
                      <span className={`text-[9px] font-bold mt-0.5 ${isSelected ? 'text-primary-foreground/80' : 'text-primary'}`}>
                        {count}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* ── Legend ── */}
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-green-500/25 border border-green-500/50 inline-block" />
              Disponible
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-primary/25 border border-primary/50 inline-block" />
              Confirmado
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-500/25 border border-amber-500/50 inline-block" />
              Reservado
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-muted/60 border border-border inline-block" />
              Sin cargar
            </span>
          </div>

          {/* ── Timeline (grilla: filas = canchas, columnas = franjas horarias) ── */}
          {dayTimes.length === 0 ? (
            <Card className="bg-card border-border">
              <CardContent className="p-8 text-center">
                <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">No hay horario configurado para este día</p>
                <p className="text-xs text-muted-foreground mt-1">Configurá franjas en la sección <span className="text-primary font-medium">Horario</span></p>
              </CardContent>
            </Card>
          ) : (() => {
            const rowCourts = isAllCourts ? courts : courts.filter((c) => c.id === selectedCourtId)
            return (
              <div className="space-y-4">
                <div className="overflow-x-auto pb-1 -mx-1 px-1">
                  <div
                    className="inline-grid gap-1 min-w-full align-top"
                    style={{ gridTemplateColumns: `minmax(96px, max-content) repeat(${dayTimes.length}, minmax(58px, 1fr))` }}
                  >
                    {/* Encabezado: esquina + horas (en "Todas", tocar la hora habilita/quita en todas las canchas) */}
                    <div className="sticky left-0 z-20 bg-background" />
                    {dayTimes.map((t) => (
                      isAllCourts ? (
                        <button
                          key={t.start}
                          onClick={() => handleToggleAll(t)}
                          title="Habilitar / quitar en todas las canchas"
                          className="pb-1 text-center text-[11px] font-semibold text-muted-foreground hover:text-primary tabular-nums transition-colors"
                        >
                          {t.start}
                        </button>
                      ) : (
                        <div key={t.start} className="pb-1 text-center text-[11px] font-semibold text-muted-foreground tabular-nums">
                          {t.start}
                        </div>
                      )
                    ))}

                    {/* Filas por cancha */}
                    {rowCourts.map((court) => (
                      <React.Fragment key={court.id}>
                        <div className="sticky left-0 z-10 bg-background pr-3 flex items-center text-sm font-medium text-foreground whitespace-nowrap">
                          {court.name}
                        </div>
                        {dayTimes.map((time) => {
                          const existing = findSlot(court.id, selectedDay, time.start)
                          const status = existing?.status
                          const key = `${court.id}-${selectedDay}-${time.start}`
                          const isProcessing = processing.has(key)
                          const isSel = selectedCell?.courtId === court.id && selectedCell?.start === time.start

                          let cellClass = 'bg-muted/25 border-border border-dashed hover:border-primary/40'
                          if (status === 'CONFIRMED') cellClass = 'bg-primary/25 border-primary/50 hover:bg-primary/30'
                          else if (status === 'RESERVED') cellClass = 'bg-amber-500/25 border-amber-500/50 hover:bg-amber-500/30'
                          else if (status === 'AVAILABLE') cellClass = 'bg-green-500/20 border-green-500/45 hover:bg-green-500/30'

                          return (
                            <button
                              key={time.start}
                              onClick={() => setSelectedCell({ courtId: court.id, start: time.start, end: time.end })}
                              title={`${court.name} · ${time.start}–${time.end}`}
                              className={`relative h-11 rounded-md border transition-all active:scale-95 ${cellClass} ${isSel ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''} ${isProcessing ? 'opacity-40 pointer-events-none' : ''}`}
                            >
                              {status === 'CONFIRMED' && <CheckCircle2 className="w-3.5 h-3.5 text-primary mx-auto" />}
                              {status === 'RESERVED' && <span className="block w-1.5 h-1.5 rounded-full bg-amber-400 mx-auto" />}
                              {isProcessing && (
                                <span className="absolute inset-0 flex items-center justify-center">
                                  <span className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                </span>
                              )}
                            </button>
                          )
                        })}
                      </React.Fragment>
                    ))}
                  </div>
                </div>

                {/* Panel de detalle / acciones de la celda seleccionada */}
                {selectedCell && (() => {
                  const court = courts.find((c) => c.id === selectedCell.courtId)
                  const time = { start: selectedCell.start, end: selectedCell.end }
                  const existing = findSlot(selectedCell.courtId, selectedDay, time.start)
                  const status = existing?.status
                  const key = `${selectedCell.courtId}-${selectedDay}-${time.start}`
                  const isProcessing = processing.has(key)

                  const statusMeta =
                    status === 'CONFIRMED' ? { label: 'Confirmado', cls: 'text-primary' }
                    : status === 'RESERVED' ? { label: 'Reservado', cls: 'text-amber-400' }
                    : status === 'AVAILABLE' ? { label: 'Disponible', cls: 'text-green-400' }
                    : { label: 'Sin cargar', cls: 'text-muted-foreground' }

                  return (
                    <div className="rounded-xl border border-border bg-card p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground">
                            {court?.name} · {time.start}–{time.end}
                          </p>
                          <p className={`text-xs font-medium mt-0.5 ${statusMeta.cls}`}>{statusMeta.label}</p>
                          {typeof existing?.price === 'number' && (
                            <p className="text-[11px] font-semibold text-primary mt-0.5">${existing.price}</p>
                          )}
                          {status === 'CONFIRMED' && existing?.matchAssignment && (
                            <p className="text-[11px] text-primary/70 mt-1.5 leading-tight">
                              {existing.matchAssignment.match?.couple1?.player1?.firstName} & {existing.matchAssignment.match?.couple1?.player2?.firstName}
                              {' vs '}
                              {existing.matchAssignment.match?.couple2?.player1?.firstName} & {existing.matchAssignment.match?.couple2?.player2?.firstName}
                            </p>
                          )}
                          {status === 'RESERVED' && existing?.booking && (
                            <p className="text-[11px] text-amber-400/80 mt-1.5 leading-tight">
                              {existing.booking.isRecurring && <span className="font-semibold">🔁 fija · </span>}
                              {existing.booking.customerName ?? `${existing.booking.player?.firstName} ${existing.booking.player?.lastName}`}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => setSelectedCell(null)}
                          className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                          title="Cerrar"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-2 mt-3">
                        {!status && (
                          <Button
                            size="sm"
                            onClick={() => handleToggle(time, selectedCell.courtId)}
                            disabled={isProcessing}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground"
                          >
                            <Plus className="w-3.5 h-3.5 mr-1" /> Habilitar turno
                          </Button>
                        )}
                        {status === 'AVAILABLE' && (
                          <>
                            <Button
                              size="sm"
                              onClick={(e) => openBookingDialog(existing, e)}
                              className="bg-green-500/20 hover:bg-green-500/35 text-green-300"
                            >
                              <Plus className="w-3.5 h-3.5 mr-1" /> Reservar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleToggle(time, selectedCell.courtId)}
                              disabled={isProcessing}
                              className="border-border text-muted-foreground hover:text-destructive hover:border-destructive/50"
                            >
                              <Trash2 className="w-3.5 h-3.5 mr-1" /> Quitar
                            </Button>
                          </>
                        )}
                        {status === 'CONFIRMED' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => handleCancelSlot(existing.id, e)}
                            className="border-destructive/50 text-destructive hover:bg-destructive/10"
                          >
                            <XCircle className="w-3.5 h-3.5 mr-1" /> Cancelar turno
                          </Button>
                        )}
                        {status === 'RESERVED' && existing?.booking && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => handleCancelBooking(existing.booking.id, e)}
                            className="border-destructive/50 text-destructive hover:bg-destructive/10"
                          >
                            <XCircle className="w-3.5 h-3.5 mr-1" /> Cancelar reserva
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })()}
              </div>
            )
          })()}
        </>
      )}

      {/* ── Reserva eventual dialog ── */}
      <Dialog open={!!bookingSlot} onOpenChange={(open) => { if (!open) setBookingSlot(null) }}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Reservar turno</DialogTitle>
          </DialogHeader>
          {bookingSlot && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {bookingSlot.day} · {bookingSlot.startTime}–{bookingSlot.endTime}
              </p>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Nombre del cliente</Label>
                <Input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="bg-input border-border text-foreground"
                  placeholder="Nombre y apellido"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Teléfono (opcional)</Label>
                <Input
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="bg-input border-border text-foreground"
                  placeholder="+54 9..."
                />
              </div>
              <Button
                onClick={handleCreateBooking}
                disabled={creatingBooking || !customerName.trim()}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {creatingBooking ? 'Reservando...' : 'Reservar'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* ─── CLUB RESERVAS FIJAS (recurrentes semanales) ────────────── */
const WEEKDAYS = [
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
  { value: 0, label: 'Domingo' },
]

export function ClubRecurringBookings() {
  const { token } = useAuthStore()
  const [recurrings, setRecurrings] = useState<any[]>([])
  const [courts, setCourts] = useState<any[]>([])
  const [players, setPlayers] = useState<any[]>([])
  const [bands, setBands] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  // form state
  const [courtId, setCourtId] = useState('')
  const [dayOfWeek, setDayOfWeek] = useState('1')
  const [timeKey, setTimeKey] = useState('') // "start|end"
  const [manualStart, setManualStart] = useState('')
  const [manualEnd, setManualEnd] = useState('')
  const [beneficiaryType, setBeneficiaryType] = useState<'player' | 'walkin'>('player')
  const [playerId, setPlayerId] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')

  const resetForm = () => {
    setEditingId(null)
    setCourtId(''); setDayOfWeek('1'); setTimeKey(''); setManualStart(''); setManualEnd('')
    setBeneficiaryType('player'); setPlayerId(''); setCustomerName(''); setCustomerPhone('')
  }

  const openCreate = () => {
    resetForm()
    // Arrancar en el primer día que tenga franja horaria configurada
    const firstDay = WEEKDAYS.find((w) => bands.some((b) => b.dayOfWeek === w.value))
    if (firstDay) setDayOfWeek(String(firstDay.value))
    setDialogOpen(true)
  }

  const openEdit = (r: any) => {
    setEditingId(r.id)
    setCourtId(r.courtId)
    setDayOfWeek(String(r.dayOfWeek))
    setTimeKey(`${r.startTime}|${r.endTime}`)
    setManualStart(r.startTime); setManualEnd(r.endTime)
    setBeneficiaryType(r.player ? 'player' : 'walkin')
    setPlayerId(r.player?.id ?? '')
    setCustomerName(r.player ? '' : (r.customerName ?? ''))
    setCustomerPhone(r.customerPhone ?? '')
    setDialogOpen(true)
  }

  const loadData = useCallback(async () => {
    try {
      const [rec, courtData, playerData, bandData] = await Promise.all([
        apiFetch('/api/club/recurring-bookings', token),
        apiFetch('/api/club/courts', token),
        apiFetch('/api/club/players', token),
        apiFetch('/api/club/schedule', token),
      ])
      setRecurrings(rec)
      setCourts(courtData)
      setPlayers(playerData)
      setBands(bandData)
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Error') }
    finally { setLoading(false) }
  }, [token])

  useEffect(() => { loadData() }, [loadData])

  // Time options from the schedule bands for the selected weekday
  const dayTimes = generateTimesFromBands(
    bands.filter((b) => b.dayOfWeek === Number(dayOfWeek))
  )

  // Solo se pueden elegir días con al menos una franja horaria configurada.
  // Al editar, se incluye el día actual de la reserva aunque ya no tenga franja.
  const weekdayOptions = WEEKDAYS.filter(
    (w) => bands.some((b) => b.dayOfWeek === w.value) || (editingId != null && Number(dayOfWeek) === w.value)
  )
  const noBandDays = weekdayOptions.length === 0

  const handleCreate = async () => {
    let startTime = ''
    let endTime = ''
    if (dayTimes.length > 0) {
      if (!timeKey) { toast.error('Elegí un horario'); return }
      ;[startTime, endTime] = timeKey.split('|')
    } else {
      if (!/^\d{2}:\d{2}$/.test(manualStart) || !/^\d{2}:\d{2}$/.test(manualEnd)) {
        toast.error('Ingresá un horario válido (HH:mm)'); return
      }
      startTime = manualStart; endTime = manualEnd
    }
    if (!courtId) { toast.error('Elegí una cancha'); return }
    if (beneficiaryType === 'player' && !playerId) { toast.error('Elegí un jugador'); return }
    if (beneficiaryType === 'walkin' && !customerName.trim()) { toast.error('Ingresá el nombre del cliente'); return }

    setSaving(true)
    try {
      const body: any = { courtId, dayOfWeek: Number(dayOfWeek), startTime, endTime }
      if (beneficiaryType === 'player') body.playerId = playerId
      else { body.customerName = customerName.trim(); body.customerPhone = customerPhone.trim() || undefined }
      const res = editingId
        ? await apiFetch(`/api/club/recurring-bookings/${editingId}`, token, {
            method: 'PUT', body: JSON.stringify(body),
          })
        : await apiFetch('/api/club/recurring-bookings', token, {
            method: 'POST', body: JSON.stringify(body),
          })
      const conflicts = res.conflicts?.length || 0
      const conflictSuffix = conflicts > 0 ? ` (${conflicts} conflicto/s desplazado/s)` : ''
      toast.success(`${editingId ? 'Reserva fija actualizada' : 'Reserva fija creada'}${conflictSuffix}`)
      setDialogOpen(false)
      resetForm()
      loadData()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error')
    } finally { setSaving(false) }
  }

  const handleCancel = async (id: string) => {
    if (!confirm('¿Cancelar esta reserva fija? Se liberan las fechas futuras.')) return
    try {
      await apiFetch(`/api/club/recurring-bookings/${id}`, token, { method: 'DELETE' })
      toast.success('Reserva fija cancelada')
      loadData()
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Error') }
  }

  const dayLabel = (d: number) => WEEKDAYS.find((w) => w.value === d)?.label ?? '—'

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Reservas fijas</h2>
          <p className="text-sm text-muted-foreground">Turnos reservados todas las semanas para un jugador</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm() }}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={openCreate} className="bg-primary hover:bg-primary/90 text-primary-foreground flex-shrink-0">
              <Plus className="w-4 h-4 mr-1.5" /> Nueva reserva fija
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-foreground">{editingId ? 'Editar reserva fija' : 'Nueva reserva fija'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-1">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Cancha</Label>
                <Select value={courtId} onValueChange={setCourtId}>
                  <SelectTrigger className="bg-input border-border text-foreground"><SelectValue placeholder="Elegí una cancha" /></SelectTrigger>
                  <SelectContent>
                    {courts.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground">Día de la semana</Label>
                <Select value={dayOfWeek} onValueChange={(v) => { setDayOfWeek(v); setTimeKey('') }} disabled={noBandDays}>
                  <SelectTrigger className="bg-input border-border text-foreground"><SelectValue placeholder="Elegí un día" /></SelectTrigger>
                  <SelectContent>
                    {weekdayOptions.map((w) => <SelectItem key={w.value} value={String(w.value)}>{w.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                {noBandDays && (
                  <p className="text-xs text-amber-400/80">
                    No tenés franjas horarias configuradas. Cargalas en la sección <span className="font-medium">Horario</span> para poder crear reservas fijas.
                  </p>
                )}
                <p className="text-xs text-muted-foreground">Solo se muestran los días con franja horaria de atención configurada.</p>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground">Horario</Label>
                {dayTimes.length > 0 ? (
                  <Select value={timeKey} onValueChange={setTimeKey}>
                    <SelectTrigger className="bg-input border-border text-foreground"><SelectValue placeholder="Elegí un horario" /></SelectTrigger>
                    <SelectContent>
                      {dayTimes.map((t) => (
                        <SelectItem key={t.startTime} value={`${t.startTime}|${t.endTime}`}>
                          {t.startTime} – {t.endTime}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="flex gap-2">
                    <Input value={manualStart} onChange={(e) => setManualStart(e.target.value)} placeholder="Inicio HH:mm" className="bg-input border-border text-foreground" />
                    <Input value={manualEnd} onChange={(e) => setManualEnd(e.target.value)} placeholder="Fin HH:mm" className="bg-input border-border text-foreground" />
                  </div>
                )}
                {dayTimes.length === 0 && (
                  <p className="text-xs text-muted-foreground">No hay franja configurada para ese día; ingresá el horario a mano.</p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground">Para quién</Label>
                <div className="flex gap-2">
                  <Button type="button" variant={beneficiaryType === 'player' ? 'default' : 'outline'}
                    onClick={() => setBeneficiaryType('player')}
                    className={beneficiaryType === 'player' ? 'flex-1 bg-primary text-primary-foreground' : 'flex-1 border-border'}>
                    Jugador
                  </Button>
                  <Button type="button" variant={beneficiaryType === 'walkin' ? 'default' : 'outline'}
                    onClick={() => setBeneficiaryType('walkin')}
                    className={beneficiaryType === 'walkin' ? 'flex-1 bg-primary text-primary-foreground' : 'flex-1 border-border'}>
                    Cliente sin cuenta
                  </Button>
                </div>
                {beneficiaryType === 'player' ? (
                  <Select value={playerId} onValueChange={setPlayerId}>
                    <SelectTrigger className="bg-input border-border text-foreground"><SelectValue placeholder="Elegí un jugador" /></SelectTrigger>
                    <SelectContent>
                      {players.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.firstName} {p.lastName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="space-y-2">
                    <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Nombre del cliente" className="bg-input border-border text-foreground" />
                    <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="Teléfono (opcional)" className="bg-input border-border text-foreground" />
                  </div>
                )}
              </div>

              <Button onClick={handleCreate} disabled={saving || noBandDays} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                {saving ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Crear reserva fija'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">Cargando...</p>
      ) : recurrings.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="p-8 text-center">
            <Repeat className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No hay reservas fijas todavía</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {recurrings.map((r) => (
            <Card key={r.id} className="bg-card border-border">
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-foreground font-medium">
                    🔁 {dayLabel(r.dayOfWeek)} · {r.startTime}–{r.endTime}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {r.court?.name} · {r.player ? `${r.player.firstName} ${r.player.lastName}` : r.customerName}
                  </p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(r)} title="Editar reserva fija">
                    <Pencil className="w-4 h-4 text-muted-foreground" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleCancel(r.id)} title="Cancelar reserva fija">
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
