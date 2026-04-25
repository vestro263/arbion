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

startBinanceFeed('btcusdt', (price) => {
  latestPrices['btcusdt'] = price
  io.emit('price', { symbol: 'BTCUSDT', price: price.toFixed(2) })
})

// ── connection ────────────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  const userId = socket.user.id
  console.log('connected:', userId)

  const open = getUserTrades(userId).filter(t => t.status === 'open')
  if (open.length) socket.emit('open_trades', open)

  socket.on('switch_symbol', ({ symbol }) => {
    const key = symbol.toLowerCase()
    startBinanceFeed(key, (price) => {
      latestPrices[key] = price
      io.emit('price', { symbol: key.toUpperCase(), price: price.toFixed(2) })
    })
    console.log(`switched feed to: ${key}`)
    socket.emit('symbol_switched', { symbol: key.toUpperCase() })
  })

  socket.on('place_order', ({ symbol = 'btcusdt', side, size = 1 }) => {
    const key = symbol.toLowerCase()
    const price = latestPrices[key]
    if (!price) return socket.emit('error', { msg: `No price yet for ${symbol}` })

    const existing = getUserTrades(userId).find(t => t.status === 'open')
    if (existing) return socket.emit('error', { msg: 'Trade already open' })

    const trade = createTrade({ userId, symbol: key, side, size, entryPrice: price })
    console.log('trade opened:', trade)

    socket.emit('trade_started', {
      tradeId:    trade.id,
      entryPrice: trade.entryPrice,
      side:       trade.side,
      size:       trade.size,
      symbol:     trade.symbol,
    })
  })

  socket.on('close_trade', ({ tradeId }) => {
    const trade = getUserTrades(userId).find(t => t.id === tradeId)
    if (!trade) return socket.emit('error', { msg: 'Trade not found' })

    const price = latestPrices[trade.symbol.toLowerCase()]
    if (!price) return socket.emit('error', { msg: 'No price available' })

    const result = closeTrade(userId, tradeId, price)
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