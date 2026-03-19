import React, { useState } from 'react';
import { useApp } from '../context/AppContext';

export default function Settings() {
  const { darkMode, toggleDark, balance, history, connectTwelveData, wsConnected, marketOpen, connecting, resetAccount, fmtP, fmtPnl } = useApp();
  const [apiKeyInput, setApiKeyInput] = useState(localStorage.getItem('tdApiKey') || '');
  const [toast, setToast] = useState('');

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2500); };
  const cp = history.reduce((s, t) => s + (t.pnl || 0), 0);
  const wins = history.filter(t => t.pnl > 0).length;

  async function handleConnect() {
    if (!apiKeyInput.trim()) { showToast('❌ Enter your Twelve Data API key'); return; }
    const result = await connectTwelveData(apiKeyInput.trim());
    if (result?.error) showToast('❌ ' + result.error);
    else showToast('✅ Connected! Live prices streaming.');
  }

  async function handleReset() {
    if (!window.confirm('Reset account? All trades and balance will be cleared.')) return;
    await resetAccount();
    showToast('✅ Account reset to ₹5,00,000');
  }

  const connStatus = wsConnected
    ? (marketOpen ? { text: '● LIVE', cls: 'badge-live' } : { text: '● Market Closed', cls: 'badge-closed' })
    : { text: '● Disconnected', cls: 'badge-disc' };

  return (
    <div className="page" style={{ paddingBottom: 30 }}>

      {/* Twelve Data Connection */}
      <div className="sett-section">
        <div className="sett-section-title">Twelve Data — Live Prices</div>
        <div className="connect-box">
          <div className="connect-how">How to get your free API key</div>
          <div className="connect-steps">
            1. Go to <b>twelvedata.com</b> → Sign up free<br />
            2. Go to <b>API Keys</b> section<br />
            3. Copy your API key (free tier = 8 symbols live)<br />
            4. Paste below and click Connect
          </div>
          <input
            className="connect-inp"
            placeholder="Paste your Twelve Data API key..."
            value={apiKeyInput}
            onChange={e => setApiKeyInput(e.target.value)}
            autoComplete="off"
          />
          <button className="connect-btn" onClick={handleConnect} disabled={connecting}>
            {connecting ? '⏳ Connecting...' : '⚡ Connect'}
          </button>
        </div>
        <div className="sett-card">
          <div className="sett-row" style={{ cursor: 'default' }}>
            <div className="sett-row-left">
              <span className="sett-row-ico">📡</span>
              <div>
                <div className="sett-row-name">Connection Status</div>
                <div className="sett-row-sub">{wsConnected ? (marketOpen ? 'Live prices streaming every 3s' : 'Connected · Market closed') : 'Not connected'}</div>
              </div>
            </div>
            <span className={`conn-badge ${connStatus.cls}`}>{connStatus.text}</span>
          </div>
        </div>
      </div>

      {/* Appearance */}
      <div className="sett-section">
        <div className="sett-section-title">Appearance</div>
        <div className="sett-card">
          <div className="sett-row" style={{ cursor: 'default' }}>
            <div className="sett-row-left">
              <span className="sett-row-ico">🌙</span>
              <div><div className="sett-row-name">Dark Mode</div><div className="sett-row-sub">Switch between light and dark theme</div></div>
            </div>
            <label className="toggle-switch">
              <input type="checkbox" checked={darkMode} onChange={e => toggleDark(e.target.checked)} />
              <span className="toggle-slider" />
            </label>
          </div>
        </div>
      </div>

      {/* Account */}
      <div className="sett-section">
        <div className="sett-section-title">Account</div>
        <div className="sett-acct-card">
          <div className="sett-avatar">PT</div>
          <div>
            <div className="sett-acct-name">Paper Trader</div>
            <div className="sett-acct-sub">Virtual Account · Indian Market</div>
          </div>
        </div>
        <div className="sett-card">
          {[
            { ico: '💰', name: 'Remaining Balance', sub: 'Available virtual capital', val: '₹'+Math.round(balance).toLocaleString('en-IN'), valColor: 'var(--green)' },
            { ico: '📊', name: 'Total P&L', sub: 'All time profit / loss', val: (cp>=0?'+':'')+'₹'+Math.abs(Math.round(cp)).toLocaleString('en-IN'), valColor: cp>=0?'var(--green)':'var(--red)' },
            { ico: '🏆', name: 'Win Rate', sub: 'Profitable trades %', val: history.length ? Math.round(wins/history.length*100)+'%' : '—', valColor: 'var(--text)' },
            { ico: '🔄', name: 'Total Trades', sub: 'Closed positions', val: history.length, valColor: 'var(--text)' },
          ].map((r, i) => (
            <div key={i} className="sett-row" style={{ cursor: 'default' }}>
              <div className="sett-row-left">
                <span className="sett-row-ico">{r.ico}</span>
                <div><div className="sett-row-name">{r.name}</div><div className="sett-row-sub">{r.sub}</div></div>
              </div>
              <div className="sett-row-val" style={{ color: r.valColor }}>{r.val}</div>
            </div>
          ))}
          <div className="sett-row" onClick={handleReset} style={{ borderTop: '1px solid var(--border)' }}>
            <div className="sett-row-left">
              <span className="sett-row-ico">🔁</span>
              <div><div className="sett-row-name" style={{ color: 'var(--red)' }}>Reset Account</div><div className="sett-row-sub">Clear trades, reset to ₹5,00,000</div></div>
            </div>
            <span style={{ color: 'var(--red)', fontSize: 18 }}>›</span>
          </div>
        </div>
      </div>

      {/* Trade History */}
      <div className="sett-section">
        <div className="sett-section-title">Trade History</div>
        {!history.length ? (
          <div className="empty-state" style={{ padding: '24px 0' }}>
            <div style={{ fontSize: 24 }}>📋</div>
            <div className="empty-title" style={{ fontSize: 13 }}>No trade history yet</div>
          </div>
        ) : history.slice(0, 30).map((t, i) => {
          const sym = t.kind === 'option' ? `${t.index} ${t.strike} ${t.type}` : t.name;
          const meta = t.kind === 'option'
            ? `${t.qty}L · ${t.expiry} · ₹${t.prem} → ₹${t.exitPrem || '—'}`
            : `${t.qty} shares · ${t.side} · ₹${fmtP(t.price)}`;
          const pnl = t.pnl || 0;
          return (
            <div key={i} className="sett-hist-item">
              <div>
                <div className="sett-hist-name">{sym}</div>
                <div className="sett-hist-meta">{meta}</div>
              </div>
              <div>
                <div className="sett-hist-pnl" style={{ color: pnl >= 0 ? 'var(--green)' : 'var(--red)' }}>
                  {pnl >= 0 ? '+' : ''}₹{Math.abs(Math.round(pnl)).toLocaleString('en-IN')}
                </div>
                <div className="sett-hist-date">{t.date || '—'}</div>
              </div>
            </div>
          );
        })}
      </div>

      {toast && <div className="toast-container"><div className="toast">{toast}</div></div>}
    </div>
  );
}
