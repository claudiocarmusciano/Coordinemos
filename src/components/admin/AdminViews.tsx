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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Building2, Plus, Trash2, Edit2, MapPin, Phone } from 'lucide-react'
import { toast } from 'sonner'

interface Club {
  id: string
  name: string
  address: string
  phone: string
  userId: string
  user: { username: string }
  _count?: { courts: number; memberships: number; tournaments: number }
}

export function AdminDashboard() {
  const { token } = useAuthStore()
  const [clubs, setClubs] = useState<Club[]>([])
  const [loading, setLoading] = useState(true)

  const loadClubs = useCallback(async () => {
    try {
      const data = await apiFetch('/api/admin/clubs', token)
      setClubs(data)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { loadClubs() }, [loadClubs])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Panel de Administración</h2>
        <p className="text-sm text-muted-foreground">Gestión general del sistema</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{clubs.length}</p>
              <p className="text-xs text-muted-foreground">Clubes</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{clubs.reduce((s, c) => s + (c._count?.courts || 0), 0)}</p>
              <p className="text-xs text-muted-foreground">Canchas</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{clubs.reduce((s, c) => s + (c._count?.memberships || 0), 0)}</p>
              <p className="text-xs text-muted-foreground">Jugadores</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-foreground text-lg">Clubes Registrados</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground text-sm">Cargando...</p>
          ) : clubs.length === 0 ? (
            <p className="text-muted-foreground text-sm">No hay clubes registrados</p>
          ) : (
            <div className="space-y-3">
              {clubs.map((club) => (
                <div key={club.id} className="bg-muted/30 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="font-medium text-foreground">{club.name}</h3>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {club.address && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="w-3 h-3" />{club.address}
                        </span>
                      )}
                      {club.phone && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Phone className="w-3 h-3" />{club.phone}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Badge variant="secondary" className="text-xs">{club._count?.courts || 0} canchas</Badge>
                      <Badge variant="secondary" className="text-xs">{club._count?.memberships || 0} jugadores</Badge>
                      <Badge variant="secondary" className="text-xs">{club._count?.tournaments || 0} torneos</Badge>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">Usuario: {club.user?.username}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export function AdminClubs() {
  const { token } = useAuthStore()
  const [clubs, setClubs] = useState<Club[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editClub, setEditClub] = useState<Club | null>(null)
  const [form, setForm] = useState({ name: '', address: '', phone: '', username: '', password: '' })

  const loadClubs = useCallback(async () => {
    try {
      const data = await apiFetch('/api/admin/clubs', token)
      setClubs(data)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { loadClubs() }, [loadClubs])

  const resetForm = () => {
    setForm({ name: '', address: '', phone: '', username: '', password: '' })
    setEditClub(null)
  }

  const handleCreate = async () => {
    try {
      await apiFetch('/api/admin/clubs', token, {
        method: 'POST',
        body: JSON.stringify(form),
      })
      toast.success('Club creado exitosamente')
      setDialogOpen(false)
      resetForm()
      loadClubs()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error')
    }
  }

  const handleEdit = async () => {
    if (!editClub) return
    try {
      await apiFetch(`/api/admin/clubs/${editClub.id}`, token, {
        method: 'PUT',
        body: JSON.stringify({ name: form.name, address: form.address, phone: form.phone }),
      })
      toast.success('Club actualizado')
      setDialogOpen(false)
      resetForm()
      loadClubs()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este club? Se eliminarán todos los datos asociados.')) return
    try {
      await apiFetch(`/api/admin/clubs/${id}`, token, { method: 'DELETE' })
      toast.success('Club eliminado')
      loadClubs()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error')
    }
  }

  const openEdit = (club: Club) => {
    setEditClub(club)
    setForm({ name: club.name, address: club.address, phone: club.phone, username: '', password: '' })
    setDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Gestión de Clubes</h2>
          <p className="text-sm text-muted-foreground">Creá y administrá los clubes del sistema</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm() }}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <Plus className="w-4 h-4 mr-2" /> Nuevo Club
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground">
                {editClub ? 'Editar Club' : 'Nuevo Club'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Nombre</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="bg-input border-border text-foreground"
                  placeholder="Nombre del club"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Dirección</Label>
                <Input
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="bg-input border-border text-foreground"
                  placeholder="Dirección"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Teléfono</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="bg-input border-border text-foreground"
                  placeholder="Teléfono"
                />
              </div>
              {!editClub && (
                <>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Usuario de acceso</Label>
                    <Input
                      value={form.username}
                      onChange={(e) => setForm({ ...form, username: e.target.value })}
                      className="bg-input border-border text-foreground"
                      placeholder="Usuario para el club"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Contraseña inicial</Label>
                    <Input
                      type="password"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      className="bg-input border-border text-foreground"
                      placeholder="Contraseña"
                    />
                  </div>
                </>
              )}
              <Button
                onClick={editClub ? handleEdit : handleCreate}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {editClub ? 'Guardar Cambios' : 'Crear Club'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="bg-card border-border">
        <CardContent className="p-0">
          {loading ? (
            <p className="p-4 text-muted-foreground text-sm">Cargando...</p>
          ) : clubs.length === 0 ? (
            <p className="p-4 text-muted-foreground text-sm">No hay clubes. Creá el primero.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-muted-foreground">Club</TableHead>
                  <TableHead className="text-muted-foreground">Usuario</TableHead>
                  <TableHead className="text-muted-foreground hidden sm:table-cell">Canchas</TableHead>
                  <TableHead className="text-muted-foreground hidden sm:table-cell">Jugadores</TableHead>
                  <TableHead className="text-muted-foreground hidden sm:table-cell">Torneos</TableHead>
                  <TableHead className="text-right"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clubs.map((club) => (
                  <TableRow key={club.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-foreground">{club.name}</p>
                        <p className="text-xs text-muted-foreground">{club.address}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{club.user?.username}</Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-foreground">{club._count?.courts || 0}</TableCell>
                    <TableCell className="hidden sm:table-cell text-foreground">{club._count?.memberships || 0}</TableCell>
                    <TableCell className="hidden sm:table-cell text-foreground">{club._count?.tournaments || 0}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(club)}>
                          <Edit2 className="w-4 h-4 text-muted-foreground" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(club.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
