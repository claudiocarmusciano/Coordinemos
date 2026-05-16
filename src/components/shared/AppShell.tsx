'use client'

import React, { useEffect, useState } from 'react'
import { useAuthStore, useViewStore, useNotificationStore, apiFetch, type ViewName } from '@/store/auth'
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

const NAV_ITEMS: Record<string, { label: string; icon: React.ReactNode; view: ViewName; showBadge?: boolean }[]> = {
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
    { label: 'Mis Clubes', icon: <Building2 className="w-4 h-4" />, view: 'player-memberships' },
    { label: 'Mis Torneos', icon: <Trophy className="w-4 h-4" />, view: 'player-tournaments' },
    { label: 'Mis Partidos', icon: <Calendar className="w-4 h-4" />, view: 'player-matches' },
    { label: 'Notificaciones', icon: <Bell className="w-4 h-4" />, view: 'player-notifications', showBadge: true },
  ],
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, token, logout } = useAuthStore()
  const { currentView, setView } = useViewStore()
  const { unreadCount, setUnreadCount } = useNotificationStore()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Poll unread notification count for players
  useEffect(() => {
    if (user?.role !== 'PLAYER') return

    let mounted = true
    const poll = async () => {
      if (!token || !mounted) return
      try {
        const data = await apiFetch('/api/player/notifications?count=true', token)
        if (mounted) setUnreadCount(data.count || 0)
      } catch {
        // Silently fail
      }
    }

    poll()
    const interval = setInterval(poll, 30000)
    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [user?.role, token])

  // Re-poll immediately when navigating away from notifications (to reflect read status)
  useEffect(() => {
    if (user?.role !== 'PLAYER' || !token) return
    apiFetch('/api/player/notifications?count=true', token)
      .then((data) => setUnreadCount(data.count || 0))
      .catch(() => {})
  }, [currentView])

  if (!user) return <>{children}</>

  // When mustChangePassword is true, render ONLY the change-password page
  // with no nav/sidebar/data-fetching components to avoid spurious error toasts.
  if (user.mustChangePassword) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        {children}
      </div>
    )
  }

  const items = NAV_ITEMS[user.role] || []
  const roleLabel = user.role === 'ADMIN' ? 'Administrador' : user.role === 'CLUB' ? 'Club' : 'Jugador'

  const renderNavItem = (item: typeof items[0], onClick?: () => void) => (
    <button
      key={item.view}
      onClick={onClick || (() => setView(item.view))}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors w-full ${
        currentView === item.view
          ? 'bg-primary/10 text-primary font-medium'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      }`}
    >
      {item.icon}
      <span className="flex-1 text-left">{item.label}</span>
      {item.showBadge && unreadCount > 0 && (
        <span className="ml-auto bg-primary text-primary-foreground text-xs rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5 font-medium">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  )

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
            {user.role === 'PLAYER' && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setView('player-notifications')}
                title="Notificaciones"
                className="relative"
              >
                <Bell className="w-4 h-4 text-muted-foreground" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-primary text-primary-foreground text-[10px] rounded-full min-w-[16px] h-4 flex items-center justify-center px-1 font-bold">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Button>
            )}
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
          {items.map((item) => renderNavItem(item))}
        </nav>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-40 bg-background/80 backdrop-blur-sm">
            <div className="absolute left-0 top-14 w-64 bg-card border-r border-border h-full p-3 flex flex-col gap-1">
              {items.map((item) => renderNavItem(item, () => {
                setView(item.view)
                setMobileMenuOpen(false)
              }))}
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
      <footer className="bg-card border-t border-border py-3 px-4 text-center text-xs text-muted-foreground mt-auto">
        Coordinemos © {new Date().getFullYear()} — Coordiná tus turnos de pádel
      </footer>
    </div>
  )
}
