import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react'
import { createChart, CrosshairMode, LineStyle, AreaSeries, createSeriesMarkers } from 'lightweight-charts'

const C = {
  bg:        '#0a0a0b',
  grid:      '#18181c',
  border:    '#242428',
  text:      '#6b6b72',
  hair:      '#3a3a40',
  green:     '#22c55e',
  red:       '#ef4444',
  greenArea: 'rgba(34,197,94,0.12)',
  redArea:   'rgba(239,68,68,0.12)',
  clear:     'rgba(0,0,0,0)',
}

const PriceChart = forwardRef(function PriceChart({
  height = 320,
  pair = 'BTC / USD',
  connected,
  inTrade,
  tradeStatus,
  onBuy,
  onSell,
}, ref) {
  const containerRef  = useRef(null)
  const wrapRef       = useRef(null)   // ← moved here, top of component
  const chartRef      = useRef(null)
  const seriesRef     = useRef(null)
  const markersPlugin = useRef(null)
  const pointsRef     = useRef([])
  const markersRef    = useRef([])

  useImperativeHandle(ref, () => ({
    update(rawPrice) {
      if (!seriesRef.current) return
      const cur  = parseFloat(rawPrice)
      const time = Math.floor(Date.now() / 1000)
      const pts  = pointsRef.current
      if (pts.length && pts[pts.length - 1].time === time) {
        pts[pts.length - 1].value = cur
      } else {
        pts.push({ time, value: cur })
      }
      if (pts.length > 300) pts.splice(0, pts.length - 300)
      const trending = pts.length < 2 || cur >= pts[0].value
      seriesRef.current.applyOptions({
        color:       trending ? C.green     : C.red,
        topColor:    trending ? C.greenArea : C.redArea,
        bottomColor: C.clear,
      })
      seriesRef.current.update({ time, value: cur })
    },

    addMarker(side) {
      if (!markersPlugin.current) return
      const time = Math.floor(Date.now() / 1000)
      markersRef.current = [
        ...markersRef.current,
        {
          time,
          position: side === 'buy' ? 'belowBar' : 'aboveBar',
          color:    side === 'buy' ? C.green     : C.red,
          shape:    side === 'buy' ? 'arrowUp'   : 'arrowDown',
          text:     side.toUpperCase(),
        },
      ]
      markersPlugin.current.setMarkers(markersRef.current)
    },

    reset() {
      pointsRef.current  = []
      markersRef.current = []
      if (!seriesRef.current) return
      seriesRef.current.setData([])
      markersPlugin.current?.setMarkers([])
      seriesRef.current.applyOptions({
        color:       C.green,
        topColor:    C.greenArea,
        bottomColor: C.clear,
      })
    },
  }))

  // ── chart init ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return

    const chart = createChart(containerRef.current, {
      width:  containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,  // fills container
      layout: {
        background: { color: C.bg },
        textColor:  C.text,
        fontFamily: "'DM Mono', 'Courier New', monospace",
        fontSize:   11,
      },
      grid: {
        vertLines: { color: C.grid, style: LineStyle.Solid },
        horzLines: { color: C.grid, style: LineStyle.Solid },
      },
      crosshair: {
        mode:     CrosshairMode.Normal,
        vertLine: { color: C.hair, labelBackgroundColor: '#18181c' },
        horzLine: { color: C.hair, labelBackgroundColor: '#18181c' },
      },
      rightPriceScale: {
        borderColor:  C.border,
        scaleMargins: { top: 0.08, bottom: 0.08 },
      },
      timeScale: {
        borderColor:    C.border,
        timeVisible:    true,
        secondsVisible: true,
        tickMarkFormatter: t => new Date(t * 1000).toTimeString().slice(0, 8),
      },
      handleScroll: true,
      handleScale:  true,
    })

    const series = chart.addSeries(AreaSeries, {
      color:            C.green,
      lineWidth:        2,
      topColor:         C.greenArea,
      bottomColor:      C.clear,
      priceLineVisible: false,
      lastValueVisible: true,
    })

    chartRef.current      = chart
    seriesRef.current     = series
    markersPlugin.current = createSeriesMarkers(series, [])

    // resize observer: tracks both width AND height
    const ro = new ResizeObserver(([e]) => {
      chart.applyOptions({
        width:  e.contentRect.width,
        height: e.contentRect.height,
      })
    })
    ro.observe(containerRef.current)

    return () => {
      ro.disconnect()
      chart.remove()
      chartRef.current      = null
      seriesRef.current     = null
      markersPlugin.current = null
    }
  }, [])  // ← no height dep, container drives size now

  // ── drag-to-resize handle ─────────────────────────────────────────────────
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
      const next = Math.min(700, Math.max(180, startH + (e.clientY - startY)))
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

  // ── status label ──────────────────────────────────────────────────────────
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

      <div className="chart-header">
        <span className="chart-pair">{pair}</span>
        <span className="chart-badge">LIVE</span>
        <span className="chart-meta">1s interval</span>
      </div>

      <div ref={containerRef} className="chart-canvas" />

      <div className="chart-overlay">
        <div className={`chart-status ${cls}`}>
          <span className="chart-status-dot" />
          {msg}
        </div>
        <div className="chart-trade-btns">
          <button className="chart-btn-buy"  onClick={onBuy}  disabled={!connected || inTrade}>▲ BUY</button>
          <button className="chart-btn-sell" onClick={onSell} disabled={!connected || inTrade}>▼ SELL</button>
        </div>
      </div>

      <div className="chart-resize-handle" />

    </div>
  )
})

export default PriceChart