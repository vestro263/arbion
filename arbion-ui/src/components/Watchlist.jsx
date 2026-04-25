import { useState } from 'react'
import { PAIRS } from '../constants/pairs'

const fmt = n => Number(n).toFixed(2)

export default function Watchlist({ activePair, onPairChange, prices = {} }) {
  const [collapsed, setCollapsed] = useState(false)
  const [search,    setSearch]    = useState('')

  const filtered = search.trim()
    ? PAIRS.filter(p =>
        p.id.toLowerCase().includes(search.toLowerCase()) ||
        p.base.toLowerCase().includes(search.toLowerCase())
      )
    : PAIRS

  return (
    <aside className={`watchlist ${collapsed ? 'collapsed' : ''}`}>

      {/* ── header ───────────────────────────────────────────────── */}
      <div className="watchlist-header">
        {!collapsed && <span className="watchlist-title">watchlist</span>}
        <button
          className="watchlist-collapse"
          onClick={() => setCollapsed(c => !c)}
          title={collapsed ? 'expand' : 'collapse'}
        >
          {collapsed ? '›' : '‹'}
        </button>
      </div>

      {/* ── search ───────────────────────────────────────────────── */}
      {!collapsed && (
        <div className="watchlist-search">
          <span className="wl-search-icon">⌕</span>
          <input
            className="wl-search-input"
            type="text"
            placeholder="search…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button className="wl-search-clear" onClick={() => setSearch('')}>×</button>
          )}
        </div>
      )}

      {/* ── column headers ───────────────────────────────────────── */}
      {!collapsed && (
        <div className="watchlist-cols">
          <span>symbol</span>
          <span>last</span>
          <span>chg%</span>
        </div>
      )}

      {/* ── rows ─────────────────────────────────────────────────── */}
      <div className="watchlist-body">
        {filtered.length === 0 && (
          <p className="wl-empty">no results</p>
        )}
        {filtered.map(pair => {
          const w   = prices[pair.id] || {}
          const act = activePair?.id === pair.id
          const pos = (w.chg ?? 0) >= 0

          return (
            <button
              key={pair.id}
              className={`watchlist-row ${act ? 'active' : ''} ${pos ? 'up' : 'dn'}`}
              onClick={() => onPairChange(pair)}
            >
              {/* symbol col */}
              <div className="wl-symbol-col">
                <span className="wl-base">{pair.base}</span>
                {!collapsed && (
                  <span className="wl-quote">/ {pair.quote}</span>
                )}
              </div>

              {/* price col */}
              {!collapsed && (
                <span className="wl-price">
                  {w.price != null ? `$${fmt(w.price)}` : '—'}
                </span>
              )}

              {/* change col */}
              {!collapsed && (
                <span className={`wl-chg ${pos ? 'pos' : 'neg'}`}>
                  {w.chgPct != null
                    ? `${pos ? '+' : ''}${w.chgPct.toFixed(2)}%`
                    : '—'}
                </span>
              )}

              {/* collapsed: just a dot indicator */}
              {collapsed && (
                <span className={`wl-dot ${pos ? 'pos' : 'neg'}`} />
              )}
            </button>
          )
        })}
      </div>

      {/* ── footer: active pair summary ──────────────────────────── */}
      {!collapsed && activePair && (
        <div className="watchlist-footer">
          <span className="wl-active-id">{activePair.id}</span>
          {prices[activePair.id]?.price != null && (
            <span className="wl-active-price">
              ${fmt(prices[activePair.id].price)}
            </span>
          )}
        </div>
      )}

    </aside>
  )
}