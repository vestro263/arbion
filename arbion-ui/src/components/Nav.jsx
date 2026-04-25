import { Link, useLocation } from 'react-router-dom'

export default function Nav({ username, onLogout }) {
  const { pathname } = useLocation()

  return (
    <nav className="nav">
      <span className="nav-brand">ARBION</span>
      <div className="nav-links">
        <Link className={`nav-btn ${pathname === '/trade'     ? 'active' : ''}`} to="/trade">Trade</Link>
        <Link className={`nav-btn ${pathname === '/portfolio' ? 'active' : ''}`} to="/portfolio">Portfolio</Link>
      </div>
      <div className="nav-right">
        <span className="nav-user">{username}</span>
        <button className="nav-logout" onClick={onLogout}>sign out</button>
      </div>
    </nav>
  )
}