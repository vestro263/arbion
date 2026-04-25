const express    = require('express')
const http       = require('http')
const { Server } = require('socket.io')
const jwt        = require('jsonwebtoken')
require('dotenv').config()

const { startBinanceFeed } = require('./engine/binanceWS')
const { createTrade, closeTrade, getUserTrades } = require('./engine/tradeStore')

const app    = express()
const server = http.createServer(app)

const FRONTEND_URL = process.env.FRONTEND_URL || 'https://arbion-feos.onrender.com'

const io = new Server(server, {
  cors: {
    origin:      FRONTEND_URL,
    methods:     ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})

// ── CORS for Express HTTP routes ──────────────────────────────────────────────
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin',  FRONTEND_URL)
  res.header('Access-Control-Allow-Methods', 'GET, POST')
  res.header('Access-Control-Allow-Headers', 'Content-Type')
  next()
})

app.use(express.json())
app.get('/health', (_req, res) => res.json({ ok: true }))

// ── auth middleware ───────────────────────────────────────────────────────────
io.use((socket, next) => {
  const token = socket.handshake.auth?.token
  if (!token) return next(new Error('No token'))
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] })
    socket.user = { id: String(decoded.user_id) }
    next()
  } catch {
    next(new Error('Unauthorized'))
  }
})

// ── price state per symbol ────────────────────────────────────────────────────
const latestPrices = {}

// start default BTC feed
startBinanceFeed('btcusdt', (price) => {
  latestPrices['btcusdt'] = price
  io.to('btcusdt').emit('price', { symbol: 'BTCUSDT', price: price.toFixed(2) })
})

// ── connection ────────────────────────────────────────────────────────────────
io.on('connection', async (socket) => {
  const userId = socket.user.id
  console.log('connected:', userId)

  // put every user in BTC room by default
  socket.join('btcusdt')

  // restore open trades on reconnect
  try {
    const open = (await getUserTrades(userId)).filter(t => t.status === 'open')
    if (open.length) socket.emit('open_trades', open)
  } catch (err) {
    console.error('getUserTrades error:', err.message)
  }

  // ── switch_symbol ─────────────────────────────────────────────────────────
  socket.on('switch_symbol', ({ symbol }) => {
    const key = symbol.toLowerCase()

    // leave all symbol rooms, join the new one
    Object.keys(socket.rooms).forEach(room => {
      if (room !== socket.id) socket.leave(room)
    })
    socket.join(key)

    // start feed if not already running
    startBinanceFeed(key, (price) => {
      latestPrices[key] = price
      io.to(key).emit('price', { symbol: key.toUpperCase(), price: price.toFixed(2) })
    })

    console.log(`${userId} switched to: ${key}`)
    socket.emit('symbol_switched', { symbol: key.toUpperCase() })
  })

  // ── place_order ───────────────────────────────────────────────────────────
  socket.on('place_order', async ({ symbol = 'btcusdt', side, size = 1 }) => {
    const key = symbol.toLowerCase()
    const price = latestPrices[key]
    if (!price) return socket.emit('error', { msg: `No price yet for ${symbol}` })

    try {
      const trades   = await getUserTrades(userId)
      const existing = trades.find(t => t.status === 'open')
      if (existing) return socket.emit('error', { msg: 'Trade already open' })

      const trade = await createTrade({ userId, symbol: key, side, size, entryPrice: price })
      console.log('trade opened:', trade)

      socket.emit('trade_started', {
        tradeId:    trade.id,
        entryPrice: trade.entryPrice,
        side:       trade.side,
        size:       trade.size,
        symbol:     trade.symbol,
      })
    } catch (err) {
      console.error('place_order error:', err.message)
      socket.emit('error', { msg: 'Failed to place order' })
    }
  })

  // ── close_trade ───────────────────────────────────────────────────────────
  socket.on('close_trade', async ({ tradeId }) => {
    try {
      const trades = await getUserTrades(userId)
      const trade  = trades.find(t => t.id === tradeId)
      if (!trade) return socket.emit('error', { msg: 'Trade not found' })

      const price = latestPrices[trade.symbol.toLowerCase()]
      if (!price) return socket.emit('error', { msg: 'No price available' })

      const result = await closeTrade(userId, tradeId, price)
      if (!result) return socket.emit('error', { msg: 'Could not close trade' })

      console.log('trade closed:', result)

      socket.emit('trade_result', {
        tradeId:    result.id,
        entryPrice: result.entryPrice,
        exitPrice:  result.exitPrice,
        pnl:        result.pnl,
        side:       result.side,
        size:       result.size,
      })
    } catch (err) {
      console.error('close_trade error:', err.message)
      socket.emit('error', { msg: 'Failed to close trade' })
    }
  })

  socket.on('disconnect', () => console.log('disconnected:', userId))
})

// ── start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 4000

server.listen(PORT, () => {
  console.log(`Node engine → http://0.0.0.0:${PORT}`)

  // keep-alive ping to prevent Render free tier spin-down
  const SELF = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`
  setInterval(() => {
    fetch(`${SELF}/health`).catch(() => {})
  }, 10 * 60 * 1000)
})