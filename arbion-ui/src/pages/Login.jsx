import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
const API_URL = import.meta.env.VITE_API_URL

export default function Login({ onLogin }) {
  const [user,    setUser]    = useState('')
  const [pass,    setPass]    = useState('')
  const [err,     setErr]     = useState('')
  const [loading, setLoading] = useState(false)
  const navigate              = useNavigate()

  useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    document.body.appendChild(script)

    script.onload = () => {
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleResponse,
        auto_select: true,
        cancel_on_tap_outside: false,
      })
      window.google.accounts.id.prompt()
    }

    return () => {
      document.body.removeChild(script)
      window.google?.accounts?.id?.cancel()
    }
  }, [])

  const handleGoogleResponse = async (response) => {
    setLoading(true)
    setErr('')
    try {
      const res = await fetch(`${API_URL}/api/google-auth/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_token: response.credential }),
      })
      const data = await res.json()
      if (!res.ok) { setErr(data.error || 'Google sign-in failed'); return }

      localStorage.setItem('access',  data.access)
      localStorage.setItem('refresh', data.refresh)
      localStorage.setItem('user',    JSON.stringify(data.user))

      navigate('/trade')
    } catch (e) {
      setErr('Google sign-in failed')
    } finally {
      setLoading(false)
    }
  }

  const submit = async () => {
    if (!user || !pass) { setErr('enter username and password'); return }
    setLoading(true)
    setErr('')
    try {
      await onLogin(user, pass)
      navigate('/trade')
    } catch (e) {
      setErr(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <span className="brand-mark">B</span>
          <span className="brand-name">ARBION</span>
        </div>

        <div className="form-group">
          <label>username</label>
          <input
            type="text"
            value={user}
            onChange={e => setUser(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submit()}
            autoFocus
          />
        </div>
        <div className="form-group">
          <label>password</label>
          <input
            type="password"
            value={pass}
            onChange={e => setPass(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submit()}
          />
        </div>

        {err && <p className="login-err">{err}</p>}

        <button className="btn-primary" onClick={submit} disabled={loading}>
          {loading ? 'signing in…' : 'sign in'}
        </button>

        <div className="login-divider">
          <span>or</span>
        </div>

        {/* Google One Tap renders its own popup, this button is a fallback */}
        <div
          id="g_id_onload"
          data-client_id={GOOGLE_CLIENT_ID}
          data-callback="handleGoogleResponse"
        />
        <div
          className="g_id_signin"
          data-type="standard"
          data-theme="outline"
          data-text="continue_with"
          data-shape="rectangular"
          data-width="100%"
        />
      </div>
    </div>
  )
}