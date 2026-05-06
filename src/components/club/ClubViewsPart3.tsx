'use client'

import React, { useEffect, useState, useCallback, useRef } from 'react'
import { useAuthStore, apiFetch } from '@/store/auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  const dialogRef = useRef<HTMLDivElement>(null)

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
          <Dialog open={dialogOpen} onOpenChange={(open) => {
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
            <DialogContent className="bg-card border-border">
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
                <div ref={dialogRef} className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Jugador 1</Label>
                    <Select value={player1Id} onValueChange={setPlayer1Id}>
                      <SelectTrigger className="bg-input border-border text-foreground w-full">
                        <SelectValue placeholder="Seleccioná jugador" />
                      </SelectTrigger>
                      <SelectContent container={dialogRef.current}>
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
                      <SelectContent container={dialogRef.current}>
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
  const dialogRef = useRef<HTMLDivElement>(null)

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
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                <Plus className="w-4 h-4 mr-2" /> Nuevo Partido
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle className="text-foreground">Nuevo Partido</DialogTitle>
              </DialogHeader>
              <div ref={dialogRef} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Pareja 1</Label>
                  <Select value={couple1Id} onValueChange={setCouple1Id}>
                    <SelectTrigger className="bg-input border-border text-foreground w-full">
                      <SelectValue placeholder="Seleccioná pareja" />
                    </SelectTrigger>
                    <SelectContent container={dialogRef.current}>
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
                    <SelectContent container={dialogRef.current}>
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
export function ClubSlots() {
  const { token } = useAuthStore()
  const [slots, setSlots] = useState<any[]>([])
  const [courts, setCourts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState({ day: '', startTime: '', endTime: '', courtId: '' })
  const dialogRef = useRef<HTMLDivElement>(null)

  const loadData = useCallback(async () => {
    try {
      const [slotData, courtData] = await Promise.all([
        apiFetch('/api/club/slots', token),
        apiFetch('/api/club/courts', token),
      ])
      setSlots(slotData)
      setCourts(courtData)
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Error') }
    finally { setLoading(false) }
  }, [token])

  useEffect(() => { loadData() }, [loadData])

  const handleCreate = async () => {
    try {
      await apiFetch('/api/club/slots', token, {
        method: 'POST',
        body: JSON.stringify(form),
      })
      toast.success('Turno creado')
      setDialogOpen(false)
      setForm({ day: '', startTime: '', endTime: '', courtId: '' })
      loadData()
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Error') }
  }

  const handleCancel = async (id: string) => {
    if (!confirm('¿Cancelar este turno? Si estaba confirmado, los jugadores serán notificados.')) return
    try {
      await apiFetch(`/api/club/slots/${id}`, token, {
        method: 'PUT',
        body: JSON.stringify({ status: 'CANCELLED' }),
      })
      toast.success('Turno cancelado')
      loadData()
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Error') }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este turno?')) return
    try {
      await apiFetch(`/api/club/slots/${id}`, token, { method: 'DELETE' })
      toast.success('Turno eliminado')
      loadData()
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Error') }
  }

  const statusColors: Record<string, string> = {
    AVAILABLE: 'bg-green-500/10 text-green-500',
    CONFIRMED: 'bg-primary/10 text-primary',
    CANCELLED: 'bg-destructive/10 text-destructive',
  }
  const statusLabels: Record<string, string> = {
    AVAILABLE: 'Disponible',
    CONFIRMED: 'Confirmado',
    CANCELLED: 'Cancelado',
  }

  // Group slots by day
  const slotsByDay = slots.reduce((acc: Record<string, any[]>, slot: any) => {
    if (!acc[slot.day]) acc[slot.day] = []
    acc[slot.day].push(slot)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Turnos</h2>
          <p className="text-sm text-muted-foreground">Gestioná los turnos disponibles de tu club</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <Plus className="w-4 h-4 mr-2" /> Nuevo Turno
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground">Nuevo Turno</DialogTitle>
            </DialogHeader>
            <div ref={dialogRef} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Día</Label>
                <Input type="date" value={form.day} onChange={(e) => setForm({ ...form, day: e.target.value })} className="bg-input border-border text-foreground" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Hora inicio</Label>
                  <Input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} className="bg-input border-border text-foreground" />
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Hora fin</Label>
                  <Input type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} className="bg-input border-border text-foreground" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Cancha</Label>
                <Select value={form.courtId} onValueChange={(v) => setForm({ ...form, courtId: v })}>
                  <SelectTrigger className="bg-input border-border text-foreground w-full">
                    <SelectValue placeholder="Seleccioná cancha" />
                  </SelectTrigger>
                  <SelectContent container={dialogRef.current}>
                    {courts.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleCreate} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" disabled={!form.day || !form.startTime || !form.endTime || !form.courtId}>
                Crear Turno
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">Cargando...</p>
      ) : slots.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="p-8 text-center">
            <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No hay turnos. Creá el primero.</p>
          </CardContent>
        </Card>
      ) : (
        Object.entries(slotsByDay)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([day, daySlots]) => (
            <Card key={day} className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-foreground text-base">
                  {new Date(day + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(daySlots as any[])
                  .sort((a: any, b: any) => a.startTime.localeCompare(b.startTime))
                  .map((slot: any) => (
                    <div key={slot.id} className="flex items-center justify-between bg-muted/30 rounded-lg p-3">
                      <div className="flex items-center gap-3">
                        <div>
                          <p className="text-foreground font-medium text-sm">{slot.startTime} – {slot.endTime}</p>
                          <p className="text-xs text-muted-foreground">{slot.court?.name}</p>
                          {slot.matchAssignment && !slot.matchAssignment.cancelledAt && (
                            <p className="text-xs text-primary mt-1">
                              {slot.matchAssignment.match?.couple1?.player1?.firstName} & {slot.matchAssignment.match?.couple1?.player2?.firstName} vs {slot.matchAssignment.match?.couple2?.player1?.firstName} & {slot.matchAssignment.match?.couple2?.player2?.firstName}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={statusColors[slot.status] || ''}>{statusLabels[slot.status] || slot.status}</Badge>
                        {slot.status === 'CONFIRMED' && (
                          <Button variant="ghost" size="sm" onClick={() => handleCancel(slot.id)} className="text-destructive text-xs">
                            Cancelar
                          </Button>
                        )}
                        {slot.status === 'AVAILABLE' && (
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(slot.id)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
              </CardContent>
            </Card>
          ))
      )}
    </div>
  )
}
