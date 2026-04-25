import { useRef, useState, useCallback, useEffect } from 'react'
import { io } from 'socket.io-client'
import { NODE_HOST } from '../lib/config'

export function useSocket() {
  const socketRef = useRef(null)
  const prevPrice = useRef(null)

  const [connected,    setConnected]    = useState(false)
  const [price,        setPrice]        = useState(null)
  const [priceDir,     setPriceDir]     = useState('')
  const [inTrade,      setInTrade]      = useState(false)
  const [tradeStatus,  setTradeStatus]  = useState(null)
  const [trades,       setTrades]       = useState([])
  const [totalPnl,     setTotalPnl]     = useState(0)

    const tradeIdRef = useRef(null)

  const connect = useCallback((token) => {
    if (socketRef.current) return

    const s = io(NODE_HOST, {
      auth:               { token },
      transports:         ['websocket'],
      reconnection:       true,
      reconnectionAttempts: 8,
    })

    s.on('connect', () => setConnected(true))

    s.on('disconnect', () => {
      setConnected(false)
      setInTrade(false)
    })

    s.on('price', ({ price: p }) => {
      const cur = parseFloat(p)
      setPriceDir(prevPrice.current === null ? '' : cur > prevPrice.current ? 'up' : 'dn')
      prevPrice.current = cur
      setPrice(cur)
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
  setTradeStatus({ state: p >= 0 ? 'won' : 'lost', entry: entryPrice, exit: exitPrice, pnl: p })
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

    socketRef.current = s
  }, [])

const closeTrade = useCallback(() => {
  if (!socketRef.current?.connected || !tradeIdRef.current) return
  socketRef.current.emit('close_trade', { tradeId: tradeIdRef.current })
}, [])

  const disconnect = useCallback(() => {
    socketRef.current?.disconnect()
    socketRef.current = null
    setConnected(false)
    setInTrade(false)
    setPrice(null)
    setPriceDir('')
    prevPrice.current = null
  }, [])

  const placeOrder = useCallback((side) => {
    if (!socketRef.current?.connected || inTrade) return
    socketRef.current.emit('place_order', { symbol: 'BTCUSD', side, type: 'market' })
    setTradeStatus({ state: 'placing', side })
  }, [inTrade])

  useEffect(() => () => disconnect(), [disconnect])


  return {
  connect, disconnect, placeOrder, closeTrade,
  connected, price, priceDir,
  inTrade, tradeStatus,
  trades, totalPnl,
}
}