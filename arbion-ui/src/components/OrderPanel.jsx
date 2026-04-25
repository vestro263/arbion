import { useState } from 'react'

const LOTS = [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5]

export default function OrderPanel({ price, connected, inTrade, onBuy, onSell, onClose, tradeStatus }) {
  const [size, setSize]   = useState(1)
  const [sl,   setSl]     = useState('')
  const [tp,   setTp]     = useState('')

  const fmt = n => Number(n).toFixed(2)

  // auto-calculate SL/TP distance in $ based on % of price
  const slPrice = sl ? parseFloat(sl) : null
  const tpPrice = tp ? parseFloat(tp) : null

  const risk   = price && slPrice ? Math.abs(price - slPrice) * size : null
  const reward = price && tpPrice ? Math.abs(price - tpPrice) * size : null
  const rr     = risk && reward   ? (reward / risk).toFixed(2) : null

  return (
    <div className="order-panel">

      {/* ── lot size ── */}
      <div className="op-section">
        <div className="op-label">LOT SIZE</div>
        <div className="op-lots">
          {LOTS.map(l => (
            <button
              key={l}
              className={`op-lot-btn ${size === l ? 'active' : ''}`}
              onClick={() => setSize(l)}
            >
              {l}
            </button>
          ))}
        </div>
        <div className="op-input-row">
          <input
            className="op-input"
            type="number"
            min="0.01"
            step="0.01"
            value={size}
            onChange={e => setSize(parseFloat(e.target.value) || 0.01)}
          />
          <span className="op-input-label">units</span>
        </div>
      </div>

      {/* ── sl / tp ── */}
      <div className="op-section">
        <div className="op-row">
          <div className="op-field">
            <div className="op-label">STOP LOSS</div>
            <div className="op-input-wrap">
              <span className="op-prefix">$</span>
              <input
                className="op-input sl"
                type="number"
                placeholder={price ? fmt(price * 0.99) : '0.00'}
                value={sl}
                onChange={e => setSl(e.target.value)}
              />
            </div>
            {risk && (
              <div className="op-hint neg">risk: -${fmt(risk)}</div>
            )}
          </div>

          <div className="op-divider" />

          <div className="op-field">
            <div className="op-label">TAKE PROFIT</div>
            <div className="op-input-wrap">
              <span className="op-prefix">$</span>
              <input
                className="op-input tp"
                type="number"
                placeholder={price ? fmt(price * 1.01) : '0.00'}
                value={tp}
                onChange={e => setTp(e.target.value)}
              />
            </div>
            {reward && (
              <div className="op-hint pos">reward: +${fmt(reward)}</div>
            )}
          </div>
        </div>

        {rr && (
          <div className="op-rr">
            R:R &nbsp;<span className={parseFloat(rr) >= 1 ? 'pos' : 'neg'}>{rr}</span>
          </div>
        )}
      </div>

      {/* ── buttons ── */}
      <div className="op-actions">
        {!inTrade ? (
          <>
            <button
              className="op-btn-buy"
              disabled={!connected || !price}
              onClick={() => onBuy('buy', price, { size, sl: slPrice, tp: tpPrice })}
            >
              ▲ BUY &nbsp;<span className="op-btn-price">{price ? `$${fmt(price)}` : '—'}</span>
            </button>
            <button
              className="op-btn-sell"
              disabled={!connected || !price}
              onClick={() => onSell('sell', price, { size, sl: slPrice, tp: tpPrice })}
            >
              ▼ SELL &nbsp;<span className="op-btn-price">{price ? `$${fmt(price)}` : '—'}</span>
            </button>
          </>
        ) : (
          <button className="op-btn-close" onClick={onClose}>
            ✕ CLOSE TRADE
            {tradeStatus?.entry && price && (
              <span className={`op-live-pnl ${price >= tradeStatus.entry ? 'pos' : 'neg'}`}>
                &nbsp;{price >= tradeStatus.entry ? '+' : ''}
                ${fmt((price - tradeStatus.entry) * size)}
              </span>
            )}
          </button>
        )}
      </div>

    </div>
  )
}