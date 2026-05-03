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
  Trophy,
  Users,
  Calendar,
  Clock,
  Plus,
  Trash2,
  Edit2,
  RectangleHorizontal,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from 'lucide-react'
import { toast } from 'sonner'

/* ─── CLUB DASHBOARD ────────────────────────────── */
export function ClubDashboard() {
  const { token } = useAuthStore()
  const [dashboard, setDashboard] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiFetch('/api/club/dashboard', token)
      .then(setDashboard)
      .catch((err: Error) => toast.error(err.message))
      .finally(() => setLoading(false))
  }, [token])

  if (loading) return <p className="text-muted-foreground">Cargando...</p>
  if (!dashboard) return null

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Panel del Club</h2>
        <p className="text-sm text-muted-foreground">Resumen de tu club</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4 text-center">
            <Trophy className="w-6 h-6 text-primary mx-auto mb-1" />
            <p className="text-2xl font-bold text-foreground">{dashboard.totalTournaments}</p>
            <p className="text-xs text-muted-foreground">Torneos</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 text-center">
            <Users className="w-6 h-6 text-green-500 mx-auto mb-1" />
            <p className="text-2xl font-bold text-foreground">{dashboard.totalPlayers}</p>
            <p className="text-xs text-muted-foreground">Jugadores</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 text-center">
            <RectangleHorizontal className="w-6 h-6 text-blue-500 mx-auto mb-1" />
            <p className="text-2xl font-bold text-foreground">{dashboard.totalCourts}</p>
            <p className="text-xs text-muted-foreground">Canchas</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 text-center">
            <Clock className="w-6 h-6 text-yellow-500 mx-auto mb-1" />
            <p className="text-2xl font-bold text-foreground">{dashboard.availableSlots}</p>
            <p className="text-xs text-muted-foreground">Turnos disp.</p>
          </CardContent>
        </Card>
      </div>

      {dashboard.tournaments?.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-foreground text-lg">Torneos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {dashboard.tournaments.map((t: any) => (
              <div key={t.id} className="bg-muted/30 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-foreground">{t.name}</h3>
                  <div className="flex gap-2">
                    <Badge variant="secondary" className="text-xs">{t.totalCouples} parejas</Badge>
                    <Badge variant="secondary" className="text-xs">{t.totalMatches} partidos</Badge>
                  </div>
                </div>
                <div className="flex gap-4 mt-2 text-sm">
                  <span className="text-green-500 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />{t.confirmedMatches} confirmados
                  </span>
                  <span className="text-yellow-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />{t.pendingMatches} pendientes
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {dashboard.recentAssignments?.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-foreground text-lg">Últimas Confirmaciones</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {dashboard.recentAssignments.map((a: any) => (
              <div key={a.id} className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span className="text-foreground">{a.match?.couple1?.player1?.firstName} & {a.match?.couple1?.player2?.firstName} vs {a.match?.couple2?.player1?.firstName} & {a.match?.couple2?.player2?.firstName}</span>
                <span className="text-muted-foreground">— {a.slot?.day} {a.slot?.startTime}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

/* ─── CLUB COURTS ────────────────────────────── */
export function ClubCourts() {
  const { token } = useAuthStore()
  const [courts, setCourts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [name, setName] = useState('')

  const load = useCallback(async () => {
    try {
      const data = await apiFetch('/api/club/courts', token)
      setCourts(data)
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Error') }
    finally { setLoading(false) }
  }, [token])

  useEffect(() => { load() }, [load])

  const handleCreate = async () => {
    try {
      await apiFetch('/api/club/courts', token, {
        method: 'POST',
        body: JSON.stringify({ name }),
      })
      toast.success('Cancha creada')
      setDialogOpen(false)
      setName('')
      load()
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Error') }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta cancha?')) return
    try {
      await apiFetch(`/api/club/courts/${id}`, token, { method: 'DELETE' })
      toast.success('Cancha eliminada')
      load()
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Error') }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Canchas</h2>
          <p className="text-sm text-muted-foreground">Gestioná las canchas de tu club</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <Plus className="w-4 h-4 mr-2" /> Nueva Cancha
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground">Nueva Cancha</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Nombre</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-input border-border text-foreground"
                  placeholder="Ej: Cancha 1"
                />
              </div>
              <Button onClick={handleCreate} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                Crear Cancha
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <p className="text-muted-foreground text-sm">Cargando...</p>
        ) : courts.length === 0 ? (
          <p className="text-muted-foreground text-sm">No hay canchas. Creá la primera.</p>
        ) : (
          courts.map((court) => (
            <Card key={court.id} className="bg-card border-border">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <RectangleHorizontal className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{court.name}</p>
                    <p className="text-xs text-muted-foreground">{court._count?.slots || 0} turnos</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(court.id)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
