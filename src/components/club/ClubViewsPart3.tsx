'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useAuthStore, apiFetch } from '@/store/auth'
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
} from 'lucide-react'

import { Label } from '@/components/ui/label'
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

const PRESET_TIMES = [
  { start: '07:30', end: '09:00' },
  { start: '09:00', end: '10:30' },
  { start: '10:30', end: '12:00' },
  { start: '12:00', end: '13:30' },
  { start: '13:30', end: '15:00' },
  { start: '15:00', end: '16:30' },
  { start: '16:30', end: '18:00' },
  { start: '18:00', end: '19:30' },
  { start: '19:30', end: '21:00' },
  { start: '21:00', end: '22:30' },
  { start: '22:30', end: '00:00' },
]

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
  const [selectedTournamentId, setSelectedTournamentId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [selectedCourtId, setSelectedCourtId] = useState<string>(ALL_COURTS)
  const [selectedDay, setSelectedDay] = useState(() => new Date().toISOString().split('T')[0])
  const [processing, setProcessing] = useState<Set<string>>(new Set())

  const loadData = useCallback(async () => {
    try {
      const [slotData, courtData, tournamentData] = await Promise.all([
        apiFetch('/api/club/slots', token),
        apiFetch('/api/club/courts', token),
        apiFetch('/api/club/tournaments', token),
      ])
      setSlots(slotData)
      setCourts(courtData)
      setTournaments(tournamentData)
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Error') }
    finally { setLoading(false) }
  }, [token])

  useEffect(() => { loadData() }, [loadData])

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

  const findSlot = (courtId: string, day: string, start: string) =>
    slots.find((s) => s.courtId === courtId && s.day === day && s.startTime === start)

  const handleToggleAll = async (time: { start: string; end: string }) => {
    const hasConfirmed = courts.some(c => findSlot(c.id, selectedDay, time.start)?.status === 'CONFIRMED')
    if (hasConfirmed) {
      toast.error('Hay un turno confirmado en alguna cancha, no se puede modificar')
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

  const formatDay = (iso: string) => {
    const d = new Date(iso + 'T12:00:00')
    return {
      weekday: d.toLocaleDateString('es-AR', { weekday: 'short' }).replace('.', '').toUpperCase(),
      num: d.getDate(),
    }
  }

  const todayIso = new Date().toISOString().split('T')[0]

  // Count available slots for the selected court (or all courts) per day
  const enabledCount = days.reduce((acc, day) => {
    let count: number
    if (isAllCourts) {
      count = slots.filter((s) => s.day === day && s.status === 'AVAILABLE').length
    } else {
      count = PRESET_TIMES.filter(t => findSlot(selectedCourtId, day, t.start)?.status === 'AVAILABLE').length
    }
    acc[day] = count
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Turnos</h2>
        <p className="text-sm text-muted-foreground">Tocá un horario para habilitarlo o quitarlo</p>
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
                    ? 'bg-primary text-primary-foreground border-primary shadow-[0_0_12px_rgba(255,120,53,0.3)]'
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
                      ? 'bg-primary text-primary-foreground border-primary shadow-[0_0_12px_rgba(255,120,53,0.3)]'
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
                        ? 'bg-primary text-primary-foreground border-primary shadow-[0_0_12px_rgba(255,120,53,0.3)]'
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
              <span className="w-2.5 h-2.5 rounded-sm bg-muted/60 border border-border inline-block" />
              Sin cargar
            </span>
          </div>

          {/* ── Slot grid ── */}
          {isAllCourts ? (
            /* All courts view: full 11-slot interactive grid */
            <div className="grid grid-cols-2 gap-2">
              {PRESET_TIMES.map((time) => {
                const isAnyConfirmed = courts.some(c => findSlot(c.id, selectedDay, time.start)?.status === 'CONFIRMED')
                const availableCount = courts.filter(c => findSlot(c.id, selectedDay, time.start)?.status === 'AVAILABLE').length
                const allAvailable = availableCount === courts.length
                const isAnyProcessing = courts.some(c => processing.has(`${c.id}-${selectedDay}-${time.start}`))

                return (
                  <button
                    key={time.start}
                    onClick={() => handleToggleAll(time)}
                    disabled={isAnyConfirmed || isAnyProcessing}
                    className={`relative p-4 rounded-xl border text-left transition-all select-none ${
                      isAnyConfirmed
                        ? 'bg-primary/10 border-primary/40 cursor-default'
                        : allAvailable
                        ? 'bg-green-500/10 border-green-500/40 hover:bg-green-500/15 active:scale-95'
                        : availableCount > 0
                        ? 'bg-green-500/5 border-green-500/20 hover:bg-green-500/10 active:scale-95'
                        : 'bg-card border-border hover:border-primary/40 hover:bg-muted/30 active:scale-95'
                    } ${isAnyProcessing ? 'opacity-40 pointer-events-none' : ''}`}
                  >
                    <p className={`text-lg font-bold leading-none ${
                      isAnyConfirmed ? 'text-primary' : availableCount > 0 ? 'text-green-400' : 'text-muted-foreground'
                    }`}>
                      {time.start}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">hasta {time.end}</p>
                    {availableCount > 0 && (
                      <p className="text-[10px] text-green-500/70 mt-1 font-medium">
                        {availableCount}/{courts.length} canchas
                      </p>
                    )}
                    {(allAvailable || availableCount > 0) && !isAnyConfirmed && (
                      <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-green-500" />
                    )}
                    {isAnyProcessing && (
                      <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-card/50">
                        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          ) : (
            /* Single court view */
            <div className="grid grid-cols-2 gap-2">
              {PRESET_TIMES.map((time) => {
                const existing = findSlot(selectedCourtId, selectedDay, time.start)
                const key = `${selectedCourtId}-${selectedDay}-${time.start}`
                const isProcessing = processing.has(key)
                const isConfirmed = existing?.status === 'CONFIRMED'
                const isAvailable = existing?.status === 'AVAILABLE'

                return (
                  <button
                    key={time.start}
                    onClick={() => handleToggle(time)}
                    disabled={isProcessing || isConfirmed}
                    className={`relative p-4 rounded-xl border text-left transition-all select-none ${
                      isConfirmed
                        ? 'bg-primary/10 border-primary/40 cursor-default'
                        : isAvailable
                        ? 'bg-green-500/10 border-green-500/40 hover:bg-green-500/15 active:scale-95'
                        : 'bg-card border-border hover:border-primary/40 hover:bg-muted/30 active:scale-95'
                    } ${isProcessing ? 'opacity-40 pointer-events-none' : ''}`}
                  >
                    {/* Time label */}
                    <p className={`text-lg font-bold leading-none ${
                      isConfirmed ? 'text-primary' : isAvailable ? 'text-green-400' : 'text-muted-foreground'
                    }`}>
                      {time.start}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">hasta {time.end}</p>

                    {/* Match info for confirmed slots */}
                    {isConfirmed && existing?.matchAssignment && (
                      <p className="text-[10px] text-primary/70 mt-1.5 leading-tight">
                        {existing.matchAssignment.match?.couple1?.player1?.firstName} & {existing.matchAssignment.match?.couple1?.player2?.firstName}
                        {' vs '}
                        {existing.matchAssignment.match?.couple2?.player1?.firstName} & {existing.matchAssignment.match?.couple2?.player2?.firstName}
                      </p>
                    )}

                    {/* Status dot */}
                    {isAvailable && (
                      <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-green-500" />
                    )}

                    {/* Cancel button for confirmed */}
                    {isConfirmed && (
                      <button
                        onClick={(e) => handleCancelSlot(existing.id, e)}
                        className="absolute top-2 right-2 w-5 h-5 flex items-center justify-center rounded-full text-destructive hover:bg-destructive/10 transition-colors text-xs font-bold"
                        title="Cancelar turno"
                      >
                        ✕
                      </button>
                    )}

                    {/* Spinner */}
                    {isProcessing && (
                      <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-card/50">
                        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
