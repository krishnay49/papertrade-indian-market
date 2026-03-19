import React from 'react';
import { useApp } from '../context/AppContext';

export default function TopNav() {
  const { prices, marketOpen, wsConnected, balance, fmtP } = useApp();
  const ni = prices['NSE:NIFTY50'];
  const sx = prices['BSE:SENSEX'];

  const badge = wsConnected
    ? (marketOpen ? { text: '● LIVE', cls: 'badge-live' } : { text: '● Closed', cls: 'badge-closed' })
    : { text: '● No Data', cls: 'badge-disc' };

  return (
    <div className="topnav">
      <span className="tn-logo">PT</span>
      <div className="tn-sep" />
      {ni && (
        <div className="tn-idx">
          <span className="tn-idx-name">NIFTY</span>
          <div className="tn-idx-row">
            <span className={`tn-idx-price ${ni.chg >= 0 ? 'up' : 'dn'}`}>{fmtP(ni.price)}</span>
            <span className={`tn-idx-chg ${ni.chg >= 0 ? 'up' : 'dn'}`}>{ni.chg >= 0 ? '▲' : '▼'} {Math.abs(ni.chg).toFixed(2)}%</span>
          </div>
        </div>
      )}
      <div className="tn-sep" />
      {sx && (
        <div className="tn-idx">
          <span className="tn-idx-name">SENSEX</span>
          <div className="tn-idx-row">
            <span className={`tn-idx-price ${sx.chg >= 0 ? 'up' : 'dn'}`}>{fmtP(sx.price)}</span>
            <span className={`tn-idx-chg ${sx.chg >= 0 ? 'up' : 'dn'}`}>{sx.chg >= 0 ? '▲' : '▼'} {Math.abs(sx.chg).toFixed(2)}%</span>
          </div>
        </div>
      )}
      <span className="tn-bal">₹{Math.round(balance).toLocaleString('en-IN')}</span>
      <span className={`conn-badge ${badge.cls}`}>{badge.text}</span>
    </div>
  );
}
