import { useRef, useState, useCallback, useEffect } from 'react'
import { io } from 'socket.io-client'
import { NODE_HOST } from '../lib/config'

export function useSocket() {
  const socketRef    = useRef(null)
  const tradeIdRef   = useRef(null)
  const activeSymbol = useRef('btcusdt')

  const [connected,   setConnected]   = useState(false)
  const [inTrade,     setInTrade]     = useState(false)
  const [tradeStatus, setTradeStatus] = useState(null)
  const [trades,      setTrades]      = useState([])
  const [totalPnl,    setTotalPnl]    = useState(0)

  const connect = useCallback((token) => {
    if (socketRef.current) return

    const s = io(NODE_HOST, {
      auth:                 { token },
      transports:           ['polling', 'websocket'],
      reconnection:         true,
      reconnectionAttempts: 10,
      reconnectionDelay:    1000,
    })

    s.on('connect', () => {
      setConnected(true)
      if (activeSymbol.current !== 'btcusdt') {
        s.emit('switch_symbol', { symbol: activeSymbol.current })
      }
    })

    s.on('disconnect', () => {
      setConnected(false)
      setInTrade(false)
    })

    s.on('open_trades', (openTrades) => {
      if (openTrades.length) {
        const t = openTrades[0]
        tradeIdRef.current = t.id
        setInTrade(true)
        setTradeStatus({ state: 'open', entry: t.entryPrice, side: t.side })
      }
    })

    s.on('trade_started', ({ tradeId, entryPrice, side }) => {
      tradeIdRef.current = tradeId
      setInTrade(true)
      setTradeStatus({ state: 'open', entry: entryPrice, side })
    })

    s.on('trade_result', ({ tradeId, entryPrice, exitPrice, pnl, side }) => {
      tradeIdRef.current = null
      const p = Number(pnl)
      setInTrade(false)
      setTradeStatus({
        state: p >= 0 ? 'won' : 'lost',
        entry: entryPrice,
        exit:  exitPrice,
        pnl:   p,
      })
      setTrades(prev => [{
        id:    tradeId,
        side,
        entry: entryPrice,
        exit:  exitPrice,
        pnl:   p,
        time:  new Date().toTimeString().slice(0, 8),
      }, ...prev])
      setTotalPnl(prev => prev + p)
    })

    s.on('error', ({ msg }) => console.error('socket error:', msg))

    socketRef.current = s
  }, [])

  const disconnect = useCallback(() => {
    socketRef.current?.disconnect()
    socketRef.current  = null
    tradeIdRef.current = null
    setConnected(false)
    setInTrade(false)
  }, [])

  const switchSymbol = useCallback((wsSymbol) => {
    const key = wsSymbol.toLowerCase()
    if (key === activeSymbol.current) return
    activeSymbol.current = key
    // tell server which symbol for trade execution price lookup
    if (socketRef.current?.connected) {
      socketRef.current.emit('switch_symbol', { symbol: key })
    }
  }, [])

  const placeOrder = useCallback((side) => {
    if (!socketRef.current?.connected || inTrade) return
    socketRef.current.emit('place_order', {
      symbol: activeSymbol.current,
      side,
      size:   1,
    })
    setTradeStatus({ state: 'placing', side })
  }, [inTrade])

  const closeTrade = useCallback(() => {
    if (!socketRef.current?.connected || !tradeIdRef.current) return
    socketRef.current.emit('close_trade', { tradeId: tradeIdRef.current })
  }, [])

  useEffect(() => () => disconnect(), [disconnect])

  return {
    connect, disconnect, placeOrder, closeTrade, switchSymbol,
    connected, inTrade, tradeStatus, trades, totalPnl,
  }
}