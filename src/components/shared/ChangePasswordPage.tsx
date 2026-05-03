'use client'

import React, { useState } from 'react'
import { useAuthStore, apiFetch } from '@/store/auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Key } from 'lucide-react'

export function ChangePasswordPage() {
  const { user, token, setAuth, updateUser } = useAuthStore()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      toast.error('Las contraseñas no coinciden')
      return
    }
    if (newPassword.length < 4) {
      toast.error('La contraseña debe tener al menos 4 caracteres')
      return
    }
    setLoading(true)
    try {
      const data = await apiFetch('/api/auth/change-password', token, {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      setAuth(data.user, data.token)
      toast.success('Contraseña actualizada correctamente')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al cambiar contraseña')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Cambiar Contraseña</h2>
        <p className="text-sm text-muted-foreground">Actualizá tu contraseña de acceso</p>
      </div>

      {user?.mustChangePassword && (
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 text-sm text-primary">
          Debés cambiar tu contraseña antes de continuar.
        </div>
      )}

      <Card className="bg-card border-border max-w-md">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <Key className="w-5 h-5" />
            Nueva Contraseña
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground">Contraseña actual</Label>
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="bg-input border-border text-foreground"
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Nueva contraseña</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="bg-input border-border text-foreground"
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Confirmar contraseña</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="bg-input border-border text-foreground"
                required
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
              disabled={loading}
            >
              {loading ? 'Guardando...' : 'Guardar Contraseña'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
