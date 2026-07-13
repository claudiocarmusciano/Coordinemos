'use client'

import React, { useState } from 'react'
import { useViewStore, apiFetch } from '@/store/auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { Eye, EyeOff, CheckCircle2 } from 'lucide-react'

export function RegisterPage() {
  const { setView } = useViewStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [dni, setDni] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [doneMessage, setDoneMessage] = useState('')

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const data = await apiFetch('/api/auth/register', null, {
        method: 'POST',
        body: JSON.stringify({ email, password, dni, firstName, lastName, phone }),
      })
      setDoneMessage(data.message || 'Revisá tu correo para verificar tu cuenta.')
      setDone(true)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al registrarse')
    } finally {
      setLoading(false)
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
            <CardTitle className="text-2xl text-foreground font-bold">Crear cuenta</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">Registrate para reservar turnos</p>
          </CardHeader>
          <CardContent>
            {done ? (
              <div className="text-center space-y-4 py-4">
                <CheckCircle2 className="w-14 h-14 text-primary mx-auto" />
                <p className="text-sm text-foreground font-medium">{doneMessage}</p>
                <p className="text-xs text-muted-foreground">
                  Revisá tu bandeja de entrada (y spam) para verificar tu email.
                </p>
                <button
                  type="button"
                  onClick={() => setView('login')}
                  className="text-xs text-primary hover:underline font-medium"
                >
                  Volver al inicio de sesión
                </button>
              </div>
            ) : (
              <>
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-muted-foreground">Email</Label>
                    <Input
                      id="email" type="email" value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="tu@email.com"
                      className="bg-input border-border text-foreground h-11" required autoFocus
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-muted-foreground">Contraseña</Label>
                    <div className="relative">
                      <Input
                        id="password" type={showPassword ? 'text' : 'password'} value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Mínimo 8 caracteres"
                        className="bg-input border-border text-foreground h-11 pr-10" required minLength={8}
                      />
                      <button
                        type="button" onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dni" className="text-muted-foreground">DNI</Label>
                    <Input
                      id="dni" inputMode="numeric" value={dni}
                      onChange={(e) => setDni(e.target.value)}
                      placeholder="Solo números"
                      className="bg-input border-border text-foreground h-11" required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="firstName" className="text-muted-foreground">Nombre</Label>
                      <Input
                        id="firstName" value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="bg-input border-border text-foreground h-11" required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName" className="text-muted-foreground">Apellido</Label>
                      <Input
                        id="lastName" value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="bg-input border-border text-foreground h-11" required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-muted-foreground">Teléfono (opcional)</Label>
                    <Input
                      id="phone" value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+54 9..."
                      className="bg-input border-border text-foreground h-11"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-11 font-medium"
                    disabled={loading}
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Creando cuenta...
                      </span>
                    ) : 'Crear cuenta'}
                  </Button>
                </form>

                <div className="mt-4 pt-4 border-t border-border text-center">
                  <span className="text-xs text-muted-foreground">¿Ya tenés cuenta? </span>
                  <button
                    type="button"
                    onClick={() => setView('login')}
                    className="text-xs text-primary hover:underline font-medium"
                  >
                    Ingresá
                  </button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
