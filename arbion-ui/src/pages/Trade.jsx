import { useRef, useEffect } from 'react'
import PriceChart from '../components/PriceChart'

const fmt  = n => Number(n).toFixed(2)
const fmtC = n => (n >= 0 ? '+' : '') + '$' + fmt(Math.abs(n))

export default function Trade({
  connected, price, priceDir,
  inTrade, tradeStatus,
  totalPnl, tradeCount,
  activePair,
  onBuy, onSell,
}) {
  const chartRef  = useRef(null)
  const lastSide  = useRef(null)

  useEffect(() => {
    if (price !== null) chartRef.current?.update?.(price)
  }, [price])

  useEffect(() => {
    if (tradeStatus?.state === 'open' && lastSide.current)
      chartRef.current?.addMarker?.(lastSide.current)
  }, [tradeStatus])

  useEffect(() => {
    chartRef.current?.reset?.()
  }, [activePair])

  const handleBuy  = () => { lastSide.current = 'buy';  onBuy()  }
  const handleSell = () => { lastSide.current = 'sell'; onSell() }

  return (
    <div className="trade-page">
      <div className="trade-main">

        <div className="stats-row">
          <div className="stat-card">
            <span className="stat-label">live price</span>
            <span className={`stat-value price ${priceDir}`}>
              {price ? `$${fmt(price)}` : '—'}
              {priceDir === 'up' && <span className="arrow">▲</span>}
              {priceDir === 'dn' && <span className="arrow">▼</span>}
            </span>
          </div>
          <div className="stat-card">
            <span className="stat-label">total pnl</span>
            <span className={`stat-value ${totalPnl > 0 ? 'pos' : totalPnl < 0 ? 'neg' : ''}`}>
              {fmtC(totalPnl)}
            </span>
          </div>
          <div className="stat-card">
            <span className="stat-label">trades</span>
            <span className="stat-value">{tradeCount}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">engine</span>
            <span className={`conn-status ${connected ? 'live' : 'off'}`}>
              <span className="conn-dot" />
              {connected ? 'live' : 'offline'}
            </span>
          </div>
        </div>

        <PriceChart
          ref={chartRef}
          height={300}
          pair={activePair?.label ?? 'BTC / USD'}
          connected={connected}
          inTrade={inTrade}
          tradeStatus={tradeStatus}
          onBuy={handleBuy}
          onSell={handleSell}
        />

      </div>
    </div>
  )
}