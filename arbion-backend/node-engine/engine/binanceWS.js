// engine/binanceWS.js
const WebSocket = require('ws')

// tracks active feeds so we don't open duplicates
const feeds = {}

function ensureFeed(symbol, onPrice) {
  const key = symbol.toLowerCase()
  if (feeds[key]) {
    // feed already running — just add this callback
    feeds[key].listeners.push(onPrice)
    return
  }

  const entry = { listeners: [onPrice], ws: null }
  feeds[key] = entry

  function connect() {
    const url = `wss://stream.binance.com:9443/ws/${key}@miniTicker`
    const ws  = new WebSocket(url)
    entry.ws  = ws

    ws.on('open', () => console.log(`Binance feed open: ${key}@miniTicker`))

    ws.on('message', raw => {
      try {
        const data  = JSON.parse(raw)
        const price = parseFloat(data.c)
        if (!isNaN(price) && price > 0) {
          entry.listeners.forEach(cb => cb(price))
        }
      } catch {}
    })

    ws.on('close', () => {
      console.log(`Binance feed closed: ${key} — reconnecting in 2s`)
      setTimeout(connect, 2000)
    })

    ws.on('error', e => {
      console.error(`Binance feed error (${key}):`, e.message)
      ws.close()
    })
  }

  connect()
}

function stopFeed(symbol) {
  const key = symbol.toLowerCase()
  if (!feeds[key]) return
  feeds[key].ws?.terminate()
  delete feeds[key]
}

module.exports = { ensureFeed, stopFeed }