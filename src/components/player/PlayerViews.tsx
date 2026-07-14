'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useAuthStore, useViewStore, useNotificationStore, apiFetch } from '@/store/auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Trophy,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Bell,
  BellRing,
  CheckCheck,
  Building2,
  CalendarPlus,
} from 'lucide-react'
import { toast } from 'sonner'

// Helper: determine if a player is in a couple
function isPlayerInCouple(couple: any, playerId: string) {
  return couple.player1Id === playerId || couple.player2Id === playerId
}

/* ─── PLAYER TOURNAMENTS ────────────────────────────── */
export function PlayerTournaments() {
  const { token, user } = useAuthStore()
  const [tournaments, setTournaments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [playerId, setPlayerId] = useState('')

  const load = useCallback(async () => {
    try {
      const meData = await apiFetch('/api/auth/me', token)
      setPlayerId(meData.playerId || '')
      const data = await apiFetch('/api/player/tournaments', token)
      setTournaments(data.tournaments || [])
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Error') }
    finally { setLoading(false) }
  }, [token])

  useEffect(() => { load() }, [load])

  if (loading) return <p className="text-muted-foreground">Cargando...</p>

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Mis Torneos</h2>
        <p className="text-sm text-muted-foreground">Torneos en los que participás</p>
      </div>

      {tournaments.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="p-8 text-center">
            <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No estás inscripto en ningún torneo</p>
          </CardContent>
        </Card>
      ) : (
        tournaments.map((t) => (
          <Card key={t.id} className="bg-card border-border">
            <CardHeader className="pb-3">
              <div>
                <CardTitle className="text-foreground text-lg">{t.name}</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {t.club?.name} · {new Date(t.startDate).toLocaleDateString('es-AR')} — {new Date(t.endDate).toLocaleDateString('es-AR')}
                </p>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {t.matches.length === 0 ? (
                <p className="text-sm text-muted-foreground">No tenés partidos asignados en este torneo</p>
              ) : (
                t.matches.map((m: any) => {
                  const myPrefs = m.mySlotPreferences || []
                  const isConfirmed = m.matchAssignment && !m.matchAssignment.cancelledAt
                  const hasPrefs = myPrefs.length > 0

                  // Determine opponent couple
                  const inCouple1 = isPlayerInCouple(m.couple1, playerId)
                  const opponentCouple = inCouple1 ? m.couple2 : m.couple1

                  let statusIcon, statusLabel, statusColor
                  if (isConfirmed) {
                    statusIcon = <CheckCircle2 className="w-4 h-4" />
                    statusLabel = 'Confirmado'
                    statusColor = 'text-green-500'
                  } else if (hasPrefs) {
                    statusIcon = <AlertCircle className="w-4 h-4" />
                    statusLabel = 'Pendiente de coincidencia'
                    statusColor = 'text-yellow-500'
                  } else {
                    statusIcon = <XCircle className="w-4 h-4" />
                    statusLabel = 'Falta marcar turnos'
                    statusColor = 'text-destructive'
                  }

                  return (
                    <div key={m.id} className="bg-muted/30 rounded-lg p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-foreground font-medium text-sm">
                            vs {opponentCouple?.player1?.firstName} {opponentCouple?.player1?.lastName} & {opponentCouple?.player2?.firstName} {opponentCouple?.player2?.lastName}
                          </p>
                          <div className={`flex items-center gap-1 mt-1 text-sm ${statusColor}`}>
                            {statusIcon}
                            <span>{statusLabel}</span>
                          </div>
                          {isConfirmed && (
                            <p className="text-sm text-primary mt-1">
                              🏸 {m.matchAssignment.slot.day} · {m.matchAssignment.slot.startTime}–{m.matchAssignment.slot.endTime} · {m.matchAssignment.slot.court?.name}
                            </p>
                          )}
                          {hasPrefs && !isConfirmed && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Marcaste {myPrefs.length} turno{myPrefs.length !== 1 ? 's' : ''}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
}

/* ─── PLAYER MATCHES (slot selection) ────────────────────────────── */
export function PlayerMatches() {
  const { token } = useAuthStore()
  const [tournaments, setTournaments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSlots, setSelectedSlots] = useState<Record<string, Set<string>>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const [savedMatches, setSavedMatches] = useState<Set<string>>(new Set())
  const [playerId, setPlayerId] = useState('')

  const load = useCallback(async () => {
    try {
      const meData = await apiFetch('/api/auth/me', token)
      setPlayerId(meData.playerId || '')
      const data = await apiFetch('/api/player/tournaments', token)
      setTournaments(data.tournaments || [])
      // Initialize selected slots from existing preferences
      const initial: Record<string, Set<string>> = {}
      ;(data.tournaments || []).forEach((t: any) => {
        t.matches.forEach((m: any) => {
          if (m.mySlotPreferences && m.mySlotPreferences.length > 0) {
            initial[m.id] = new Set(m.mySlotPreferences.map((p: any) => `${p.day}|${p.startTime}|${p.endTime}`))
          }
        })
      })
      setSelectedSlots(initial)
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Error') }
    finally { setLoading(false) }
  }, [token])

  useEffect(() => { load() }, [load])

  const toggleSlot = (matchId: string, slotKey: string) => {
    setSavedMatches(prev => { const s = new Set(prev); s.delete(matchId); return s })
    setSelectedSlots((prev) => {
      const newSet = new Set(prev[matchId] || [])
      if (newSet.has(slotKey)) {
        newSet.delete(slotKey)
      } else {
        newSet.add(slotKey)
      }
      return { ...prev, [matchId]: newSet }
    })
  }

  const savePreferences = async (matchId: string) => {
    const slots = Array.from(selectedSlots[matchId] || []).map((key) => {
      const [day, startTime, endTime] = key.split('|')
      return { day, startTime, endTime }
    })
    if (slots.length === 0) {
      toast.error('Seleccioná al menos un turno')
      return
    }
    setSaving(matchId)
    try {
      await apiFetch('/api/player/preferences', token, {
        method: 'POST',
        body: JSON.stringify({ matchId, slots }),
      })
      toast.success('Preferencias guardadas')
      setSavedMatches(prev => new Set(prev).add(matchId))
      load()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error')
    } finally {
      setSaving(null)
    }
  }

  if (loading) return <p className="text-muted-foreground">Cargando...</p>

  const allMatches: any[] = []
  tournaments.forEach((t: any) => {
    t.matches.forEach((m: any) => {
      allMatches.push({ ...m, tournament: t, club: t.club, availableSlots: t.availableSlots })
    })
  })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Mis Partidos</h2>
        <p className="text-sm text-muted-foreground">Seleccioná los turnos que te convienen</p>
      </div>

      {allMatches.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="p-8 text-center">
            <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No tenés partidos asignados</p>
          </CardContent>
        </Card>
      ) : (
        allMatches.map((m) => {
          const isConfirmed = m.matchAssignment && !m.matchAssignment.cancelledAt
          const currentSelected = selectedSlots[m.id] || new Set()
          const availableSlots = m.availableSlots || []
          const inCouple1 = isPlayerInCouple(m.couple1, playerId)
          const opponentCouple = inCouple1 ? m.couple2 : m.couple1

          // Team availability (all 4 players) for coordination when there's no common slot yet
          const teamPreferences = m.teamPreferences || []
          const otherPlayers = teamPreferences.filter((p: any) => !p.isMe)
          const totalOthers = otherPlayers.length
          // How many of the OTHER players picked each slot key
          const othersBySlot: Record<string, number> = {}
          otherPlayers.forEach((p: any) =>
            (p.slots || []).forEach((s: any) => {
              const k = `${s.day}|${s.startTime}|${s.endTime}`
              othersBySlot[k] = (othersBySlot[k] || 0) + 1
            })
          )

          // Group available slots by day
          const slotsByDay: Record<string, any[]> = {}
          availableSlots.forEach((s: any) => {
            if (!slotsByDay[s.day]) slotsByDay[s.day] = []
            const key = `${s.day}|${s.startTime}|${s.endTime}`
            if (!slotsByDay[s.day].find((x: any) => `${x.day}|${x.startTime}|${x.endTime}` === key)) {
              slotsByDay[s.day].push(s)
            }
          })

          return (
            <Card key={m.id} className="bg-card border-border">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-foreground text-base">
                      {m.tournament?.name}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {m.club?.name}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      vs {opponentCouple?.player1?.firstName} {opponentCouple?.player1?.lastName} & {opponentCouple?.player2?.firstName} {opponentCouple?.player2?.lastName}
                    </p>
                  </div>
                  {isConfirmed ? (
                    <Badge className="bg-green-500/10 text-green-500"><CheckCircle2 className="w-3 h-3 mr-1" />Confirmado</Badge>
                  ) : currentSelected.size > 0 ? (
                    <Badge className="bg-yellow-500/10 text-yellow-500"><AlertCircle className="w-3 h-3 mr-1" />Pendiente</Badge>
                  ) : (
                    <Badge className="bg-destructive/10 text-destructive"><XCircle className="w-3 h-3 mr-1" />Sin elegir</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {isConfirmed ? (
                  <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-4">
                    <p className="text-green-500 font-medium">¡Turno confirmado!</p>
                    <p className="text-sm text-foreground mt-1">
                      🏸 {m.matchAssignment.slot.day} · {m.matchAssignment.slot.startTime}–{m.matchAssignment.slot.endTime} · {m.matchAssignment.slot.court?.name}
                    </p>
                    {m.club?.name && (
                      <p className="text-xs text-muted-foreground mt-1">
                        📍 {m.club.name}
                      </p>
                    )}
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground mb-3">
                      Seleccioná los horarios en los que podés jugar:
                    </p>
                    {Object.keys(slotsByDay).length === 0 ? (
                      <p className="text-sm text-muted-foreground">No hay turnos disponibles</p>
                    ) : (
                      <div className="space-y-3">
                        {Object.entries(slotsByDay)
                          .sort(([a], [b]) => a.localeCompare(b))
                          .map(([day, daySlots]) => (
                            <div key={day}>
                              <p className="text-sm font-medium text-foreground mb-2">
                                {new Date(day + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
                              </p>
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {daySlots
                                  .sort((a: any, b: any) => a.startTime.localeCompare(b.startTime))
                                  .map((slot: any) => {
                                    const key = `${slot.day}|${slot.startTime}|${slot.endTime}`
                                    const isSelected = currentSelected.has(key)
                                    const othersCount = othersBySlot[key] || 0
                                    // All other players already chose this slot → picking it confirms the match
                                    const allOthersHere = totalOthers > 0 && othersCount === totalOthers
                                    return (
                                      <button
                                        key={key}
                                        onClick={() => toggleSlot(m.id, key)}
                                        className={`p-3 rounded-lg border text-sm transition-all ${
                                          isSelected
                                            ? 'bg-primary/20 border-primary text-primary font-medium'
                                            : allOthersHere
                                            ? 'bg-green-500/10 border-green-500/40 text-green-500 hover:border-green-500'
                                            : 'bg-muted/30 border-border text-muted-foreground hover:border-primary/50'
                                        }`}
                                      >
                                        <p className="font-medium">{slot.startTime} – {slot.endTime}</p>
                                        {totalOthers > 0 ? (
                                          <p className={`text-xs mt-0.5 ${allOthersHere ? 'font-medium' : 'opacity-70'}`}>
                                            {allOthersHere
                                              ? '✓ Los otros 3 pueden'
                                              : `${othersCount}/${totalOthers} compañeros`}
                                          </p>
                                        ) : (
                                          <p className="text-xs mt-0.5 opacity-70">Canchas disponibles</p>
                                        )}
                                      </button>
                                    )
                                  })}
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                    {teamPreferences.length > 0 && (
                      <div className="mt-4 rounded-lg border border-border bg-muted/20 p-3">
                        <p className="text-xs font-medium text-foreground mb-2">Disponibilidad del equipo</p>
                        <div className="space-y-2">
                          {teamPreferences.map((p: any) => (
                            <div key={p.playerId} className="flex flex-col gap-1">
                              <span className="text-xs text-muted-foreground">
                                {p.isMe ? 'Vos' : `${p.firstName} ${p.lastName}`}
                              </span>
                              {(p.slots || []).length === 0 ? (
                                <span className="text-xs text-destructive/80">Sin cargar aún</span>
                              ) : (
                                <div className="flex flex-wrap gap-1">
                                  {(p.slots || [])
                                    .slice()
                                    .sort((a: any, b: any) =>
                                      (a.day + a.startTime).localeCompare(b.day + b.startTime)
                                    )
                                    .map((s: any) => (
                                      <span
                                        key={`${p.playerId}-${s.day}-${s.startTime}`}
                                        className="px-1.5 py-0.5 rounded bg-muted/50 text-[11px] text-muted-foreground"
                                      >
                                        {new Date(s.day + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'numeric' })} {s.startTime}
                                      </span>
                                    ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {savedMatches.has(m.id) ? (
                      <div className="w-full mt-4 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-green-500/10 border border-green-500/20 text-green-500 text-sm font-medium">
                        <CheckCircle2 className="w-4 h-4" />
                        Preferencias enviadas · podés modificarlas arriba
                      </div>
                    ) : (
                      <Button
                        onClick={() => savePreferences(m.id)}
                        className="w-full mt-4 bg-primary hover:bg-primary/90 text-primary-foreground"
                        disabled={saving === m.id || currentSelected.size === 0}
                      >
                        {saving === m.id ? 'Guardando...' : `Confirmar ${currentSelected.size} turno${currentSelected.size !== 1 ? 's' : ''}`}
                      </Button>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          )
        })
      )}
    </div>
  )
}

/* ─── PLAYER MEMBERSHIPS ────────────────────────────── */
export function PlayerMemberships() {
  const { token } = useAuthStore()
  const [memberships, setMemberships] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const data = await apiFetch('/api/player/memberships', token)
      setMemberships(data)
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Error') }
    finally { setLoading(false) }
  }, [token])

  useEffect(() => { load() }, [load])

  const handleAction = async (id: string, action: 'CONFIRM' | 'REJECT') => {
    setActing(id)
    try {
      await apiFetch(`/api/player/memberships/${id}`, token, {
        method: 'PUT',
        body: JSON.stringify({ action }),
      })
      toast.success(action === 'CONFIRM' ? 'Te uniste al club' : 'Solicitud rechazada')
      load()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error')
    } finally {
      setActing(null)
    }
  }

  const statusBadge = (status: string) => {
    if (status === 'CONFIRMED') return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/15 text-green-400">Confirmado</span>
    if (status === 'REJECTED') return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-destructive/15 text-destructive">Rechazado</span>
    return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-500/15 text-yellow-400">Pendiente</span>
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Mis Clubes</h2>
        <p className="text-sm text-muted-foreground">Clubes en los que participás o tenés solicitudes pendientes</p>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Cargando...</p>
      ) : memberships.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="p-8 text-center">
            <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No tenés clubes vinculados</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {memberships.map((m) => (
            <Card key={m.id} className="bg-card border-border">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-foreground">{m.club?.name}</h3>
                      {statusBadge(m.status)}
                    </div>
                    {m.club?.address && (
                      <p className="text-xs text-muted-foreground mt-1">{m.club.address}</p>
                    )}
                  </div>
                  {m.status === 'PENDING' && (
                    <div className="flex gap-2 flex-shrink-0">
                      <Button
                        size="sm"
                        onClick={() => handleAction(m.id, 'CONFIRM')}
                        disabled={acting === m.id}
                        className="bg-green-500 hover:bg-green-600 text-white text-xs"
                      >
                        {acting === m.id ? '...' : 'Confirmar'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAction(m.id, 'REJECT')}
                        disabled={acting === m.id}
                        className="border-destructive text-destructive hover:bg-destructive/10 text-xs"
                      >
                        Rechazar
                      </Button>
                    </div>
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

/* ─── PLAYER NOTIFICATIONS ────────────────────────────── */
export function PlayerNotifications() {
  const { token } = useAuthStore()
  const { setUnreadCount } = useNotificationStore()
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const data = await apiFetch('/api/player/notifications', token)
      setNotifications(data)
      // Sync badge count immediately
      setUnreadCount(data.filter((n: any) => !n.read).length)
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Error') }
    finally { setLoading(false) }
  }, [token])

  useEffect(() => { load() }, [load])

  const markAllRead = async () => {
    try {
      await apiFetch('/api/player/notifications', token, {
        method: 'PUT',
        body: JSON.stringify({ markAllRead: true }),
      })
      // Update badge immediately before re-fetching
      setUnreadCount(0)
      toast.success('Todas las notificaciones marcadas como leídas')
      load()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error')
    }
  }

  const markAsRead = async (id: string) => {
    try {
      await apiFetch('/api/player/notifications', token, {
        method: 'PUT',
        body: JSON.stringify({ notificationIds: [id] }),
      })
      // Update badge immediately
      setUnreadCount(Math.max(0, notifications.filter((n) => !n.read).length - 1))
      load()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error')
    }
  }

  const unreadCount = notifications.filter((n) => !n.read).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Notificaciones</h2>
          <p className="text-sm text-muted-foreground">Avisos sobre tus turnos</p>
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
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    n.type === 'SLOT_CONFIRMED' ? 'bg-green-500/10' : n.type === 'SLOT_CANCELLED' ? 'bg-destructive/10' : 'bg-primary/10'
                  }`}>
                    {n.type === 'SLOT_CONFIRMED' ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    ) : n.type === 'SLOT_CANCELLED' ? (
                      <XCircle className="w-4 h-4 text-destructive" />
                    ) : (
                      <BellRing className="w-4 h-4 text-primary" />
                    )}
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

/* ─── PLAYER BOOKINGS (reserva eventual, autoservicio) ────────────────────────────── */
export function PlayerBookings() {
  const { token, user } = useAuthStore()
  const emailVerified = user?.emailVerified !== false // undefined (legacy) treated as verified
  const [clubs, setClubs] = useState<any[]>([])
  const [selectedClubId, setSelectedClubId] = useState('')
  const [slotsByDay, setSlotsByDay] = useState<any[]>([])
  const [selectedSlot, setSelectedSlot] = useState<any>(null)
  const [myBookings, setMyBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [booking, setBooking] = useState(false)
  const [resending, setResending] = useState(false)

  const loadClubsAndBookings = useCallback(async () => {
    try {
      const [allClubs, bookings] = await Promise.all([
        apiFetch('/api/player/clubs', token),
        apiFetch('/api/player/bookings', token),
      ])
      setClubs(allClubs)
      setMyBookings(bookings)
      if (allClubs.length > 0) {
        setSelectedClubId((prev) => prev || allClubs[0].id)
      }
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Error') }
    finally { setLoading(false) }
  }, [token])

  useEffect(() => { loadClubsAndBookings() }, [loadClubsAndBookings])

  const handleResend = async () => {
    if (!user?.email) {
      toast.message('Revisá tu bandeja de entrada (y spam).')
      return
    }
    setResending(true)
    try {
      await apiFetch('/api/auth/resend-verification', token, {
        method: 'POST',
        body: JSON.stringify({ email: user.email }),
      })
      toast.success('Te reenviamos el correo de verificación')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error')
    } finally {
      setResending(false)
    }
  }

  const loadSlots = useCallback(async () => {
    if (!selectedClubId) return
    setSlotsLoading(true)
    setSelectedSlot(null)
    try {
      const data = await apiFetch(`/api/player/slots?clubId=${selectedClubId}`, token)
      setSlotsByDay(data.slotsByDay || [])
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Error') }
    finally { setSlotsLoading(false) }
  }, [token, selectedClubId])

  useEffect(() => { loadSlots() }, [loadSlots])

  const handleReserve = async () => {
    if (!selectedSlot) return
    setBooking(true)
    try {
      await apiFetch('/api/player/bookings', token, {
        method: 'POST',
        body: JSON.stringify({ slotId: selectedSlot.id }),
      })
      toast.success('Turno reservado')
      setSelectedSlot(null)
      loadSlots()
      loadClubsAndBookings()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error')
    } finally {
      setBooking(false)
    }
  }

  if (loading) return <p className="text-muted-foreground">Cargando...</p>

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Reservar Turno</h2>
        <p className="text-sm text-muted-foreground">Reservá un turno suelto en cualquier club</p>
      </div>

      {!emailVerified && (
        <Card className="bg-yellow-500/5 border-yellow-500/30">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-foreground font-medium">Verificá tu email para poder reservar</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Te enviamos un correo de verificación al registrarte.
              </p>
              <button
                type="button"
                onClick={handleResend}
                disabled={resending}
                className="text-xs text-primary hover:underline font-medium mt-2"
              >
                {resending ? 'Reenviando...' : 'Reenviar correo'}
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {clubs.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="p-8 text-center">
            <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No hay clubes disponibles todavía</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {clubs.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {clubs.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedClubId(c.id)}
                  className={`flex-shrink-0 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                    selectedClubId === c.id
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground'
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          )}

          <Card className="bg-card border-border">
            <CardContent className="p-4">
              {slotsLoading ? (
                <p className="text-sm text-muted-foreground">Cargando turnos...</p>
              ) : slotsByDay.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay turnos disponibles en este club</p>
              ) : (
                <div className="space-y-3">
                  {slotsByDay.map((d: any) => (
                    <div key={d.day}>
                      <p className="text-sm font-medium text-foreground mb-2">
                        {new Date(d.day + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {d.slots
                          .sort((a: any, b: any) => a.startTime.localeCompare(b.startTime))
                          .map((slot: any) => {
                            // Taken slots show only as "Reservado" — never who reserved (privacy)
                            if (slot.available === false) {
                              return (
                                <div
                                  key={slot.id}
                                  className="p-3 rounded-lg border border-border bg-muted/10 text-sm opacity-60 cursor-not-allowed select-none"
                                >
                                  <p className="font-medium text-muted-foreground">{slot.startTime} – {slot.endTime}</p>
                                  <p className="text-xs mt-0.5 opacity-70">{slot.court?.name}</p>
                                  <p className="text-xs mt-0.5 font-semibold text-amber-400/80">Reservado</p>
                                </div>
                              )
                            }
                            const isSelected = selectedSlot?.id === slot.id
                            return (
                              <button
                                key={slot.id}
                                onClick={() => setSelectedSlot({ ...slot, day: d.day })}
                                className={`p-3 rounded-lg border text-sm transition-all ${
                                  isSelected
                                    ? 'bg-primary/20 border-primary text-primary font-medium'
                                    : 'bg-muted/30 border-border text-muted-foreground hover:border-primary/50'
                                }`}
                              >
                                <p className="font-medium">{slot.startTime} – {slot.endTime}</p>
                                <p className="text-xs mt-0.5 opacity-70">{slot.court?.name}</p>
                                {typeof slot.price === 'number' && (
                                  <p className="text-xs mt-0.5 font-semibold text-primary">${slot.price}</p>
                                )}
                              </button>
                            )
                          })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {selectedSlot && (
                <Button
                  onClick={handleReserve}
                  disabled={booking || !emailVerified}
                  className="w-full mt-4 bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  <CalendarPlus className="w-4 h-4 mr-1.5" />
                  {!emailVerified
                    ? 'Verificá tu email para reservar'
                    : booking ? 'Reservando...' : 'Reservar este turno'}
                </Button>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Tus reservas</h3>
        {myBookings.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tenés reservas eventuales todavía</p>
        ) : (
          <div className="space-y-2">
            {myBookings.map((b) => (
              <Card key={b.id} className="bg-card border-border">
                <CardContent className="p-4">
                  <p className="text-sm text-foreground font-medium">
                    🏸 {b.slot.day} · {b.slot.startTime}–{b.slot.endTime} · {b.slot.court?.name}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    📍 {b.slot.club?.name} · Para cancelar, contactá al club
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── PLAYER ONBOARDING (completar perfil post-verificación) ────────────────────────────── */
export function PlayerOnboarding() {
  const { token, updateUser } = useAuthStore()
  const { setView } = useViewStore()
  const [birthDate, setBirthDate] = useState('')
  const [saving, setSaving] = useState(false)

  const finish = () => setView('player-memberships')

  const handleSave = async () => {
    setSaving(true)
    try {
      await apiFetch('/api/player/profile', token, {
        method: 'PATCH',
        body: JSON.stringify({ birthDate: birthDate || null }),
      })
      updateUser({ birthDate: birthDate || null })
      toast.success('Perfil actualizado')
      finish()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground">¡Hola! 👋</h2>
        <p className="text-sm text-muted-foreground mt-1">Completá tu perfil para terminar</p>
      </div>

      <Card className="bg-card border-border">
        <CardContent className="p-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="birthDate" className="text-muted-foreground">Fecha de nacimiento</Label>
            <Input
              id="birthDate"
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className="bg-input border-border text-foreground h-11"
            />
            <p className="text-xs text-muted-foreground">Podés completarla ahora o más tarde.</p>
          </div>

          <Button
            onClick={handleSave}
            disabled={saving || !birthDate}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-11 font-medium"
          >
            {saving ? 'Guardando...' : 'Finalizar'}
          </Button>
          <Button
            variant="outline"
            onClick={finish}
            className="w-full border-border text-muted-foreground hover:text-foreground"
          >
            Omitir por ahora
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
