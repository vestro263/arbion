const express    = require('express')
const http       = require('http')
const { Server } = require('socket.io')
const jwt        = require('jsonwebtoken')
require('dotenv').config()

const { startBinanceFeed } = require('./engine/binanceWS')
const { createTrade, closeTrade, getUserTrades } = require('./engine/tradeStore')

const app    = express()
const server = http.createServer(app)
const io     = new Server(server, { cors: { origin: '*' } })

// ── auth middleware ───────────────────────────────────────────────────────────
io.use((socket, next) => {
  const token = socket.handshake.auth?.token
  if (!token) return next(new Error('No token'))
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] })
    socket.user = { id: String(decoded.user_id) }
    next()
  } catch (err) {
    next(new Error('Unauthorized'))
  }
})

// ── price state (shared across all sockets) ───────────────────────────────────
let latestPrice = null

startBinanceFeed('btcusdt', (price) => {
  latestPrice = price
  io.emit('price', { symbol: 'BTCUSD', price: price.toFixed(2) })
})

// ── connection ────────────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  const userId = socket.user.id
  console.log('connected:', userId)

  // send open trades on reconnect
  const open = getUserTrades(userId).filter(t => t.status === 'open')
  if (open.length) socket.emit('open_trades', open)

  // ── place_order ───────────────────────────────────────────────────────────
  socket.on('place_order', ({ symbol = 'BTCUSD', side, size = 1 }) => {
    if (!latestPrice) return socket.emit('error', { msg: 'No price yet' })

    const existing = getUserTrades(userId).find(t => t.status === 'open')
    if (existing) return socket.emit('error', { msg: 'Trade already open' })

    // Day 4 trade model
    const trade = createTrade({
      userId,
      symbol,
      side,          // 'buy' | 'sell'
      size,
      entryPrice: latestPrice,
    })

    console.log('trade opened:', trade)

    socket.emit('trade_started', {
      tradeId:    trade.id,
      entryPrice: trade.entryPrice,
      side:       trade.side,
      size:       trade.size,
      symbol:     trade.symbol,
    })
  })

  // ── close_trade ───────────────────────────────────────────────────────────
  socket.on('close_trade', ({ tradeId }) => {
    if (!latestPrice) return

    const result = closeTrade(userId, tradeId, latestPrice)
    if (!result) return socket.emit('error', { msg: 'Trade not found' })

    console.log('trade closed:', result)

    socket.emit('trade_result', {
      tradeId:    result.id,
      entryPrice: result.entryPrice,
      exitPrice:  result.exitPrice,
      pnl:        result.pnl,
      side:       result.side,
      size:       result.size,
    })
  })

  socket.on('disconnect', () => {
    console.log('disconnected:', userId)
  })
})

const PORT = process.env.PORT || 4000

server.listen(PORT, () => {
  console.log(`Node engine → http://localhost:${PORT}`)
})