const { randomUUID } = require('crypto')

const store = {}

function getUserTrades(userId) {
  return store[userId] || []
}

function createTrade({ userId, symbol, side, size, entryPrice }) {
  if (!store[userId]) store[userId] = []

  const trade = {
    id:        randomUUID(),
    userId,
    symbol,
    side,
    size,
    entryPrice,
    exitPrice: null,
    pnl:       null,
    status:    'open',
    openedAt:  new Date().toISOString(),
    closedAt:  null,
  }

  store[userId].push(trade)
  return trade
}

function closeTrade(userId, tradeId, exitPrice) {
  const trades = store[userId] || []
  const trade  = trades.find(t => t.id === tradeId && t.status === 'open')
  if (!trade) return null

  const pnl = trade.side === 'buy'
    ? (exitPrice - trade.entryPrice) * trade.size
    : (trade.entryPrice - exitPrice) * trade.size

  trade.exitPrice = exitPrice
  trade.pnl       = parseFloat(pnl.toFixed(2))
  trade.status    = 'closed'
  trade.closedAt  = new Date().toISOString()

  return trade
}

module.exports = { createTrade, closeTrade, getUserTrades }