import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react'

const PriceChart = forwardRef(function PriceChart({
  pair = 'BTC / USD',
  connected,
  inTrade,
  tradeStatus,
  onBuy,
  onSell,
}, ref) {
  const wrapRef      = useRef(null)
  const containerRef = useRef(null)
  const widgetRef    = useRef(null)

  // expose reset (pair switch) — just reload the widget with new symbol
  useImperativeHandle(ref, () => ({
    update()     {},   // no-op — TV handles price internally
    addMarker()  {},   // no-op — could use TV drawings API later
    reset()      { mountWidget() },
  }))

  function getSymbol(pairLabel) {
    // 'BTC / USD' → 'BINANCE:BTCUSDT'
    const clean = pairLabel.replace(/\s/g, '').replace('/', '')
    return `BINANCE:${clean}T`
  }

  function mountWidget() {
    if (!containerRef.current) return

    // clear previous
    containerRef.current.innerHTML = ''
    widgetRef.current = null

    const script = document.createElement('script')
    script.src   = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js'
    script.async = true
    script.innerHTML = JSON.stringify({
      autosize:          true,
      symbol:            getSymbol(pair),
      interval:          '1',       // 1 minute
      timezone:          'Etc/UTC',
      theme:             'dark',
      style:             '1',       // candlestick
      locale:            'en',
      toolbar_bg:        '#0a0a0b',
      enable_publishing: false,
      hide_top_toolbar:  false,
      hide_legend:       false,
      save_image:        false,
      backgroundColor:   '#0a0a0b',
      gridColor:         'rgba(255,255,255,0.04)',
      container_id:      'tv_chart',
    })

    containerRef.current.appendChild(script)
  }

  // mount on load
  useEffect(() => {
    mountWidget()
  }, [pair])

  // drag-to-resize
  useEffect(() => {
    const wrap   = wrapRef.current
    const handle = wrap?.querySelector('.chart-resize-handle')
    if (!wrap || !handle) return

    let startY = 0
    let startH = 0

    const onDown = e => {
      startY = e.clientY
      startH = wrap.getBoundingClientRect().height
      handle.classList.add('dragging')
      document.addEventListener('mousemove', onMove)
      document.addEventListener('mouseup',   onUp)
      e.preventDefault()
    }
    const onMove = e => {
      const next = Math.min(900, Math.max(300, startH + (e.clientY - startY)))
      wrap.style.height = next + 'px'
    }
    const onUp = () => {
      handle.classList.remove('dragging')
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup',   onUp)
    }

    handle.addEventListener('mousedown', onDown)
    return () => handle.removeEventListener('mousedown', onDown)
  }, [])

  // status label
  const fmt = n => Number(n).toFixed(2)
  const statusText = () => {
    if (!connected)   return { msg: 'connecting…',           cls: '' }
    if (!tradeStatus) return { msg: 'ready — place a trade', cls: '' }
    const s = tradeStatus.state
    if (s === 'placing') return { msg: `sending ${tradeStatus.side}…`,                                                            cls: 'open' }
    if (s === 'open')    return { msg: `open · $${fmt(tradeStatus.entry)}`,                                                        cls: 'open' }
    if (s === 'won')     return { msg: `+$${fmt(tradeStatus.pnl)} · ${fmt(tradeStatus.entry)}→${fmt(tradeStatus.exit)}`,           cls: 'won'  }
    if (s === 'lost')    return { msg: `-$${fmt(Math.abs(tradeStatus.pnl))} · ${fmt(tradeStatus.entry)}→${fmt(tradeStatus.exit)}`, cls: 'lost' }
    return { msg: '', cls: '' }
  }
  const { msg, cls } = statusText()

  return (
    <div className="chart-wrap" ref={wrapRef}>

      {/* TradingView iframe container */}
      <div
        ref={containerRef}
        className="tradingview-widget-container"
        style={{ height: '100%', width: '100%' }}
      >
        <div
          id="tv_chart"
          className="tradingview-widget-container__widget"
          style={{ height: 'calc(100% - 32px)', width: '100%' }}
        />
      </div>

      {/* overlay: status + buttons */}
      <div className="chart-overlay">
        <div className={`chart-status ${cls}`}>
          <span className="chart-status-dot" />
          {msg}
        </div>
        <div className="chart-trade-btns">
          <button
            className="chart-btn-buy"
            onClick={onBuy}
            disabled={!connected || inTrade}
          >
            ▲ BUY
          </button>
          <button
            className="chart-btn-sell"
            onClick={onSell}
            disabled={!connected || inTrade}
          >
            ▼ SELL
          </button>
        </div>
      </div>

      <div className="chart-resize-handle" />

    </div>
  )
})

export default PriceChart