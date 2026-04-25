const WebSocket = require('ws')

/**
 * Starts a Binance trade stream
 * @param {string} symbol - e.g. btcusdt
 * @param {(price: number) => void} onPrice - callback for price updates
 */
function startBinanceFeed(symbol, onPrice) {
  const url = `wss://fstream.binance.com/ws/btcusdt@trade`

  let ws
  let reconnectTimeout

  function connect() {
    console.log(`Connecting to Binance WS: ${symbol}`)

    ws = new WebSocket(url)

    ws.on('open', () => {
      console.log(`✅ Binance WS connected: ${symbol}`)
    })

    ws.on('message', (raw) => {
      try {
        const data = JSON.parse(raw.toString())
        const price = parseFloat(data.p)

        if (Number.isFinite(price)) {
          onPrice(price)
        }
      } catch (err) {
        console.error('❌ WS parse error:', err.message)
      }
    })

    ws.on('close', () => {
      console.log('⚠️ Binance WS closed — reconnecting in 2s')

      reconnectTimeout = setTimeout(() => {
        connect()
      }, 2000)
    })

    ws.on('error', (err) => {
      console.error('❌ Binance WS error:', err.message)
    })
  }

  connect()

  // optional cleanup if you ever need it
  return () => {
    if (reconnectTimeout) clearTimeout(reconnectTimeout)
    if (ws) ws.close()
  }
}

module.exports = { startBinanceFeed }