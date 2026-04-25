const express    = require('express')
const http       = require('http')
const { Server } = require('socket.io')
const jwt        = require('jsonwebtoken')
require('dotenv').config()

const { startBinanceFeed }                       = require('./engine/binanceWS')
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

// ── auth ──────────────────────────────────────────────────────────────────────
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

// ── price cache ───────────────────────────────────────────────────────────────
const latestPrices = {}
const activeFeeds  = new Set()

function trackSymbol(wsSymbol) {
  const key = wsSymbol.toLowerCase()
  if (activeFeeds.has(key)) return
  activeFeeds.add(key)
  startBinanceFeed(key, (price) => {
    latestPrices[key] = price
    checkSLTP(key, price)   // ← check every price tick
  })
}

trackSymbol('btcusdt')

// ── SL/TP enforcement ─────────────────────────────────────────────────────────
// map userId → socket for fast lookup
const userSockets = {}

async function checkSLTP(symbol, price) {
  // find all sockets trading this symbol
  for (const [userId, socket] of Object.entries(userSockets)) {
    try {
      const trades = await getUserTrades(userId)
      const open   = trades.find(t =>
        t.status === 'open' &&
        t.symbol.toLowerCase() === symbol &&
        (t.sl !== null || t.tp !== null)
      )
      if (!open) continue

      const hit = shouldClose(open, price)
      if (!hit) continue

      // auto-close
      const result = await closeTrade(userId, open.id, price)
      if (!result) continue

      console.log(`SL/TP hit — ${userId} trade ${open.id} closed at ${price} (${hit})`)

      socket.emit('trade_result', {
        tradeId:    result.id,
        entryPrice: result.entryPrice,
        exitPrice:  result.exitPrice,
        pnl:        result.pnl,
        side:       result.side,
        size:       result.size,
        closedBy:   hit,   // 'sl' | 'tp'
      })
    } catch (err) {
      console.error('checkSLTP error:', err.message)
    }
  }
}

function shouldClose(trade, price) {
  const { side, sl, tp } = trade

  if (side === 'buy') {
    if (sl !== null && price <= sl) return 'sl'
    if (tp !== null && price >= tp) return 'tp'
  }

  if (side === 'sell') {
    if (sl !== null && price >= sl) return 'sl'
    if (tp !== null && price <= tp) return 'tp'
  }

  return null
}

// ── connection ────────────────────────────────────────────────────────────────
io.on('connection', async (socket) => {
  const userId = socket.user.id
  console.log('connected:', userId)

  userSockets[userId] = socket   // register for SL/TP checks
  socket.activeSymbol = 'btcusdt'

  try {
    const open = (await getUserTrades(userId)).filter(t => t.status === 'open')
    if (open.length) {
      const t = open[0]
      socket.emit('open_trades', open)
      // ensure symbol is being tracked for SL/TP
      trackSymbol(t.symbol)
    }
  } catch (err) {
    console.error('getUserTrades error:', err.message)
  }

  socket.on('switch_symbol', ({ symbol }) => {
    const key = symbol.toLowerCase()
    socket.activeSymbol = key
    trackSymbol(key)
  })

  socket.on('place_order', async ({ symbol, side, size = 1, price: clientPrice, sl, tp }) => {
    const key   = (symbol || socket.activeSymbol).toLowerCase()
    const price = latestPrices[key] || clientPrice
    if (!price) return socket.emit('error', { msg: `No price yet for ${key}` })

    // validate SL/TP make sense
    if (sl !== null && tp !== null) {
      if (side === 'buy'  && sl >= price) return socket.emit('error', { msg: 'SL must be below entry for buy'  })
      if (side === 'buy'  && tp <= price) return socket.emit('error', { msg: 'TP must be above entry for buy'  })
      if (side === 'sell' && sl <= price) return socket.emit('error', { msg: 'SL must be above entry for sell' })
      if (side === 'sell' && tp >= price) return socket.emit('error', { msg: 'TP must be below entry for sell' })
    }

    try {
      const trades   = await getUserTrades(userId)
      const existing = trades.find(t => t.status === 'open')
      if (existing) return socket.emit('error', { msg: 'Trade already open' })

      const trade = await createTrade({
        userId,
        symbol: key,
        side,
        size,
        entryPrice: price,
        sl:  sl  ?? null,
        tp:  tp  ?? null,
      })

      console.log('trade opened:', trade)

      // ensure price feed running for this symbol
      trackSymbol(key)

      socket.emit('trade_started', {
        tradeId:    trade.id,
        entryPrice: trade.entryPrice,
        side:       trade.side,
        size:       trade.size,
        symbol:     trade.symbol,
        sl:         trade.sl,
        tp:         trade.tp,
      })
      await djangoPost('open/', {
          tradeId:    trade.id,
          userId:     userId,
          symbol:     trade.symbol,
          side:       trade.side,
          size:       trade.size,
          entryPrice: trade.entryPrice,
          sl:         trade.sl,
          tp:         trade.tp,
        })
    } catch (err) {
      console.error('place_order error:', err.message)
      socket.emit('error', { msg: 'Failed to place order' })
    }
  })

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
        closedBy:   'manual',
      })
      await djangoPost('close/', {
          tradeId:   result.id,
          exitPrice: result.exitPrice,
          pnl:       result.pnl,
          closedBy:  result.closedBy || 'manual',
        })
    } catch (err) {
      console.error('close_trade error:', err.message)
      socket.emit('error', { msg: 'Failed to close trade' })
    }
  })

  socket.on('disconnect', () => {
    delete userSockets[userId]   // clean up
    console.log('disconnected:', userId)
  })
})

const DJANGO_URL    = process.env.DJANGO_URL    || 'http://localhost:8000'
const NODE_SECRET   = process.env.JWT_SECRET   || 'node_internal_secret'

async function djangoPost(path, body) {
  try {
    await fetch(`${DJANGO_URL}/api/trades/${path}`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'X-Node-Secret': NODE_SECRET,
      },
      body: JSON.stringify(body),
    })
  } catch (err) {
    console.error(`Django POST ${path} failed:`, err.message)
  }
}
const PORT = process.env.PORT || 4000

socket.on('place_order', async ({ symbol, side, size = 1, price: clientPrice, sl, tp }) => {
  console.log('[PLACE_ORDER]', { symbol, side, size, clientPrice, sl, tp })  // ← add
  const key   = (symbol || socket.activeSymbol).toLowerCase()
  const price = latestPrices[key] || clientPrice
  console.log('[PRICE]', key, price, latestPrices[key])  // ← add
  if (!price) return socket.emit('error', { msg: `No price yet for ${key}` })

  if (sl !== null && tp !== null) {
    if (side === 'buy'  && sl >= price) return socket.emit('error', { msg: 'SL must be below entry for buy'  })
    if (side === 'buy'  && tp <= price) return socket.emit('error', { msg: 'TP must be above entry for buy'  })
    if (side === 'sell' && sl <= price) return socket.emit('error', { msg: 'SL must be above entry for sell' })
    if (side === 'sell' && tp >= price) return socket.emit('error', { msg: 'TP must be below entry for sell' })
  }

  try {
    const trades   = await getUserTrades(userId)
    console.log('[EXISTING TRADES]', trades)  // ← add
    const existing = trades.find(t => t.status === 'open')
    if (existing) return socket.emit('error', { msg: 'Trade already open' })

    const trade = await createTrade({
      userId, symbol: key, side, size,
      entryPrice: price, sl: sl ?? null, tp: tp ?? null,
    })
    console.log('[TRADE CREATED]', trade)  // ← add

server.listen(PORT, () => {
  console.log(`Node engine → http://0.0.0.0:${PORT}`)
  const SELF = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`
  setInterval(() => fetch(`${SELF}/health`).catch(() => {}), 10 * 60 * 1000)
})