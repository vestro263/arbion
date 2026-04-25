import { useState, useEffect } from 'react'
import { useGoogleOneTapLogin } from '@react-oauth/google'
import { DJANGO_HOST } from '../lib/config'

export default function Login({ onLogin }) {
  const [tab,     setTab]     = useState('login')  // 'login' | 'signup'
  const [user,    setUser]    = useState('')
  const [email,   setEmail]   = useState('')
  const [pass,    setPass]    = useState('')
  const [pass2,   setPass2]   = useState('')
  const [err,     setErr]     = useState('')
  const [loading, setLoading] = useState(false)

  // ── google one tap ────────────────────────────────────────────────────────
  useGoogleOneTapLogin({
    onSuccess: async ({ credential }) => {
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

  // ── login ─────────────────────────────────────────────────────────────────
  const handleLogin = async e => {
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

  // ── signup ────────────────────────────────────────────────────────────────
  const handleSignup = async e => {
    e.preventDefault()
    setErr('')
    if (pass !== pass2) return setErr('Passwords do not match')
    if (pass.length < 6) return setErr('Password must be at least 6 characters')
    setLoading(true)
    try {
      const res = await fetch(`${DJANGO_HOST}/api/users/signup/`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ username: user, email, password: pass }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Signup failed')
      onLogin(data.access, data.user.username)
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

        {/* ── tabs ── */}
        <div className="login-tabs">
          <button
            className={`login-tab ${tab === 'login'  ? 'active' : ''}`}
            onClick={() => { setTab('login');  setErr('') }}
          >
            sign in
          </button>
          <button
            className={`login-tab ${tab === 'signup' ? 'active' : ''}`}
            onClick={() => { setTab('signup'); setErr('') }}
          >
            create account
          </button>
        </div>

        {/* ── login form ── */}
        {tab === 'login' && (
          <form onSubmit={handleLogin}>
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
        )}

        {/* ── signup form ── */}
        {tab === 'signup' && (
          <form onSubmit={handleSignup}>
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
              <label>email <span style={{ color: 'var(--text4)' }}>(optional)</span></label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
            <div className="form-group">
              <label>password</label>
              <input
                type="password"
                value={pass}
                onChange={e => setPass(e.target.value)}
                autoComplete="new-password"
                required
              />
            </div>
            <div className="form-group">
              <label>confirm password</label>
              <input
                type="password"
                value={pass2}
                onChange={e => setPass2(e.target.value)}
                autoComplete="new-password"
                required
              />
            </div>
            {err && <div className="login-err">{err}</div>}
            <button className="btn-primary" type="submit" disabled={loading}>
              {loading ? 'creating account…' : 'create account'}
            </button>
          </form>
        )}

        <div className="login-divider"><span>or</span></div>

        <GoogleLoginButton onLogin={onLogin} onErr={setErr} />

      </div>
    </div>
  )
}

// ── google button fallback ────────────────────────────────────────────────────
function GoogleLoginButton({ onLogin, onErr }) {
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
    if (!clientId || loaded) return

    const script  = document.createElement('script')
    script.src    = 'https://accounts.google.com/gsi/client'
    script.async  = true
    script.onload = () => {
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback:  async ({ credential }) => {
          try {
            const res = await fetch(`${DJANGO_HOST}/api/users/auth/google/`, {
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