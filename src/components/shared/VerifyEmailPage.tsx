'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useAuthStore, useViewStore, apiFetch } from '@/store/auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { Eye, EyeOff, CheckCircle2, XCircle } from 'lucide-react'

export function VerifyEmailPage() {
  const { setAuth } = useAuthStore()
  const { viewParams, setView } = useViewStore()
  const token = viewParams.token || ''
  const mode = viewParams.mode || 'verify' // 'verify' | 'claim'

  // For an auto-verify link (mode 'verify') we start in 'loading'; for claim we wait for the form
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>(
    () => (!token ? 'error' : mode === 'verify' ? 'loading' : 'idle')
  )
  const [errorMsg, setErrorMsg] = useState(() => (token ? '' : 'Falta el token de verificación'))
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const pendingAuth = useRef<{ user: any; token: string } | null>(null)

  // For plain verification, run automatically on mount (inline promise, mirrors page.tsx pattern)
  useEffect(() => {
    if (!token || mode !== 'verify') return
    apiFetch('/api/auth/verify-email', null, {
      method: 'POST',
      body: JSON.stringify({ token }),
    })
      .then((data) => {
        pendingAuth.current = { user: data.user, token: data.token }
        setStatus('success')
      })
      .catch((err: unknown) => {
        setStatus('error')
        setErrorMsg(err instanceof Error ? err.message : 'No se pudo verificar')
      })
  }, [token, mode])

  // Show the success screen briefly, then log in and go to onboarding
  useEffect(() => {
    if (status !== 'success' || !pendingAuth.current) return
    const t = setTimeout(() => {
      const p = pendingAuth.current!
      setAuth(p.user, p.token)
      setView('player-onboarding')
    }, 1200)
    return () => clearTimeout(t)
  }, [status, setAuth, setView])

  const handleClaim = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 8) { toast.error('La contraseña debe tener al menos 8 caracteres'); return }
    if (password !== confirm) { toast.error('Las contraseñas no coinciden'); return }
    setStatus('loading')
    try {
      const data = await apiFetch('/api/auth/verify-email', null, {
        method: 'POST',
        body: JSON.stringify({ token, password }),
      })
      pendingAuth.current = { user: data.user, token: data.token }
      setStatus('success')
    } catch (err: unknown) {
      setStatus('error')
      setErrorMsg(err instanceof Error ? err.message : 'No se pudo verificar')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
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
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/20">
              <span className="text-background font-bold text-3xl">C</span>
            </div>
            <CardTitle className="text-2xl text-foreground font-bold">
              {mode === 'claim' ? 'Activá tu cuenta' : 'Verificando email'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {status === 'success' ? (
              <div className="text-center space-y-3 py-4">
                <CheckCircle2 className="w-14 h-14 text-primary mx-auto" />
                <p className="text-sm text-foreground font-medium">
                  {mode === 'claim' ? '¡Cuenta activada!' : '¡Email verificado!'} Redirigiendo...
                </p>
              </div>
            ) : status === 'error' ? (
              <div className="text-center space-y-4 py-4">
                <XCircle className="w-14 h-14 text-destructive mx-auto" />
                <p className="text-sm text-foreground font-medium">{errorMsg}</p>
                <button
                  type="button"
                  onClick={() => setView('login')}
                  className="text-xs text-primary hover:underline font-medium"
                >
                  Volver al inicio de sesión
                </button>
              </div>
            ) : mode === 'claim' ? (
              <form onSubmit={handleClaim} className="space-y-4">
                <p className="text-xs text-muted-foreground text-center">
                  Elegí una contraseña para tu cuenta.
                </p>
                <div className="space-y-2">
                  <Label htmlFor="pwd" className="text-muted-foreground">Nueva contraseña</Label>
                  <div className="relative">
                    <Input
                      id="pwd" type={showPassword ? 'text' : 'password'} value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Mínimo 8 caracteres"
                      className="bg-input border-border text-foreground h-11 pr-10" required minLength={8} autoFocus
                    />
                    <button
                      type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm" className="text-muted-foreground">Confirmar contraseña</Label>
                  <Input
                    id="confirm" type={showPassword ? 'text' : 'password'} value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className="bg-input border-border text-foreground h-11" required minLength={8}
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-11 font-medium"
                  disabled={status === 'loading'}
                >
                  {status === 'loading' ? 'Activando...' : 'Activar cuenta'}
                </Button>
              </form>
            ) : (
              <div className="text-center py-6">
                <span className="inline-block w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                <p className="text-sm text-muted-foreground mt-3">Verificando tu email...</p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
