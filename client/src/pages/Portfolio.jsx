import React, { useState } from 'react';
import { useApp } from '../context/AppContext';

export default function Portfolio() {
  const { positions, history, balance, exitPosition, fmtP, fmtPnl } = useApp();
  const [tab, setTab] = useState('holdings');
  const [toast, setToast] = useState('');

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  const stocks = positions.filter(p => p.kind === 'stock' && p.side === 'BUY');
  const opts = positions.filter(p => p.kind === 'option' || (p.kind === 'stock' && p.side === 'SELL'));

  const invested = stocks.reduce((s, p) => s + p.price * p.qty, 0);
  const current = stocks.reduce((s, p) => s + (p.curPrice || p.price) * p.qty, 0);
  const holdPnl = current - invested;
  const optPnl = opts.reduce((s, p) => s + (p.kind === 'option' ? ((p.curPrem||p.prem) - p.prem) * p.lot * p.qty : ((p.side==='SELL'?-1:1) * ((p.curPrice||p.price) - p.price) * p.qty)), 0);
  const totalPnl = holdPnl + optPnl + history.reduce((s, t) => s + (t.pnl || 0), 0);

  async function handleExit(id) {
    const pnl = await exitPosition(id);
    showToast(`${pnl >= 0 ? '✅' : '❌'} Exited · P&L: ${fmtPnl(pnl)}`);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 108px)' }}>
      <div className="port-tabs">
        <button className={`port-tab ${tab === 'holdings' ? 'active' : ''}`} onClick={() => setTab('holdings')}>Holdings</button>
        <button className={`port-tab ${tab === 'positions' ? 'active' : ''}`} onClick={() => setTab('positions')}>Positions</button>
      </div>

      {tab === 'holdings' && (
        <>
          <div className="port-hdr">
            <div className="port-stat"><div className="port-stat-lbl">Invested</div><div className="port-stat-val">₹{Math.round(invested).toLocaleString('en-IN')}</div></div>
            <div className="port-sep" />
            <div className="port-stat"><div className="port-stat-lbl">Current</div><div className="port-stat-val">₹{Math.round(current).toLocaleString('en-IN')}</div></div>
            <div className="port-sep" />
            <div className="port-stat"><div className="port-stat-lbl">P&L</div><div className="port-stat-val" style={{ color: holdPnl >= 0 ? 'var(--green)' : 'var(--red)' }}>{fmtPnl(holdPnl)}</div></div>
          </div>
          <div style={{ flex: 1, overflow: 'auto' }}>
            {!stocks.length ? (
              <div className="empty-state"><div className="empty-ico">📦</div><div className="empty-title">No holdings yet</div><div className="empty-sub">Buy stocks from Watchlist</div></div>
            ) : (
              <div className="tbl-wrap">
                <table>
                  <thead><tr><th>Symbol</th><th>Qty</th><th>Avg</th><th>LTP</th><th>P&L</th><th>Action</th></tr></thead>
                  <tbody>
                    {stocks.map(p => {
                      const cur = p.curPrice || p.price;
                      const pnl = (cur - p.price) * p.qty;
                      return (
                        <tr key={p._id || p.id}>
                          <td><div className="td-sym">{p.name}</div><div className="td-sub">{p.sym?.replace('NSE:','')}</div></td>
                          <td>{p.qty}</td>
                          <td>₹{fmtP(p.price)}</td>
                          <td className={pnl >= 0 ? 'up' : 'dn'}>₹{fmtP(cur)}</td>
                          <td className={pnl >= 0 ? 'up' : 'dn'}>{fmtPnl(pnl)}</td>
                          <td><button className="exit-btn" onClick={() => handleExit(p._id || p.id)}>Sell</button></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {tab === 'positions' && (
        <>
          <div className="port-hdr">
            <div className="port-stat"><div className="port-stat-lbl">Open P&L</div><div className="port-stat-val" style={{ color: optPnl >= 0 ? 'var(--green)' : 'var(--red)' }}>{fmtPnl(optPnl)}</div></div>
            <div className="port-sep" />
            <div className="port-stat"><div className="port-stat-lbl">Overall P&L</div><div className="port-stat-val" style={{ color: totalPnl >= 0 ? 'var(--green)' : 'var(--red)' }}>{fmtPnl(totalPnl)}</div></div>
            <div className="port-sep" />
            <div className="port-stat"><div className="port-stat-lbl">Open</div><div className="port-stat-val">{opts.length}</div></div>
          </div>
          <div style={{ flex: 1, overflow: 'auto' }}>
            {!opts.length ? (
              <div className="empty-state"><div className="empty-ico">📊</div><div className="empty-title">No open positions</div><div className="empty-sub">Buy options to see them here</div></div>
            ) : (
              <div className="tbl-wrap">
                <table>
                  <thead><tr><th>Symbol</th><th>Qty</th><th>Entry</th><th>LTP</th><th>P&L</th><th>%</th><th>Action</th></tr></thead>
                  <tbody>
                    {opts.map(p => {
                      const isOpt = p.kind === 'option';
                      const cur = isOpt ? (p.curPrem || p.prem) : (p.curPrice || p.price);
                      const entry = isOpt ? p.prem : p.price;
                      const pnl = isOpt ? (cur - entry) * p.lot * p.qty : (p.side === 'SELL' ? -1 : 1) * (cur - entry) * p.qty;
                      const pct = ((cur - entry) / entry * 100).toFixed(1);
                      return (
                        <tr key={p._id || p.id}>
                          <td>
                            <div className="td-sym">
                              {isOpt ? `${p.index} ${p.strike}` : p.name}
                              <span className={`badge badge-${(isOpt ? p.type : p.side || 'buy').toLowerCase()}`} style={{ marginLeft: 4 }}>
                                {isOpt ? p.type : p.side}
                              </span>
                            </div>
                            <div className="td-sub">{isOpt ? `${p.expiry} · ${p.qty}L` : `${p.qty} shares`}</div>
                          </td>
                          <td>₹{isOpt ? entry : fmtP(entry)}</td>
                          <td>{isOpt ? p.lot * p.qty : p.qty}</td>
                          <td className={pnl >= 0 ? 'up' : 'dn'}>₹{isOpt ? cur : fmtP(cur)}</td>
                          <td className={pnl >= 0 ? 'up' : 'dn'}>{fmtPnl(pnl)}</td>
                          <td className={pnl >= 0 ? 'up' : 'dn'}>{pct}%</td>
                          <td><button className="exit-btn" onClick={() => handleExit(p._id || p.id)}>Exit</button></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {toast && <div className="toast-container"><div className="toast">{toast}</div></div>}
    </div>
  );
}
