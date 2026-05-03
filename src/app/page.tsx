'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useAuthStore, useViewStore, apiFetch } from '@/store/auth'
import { AppShell } from '@/components/shared/AppShell'
import { LoginPage } from '@/components/shared/LoginPage'
import { ChangePasswordPage } from '@/components/shared/ChangePasswordPage'
import { AdminDashboard, AdminClubs } from '@/components/admin/AdminViews'
import { ClubDashboard, ClubCourts } from '@/components/club/ClubViewsPart1'
import { ClubTournaments, ClubPlayers } from '@/components/club/ClubViewsPart2'
import { ClubCouples, ClubMatches, ClubSlots } from '@/components/club/ClubViewsPart3'
import { PlayerTournaments, PlayerMatches, PlayerNotifications } from '@/components/player/PlayerViews'

async function initAdmin() {
  try {
    await fetch('/api/admin/init', { method: 'POST', headers: { 'Content-Type': 'application/json' } })
  } catch {
    // Admin might already exist
  }
}

function ViewRouter() {
  const { currentView } = useViewStore()

  switch (currentView) {
    case 'admin-dashboard': return <AdminDashboard />
    case 'admin-clubs': return <AdminClubs />
    case 'club-dashboard': return <ClubDashboard />
    case 'club-courts': return <ClubCourts />
    case 'club-tournaments': return <ClubTournaments />
    case 'club-players': return <ClubPlayers />
    case 'club-couples': return <ClubCouples />
    case 'club-matches': return <ClubMatches />
    case 'club-slots': return <ClubSlots />
    case 'player-tournaments': return <PlayerTournaments />
    case 'player-matches': return <PlayerMatches />
    case 'player-notifications': return <PlayerNotifications />
    case 'change-password': return <ChangePasswordPage />
    default: return <LoginPage />
  }
}

function getDefaultView(role: string): string {
  switch (role) {
    case 'ADMIN': return 'admin-dashboard'
    case 'CLUB': return 'club-dashboard'
    case 'PLAYER': return 'player-tournaments'
    default: return 'login'
  }
}

export default function HomePage() {
  const { user, token, setAuth, logout } = useAuthStore()
  const { setView, currentView } = useViewStore()
  const [initializing, setInitializing] = useState(!user && !!token)
  const initRan = useRef(false)

  useEffect(() => {
    initAdmin()
  }, [])

  useEffect(() => {
    if (initRan.current) return
    initRan.current = true

    if (token && !user) {
      apiFetch('/api/auth/me', token)
        .then((data) => {
          setAuth(data, token!)
        })
        .catch(() => {
          logout()
        })
        .finally(() => setInitializing(false))
    }
  }, [token, user, setAuth, logout])

  useEffect(() => {
    if (user && currentView === 'login') {
      setView(getDefaultView(user.role) as any)
    }
    if (!user && currentView !== 'login') {
      setView('login')
    }
  }, [user, currentView, setView])

  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4 animate-pulse">
            <span className="text-white font-bold text-2xl">C</span>
          </div>
          <p className="text-muted-foreground">Cargando Coordinemos...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <LoginPage />
  }

  return (
    <AppShell>
      <ViewRouter />
    </AppShell>
  )
}
