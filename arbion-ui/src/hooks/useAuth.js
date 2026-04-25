import { useState, useCallback } from 'react'
import { NODE_HOST } from '../lib/config'

const API_URL = import.meta.env.VITE_API_URL

async function fetchToken(user, pass) {
  const res = await fetch(`${API_URL}/api/token/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: user, password: pass }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || data.error || 'Login failed')
  return data.access
}

export function useAuth() {
  const [jwt,      setJwt]      = useState(null)
  const [username, setUsername] = useState('')

  const login = useCallback(async (user, pass) => {
    const token = await fetchToken(user, pass)
    setJwt(token)
    setUsername(user)
    return token
  }, [])

  const loginWithToken = useCallback((token, user = '') => {
    setJwt(token)
    setUsername(user)
  }, [])

  const logout = useCallback(() => {
    setJwt(null)
    setUsername('')
  }, [])

  return { jwt, username, login, loginWithToken, logout }
}