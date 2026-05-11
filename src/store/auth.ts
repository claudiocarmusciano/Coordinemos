import { create } from 'zustand'

export type UserRole = 'ADMIN' | 'CLUB' | 'PLAYER'

export interface AuthUser {
  id: string
  username: string
  role: UserRole
  mustChangePassword: boolean
  clubId?: string
  playerId?: string
}

interface AuthState {
  user: AuthUser | null
  token: string | null
  setAuth: (user: AuthUser, token: string) => void
  logout: () => void
  updateUser: (user: Partial<AuthUser>) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: typeof window !== 'undefined' ? localStorage.getItem('token') : null,
  setAuth: (user, token) => {
    localStorage.setItem('token', token)
    set({ user, token })
  },
  logout: () => {
    localStorage.removeItem('token')
    set({ user: null, token: null })
  },
  updateUser: (partial) =>
    set((state) => ({
      user: state.user ? { ...state.user, ...partial } : null,
    })),
}))

// View routing state
export type ViewName =
  | 'login'
  | 'admin-dashboard'
  | 'admin-clubs'
  | 'club-dashboard'
  | 'club-courts'
  | 'club-tournaments'
  | 'club-players'
  | 'club-couples'
  | 'club-matches'
  | 'club-slots'
  | 'player-tournaments'
  | 'player-matches'
  | 'player-notifications'
  | 'player-memberships'
  | 'change-password'

interface ViewState {
  currentView: ViewName
  viewParams: Record<string, string>
  setView: (view: ViewName, params?: Record<string, string>) => void
}

export const useViewStore = create<ViewState>((set) => ({
  currentView: 'login',
  viewParams: {},
  setView: (view, params = {}) => set({ currentView: view, viewParams: params }),
}))

// API helper
export async function apiFetch(path: string, token: string | null, options?: RequestInit) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string> || {}),
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  const res = await fetch(path, { ...options, headers })
  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(data.message || data.error || `Error ${res.status}`)
  }
  return res.json()
}
