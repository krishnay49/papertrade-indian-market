import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import TradeModal from '../components/TradeModal';

const ALL_SYMBOLS = [
  { sym:'NSE:NIFTY50',   name:'Nifty 50',           tag:'INDEX', lot:75,  isIdx:true  },
  { sym:'NSE:BANKNIFTY', name:'Bank Nifty',          tag:'INDEX', lot:15,  isIdx:true  },
  { sym:'BSE:SENSEX',    name:'Sensex',              tag:'INDEX', lot:10,  isIdx:true  },
  { sym:'NSE:FINNIFTY',  name:'Fin Nifty',           tag:'INDEX', lot:40,  isIdx:true  },
  { sym:'NSE:HDFCBANK',  name:'HDFC Bank',           tag:'STOCK', lot:550, isIdx:false },
  { sym:'NSE:RELIANCE',  name:'Reliance Industries', tag:'STOCK', lot:250, isIdx:false },
  { sym:'NSE:TCS',       name:'TCS',                 tag:'STOCK', lot:150, isIdx:false },
  { sym:'NSE:INFY',      name:'Infosys',             tag:'STOCK', lot:300, isIdx:false },
  { sym:'NSE:ICICIBANK', name:'ICICI Bank',          tag:'STOCK', lot:700, isIdx:false },
  { sym:'NSE:SBIN',      name:'State Bank of India', tag:'STOCK', lot:1500,isIdx:false },
  { sym:'NSE:AXISBANK',  name:'Axis Bank',           tag:'STOCK', lot:625, isIdx:false },
  { sym:'NSE:WIPRO',     name:'Wipro',               tag:'STOCK', lot:1000,isIdx:false },
  { sym:'NSE:KOTAKBANK', name:'Kotak Mahindra Bank', tag:'STOCK', lot:400, isIdx:false },
  { sym:'NSE:LT',        name:'Larsen & Toubro',     tag:'STOCK', lot:150, isIdx:false },
  { sym:'NSE:TATASTEEL', name:'Tata Steel',          tag:'STOCK', lot:1125,isIdx:false },
  { sym:'NSE:ITC',       name:'ITC Ltd',             tag:'STOCK', lot:1600,isIdx:false },
  { sym:'NSE:MARUTI',    name:'Maruti Suzuki',       tag:'STOCK', lot:100, isIdx:false },
  { sym:'NSE:TATAMOTORS',name:'Tata Motors',         tag:'STOCK', lot:1375,isIdx:false },
];

export default function Watchlist() {
  const { watchlist, addToWatchlist, removeFromWatchlist, prices, fmtP } = useApp();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [trade, setTrade] = useState(null);
  const [toast, setToast] = useState('');

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  const filtered = query.trim().length > 0
    ? ALL_SYMBOLS.filter(s => s.name.toLowerCase().includes(query.toLowerCase()) || s.sym.toLowerCase().includes(query.toLowerCase()))
    : [];

  function handleAdd(item) {
    const ok = addToWatchlist({ kind: 'sym', sym: item.sym, name: item.name, tag: item.tag, lot: item.lot, isIdx: item.isIdx });
    if (ok) showToast(`✅ ${item.name} added`);
    else showToast('Already in watchlist or list full');
    setQuery('');
  }

  return (
    <div style={{ height: 'calc(100vh - 108px)', display: 'flex', flexDirection: 'column' }}>
      {/* Search */}
      <div className="wl-search">
        <span className="wl-search-ico">🔍</span>
        <input
          className="wl-search-inp"
          placeholder="Search stocks, indices..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          autoComplete="off"
        />
        {filtered.length > 0 && (
          <div className="wl-search-drop">
            {filtered.slice(0, 10).map(s => (
              <div key={s.sym} className="wl-drop-item">
                <div>
                  <div className="wl-drop-name">{s.name}</div>
                  <div className="wl-drop-sub">{s.sym} · {s.tag}</div>
                </div>
                <button className="wl-drop-add" onClick={() => handleAdd(s)}>Add ⊕</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Header */}
      <div className="wl-hdr">
        <span className="wl-hdr-title">My Watchlist</span>
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{watchlist.length} / 50</span>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {!watchlist.length ? (
          <div className="empty-state">
            <div className="empty-ico">⭐</div>
            <div className="empty-title">Watchlist is empty</div>
            <div className="empty-sub">Search stocks above to add them</div>
          </div>
        ) : watchlist.map((w, i) => {
          const d = prices[w.sym] || { price: 0, chg: 0 };
          const up = d.chg >= 0;
          return (
            <div key={i} className="wl-item" onClick={() => navigate(`/chart/${encodeURIComponent(w.sym)}`)}>
              <div className="wl-item-left">
                <div className="wl-item-name">{w.name}</div>
                <div className="wl-item-sub">{w.isIdx ? 'NSE INDEX' : 'NSE EQ'}</div>
              </div>
              <div className="wl-item-right">
                <div className={`wl-item-price ${up ? 'up' : 'dn'}`}>₹{fmtP(d.price)}</div>
                <div className={`wl-item-chg ${up ? 'up' : 'dn'}`}>{up ? '▲ +' : '▼ '}{Math.abs(d.chg).toFixed(2)}%</div>
              </div>
              <div className="wl-item-actions">
                {!w.isIdx && <>
                  <button className="wl-act wl-act-buy" onClick={e => { e.stopPropagation(); setTrade({ kind:'stock', sym:w.sym, name:w.name, price: d.price, lot:w.lot, defaultMode:'BUY' }); }}>B</button>
                  <button className="wl-act wl-act-sell" onClick={e => { e.stopPropagation(); setTrade({ kind:'stock', sym:w.sym, name:w.name, price: d.price, lot:w.lot, defaultMode:'SELL' }); }}>S</button>
                </>}
                <button className="wl-act wl-act-del" onClick={e => { e.stopPropagation(); removeFromWatchlist(i); }}>✕</button>
              </div>
            </div>
          );
        })}
      </div>

      {trade && <TradeModal trade={trade} onClose={() => setTrade(null)} onSuccess={showToast} />}
      {toast && <div className="toast-container"><div className="toast">{toast}</div></div>}
    </div>
  );
}
