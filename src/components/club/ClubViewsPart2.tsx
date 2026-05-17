'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useAuthStore, apiFetch } from '@/store/auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  Trophy,
  Users,
  Plus,
  Trash2,
  UserPlus,
  X,
  Eye,
  EyeOff,
  Bell,
  BellRing,
  CheckCheck,
  CheckCircle2,
  XCircle,
} from 'lucide-react'
import { useNotificationStore } from '@/store/auth'
import { toast } from 'sonner'

/* ─── CLUB TOURNAMENTS ────────────────────────────── */
export function ClubTournaments() {
  const { token } = useAuthStore()
  const [tournaments, setTournaments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState({ name: '', startDate: '', endDate: '' })

  const load = useCallback(async () => {
    try {
      const data = await apiFetch('/api/club/tournaments', token)
      setTournaments(data)
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Error') }
    finally { setLoading(false) }
  }, [token])

  useEffect(() => { load() }, [load])

  const handleCreate = async () => {
    try {
      await apiFetch('/api/club/tournaments', token, {
        method: 'POST',
        body: JSON.stringify(form),
      })
      toast.success('Torneo creado')
      setDialogOpen(false)
      setForm({ name: '', startDate: '', endDate: '' })
      load()
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Error') }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este torneo? Se eliminarán parejas, partidos y preferencias asociadas.')) return
    try {
      await apiFetch(`/api/club/tournaments/${id}`, token, { method: 'DELETE' })
      toast.success('Torneo eliminado')
      load()
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Error') }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Torneos</h2>
          <p className="text-sm text-muted-foreground">Gestioná los torneos de tu club</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <Plus className="w-4 h-4 mr-2" /> Nuevo Torneo
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground">Nuevo Torneo</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Nombre</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-input border-border text-foreground" placeholder="Ej: Torneo Apertura 2025" />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Fecha inicio</Label>
                <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="bg-input border-border text-foreground" />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Fecha fin</Label>
                <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} className="bg-input border-border text-foreground" />
              </div>
              <Button onClick={handleCreate} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">Crear Torneo</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">Cargando...</p>
      ) : tournaments.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="p-8 text-center">
            <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No hay torneos. Creá el primero.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {tournaments.map((t) => (
            <Card key={t.id} className="bg-card border-border">
              <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-medium text-foreground">{t.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(t.startDate).toLocaleDateString('es-AR')} — {new Date(t.endDate).toLocaleDateString('es-AR')}
                  </p>
                  <div className="flex gap-2 mt-2">
                    <Badge variant="secondary" className="text-xs">{t._count?.couples || 0} parejas</Badge>
                    <Badge variant="secondary" className="text-xs">{t._count?.matches || 0} partidos</Badge>
                    <Badge variant="secondary" className="text-xs">{t.tournamentPlayers?.length || 0} inscriptos</Badge>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(t.id)}>
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

/* ─── CLUB PLAYERS ────────────────────────────── */
export function ClubPlayers() {
  const { token } = useAuthStore()
  const [players, setPlayers] = useState<any[]>([])
  const [tournaments, setTournaments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [enrollDialogOpen, setEnrollDialogOpen] = useState(false)
  const [selectedPlayer, setSelectedPlayer] = useState<any>(null)
  const [selectedTournament, setSelectedTournament] = useState('')

  // Two-step form state
  const [step, setStep] = useState<'lookup' | 'found' | 'create'>('lookup')
  const [dniInput, setDniInput] = useState('')
  const [lookupResult, setLookupResult] = useState<{ firstName: string; lastName: string; phone: string } | null>(null)
  const [createForm, setCreateForm] = useState({ firstName: '', lastName: '', phone: '', password: '' })
  const [submitting, setSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const load = useCallback(async () => {
    try {
      const [pData, tData] = await Promise.all([
        apiFetch('/api/club/players', token),
        apiFetch('/api/club/tournaments', token),
      ])
      setPlayers(pData)
      setTournaments(tData)
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Error') }
    finally { setLoading(false) }
  }, [token])

  useEffect(() => { load() }, [load])

  // Poll every 15s to catch membership confirmations from players
  useEffect(() => {
    const interval = setInterval(() => { load() }, 15000)
    return () => clearInterval(interval)
  }, [load])

  const resetDialog = () => {
    setStep('lookup')
    setDniInput('')
    setLookupResult(null)
    setCreateForm({ firstName: '', lastName: '', phone: '', password: '' })
    setSubmitting(false)
  }

  const handleLookup = async () => {
    const dni = dniInput.trim()
    if (!dni) { toast.error('Ingresá un DNI'); return }
    if (!/^\d+$/.test(dni)) { toast.error('El DNI debe ser numérico'); return }
    try {
      const data = await apiFetch(`/api/club/players/lookup?dni=${dni}`, token)
      if (data.found) {
        setLookupResult(data.player)
        setStep('found')
      } else {
        setLookupResult(null)
        setStep('create')
      }
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Error') }
  }

  const handleSendRequest = async () => {
    setSubmitting(true)
    try {
      await apiFetch('/api/club/players', token, {
        method: 'POST',
        body: JSON.stringify({ dni: dniInput.trim() }),
      })
      toast.success('Solicitud enviada. El jugador debe confirmar.')
      setDialogOpen(false)
      resetDialog()
      load()
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Error') }
    finally { setSubmitting(false) }
  }

  const handleCreate = async () => {
    setSubmitting(true)
    try {
      await apiFetch('/api/club/players', token, {
        method: 'POST',
        body: JSON.stringify({ dni: dniInput.trim(), ...createForm }),
      })
      toast.success('Jugador creado y agregado al club')
      setDialogOpen(false)
      resetDialog()
      load()
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Error') }
    finally { setSubmitting(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Quitar este jugador del club?')) return
    try {
      await apiFetch(`/api/club/players/${id}`, token, { method: 'DELETE' })
      toast.success('Jugador quitado del club')
      load()
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Error') }
  }

  const handleEnroll = async () => {
    if (!selectedPlayer || !selectedTournament) return
    try {
      await apiFetch('/api/club/tournament-players', token, {
        method: 'POST',
        body: JSON.stringify({ tournamentId: selectedTournament, playerId: selectedPlayer.id }),
      })
      toast.success('Jugador inscripto al torneo')
      setEnrollDialogOpen(false)
      load()
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Error') }
  }

  const handleUnenroll = async (tournamentId: string, playerId: string) => {
    try {
      await apiFetch('/api/club/tournament-players', token, {
        method: 'DELETE',
        body: JSON.stringify({ tournamentId, playerId }),
      })
      toast.success('Jugador removido del torneo')
      load()
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Error') }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Jugadores</h2>
          <p className="text-sm text-muted-foreground">Gestioná los jugadores de tu club</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetDialog() }}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <UserPlus className="w-4 h-4 mr-2" /> Agregar Jugador
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground">Agregar Jugador</DialogTitle>
            </DialogHeader>

            {step === 'lookup' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">DNI del jugador</Label>
                  <Input
                    value={dniInput}
                    onChange={(e) => setDniInput(e.target.value.replace(/\D/g, ''))}
                    className="bg-input border-border text-foreground"
                    placeholder="Ej: 30123456"
                    inputMode="numeric"
                  />
                </div>
                <Button onClick={handleLookup} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                  Buscar
                </Button>
              </div>
            )}

            {step === 'found' && lookupResult && (
              <div className="space-y-4">
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                  <p className="text-green-400 font-medium text-sm">Jugador encontrado</p>
                  <p className="text-foreground font-semibold mt-1">{lookupResult.firstName} {lookupResult.lastName}</p>
                  {lookupResult.phone && <p className="text-muted-foreground text-xs mt-0.5">Tel: {lookupResult.phone}</p>}
                </div>
                <p className="text-sm text-muted-foreground">Se enviará una solicitud de vinculación al jugador. Deberá confirmarla desde su panel.</p>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep('lookup')} className="flex-1 border-border text-muted-foreground">
                    Volver
                  </Button>
                  <Button onClick={handleSendRequest} disabled={submitting} className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground">
                    {submitting ? 'Enviando...' : 'Enviar solicitud'}
                  </Button>
                </div>
              </div>
            )}

            {step === 'create' && (
              <div className="space-y-4">
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                  <p className="text-yellow-400 text-sm font-medium">DNI no registrado</p>
                  <p className="text-muted-foreground text-xs mt-0.5">Completá los datos para crear el jugador.</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Nombre</Label>
                    <Input value={createForm.firstName} onChange={(e) => setCreateForm({ ...createForm, firstName: e.target.value })} className="bg-input border-border text-foreground" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Apellido</Label>
                    <Input value={createForm.lastName} onChange={(e) => setCreateForm({ ...createForm, lastName: e.target.value })} className="bg-input border-border text-foreground" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Teléfono (opcional)</Label>
                  <Input value={createForm.phone} onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })} className="bg-input border-border text-foreground" />
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Contraseña inicial</Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={createForm.password}
                      onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                      className="bg-input border-border text-foreground pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep('lookup')} className="flex-1 border-border text-muted-foreground">
                    Volver
                  </Button>
                  <Button onClick={handleCreate} disabled={submitting} className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground">
                    {submitting ? 'Creando...' : 'Crear jugador'}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">Cargando...</p>
      ) : players.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="p-8 text-center">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No hay jugadores confirmados. Agregá el primero.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {players.map((p) => (
            <Card key={p.id} className="bg-card border-border">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium text-foreground">{p.firstName} {p.lastName}</h3>
                    <p className="text-xs text-muted-foreground">DNI: {p.user?.username}</p>
                    {p.phone && <p className="text-xs text-muted-foreground">Tel: {p.phone}</p>}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {p.tournamentPlayers?.map((tp: any) => (
                        <Badge key={tp.id} variant="secondary" className="text-xs flex items-center gap-1">
                          {tp.tournament?.name || 'Torneo'}
                          <button onClick={() => handleUnenroll(tp.tournamentId, p.id)}>
                            <X className="w-3 h-3 hover:text-destructive" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => { setSelectedPlayer(p); setEnrollDialogOpen(true) }}>
                      <Trophy className="w-4 h-4 text-primary" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Enroll dialog - modal={false} so Select dropdowns work */}
      <Dialog modal={false} open={enrollDialogOpen} onOpenChange={setEnrollDialogOpen}>
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
            <DialogTitle className="text-foreground">Inscribir a Torneo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Inscribir a <span className="text-foreground font-medium">{selectedPlayer?.firstName} {selectedPlayer?.lastName}</span>
            </p>
            <Select value={selectedTournament} onValueChange={setSelectedTournament}>
              <SelectTrigger className="bg-input border-border text-foreground w-full">
                <SelectValue placeholder="Seleccioná un torneo" />
              </SelectTrigger>
              <SelectContent>
                {tournaments.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleEnroll} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" disabled={!selectedTournament}>
              Inscribir
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* ─── CLUB NOTIFICATIONS ────────────────────────────── */
export function ClubNotifications() {
  const { token } = useAuthStore()
  const { setUnreadCount } = useNotificationStore()
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const data = await apiFetch('/api/club/notifications', token)
      setNotifications(data)
      setUnreadCount(data.filter((n: any) => !n.read).length)
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Error') }
    finally { setLoading(false) }
  }, [token])

  useEffect(() => { load() }, [load])

  const markAllRead = async () => {
    try {
      await apiFetch('/api/club/notifications', token, {
        method: 'PUT',
        body: JSON.stringify({ markAllRead: true }),
      })
      setUnreadCount(0)
      toast.success('Todas las notificaciones marcadas como leídas')
      load()
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Error') }
  }

  const markAsRead = async (id: string) => {
    try {
      await apiFetch('/api/club/notifications', token, {
        method: 'PUT',
        body: JSON.stringify({ notificationIds: [id] }),
      })
      setUnreadCount(Math.max(0, notifications.filter((n) => !n.read).length - 1))
      load()
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Error') }
  }

  const unreadCount = notifications.filter((n) => !n.read).length

  const typeIcon = (type: string) => {
    if (type === 'SLOT_CONFIRMED') return <CheckCircle2 className="w-4 h-4 text-green-500" />
    if (type === 'PASSWORD_RESET') return <Bell className="w-4 h-4 text-yellow-500" />
    if (type === 'SLOT_CANCELLED') return <XCircle className="w-4 h-4 text-destructive" />
    return <BellRing className="w-4 h-4 text-primary" />
  }

  const typeBg = (type: string) => {
    if (type === 'SLOT_CONFIRMED') return 'bg-green-500/10'
    if (type === 'PASSWORD_RESET') return 'bg-yellow-500/10'
    if (type === 'SLOT_CANCELLED') return 'bg-destructive/10'
    return 'bg-primary/10'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Notificaciones</h2>
          <p className="text-sm text-muted-foreground">Avisos sobre tu club</p>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={markAllRead}
            className="border-border text-muted-foreground hover:text-foreground"
          >
            <CheckCheck className="w-4 h-4 mr-1" />
            Marcar todas como leídas
          </Button>
        )}
      </div>

      {loading ? (
        <p className="text-muted-foreground">Cargando...</p>
      ) : notifications.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="p-8 text-center">
            <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No hay notificaciones</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <Card key={n.id} className={`bg-card border-border transition-colors ${!n.read ? 'border-primary/30 bg-primary/[0.02]' : ''}`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${typeBg(n.type)}`}>
                    {typeIcon(n.type)}
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm ${!n.read ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>{n.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(n.createdAt).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  {!n.read && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => markAsRead(n.id)}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Marcar leída
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
