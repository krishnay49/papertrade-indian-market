import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

const INDICES = [
  { sym: 'NSE:NIFTY',     name: 'Nifty 50',   sub: 'NIFTY · Lot 75',    lot: 75 },
  { sym: 'NSE:BANKNIFTY', name: 'Bank Nifty', sub: 'BANKNIFTY · Lot 15', lot: 15 },
  { sym: 'BSE:SENSEX',    name: 'Sensex',     sub: 'SENSEX · Lot 10',    lot: 10 },
  { sym: 'NSE:FINNIFTY',  name: 'Fin Nifty',  sub: 'FINNIFTY · Lot 40',  lot: 40 },
  { sym: 'NSE:HDFCBANK',  name: 'HDFC Bank',  sub: 'NSE EQ · Lot 550',   lot: 550 },
  { sym: 'NSE:RELIANCE',  name: 'Reliance',   sub: 'NSE EQ · Lot 250',   lot: 250 },
  { sym: 'NSE:TCS',       name: 'TCS',        sub: 'NSE EQ · Lot 150',   lot: 150 },
  { sym: 'NSE:INFY',      name: 'Infosys',    sub: 'NSE EQ · Lot 300',   lot: 300 },
];

export default function Market() {
  const navigate = useNavigate();
  const { prices, fmtP } = useApp();

  return (
    <div>
      <div className="page-hdr" style={{ padding: '8px 14px 6px', borderBottom: '1px solid var(--border2)' }}>
        Market Overview
      </div>
      {INDICES.map(idx => {
        const d = prices[idx.sym];
        const price = d?.price || 0;
        const chg = d?.chg || 0;
        const up = chg >= 0;
        return (
          <div key={idx.sym} className="market-row" onClick={() => navigate(`/chart/${encodeURIComponent(idx.sym)}`)}>
            <div className="market-row-info">
              <div className="market-row-name">{idx.name}</div>
              <div className="market-row-sub">{idx.sub}</div>
            </div>
            <div className="market-row-right">
              <div className={`market-row-price ${up ? 'up' : 'dn'}`}>{fmtP(price)}</div>
              <div className={`market-row-chg ${up ? 'up' : 'dn'}`}>{up ? '▲ +' : '▼ '}{Math.abs(chg).toFixed(2)}%</div>
            </div>
            <div className="market-row-arrow">›</div>
          </div>
        );
      })}
    </div>
  );
}
