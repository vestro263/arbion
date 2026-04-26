import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const API_URL = import.meta.env.VITE_API_URL

const COUNTRIES = [
  'Afghanistan','Albania','Algeria','Angola','Argentina','Australia','Austria',
  'Belgium','Bolivia','Brazil','Canada','Chile','China','Colombia','Croatia',
  'Czech Republic','Denmark','Ecuador','Egypt','Ethiopia','Finland','France',
  'Germany','Ghana','Greece','Guatemala','Hungary','India','Indonesia','Iran',
  'Iraq','Ireland','Israel','Italy','Jamaica','Japan','Jordan','Kenya','Kuwait',
  'Malaysia','Mexico','Morocco','Mozambique','Netherlands','New Zealand','Nigeria',
  'Norway','Pakistan','Panama','Peru','Philippines','Poland','Portugal','Qatar',
  'Romania','Russia','Saudi Arabia','Senegal','Serbia','Singapore','South Africa',
  'South Korea','Spain','Sri Lanka','Sweden','Switzerland','Tanzania','Thailand',
  'Turkey','Uganda','Ukraine','United Arab Emirates','United Kingdom',
  'United States','Uruguay','Venezuela','Vietnam','Zimbabwe',
]

const ID_TYPES = [
  { value: 'passport',    label: 'Passport' },
  { value: 'national_id', label: 'National ID' },
  { value: 'drivers',     label: "Driver's License" },
]

export default function Settings({ jwt, activeAccount, demoBalance, realBalance, onSwitchAccount }) {
  const navigate           = useNavigate()
  const [tab,           setTab]           = useState('account')
  const [loading,       setLoading]       = useState(false)
  const [done,          setDone]          = useState(false)
  const [err,           setErr]           = useState('')
  const [focused,       setFocused]       = useState(null)
  const [accountNumber, setAccountNumber] = useState('')
  const [copied,        setCopied]        = useState(false)

  const [form, setForm] = useState({
    full_name:   '',
    dob:         '',
    country:     '',
    phone:       '',
    id_type:     'passport',
    id_number:   '',
    address:     '',
    city:        '',
    postal_code: '',
  })

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }))

  const submitKyc = async () => {
    const required = ['full_name', 'dob', 'country', 'phone', 'id_type', 'id_number']
    for (const f of required) {
      if (!form[f]) { setErr('Please fill all required fields'); return }
    }
    setLoading(true)
    setErr('')
    try {
      const res = await fetch(`${API_URL}/api/kyc/`, {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${jwt}`,
        },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { setErr(data.error || 'Submission failed'); return }
      setAccountNumber(data.account_number)
      setDone(true)
      if (onSwitchAccount) onSwitchAccount('real')
    } catch (e) {
      setErr('Submission failed')
    } finally {
      setLoading(false)
    }
  }

  const copyNumber = () => {
    navigator.clipboard.writeText(accountNumber)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <>
      <style>{`
        .settings-page {
          min-height: 100vh;
          background: #0d0d0f;
          padding: 40px 24px 80px;
          font-family: 'Share Tech Mono', monospace;
          color: #e0e0e0;
        }
        .settings-header { max-width: 640px; margin: 0 auto 32px; }
        .settings-back {
          background: none; border: none; color: rgba(255,255,255,0.3);
          font-family: inherit; font-size: 11px; letter-spacing: 0.15em;
          cursor: pointer; padding: 0; margin-bottom: 16px;
          display: flex; align-items: center; gap: 6px; transition: color 0.2s;
        }
        .settings-back:hover { color: #fff; }
        .settings-title { font-size: 22px; font-weight: 700; letter-spacing: 0.08em; color: #fff; margin-bottom: 4px; }
        .settings-sub { font-size: 11px; color: rgba(255,255,255,0.3); letter-spacing: 0.1em; }
        .settings-tabs {
          display: flex; max-width: 640px; margin: 0 auto 28px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }
        .settings-tab {
          background: none; border: none; border-bottom: 2px solid transparent;
          padding: 10px 20px; font-family: inherit; font-size: 10px;
          letter-spacing: 0.18em; text-transform: uppercase;
          color: rgba(255,255,255,0.3); cursor: pointer; transition: all 0.2s; margin-bottom: -1px;
        }
        .settings-tab.active { color: #fff; border-bottom-color: #fff; }
        .settings-body { max-width: 640px; margin: 0 auto; }

        .acc-cards { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 28px; }
        .acc-card {
          background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07);
          padding: 20px; border-radius: 2px; position: relative; transition: border-color 0.2s;
        }
        .acc-card.active-demo { border-color: rgba(234,179,8,0.4); }
        .acc-card.active-real { border-color: rgba(34,197,94,0.4); }
        .acc-card-label { font-size: 8px; letter-spacing: 0.25em; text-transform: uppercase; color: rgba(255,255,255,0.3); margin-bottom: 8px; }
        .acc-card-balance { font-size: 26px; font-weight: 700; color: #fff; margin-bottom: 4px; font-variant-numeric: tabular-nums; }
        .acc-card-type { font-size: 9px; letter-spacing: 0.2em; text-transform: uppercase; }
        .acc-card-type.demo { color: #eab308; }
        .acc-card-type.real { color: #22c55e; }
        .acc-card-badge { position: absolute; top: 12px; right: 12px; font-size: 8px; letter-spacing: 0.15em; padding: 3px 8px; border-radius: 2px; }
        .acc-card-badge.active-demo { background: rgba(234,179,8,0.15); color: #eab308; }
        .acc-card-badge.active-real { background: rgba(34,197,94,0.15); color: #22c55e; }

        .kyc-intro { background: rgba(34,197,94,0.06); border: 1px solid rgba(34,197,94,0.15); padding: 16px 20px; margin-bottom: 28px; border-radius: 2px; }
        .kyc-intro-title { font-size: 11px; color: #22c55e; letter-spacing: 0.15em; text-transform: uppercase; margin-bottom: 6px; }
        .kyc-intro-text { font-size: 11px; color: rgba(255,255,255,0.4); line-height: 1.7; letter-spacing: 0.05em; }
        .kyc-section-title { font-size: 9px; letter-spacing: 0.25em; text-transform: uppercase; color: rgba(255,255,255,0.2); margin: 24px 0 14px; padding-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.05); }
        .kyc-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .kyc-field { display: flex; flex-direction: column; gap: 6px; }
        .kyc-field.span2 { grid-column: span 2; }
        .kyc-label { font-size: 8.5px; letter-spacing: 0.2em; text-transform: uppercase; color: rgba(255,255,255,0.3); transition: color 0.2s; }
        .kyc-field.focused .kyc-label { color: #fff; }
        .kyc-input, .kyc-select {
          background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08);
          border-bottom-color: rgba(255,255,255,0.15); color: #e0e0e0; font-family: inherit;
          font-size: 13px; padding: 9px 12px; outline: none; transition: all 0.2s;
          -webkit-appearance: none; border-radius: 0; width: 100%;
        }
        .kyc-input:focus, .kyc-select:focus { border-color: transparent; border-bottom-color: #fff; background: rgba(255,255,255,0.05); }
        .kyc-input::placeholder { color: rgba(255,255,255,0.15); }
        .kyc-select option { background: #1a1a1f; color: #e0e0e0; }
        .kyc-required { color: rgba(239,68,68,0.7); margin-left: 2px; }
        .kyc-submit {
          width: 100%; margin-top: 32px; padding: 14px; background: transparent;
          border: 1px solid #22c55e; color: #22c55e; font-family: inherit; font-size: 10px;
          letter-spacing: 0.25em; text-transform: uppercase; cursor: pointer;
          transition: all 0.2s; position: relative; overflow: hidden;
        }
        .kyc-submit::before { content: ''; position: absolute; inset: 0; background: #22c55e; transform: translateX(-100%); transition: transform 0.3s ease; z-index: 0; }
        .kyc-submit:hover::before { transform: translateX(0); }
        .kyc-submit:hover { color: #0d0d0f; }
        .kyc-submit span { position: relative; z-index: 1; }
        .kyc-submit:disabled { border-color: rgba(255,255,255,0.1); color: rgba(255,255,255,0.2); cursor: not-allowed; }
        .kyc-submit:disabled::before { display: none; }
        .kyc-err { font-size: 11px; color: #ef4444; margin-top: 12px; letter-spacing: 0.08em; }

        .kyc-done { text-align: center; padding: 48px 24px; }
        .kyc-done-icon { font-size: 48px; margin-bottom: 16px; }
        .kyc-done-title { font-size: 18px; font-weight: 700; color: #22c55e; letter-spacing: 0.1em; margin-bottom: 8px; }
        .kyc-done-sub { font-size: 11px; color: rgba(255,255,255,0.3); letter-spacing: 0.1em; line-height: 1.7; }

        .acc-number-card {
          margin: 28px auto 0;
          max-width: 360px;
          background: rgba(34,197,94,0.06);
          border: 1px solid rgba(34,197,94,0.2);
          border-radius: 2px;
          padding: 24px;
          text-align: center;
        }
        .acc-number-label { font-size: 9px; letter-spacing: 0.25em; color: rgba(255,255,255,0.3); text-transform: uppercase; margin-bottom: 12px; }
        .acc-number-value { font-size: 30px; font-weight: 700; color: #22c55e; letter-spacing: 0.12em; margin-bottom: 12px; font-variant-numeric: tabular-nums; }
        .acc-number-hint { font-size: 10px; color: rgba(255,255,255,0.3); letter-spacing: 0.08em; line-height: 1.7; margin-bottom: 16px; }
        .acc-number-copy {
          background: none; border: 1px solid rgba(34,197,94,0.3); color: #22c55e;
          font-family: inherit; font-size: 9px; letter-spacing: 0.15em;
          padding: 8px 20px; cursor: pointer; text-transform: uppercase; transition: all 0.2s;
        }
        .acc-number-copy:hover { background: rgba(34,197,94,0.1); }
        .acc-number-copy.copied { border-color: rgba(255,255,255,0.2); color: rgba(255,255,255,0.4); }

        @media (max-width: 600px) {
          .acc-cards { grid-template-columns: 1fr; }
          .kyc-grid { grid-template-columns: 1fr; }
          .kyc-field.span2 { grid-column: span 1; }
        }
      `}</style>

      <div className="settings-page">
        <div className="settings-header">
          <button className="settings-back" onClick={() => navigate('/trade')}>
            ← Back to Trade
          </button>
          <h1 className="settings-title">Settings</h1>
          <p className="settings-sub">Manage your accounts and profile</p>
        </div>

        <div className="settings-tabs">
          <button className={`settings-tab ${tab === 'account' ? 'active' : ''}`} onClick={() => setTab('account')}>Account</button>
          <button className={`settings-tab ${tab === 'real'    ? 'active' : ''}`} onClick={() => setTab('real')}>Open Real Account</button>
        </div>

        <div className="settings-body">

          {/* ── Account Tab ── */}
          {tab === 'account' && (
            <div>
              <div className="acc-cards">
                <div className={`acc-card ${activeAccount === 'demo' ? 'active-demo' : ''}`}>
                  {activeAccount === 'demo' && <span className="acc-card-badge active-demo">Active</span>}
                  <div className="acc-card-label">Demo Account</div>
                  <div className="acc-card-balance">${Number(demoBalance || 10000).toLocaleString('en', { minimumFractionDigits: 2 })}</div>
                  <div className="acc-card-type demo">Virtual Funds</div>
                </div>
                <div className={`acc-card ${activeAccount === 'real' ? 'active-real' : ''}`}>
                  {activeAccount === 'real' && <span className="acc-card-badge active-real">Active</span>}
                  <div className="acc-card-label">Real Account</div>
                  <div className="acc-card-balance">${Number(realBalance || 0).toLocaleString('en', { minimumFractionDigits: 2 })}</div>
                  <div className="acc-card-type real">Live Funds</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  style={{ flex: 1, padding: '11px', background: activeAccount === 'demo' ? 'rgba(234,179,8,0.12)' : 'transparent', border: `1px solid ${activeAccount === 'demo' ? 'rgba(234,179,8,0.4)' : 'rgba(255,255,255,0.08)'}`, color: activeAccount === 'demo' ? '#eab308' : 'rgba(255,255,255,0.3)', fontFamily: 'inherit', fontSize: '10px', letterSpacing: '0.15em', textTransform: 'uppercase', cursor: 'pointer', transition: 'all 0.2s' }}
                  onClick={() => onSwitchAccount('demo')}
                >
                  Switch to Demo
                </button>
                <button
                  style={{ flex: 1, padding: '11px', background: activeAccount === 'real' ? 'rgba(34,197,94,0.12)' : 'transparent', border: `1px solid ${activeAccount === 'real' ? 'rgba(34,197,94,0.4)' : 'rgba(255,255,255,0.08)'}`, color: activeAccount === 'real' ? '#22c55e' : 'rgba(255,255,255,0.3)', fontFamily: 'inherit', fontSize: '10px', letterSpacing: '0.15em', textTransform: 'uppercase', cursor: 'pointer', transition: 'all 0.2s' }}
                  onClick={() => onSwitchAccount('real')}
                >
                  Switch to Real
                </button>
              </div>
            </div>
          )}

          {/* ── Real Account KYC Tab ── */}
          {tab === 'real' && (
            done ? (
              <div className="kyc-done">
                <div className="kyc-done-icon">✓</div>
                <div className="kyc-done-title">Real Account Activated</div>
                <div className="kyc-done-sub">
                  Your identity has been verified.<br />
                  Your real account is now active.
                </div>
                <div className="acc-number-card">
                  <div className="acc-number-label">Your MetaTrader Account Number</div>
                  <div className="acc-number-value">{accountNumber}</div>
                  <div className="acc-number-hint">
                    Use this number to log into MetaTrader.<br />
                    Your password is your Arbion password.
                  </div>
                  <button className={`acc-number-copy ${copied ? 'copied' : ''}`} onClick={copyNumber}>
                    {copied ? '✓ Copied' : 'Copy Number'}
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="kyc-intro">
                  <div className="kyc-intro-title">Identity Verification</div>
                  <div className="kyc-intro-text">
                    To comply with financial regulations we need to verify your identity.
                    Your data is encrypted and never shared with third parties.
                  </div>
                </div>

                <div className="kyc-section-title">Personal Information</div>
                <div className="kyc-grid">
                  <div className={`kyc-field span2 ${focused === 'full_name' ? 'focused' : ''}`}>
                    <label className="kyc-label">Full Legal Name <span className="kyc-required">*</span></label>
                    <input className="kyc-input" placeholder="As it appears on your ID" value={form.full_name} onChange={set('full_name')} onFocus={() => setFocused('full_name')} onBlur={() => setFocused(null)} />
                  </div>
                  <div className={`kyc-field ${focused === 'dob' ? 'focused' : ''}`}>
                    <label className="kyc-label">Date of Birth <span className="kyc-required">*</span></label>
                    <input className="kyc-input" type="date" value={form.dob} onChange={set('dob')} onFocus={() => setFocused('dob')} onBlur={() => setFocused(null)} />
                  </div>
                  <div className={`kyc-field ${focused === 'country' ? 'focused' : ''}`}>
                    <label className="kyc-label">Country of Residence <span className="kyc-required">*</span></label>
                    <select className="kyc-select" value={form.country} onChange={set('country')} onFocus={() => setFocused('country')} onBlur={() => setFocused(null)}>
                      <option value="">Select country</option>
                      {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className={`kyc-field ${focused === 'phone' ? 'focused' : ''}`}>
                    <label className="kyc-label">Phone Number <span className="kyc-required">*</span></label>
                    <input className="kyc-input" placeholder="+1 234 567 8900" value={form.phone} onChange={set('phone')} onFocus={() => setFocused('phone')} onBlur={() => setFocused(null)} />
                  </div>
                </div>

                <div className="kyc-section-title">Identity Document</div>
                <div className="kyc-grid">
                  <div className={`kyc-field ${focused === 'id_type' ? 'focused' : ''}`}>
                    <label className="kyc-label">Document Type <span className="kyc-required">*</span></label>
                    <select className="kyc-select" value={form.id_type} onChange={set('id_type')} onFocus={() => setFocused('id_type')} onBlur={() => setFocused(null)}>
                      {ID_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div className={`kyc-field ${focused === 'id_number' ? 'focused' : ''}`}>
                    <label className="kyc-label">Document Number <span className="kyc-required">*</span></label>
                    <input className="kyc-input" placeholder="AB1234567" value={form.id_number} onChange={set('id_number')} onFocus={() => setFocused('id_number')} onBlur={() => setFocused(null)} />
                  </div>
                </div>

                <div className="kyc-section-title">Address <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '8px' }}>(Optional)</span></div>
                <div className="kyc-grid">
                  <div className={`kyc-field span2 ${focused === 'address' ? 'focused' : ''}`}>
                    <label className="kyc-label">Street Address</label>
                    <input className="kyc-input" placeholder="123 Main Street" value={form.address} onChange={set('address')} onFocus={() => setFocused('address')} onBlur={() => setFocused(null)} />
                  </div>
                  <div className={`kyc-field ${focused === 'city' ? 'focused' : ''}`}>
                    <label className="kyc-label">City</label>
                    <input className="kyc-input" placeholder="New York" value={form.city} onChange={set('city')} onFocus={() => setFocused('city')} onBlur={() => setFocused(null)} />
                  </div>
                  <div className={`kyc-field ${focused === 'postal_code' ? 'focused' : ''}`}>
                    <label className="kyc-label">Postal Code</label>
                    <input className="kyc-input" placeholder="10001" value={form.postal_code} onChange={set('postal_code')} onFocus={() => setFocused('postal_code')} onBlur={() => setFocused(null)} />
                  </div>
                </div>

                {err && <p className="kyc-err">{err}</p>}

                <button className="kyc-submit" onClick={submitKyc} disabled={loading}>
                  <span>{loading ? 'Submitting...' : 'Submit & Activate Real Account'}</span>
                </button>
              </div>
            )
          )}
        </div>
      </div>
    </>
  )
}