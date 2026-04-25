import { Link, useLocation } from 'react-router-dom'

export default function Nav({ username, onLogout, activeAccount, demoBalance, realBalance, onSwitchAccount, onResetDemo }) {
  const { pathname } = useLocation()

  const balance = activeAccount === 'demo' ? demoBalance : realBalance

  return (
    <nav className="nav">
      <span className="nav-brand">ARBION</span>

      <div className="nav-links">
        <Link className={`nav-btn ${pathname === '/trade'     ? 'active' : ''}`} to="/trade">Trade</Link>
        <Link className={`nav-btn ${pathname === '/portfolio' ? 'active' : ''}`} to="/portfolio">Portfolio</Link>
      </div>

      <div className="nav-center">
        {/* ── account toggle ── */}
        <div className="account-toggle">
          <button
            className={`acc-btn ${activeAccount === 'demo' ? 'active' : ''}`}
            onClick={() => onSwitchAccount('demo')}
          >
            Demo
          </button>
          <button
            className={`acc-btn ${activeAccount === 'real' ? 'active' : ''}`}
            onClick={() => onSwitchAccount('real')}
          >
            Real
          </button>
        </div>

        {/* ── balance ── */}
        <div className="nav-balance">
          <span className="nav-balance-label">{activeAccount === 'demo' ? 'Demo' : 'Real'}</span>
          <span className="nav-balance-value">${Number(balance).toLocaleString('en', { minimumFractionDigits: 2 })}</span>
          {activeAccount === 'demo' && (
            <button className="nav-reset" onClick={onResetDemo} title="Reset demo balance">↺</button>
          )}
        </div>
      </div>

      <div className="nav-right">
        <span className="nav-user">{username}</span>
        <button className="nav-logout" onClick={onLogout}>sign out</button>
      </div>
    </nav>
  )
}