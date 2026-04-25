import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Login({ onLogin }) {
  const [user,    setUser]    = useState('')
  const [pass,    setPass]    = useState('')
  const [err,     setErr]     = useState('')
  const [loading, setLoading] = useState(false)
  const navigate              = useNavigate()

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
      </div>
    </div>
  )
}