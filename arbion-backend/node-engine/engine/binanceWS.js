const WebSocket = require('ws')

const feeds = {}

function ensureFeed(symbol, onPrice) {
  const key = symbol.toLowerCase()

  if (feeds[key]) {
    feeds[key].onPrice = onPrice
    return
  }

  const url  = `wss://stream.binance.com:9443/ws/${key}@trade`  // ✅ spot
  const feed = { ws: null, reconnectTimeout: null, stopped: false, onPrice }
  feeds[key] = feed

  function connect() {
    console.log(`Connecting to Binance WS: ${key}`)
    feed.ws = new WebSocket(url)

    feed.ws.on('open', () =>
      console.log(`✅ Binance WS connected: ${key}`)
    )

    feed.ws.on('message', (raw) => {
      try {
        const data  = JSON.parse(raw.toString())
        const price = parseFloat(data.p)
        if (!Number.isFinite(price) || price <= 0) return  // ✅ guard bad data
        feed.onPrice(price)
      } catch (err) {
        console.error(`❌ WS parse error (${key}):`, err.message)
      }
    })

    feed.ws.on('close', () => {
      if (feed.stopped) return
      console.log(`⚠️ Binance WS closed (${key}) — reconnecting in 2s`)
      feed.reconnectTimeout = setTimeout(connect, 2000)
    })

    feed.ws.on('error', (err) =>
      console.error(`❌ Binance WS error (${key}):`, err.message)
    )
  }

  connect()
}

function stopFeed(symbol) {
  const key  = symbol.toLowerCase()
  const feed = feeds[key]
  if (!feed) return
  feed.stopped = true
  if (feed.reconnectTimeout) clearTimeout(feed.reconnectTimeout)
  if (feed.ws) feed.ws.close()
  delete feeds[key]
}

module.exports = { ensureFeed, stopFeed }