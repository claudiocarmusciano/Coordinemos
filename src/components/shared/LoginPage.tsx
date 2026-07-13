'use client'

import React, { useState } from 'react'
import { useAuthStore, useViewStore } from '@/store/auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { apiFetch } from '@/store/auth'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { Eye, EyeOff } from 'lucide-react'

export function LoginPage() {
  const { setAuth } = useAuthStore()
  const { setView } = useViewStore()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showForgot, setShowForgot] = useState(false)
  const [forgotDni, setForgotDni] = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotDone, setForgotDone] = useState(false)

  const [forgotMessage, setForgotMessage] = useState('')

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!forgotDni.trim()) return
    setForgotLoading(true)
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dni: forgotDni.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.message || 'Error al procesar la solicitud')
        return
      }
      setForgotMessage(data.message || '')
      setForgotDone(true)
    } catch {
      toast.error('No se pudo conectar con el servidor')
    } finally {
      setForgotLoading(false)
    }
  }

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
      {/* Background decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-primary/3 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-sm relative"
      >
        <Card className="bg-card border-border shadow-xl shadow-black/20">
          <CardHeader className="text-center pb-2">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.4 }}
            >
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/20">
                <span className="text-background font-bold text-3xl">C</span>
              </div>
            </motion.div>
            <CardTitle className="text-2xl text-foreground font-bold">Coordinemos</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">Coordiná tus turnos de pádel</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-muted-foreground">Email o usuario</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Tu email o DNI"
                  className="bg-input border-border text-foreground h-11"
                  required
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-muted-foreground">Contraseña</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Tu contraseña"
                    className="bg-input border-border text-foreground h-11 pr-10"
                    required
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
              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-11 font-medium"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Ingresando...
                  </span>
                ) : 'Ingresar'}
              </Button>
            </form>

            {/* Forgot password */}
            <div className="mt-4 pt-4 border-t border-border">
              {!showForgot ? (
                <button
                  type="button"
                  onClick={() => { setShowForgot(true); setForgotDone(false); setForgotDni('') }}
                  className="text-xs text-muted-foreground hover:text-primary transition-colors w-full text-center"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              ) : forgotDone ? (
                <div className="text-center space-y-2">
                  <p className="text-xs text-foreground font-medium">{forgotMessage}</p>
                  <button
                    type="button"
                    onClick={() => { setShowForgot(false); setForgotDone(false); setForgotMessage('') }}
                    className="text-xs text-primary hover:underline"
                  >
                    Volver al inicio de sesión
                  </button>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-3">
                  <p className="text-xs text-muted-foreground text-center">Ingresá tu DNI para restablecer tu contraseña</p>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={forgotDni}
                    onChange={(e) => setForgotDni(e.target.value)}
                    placeholder="Tu DNI (solo números)"
                    className="bg-input border-border text-foreground h-10 text-sm"
                    required
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="flex-1 border-border"
                      onClick={() => setShowForgot(false)}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
                      disabled={forgotLoading}
                    >
                      {forgotLoading ? 'Enviando...' : 'Restablecer'}
                    </Button>
                  </div>
                </form>
              )}
            </div>

            {/* Register link */}
            <div className="mt-4 pt-4 border-t border-border text-center">
              <span className="text-xs text-muted-foreground">¿No tenés cuenta? </span>
              <button
                type="button"
                onClick={() => setView('register')}
                className="text-xs text-primary hover:underline font-medium"
              >
                Registrate
              </button>
            </div>

          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
