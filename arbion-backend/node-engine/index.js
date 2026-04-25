const express    = require('express')
const http       = require('http')
const { Server } = require('socket.io')
const jwt        = require('jsonwebtoken')
require('dotenv').config()

const { ensureFeed }                             = require('./engine/binanceWS')
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

// ── price state ───────────────────────────────────────────────────────────────
const latestPrices = {}  // { 'btcusdt': 94000.12 }

// Start BTC feed by default so first user gets price immediately
ensureFeed('btcusdt', (price) => {
  latestPrices['btcusdt'] = price
  io.to('btcusdt').emit('price', { symbol: 'BTCUSDT', price: price.toFixed(2) })
})

// ── helpers ───────────────────────────────────────────────────────────────────

// Move a socket from its current symbol room into a new one
// and ensure the feed for that symbol is running
function joinSymbol(socket, wsSymbol) {
  const key = wsSymbol.toLowerCase()

  // leave every room except the socket's own room
  socket.rooms.forEach(room => {
    if (room !== socket.id) socket.leave(room)
  })

  // join the new symbol room
  socket.join(key)

  // ensure feed is running — update callback to broadcast to room
  ensureFeed(key, (price) => {
    latestPrices[key] = price
    io.to(key).emit('price', { symbol: key.toUpperCase(), price: price.toFixed(2) })
  })

  console.log(`${socket.user.id} → ${key}`)
}

// ── connection ────────────────────────────────────────────────────────────────
io.on('connection', async (socket) => {
  const userId = socket.user.id
  console.log('connected:', userId)

  // Default: join BTC room
  joinSymbol(socket, 'btcusdt')

  // Restore open trades on reconnect
  try {
    const open = (await getUserTrades(userId)).filter(t => t.status === 'open')
    if (open.length) socket.emit('open_trades', open)
  } catch (err) {
    console.error('getUserTrades error:', err.message)
  }

  // ── switch_symbol ─────────────────────────────────────────────────────────
  // Client calls this when user clicks a different pair in the watchlist
  socket.on('switch_symbol', ({ symbol }) => {
    if (!symbol) return
    joinSymbol(socket, symbol)
    // Immediately send latest known price for this symbol if we have it
    const key   = symbol.toLowerCase()
    const price = latestPrices[key]
    if (price) {
      socket.emit('price', { symbol: key.toUpperCase(), price: price.toFixed(2) })
    }
    socket.emit('symbol_switched', { symbol: key.toUpperCase() })
  })

  // ── place_order ───────────────────────────────────────────────────────────
  socket.on('place_order', async ({ symbol = 'btcusdt', side, size = 1 }) => {
    const key   = symbol.toLowerCase()
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
  const SELF = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`
  setInterval(() => fetch(`${SELF}/health`).catch(() => {}), 10 * 60 * 1000)
})