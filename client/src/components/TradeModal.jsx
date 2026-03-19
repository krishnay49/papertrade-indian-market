import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';

export default function TradeModal({ trade, onClose, onSuccess }) {
  const { buyOption, buyStock, fmtP, balance } = useApp();
  const [qty, setQty] = useState(1);
  const [mode, setMode] = useState(trade?.defaultMode || 'BUY');

  useEffect(() => { setQty(1); setMode(trade?.defaultMode || 'BUY'); }, [trade]);

  if (!trade) return null;

  const isOption = trade.kind === 'option';
  const price = isOption ? trade.prem : trade.price;
  const lot = trade.lot || 1;
  const cost = isOption ? price * lot * qty : price * qty;

  async function handleConfirm() {
    let result;
    if (isOption) {
      result = await buyOption({ ...trade, qty });
    } else {
      result = await buyStock({ ...trade, qty, side: mode });
    }
    if (result?.error) { alert(result.error); return; }
    onSuccess?.(`✅ ${isOption ? `Bought ${qty}L ${trade.index} ${trade.strike} ${trade.type} @ ₹${price}` : `${mode} ${qty} ${trade.name} @ ₹${fmtP(price)}`}`);
    onClose();
  }

  return (
    <div className="modal-ov open" onClick={e => e.target.classList.contains('modal-ov') && onClose()}>
      <div className="modal">
        <div className="modal-drag" />
        <div className="modal-title">
          {isOption ? `${trade.index} ${trade.strike} ${trade.type}` : trade.name}
        </div>
        <div className="modal-sub">
          {isOption ? `NFO ${trade.expiry} · Paper Trade` : `${trade.sym?.replace('NSE:','')} · NSE Equity · Paper Trade`}
        </div>

        {!isOption && (
          <div className="bs-row">
            <button className={`bs-btn ${mode === 'BUY' ? 'act-buy' : ''}`} onClick={() => setMode('BUY')}>BUY / LONG</button>
            <button className={`bs-btn ${mode === 'SELL' ? 'act-sell' : ''}`} onClick={() => setMode('SELL')}>SELL / SHORT</button>
          </div>
        )}

        <div className="m-grid">
          <div className="m-box"><div className="m-lbl">Price</div><div className="m-val">₹{fmtP(price)}</div></div>
          <div className="m-box"><div className="m-lbl">Lot / Qty</div><div className="m-val">{isOption ? `${lot} qty` : `1 share`}</div></div>
          <div className="m-box"><div className="m-lbl">Symbol</div><div className="m-val">{isOption ? `${trade.index} ${trade.strike}` : trade.sym?.replace('NSE:','')}</div></div>
          <div className="m-box"><div className="m-lbl">Type</div><div className="m-val">{isOption ? trade.type : 'STOCK'}</div></div>
        </div>

        <div className="qty-row">
          <span className="qty-lbl">{isOption ? `Lots (1 lot = ${lot} qty)` : 'Quantity (shares)'}</span>
          <button className="qty-btn" onClick={() => setQty(q => Math.max(1, q - 1))}>−</button>
          <span className="qty-num">{qty}</span>
          <button className="qty-btn" onClick={() => setQty(q => Math.min(500, q + 1))}>+</button>
        </div>

        <div className="m-cost">
          <span className="m-cost-lbl">{mode === 'SELL' && !isOption ? 'Total Value' : 'Total Cost'}</span>
          <span className="m-cost-val">₹{Math.round(cost).toLocaleString('en-IN')}</span>
        </div>

        <div className="m-btns">
          <button className="m-cancel" onClick={onClose}>Cancel</button>
          <button
            className={`m-confirm ${isOption ? (trade.type === 'CE' ? 'm-conf-ce' : 'm-conf-pe') : (mode === 'BUY' ? 'm-conf-buy' : 'm-conf-sell')}`}
            onClick={handleConfirm}
          >
            {isOption ? `BUY ${trade.type}` : `${mode} ${trade.name?.split(' ')[0]}`}
          </button>
        </div>
      </div>
    </div>
  );
}
