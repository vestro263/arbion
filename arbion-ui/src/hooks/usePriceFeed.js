import { useEffect, useRef, useState, useCallback } from 'react'

export function usePriceFeed(wsSymbol) {
  const wsRef       = useRef(null)
  const prevPrice   = useRef(null)
  const activeKey   = useRef(null)

  const [price,    setPrice]    = useState(null)
  const [priceDir, setPriceDir] = useState('')

  const connect = useCallback((key) => {
    // close existing connection
    if (wsRef.current) {
      wsRef.current.onclose = null  // prevent reconnect loop
      wsRef.current.close()
      wsRef.current = null
    }

    prevPrice.current = null
    setPrice(null)
    setPriceDir('')

    const url = `wss://stream.binance.com:9443/ws/${key.toLowerCase()}@trade`
    const ws  = new WebSocket(url)
    activeKey.current = key

    ws.onmessage = (e) => {
      try {
        const data  = JSON.parse(e.data)
        const cur   = parseFloat(data.p)
        if (!isFinite(cur) || cur <= 0) return
        setPriceDir(prevPrice.current === null ? '' : cur > prevPrice.current ? 'up' : 'dn')
        prevPrice.current = cur
        setPrice(cur)
      } catch {}
    }

    ws.onclose = () => {
      // reconnect only if this symbol is still active
      if (activeKey.current === key) {
        setTimeout(() => connect(key), 2000)
      }
    }

    ws.onerror = () => ws.close()

    wsRef.current = ws
  }, [])

  useEffect(() => {
    if (wsSymbol) connect(wsSymbol)
    return () => {
      if (wsRef.current) {
        activeKey.current = null
        wsRef.current.onclose = null
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [wsSymbol, connect])

  return { price, priceDir }
}