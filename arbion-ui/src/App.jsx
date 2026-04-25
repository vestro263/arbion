import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

import { useAuth }      from './hooks/useAuth'
import { useSocket }    from './hooks/useSocket'
import { usePriceFeed } from './hooks/usePriceFeed'

import Nav            from './components/Nav'
import Watchlist      from './components/Watchlist'
import ProtectedRoute from './components/ProtectedRoute'

import Login     from './pages/Login'
import Trade     from './pages/Trade'
import Portfolio from './pages/Portfolio'

import { PAIRS, DEFAULT_PAIR } from './constants/pairs'
import './App.css'

export default function App() {
  const { jwt, username, login, logout } = useAuth()
  const {
    connect, disconnect, placeOrder, closeTrade, switchSymbol,
    connected, inTrade, tradeStatus, trades, totalPnl,
  } = useSocket()

  const [activePair,      setActivePair]      = useState(DEFAULT_PAIR)
  const [watchlistPrices, setWatchlistPrices] = useState({})

  // ── live price for active pair — direct browser→Binance ──────────────────
  const { price, priceDir } = usePriceFeed(activePair?.wsSymbol)

  // ── watchlist feeds — direct browser→Binance ─────────────────────────────
  useEffect(() => {
    let alive = true
    const sockets = {}

    PAIRS.forEach(pair => {
      const ws = new WebSocket(
        `wss://stream.binance.com:9443/ws/${pair.wsSymbol}@miniTicker`
      )
      ws.onopen    = () => { if (!alive) ws.close() }
      ws.onmessage = (e) => {
        if (!alive) return
        const d = JSON.parse(e.data)
        setWatchlistPrices(prev => ({
          ...prev,
          [pair.id]: {
            price:  parseFloat(d.c),
            chg:    parseFloat(d.c) - parseFloat(d.o),
            chgPct: ((parseFloat(d.c) - parseFloat(d.o)) / parseFloat(d.o)) * 100,
          },
        }))
      }
      ws.onerror = () => {}
      sockets[pair.id] = ws
    })

    return () => {
      alive = false
      Object.values(sockets).forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) ws.close()
      })
    }
  }, [])

  const handlePairChange = (pair) => {
    setActivePair(pair)
    switchSymbol(pair.wsSymbol)  // tell server for trade execution
  }


const handleLogin = (token, username) => {
  localStorage.setItem("token", token)
  connect(token)
}
  const handleLogout = () => {
    disconnect()
    logout()
  }

  const tradePage = (
    <div className="app-body">
      <Watchlist
        activePair={activePair}
        onPairChange={handlePairChange}
        prices={watchlistPrices}
      />
      <Trade
        connected={connected}
        price={price}
        priceDir={priceDir}
        inTrade={inTrade}
        tradeStatus={tradeStatus}
        totalPnl={totalPnl}
        tradeCount={trades.length}
        onBuy={() => placeOrder('buy')}
        onSell={() => placeOrder('sell')}
        onClose={closeTrade}
        activePair={activePair}
      />
    </div>
  )

  return (
    <BrowserRouter>
      {jwt && <Nav username={username} onLogout={handleLogout} />}
      <Routes>
        <Route path="/login" element={<Login onLogin={handleLogin} />} />
        <Route path="/trade" element={
          <ProtectedRoute jwt={jwt}>{tradePage}</ProtectedRoute>
        } />
        <Route path="/portfolio" element={
          <ProtectedRoute jwt={jwt}>
            <Portfolio trades={trades} totalPnl={totalPnl} />
          </ProtectedRoute>
        } />
        <Route path="*" element={<Navigate to={jwt ? '/trade' : '/login'} replace />} />
      </Routes>
    </BrowserRouter>
  )
}