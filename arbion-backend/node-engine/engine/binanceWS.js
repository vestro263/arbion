const WebSocket = require('ws')

const activeFeeds = {}   // { 'btcusdt': cleanupFn }

/**
 * Starts a Binance futures trade stream for a symbol.
 * Automatically closes any existing feed for that symbol first.
 * @param {string} symbol - e.g. 'btcusdt'
 * @param {(price: number) => void} onPrice
 */
function startBinanceFeed(symbol, onPrice) {
  const key = symbol.toLowerCase()

  // close existing feed for this symbol if any
  if (activeFeeds[key]) {
    console.log(`🔄 Closing existing feed for ${key}`)
    activeFeeds[key]()
    delete activeFeeds[key]
  }

  const url = `wss://fstream.binance.com/ws/${key}@trade`  // ← fixed

  let ws
  let reconnectTimeout
  let stopped = false

  function connect() {
    console.log(`Connecting to Binance WS: ${key}`)
    ws = new WebSocket(url)

    ws.on('open', () => console.log(`✅ Binance WS connected: ${key}`))

    ws.on('message', (raw) => {
      try {
        const data = JSON.parse(raw.toString())
        const price = parseFloat(data.p)
        if (Number.isFinite(price)) onPrice(price)
      } catch (err) {
        console.error('❌ WS parse error:', err.message)
      }
    })

    ws.on('close', () => {
      if (stopped) return   // intentional close, don't reconnect
      console.log(`⚠️ Binance WS closed (${key}) — reconnecting in 2s`)
      reconnectTimeout = setTimeout(connect, 2000)
    })

    ws.on('error', (err) => console.error(`❌ Binance WS error (${key}):`, err.message))
  }

  connect()

  const cleanup = () => {
    stopped = true
    if (reconnectTimeout) clearTimeout(reconnectTimeout)
    if (ws) ws.close()
  }

  activeFeeds[key] = cleanup
  return cleanup
}

module.exports = { startBinanceFeed }