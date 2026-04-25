import { useState, useCallback } from 'react'
import { fetchToken } from '../lib/auth'

export function useAuth() {
  const [jwt,      setJwt]      = useState(null)
  const [username, setUsername] = useState('')

  const login = useCallback(async (user, pass) => {
    const token = await fetchToken(user, pass)
    setJwt(token)
    setUsername(user)
    return token
  }, [])

  const logout = useCallback(() => {
    setJwt(null)
    setUsername('')
  }, [])

  return { jwt, username, login, logout }
}