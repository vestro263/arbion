const fmt = n => Number(n).toFixed(2)

export default function Portfolio({ trades, totalPnl }) {
  const wins    = trades.filter(t => t.pnl >= 0).length
  const losses  = trades.length - wins
  const winRate = trades.length ? Math.round((wins / trades.length) * 100) : 0

  return (
    <main className="portfolio-page">

      <div className="port-stats">
        <div className="port-stat">
          <span className="stat-label">total pnl</span>
          <span className={`stat-value lg ${totalPnl >= 0 ? 'pos' : 'neg'}`}>
            {totalPnl >= 0 ? '+' : ''}${fmt(totalPnl)}
          </span>
        </div>
        <div className="port-stat">
          <span className="stat-label">win rate</span>
          <span className="stat-value lg">{winRate}%</span>
        </div>
        <div className="port-stat">
          <span className="stat-label">wins</span>
          <span className="stat-value lg pos">{wins}</span>
        </div>
        <div className="port-stat">
          <span className="stat-label">losses</span>
          <span className="stat-value lg neg">{losses}</span>
        </div>
      </div>

      <div className="trade-history">
        <h2 className="history-title">trade history</h2>
        {trades.length === 0 ? (
          <p className="empty-history">no trades yet — go place one</p>
        ) : (
          <table className="history-table">
            <thead>
              <tr>
                <th>time</th>
                <th>pair</th>
                <th>side</th>
                <th>entry</th>
                <th>exit</th>
                <th>pnl</th>
                <th>result</th>
              </tr>
            </thead>
            <tbody>
              {trades.map(t => (
                <tr key={t.id} className={t.pnl >= 0 ? 'row-win' : 'row-loss'}>
                  <td className="td-mono">{t.time}</td>
                  <td className="td-mono td-pair">{t.pair ?? 'BTC/USD'}</td>
                  <td className="td-mono">
                    <span className={`pill ${t.side === 'buy' ? 'pill-buy' : 'pill-sell'}`}>
                      {t.side ?? '—'}
                    </span>
                  </td>
                  <td className="td-mono">${fmt(t.entry)}</td>
                  <td className="td-mono">${fmt(t.exit)}</td>
                  <td className={`td-mono td-pnl ${t.pnl >= 0 ? 'pos' : 'neg'}`}>
                    {t.pnl >= 0 ? '+' : ''}${fmt(t.pnl)}
                  </td>
                  <td>
                    <span className={`pill ${t.pnl >= 0 ? 'pill-win' : 'pill-loss'}`}>
                      {t.pnl >= 0 ? 'win' : 'loss'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

    </main>
  )
}