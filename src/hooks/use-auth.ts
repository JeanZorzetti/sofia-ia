'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface User {
  id: number
  username: string
  role: 'admin' | 'user'
}

interface AuthState {
  isAuthenticated: boolean
  user: User | null
  loading: boolean
  error: string | null
}

export function useAuth() {
  const router = useRouter()
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    loading: true,
    error: null,
  })

  const refreshProfile = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, loading: true, error: null }))

      const response = await fetch('/api/auth/profile')

      if (response.ok) {
        const data = await response.json()
        setState({
          isAuthenticated: true,
          user: data.user,
          loading: false,
          error: null,
        })
        return data.user
      } else if (response.status === 401) {
        setState({
          isAuthenticated: false,
          user: null,
          loading: false,
          error: null,
        })
        return null
      } else {
        throw new Error('Failed to fetch profile')
      }
    } catch (error) {
      setState({
        isAuthenticated: false,
        user: null,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch profile',
      })
      return null
    }
  }, [])

  const login = useCallback(
    async (username: string, password: string) => {
      try {
        setState((prev) => ({ ...prev, loading: true, error: null }))

        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ username, password }),
        })

        const data = await response.json()

        if (response.ok) {
          await refreshProfile()
          router.push('/dashboard')
          return { success: true }
        } else {
          setState((prev) => ({
            ...prev,
            loading: false,
            error: data.message || 'Login failed',
          }))
          return { success: false, error: data.message || 'Login failed' }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Login failed'
        setState((prev) => ({
          ...prev,
          loading: false,
          error: errorMessage,
        }))
        return { success: false, error: errorMessage }
      }
    },
    [refreshProfile, router]
  )

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
      })
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setState({
        isAuthenticated: false,
        user: null,
        loading: false,
        error: null,
      })
      router.push('/login')
    }
  }, [router])

  useEffect(() => {
    refreshProfile()
  }, [refreshProfile])

  return {
    user: state.user,
    isAuthenticated: state.isAuthenticated,
    loading: state.loading,
    error: state.error,
    login,
    logout,
    refreshProfile,
  }
}
