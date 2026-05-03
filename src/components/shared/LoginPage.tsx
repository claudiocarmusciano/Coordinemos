'use client'

import React, { useState } from 'react'
import { useAuthStore } from '@/store/auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { apiFetch } from '@/store/auth'
import { toast } from 'sonner'

export function LoginPage() {
  const { setAuth } = useAuthStore()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const data = await apiFetch('/api/auth/login', null, {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      })
      setAuth(data.user, data.token)
      toast.success('¡Bienvenido!')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm bg-card border-border">
        <CardHeader className="text-center pb-2">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-3">
            <span className="text-white font-bold text-2xl">C</span>
          </div>
          <CardTitle className="text-xl text-foreground">Coordinemos</CardTitle>
          <p className="text-sm text-muted-foreground">Coordiná tus turnos de pádel</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-muted-foreground">Usuario</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Tu usuario"
                className="bg-input border-border text-foreground"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-muted-foreground">Contraseña</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Tu contraseña"
                className="bg-input border-border text-foreground"
                required
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
              disabled={loading}
            >
              {loading ? 'Ingresando...' : 'Ingresar'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
