import { useState, useCallback } from 'react'

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

async function fetchMe(token) {
  const res = await fetch(`${API_URL}/api/me/`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  if (!res.ok) return null
  return res.json()
}

export function useAuth() {
  const [jwt,           setJwt]           = useState(null)
  const [username,      setUsername]      = useState('')
  const [activeAccount, setActiveAccount] = useState('demo')
  const [demoBalance,   setDemoBalance]   = useState('10000.00')
  const [realBalance,   setRealBalance]   = useState('0.00')

  const applyUser = useCallback((token, userData) => {
    setJwt(token)
    setUsername(userData.username)
    setActiveAccount(userData.active_account || 'demo')
    setDemoBalance(userData.demo_balance    || '10000.00')
    setRealBalance(userData.real_balance    || '0.00')
    localStorage.setItem('access', token)
    localStorage.setItem('user',   JSON.stringify(userData))
  }, [])

  const login = useCallback(async (user, pass) => {
    const token    = await fetchToken(user, pass)
    const userData = await fetchMe(token)
    applyUser(token, userData || { username: user, active_account: 'demo', demo_balance: '10000.00', real_balance: '0.00' })
    return token
  }, [applyUser])

  const loginWithToken = useCallback(async (token, userData = null) => {
    const me = userData || await fetchMe(token)
    applyUser(token, me || { username: '', active_account: 'demo', demo_balance: '10000.00', real_balance: '0.00' })
  }, [applyUser])

  const switchAccount = useCallback(async (type) => {
    if (!jwt) return
    const res = await fetch(`${API_URL}/api/switch-account/`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${jwt}` },
      body:    JSON.stringify({ account_type: type }),
    })
    const data = await res.json()
    if (res.ok) {
      setActiveAccount(data.active_account)
      setDemoBalance(data.user.demo_balance)
      setRealBalance(data.user.real_balance)
    }
  }, [jwt])

  const resetDemo = useCallback(async () => {
    if (!jwt) return
    const res = await fetch(`${API_URL}/api/reset-demo/`, {
      method:  'POST',
      headers: { 'Authorization': `Bearer ${jwt}` },
    })
    const data = await res.json()
    if (res.ok) setDemoBalance(data.demo_balance)
  }, [jwt])

  const logout = useCallback(() => {
    setJwt(null)
    setUsername('')
    setActiveAccount('demo')
    setDemoBalance('10000.00')
    setRealBalance('0.00')
    localStorage.removeItem('access')
    localStorage.removeItem('user')
  }, [])

  return {
    jwt, username, activeAccount, demoBalance, realBalance,
    login, loginWithToken, switchAccount, resetDemo, logout,
  }
}