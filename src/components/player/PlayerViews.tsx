'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useAuthStore, apiFetch } from '@/store/auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Trophy,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Bell,
  BellRing,
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
                                    return (
                                      <button
                                        key={key}
                                        onClick={() => toggleSlot(m.id, key)}
                                        className={`p-3 rounded-lg border text-sm transition-all ${
                                          isSelected
                                            ? 'bg-primary/20 border-primary text-primary font-medium'
                                            : 'bg-muted/30 border-border text-muted-foreground hover:border-primary/50'
                                        }`}
                                      >
                                        <p className="font-medium">{slot.startTime} – {slot.endTime}</p>
                                        <p className="text-xs mt-0.5 opacity-70">Canchas disponibles</p>
                                      </button>
                                    )
                                  })}
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                    <Button
                      onClick={() => savePreferences(m.id)}
                      className="w-full mt-4 bg-primary hover:bg-primary/90 text-primary-foreground"
                      disabled={saving === m.id || currentSelected.size === 0}
                    >
                      {saving === m.id ? 'Guardando...' : `Confirmar ${currentSelected.size} turno${currentSelected.size !== 1 ? 's' : ''}`}
                    </Button>
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

/* ─── PLAYER NOTIFICATIONS ────────────────────────────── */
export function PlayerNotifications() {
  const { token } = useAuthStore()
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const data = await apiFetch('/api/player/notifications', token)
      setNotifications(data)
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Error') }
    finally { setLoading(false) }
  }, [token])

  useEffect(() => { load() }, [load])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Notificaciones</h2>
        <p className="text-sm text-muted-foreground">Avisos sobre tus turnos</p>
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
            <Card key={n.id} className={`bg-card border-border ${!n.read ? 'border-primary/30' : ''}`}>
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
                  <div>
                    <p className="text-foreground text-sm">{n.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(n.createdAt).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
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
