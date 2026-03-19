import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

const TV_MAP = {
  'NSE:NIFTY50':   'NSE:NIFTY50',
  'NSE:BANKNIFTY': 'NSE:BANKNIFTY',
  'BSE:SENSEX':    'BSE:SENSEX',
  'NSE:FINNIFTY':  'NSE:FINNIFTY',
  'NSE:HDFCBANK':  'NSE:HDFCBANK',
  'NSE:RELIANCE':  'NSE:RELIANCE',
  'NSE:TCS':       'NSE:TCS',
  'NSE:INFY':      'NSE:INFY',
};
const TFS = ['1','5','15','60','D'];
const TF_LABELS = { '1':'1m','5':'5m','15':'15m','60':'1H','D':'1D' };

export default function ChartPage() {
  const { sym } = useParams();
  const decoded = decodeURIComponent(sym);
  const navigate = useNavigate();
  const { prices, fmtP, darkMode } = useApp();
  const [tf, setTf] = useState('15');
  const containerRef = useRef(null);
  const scriptRef = useRef(null);

  const d = prices[decoded];
  const tvSym = TV_MAP[decoded] || decoded;

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.id = 'tv-chart-' + Date.now();
    wrap.style.cssText = 'height:100%;width:100%;';
    containerRef.current.appendChild(wrap);

    const s = document.createElement('script');
    s.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    s.async = true;
    s.innerHTML = JSON.stringify({
      autosize: true, symbol: tvSym, interval: tf,
      timezone: 'Asia/Kolkata', theme: darkMode ? 'dark' : 'light',
      style: '1', locale: 'en', enable_publishing: false,
      allow_symbol_change: true, container_id: wrap.id,
      backgroundColor: darkMode ? 'rgba(15,17,23,0)' : 'rgba(255,255,255,0)',
      gridColor: darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
    });
    wrap.appendChild(s);
    scriptRef.current = s;
  }, [tvSym, tf, darkMode]);

  return (
    <div className="chart-page">
      <div className="chart-hdr">
        <button className="chart-back" onClick={() => navigate(-1)}>‹</button>
        <div>
          <span className="chart-sym">{decoded.replace('NSE:','').replace('BSE:','')}</span>
          {d && <>
            <span className={`chart-price ${d.chg>=0?'up':'dn'}`} style={{marginLeft:8}}>₹{fmtP(d.price)}</span>
            <span className={`chart-chg ${d.chg>=0?'up':'dn'}`} style={{marginLeft:4}}>{d.chg>=0?'▲ +':'▼ '}{Math.abs(d.chg).toFixed(2)}%</span>
          </>}
        </div>
        <div className="chart-tfs">
          {TFS.map(t => (
            <button key={t} className={`tf-btn ${tf===t?'active':''}`} onClick={() => setTf(t)}>
              {TF_LABELS[t]}
            </button>
          ))}
        </div>
      </div>
      <div className="chart-frame" ref={containerRef} />
    </div>
  );
}
