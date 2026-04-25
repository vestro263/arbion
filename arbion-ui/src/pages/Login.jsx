import { useState, useEffect } from 'react'
import { useGoogleOneTapLogin } from '@react-oauth/google'
import { DJANGO_HOST } from '../lib/config'

export default function Login({ onLogin }) {
  const [user,    setUser]    = useState('')
  const [pass,    setPass]    = useState('')
  const [err,     setErr]     = useState('')
  const [loading, setLoading] = useState(false)

  // ── google one tap ──────────────────────────────────────────────────────
  useGoogleOneTapLogin({
    onSuccess: async ({ credential }) => {
      // credential is an ID token (JWT) — send to Django
      try {
        const res  = await fetch(`${DJANGO_HOST}/api/users/auth/google/`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ id_token: credential }),
        })
        if (!res.ok) throw new Error('Google auth failed')
        const data = await res.json()
        onLogin(data.access, data.user.username)
      } catch (e) {
        setErr(e.message)
      }
    },
    onError: () => setErr('Google One Tap failed'),
  })

  // ── standard login ──────────────────────────────────────────────────────
  const handleSubmit = async e => {
    e.preventDefault()
    setErr('')
    setLoading(true)
    try {
      const res = await fetch(`${DJANGO_HOST}/api/users/token/`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ username: user, password: pass }),
      })
      if (!res.ok) throw new Error('Invalid credentials')
      const data = await res.json()
      onLogin(data.access, user)
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
          <div className="brand-mark">A</div>
          <div className="brand-name">ARBION</div>
        </div>
        <div className="login-sub">trading engine</div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>username</label>
            <input
              type="text"
              value={user}
              onChange={e => setUser(e.target.value)}
              autoComplete="username"
              required
            />
          </div>
          <div className="form-group">
            <label>password</label>
            <input
              type="password"
              value={pass}
              onChange={e => setPass(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          {err && <div className="login-err">{err}</div>}

          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? 'signing in…' : 'sign in'}
          </button>
        </form>

        <div className="login-divider">
          <span>or</span>
        </div>

        {/* manual google button as fallback */}
        <GoogleLoginButton onLogin={onLogin} onErr={setErr} />

      </div>
    </div>
  )
}

// ── fallback button if one tap is dismissed ───────────────────────────────────
function GoogleLoginButton({ onLogin, onErr }) {
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const id = import.meta.env.VITE_GOOGLE_CLIENT_ID
    if (!id || loaded) return

    const script    = document.createElement('script')
    script.src      = 'https://accounts.google.com/gsi/client'
    script.async    = true
    script.onload   = () => {
      window.google.accounts.id.initialize({
        client_id: id,
        callback:  async ({ credential }) => {
          try {
            const res  = await fetch(`${import.meta.env.VITE_DJANGO_HOST}/api/users/auth/google/`, {
              method:  'POST',
              headers: { 'Content-Type': 'application/json' },
              body:    JSON.stringify({ id_token: credential }),
            })
            if (!res.ok) throw new Error('Google auth failed')
            const data = await res.json()
            onLogin(data.access, data.user.username)
          } catch (e) {
            onErr(e.message)
          }
        },
      })
      window.google.accounts.id.renderButton(
        document.getElementById('google-btn'),
        {
          theme: 'filled_black',
          size:  'large',
          width: '100%',
          text:  'continue_with',
          shape: 'rectangular',
        }
      )
      setLoaded(true)
    }
    document.body.appendChild(script)
  }, [])

  return <div id="google-btn" style={{ width: '100%', minHeight: '44px' }} />
}