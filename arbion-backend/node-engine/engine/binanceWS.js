const WebSocket = require('ws')

function startBinanceFeed(symbol, onPrice) {
  const url = `wss://stream.binance.com:9443/ws/${symbol}@miniTicker`

  function connect() {
    const ws = new WebSocket(url)

    ws.on('open',    () => console.log(`Binance feed: ${symbol}@miniTicker`))
    ws.on('message', raw => {
      try {
        const data  = JSON.parse(raw)
        const price = parseFloat(data.c)   // close price
        if (!isNaN(price) && price > 0) onPrice(price)
      } catch {}
    })
    ws.on('close', () => {
      console.log('Binance WS closed — reconnecting in 2s')
      setTimeout(connect, 2000)
    })
    ws.on('error', e => console.error('Binance WS error:', e.message))
  }

  connect()
}

module.exports = { startBinanceFeed }