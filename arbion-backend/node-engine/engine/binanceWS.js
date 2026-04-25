const WebSocket = require('ws')

function startBinanceFeed(symbol, onPrice) {
  const url = `wss://stream.binance.com:9443/ws/${symbol}@trade`

function connect() {
  const ws = new WebSocket(url)

  ws.on('open', () => {
    console.log(`Binance WS connected: ${symbol}`)
  })

  ws.on('message', (raw) => {
    try {
      const data = JSON.parse(raw)
      const price = parseFloat(data.p)
      if (!isNaN(price)) onPrice(price)
    } catch (err) {
      console.error("Parse error:", err.message)
    }
  })

  ws.on('error', (e) => {
    console.error('Binance WS error:', e.message)
  })

  ws.on('close', (code) => {
    console.log(`Binance WS closed (code: ${code})`)

    // 🚨 IMPORTANT: stop infinite loop on 451
    if (code === 451) {
      console.error("Binance blocked this connection (451). Stopping retries.")
      return
    }

    setTimeout(connect, 5000)
  })
}

module.exports = { startBinanceFeed }