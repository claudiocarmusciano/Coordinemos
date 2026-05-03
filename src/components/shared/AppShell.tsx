'use client'

import React from 'react'
import { useAuthStore, useViewStore, type ViewName } from '@/store/auth'
import {
  LogOut,
  Shield,
  Building2,
  User,
  Trophy,
  Users,
  Calendar,
  Clock,
  Home,
  Key,
  Bell,
  RectangleHorizontal,
  Menu,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useState } from 'react'

const NAV_ITEMS: Record<string, { label: string; icon: React.ReactNode; view: ViewName }[]> = {
  ADMIN: [
    { label: 'Inicio', icon: <Home className="w-4 h-4" />, view: 'admin-dashboard' },
    { label: 'Clubes', icon: <Building2 className="w-4 h-4" />, view: 'admin-clubs' },
  ],
  CLUB: [
    { label: 'Inicio', icon: <Home className="w-4 h-4" />, view: 'club-dashboard' },
    { label: 'Canchas', icon: <RectangleHorizontal className="w-4 h-4" />, view: 'club-courts' },
    { label: 'Torneos', icon: <Trophy className="w-4 h-4" />, view: 'club-tournaments' },
    { label: 'Jugadores', icon: <Users className="w-4 h-4" />, view: 'club-players' },
    { label: 'Parejas', icon: <User className="w-4 h-4" />, view: 'club-couples' },
    { label: 'Partidos', icon: <Calendar className="w-4 h-4" />, view: 'club-matches' },
    { label: 'Turnos', icon: <Clock className="w-4 h-4" />, view: 'club-slots' },
  ],
  PLAYER: [
    { label: 'Mis Torneos', icon: <Trophy className="w-4 h-4" />, view: 'player-tournaments' },
    { label: 'Mis Partidos', icon: <Calendar className="w-4 h-4" />, view: 'player-matches' },
    { label: 'Notificaciones', icon: <Bell className="w-4 h-4" />, view: 'player-notifications' },
  ],
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuthStore()
  const { currentView, setView } = useViewStore()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  if (!user) return <>{children}</>

  const items = NAV_ITEMS[user.role] || []

  const roleLabel = user.role === 'ADMIN' ? 'Administrador' : user.role === 'CLUB' ? 'Club' : 'Jugador'

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top header */}
      <header className="sticky top-0 z-50 bg-card border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden text-foreground"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-white font-bold text-sm">C</span>
              </div>
              <h1 className="text-lg font-semibold text-foreground hidden sm:block">Coordinemos</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="secondary" className="text-xs">
                {roleLabel}
              </Badge>
              <span className="text-muted-foreground hidden sm:inline">{user.username}</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setView('change-password')}
              title="Cambiar contraseña"
            >
              <Key className="w-4 h-4 text-muted-foreground" />
            </Button>
            <Button variant="ghost" size="icon" onClick={logout} title="Cerrar sesión">
              <LogOut className="w-4 h-4 text-muted-foreground" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar - desktop */}
        <nav className="hidden md:flex flex-col w-56 border-r border-border bg-card p-3 gap-1">
          {items.map((item) => (
            <button
              key={item.view}
              onClick={() => setView(item.view)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                currentView === item.view
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-40 bg-background/80 backdrop-blur-sm">
            <div className="absolute left-0 top-14 w-64 bg-card border-r border-border h-full p-3 flex flex-col gap-1">
              {items.map((item) => (
                <button
                  key={item.view}
                  onClick={() => {
                    setView(item.view)
                    setMobileMenuOpen(false)
                  }}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                    currentView === item.view
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}
            </div>
            <div className="flex-1" onClick={() => setMobileMenuOpen(false)} />
          </div>
        )}

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-6 max-w-5xl mx-auto">{children}</div>
        </main>
      </div>

      {/* Footer */}
      <footer className="bg-card border-t border-border py-3 px-4 text-center text-xs text-muted-foreground">
        Coordinemos © {new Date().getFullYear()} — Coordiná tus turnos de pádel
      </footer>
    </div>
  )
}
