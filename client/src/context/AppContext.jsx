import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';

const API = process.env.REACT_APP_API_URL || '';

const AppContext = createContext(null);

// Generate a persistent session ID
function getSessionId() {
  let id = localStorage.getItem('sessionId');
  if (!id) { id = 'pt_' + Date.now() + '_' + Math.random().toString(36).slice(2); localStorage.setItem('sessionId', id); }
  return id;
}

export function AppProvider({ children }) {
  const SESSION_ID = getSessionId();
  const INIT_BAL = 500000;

  const [prices, setPrices]         = useState({});
  const [marketOpen, setMarketOpen] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [balance, setBalance]       = useState(INIT_BAL);
  const [positions, setPositions]   = useState([]);
  const [history, setHistory]       = useState([]);
  const [watchlist, setWatchlist]   = useState([]);
  const [darkMode, setDarkMode]     = useState(false);
  const [apiKey, setApiKey]         = useState(localStorage.getItem('tdApiKey') || '');
  const [connecting, setConnecting] = useState(false);
  const pollRef = useRef(null);

  // ── LOAD PORTFOLIO ──
  useEffect(() => {
    loadPortfolio();
    loadTrades();
    // Try to poll prices if API key exists
    if (localStorage.getItem('tdApiKey')) startPolling();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  // ── DARK MODE ──
  useEffect(() => {
    document.body.classList.toggle('dark', darkMode);
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  async function loadPortfolio() {
    try {
      const { data } = await axios.get(`${API}/api/portfolio/${SESSION_ID}`);
      if (data.balance) setBalance(data.balance);
      if (data.watchlist) setWatchlist(data.watchlist);
      if (data.darkMode !== undefined) setDarkMode(data.darkMode);
    } catch(e) {
      // offline fallback — use localStorage
      const saved = JSON.parse(localStorage.getItem('portfolio') || '{}');
      if (saved.balance) setBalance(saved.balance);
      if (saved.watchlist) setWatchlist(saved.watchlist);
    }
  }

  async function savePortfolio(updates) {
    try {
      await axios.put(`${API}/api/portfolio/${SESSION_ID}`, updates);
    } catch(e) {
      localStorage.setItem('portfolio', JSON.stringify(updates));
    }
  }

  async function loadTrades() {
    try {
      const { data } = await axios.get(`${API}/api/trades/${SESSION_ID}`);
      setPositions(data.filter(t => t.status === 'open'));
      setHistory(data.filter(t => t.status === 'closed'));
    } catch(e) {
      const saved = JSON.parse(localStorage.getItem('trades') || '[]');
      setPositions(saved.filter(t => t.status === 'open'));
      setHistory(saved.filter(t => t.status === 'closed'));
    }
  }

  // ── TWELVE DATA CONNECT ──
  async function connectTwelveData(key) {
    setConnecting(true);
    try {
      const { data } = await axios.post(`${API}/api/connect`, { apiKey: key });
      if (data.success) {
        localStorage.setItem('tdApiKey', key);
        setApiKey(key);
        setWsConnected(true);
        startPolling();
      }
      return data;
    } catch(e) {
      return { error: e.response?.data?.error || e.message };
    } finally {
      setConnecting(false);
    }
  }

  // ── POLL PRICES every 3s ──
  function startPolling() {
    if (pollRef.current) clearInterval(pollRef.current);
    fetchPrices();
    pollRef.current = setInterval(fetchPrices, 3000);
  }

  async function fetchPrices() {
    try {
      const { data } = await axios.get(`${API}/api/prices`);
      if (data.data) {
        setPrices(data.data);
        setMarketOpen(data.market_open);
        setWsConnected(true);
      }
    } catch(e) { setWsConnected(false); }
  }

  // ── TRADE ACTIONS ──
  async function buyOption({ strike, type, prem, qty, lot, expiry, index }) {
    const cost = prem * lot * qty;
    if (cost > balance) return { error: 'Insufficient balance' };
    const newBal = balance - cost;
    const trade = {
      sessionId: SESSION_ID, kind: 'option',
      strike, type, prem, qty, lot, expiry, index,
      status: 'open', curPrem: prem,
      date: new Date().toLocaleDateString('en-IN')
    };
    try {
      const { data } = await axios.post(`${API}/api/trades`, trade);
      setPositions(p => [...p, data]);
    } catch(e) {
      const local = { ...trade, _id: Date.now().toString() };
      setPositions(p => [...p, local]);
    }
    setBalance(newBal);
    savePortfolio({ balance: newBal, watchlist, darkMode });
    return { success: true };
  }

  async function buyStock({ sym, name, price, qty, side }) {
    const cost = price * qty;
    let newBal = side === 'BUY' ? balance - cost : balance + cost;
    if (side === 'BUY' && cost > balance) return { error: 'Insufficient balance' };
    const trade = {
      sessionId: SESSION_ID, kind: 'stock',
      sym, name, price, qty, side, status: 'open',
      curPrice: price, date: new Date().toLocaleDateString('en-IN')
    };
    try {
      const { data } = await axios.post(`${API}/api/trades`, trade);
      setPositions(p => [...p, data]);
    } catch(e) {
      setPositions(p => [...p, { ...trade, _id: Date.now().toString() }]);
    }
    setBalance(newBal);
    savePortfolio({ balance: newBal, watchlist, darkMode });
    return { success: true };
  }

  async function exitPosition(tradeId) {
    const pos = positions.find(p => (p._id || p.id) === tradeId);
    if (!pos) return;
    let pnl = pos.kind === 'option'
      ? (pos.curPrem - pos.prem) * pos.lot * pos.qty
      : (pos.side === 'BUY' ? 1 : -1) * (pos.curPrice - pos.price) * pos.qty;
    let newBal = pos.kind === 'option'
      ? balance + pos.curPrem * pos.lot * pos.qty
      : balance + (pos.side === 'BUY' ? pos.curPrice * pos.qty : 2 * pos.price * pos.qty - pos.curPrice * pos.qty);
    const update = { status: 'closed', exitPrem: pos.curPrem, pnl };
    try {
      await axios.put(`${API}/api/trades/${tradeId}`, update);
    } catch(e) {}
    setPositions(p => p.filter(x => (x._id || x.id) !== tradeId));
    setHistory(h => [{ ...pos, ...update }, ...h]);
    setBalance(newBal);
    savePortfolio({ balance: newBal, watchlist, darkMode });
    return pnl;
  }

  // Update curPrem/curPrice on positions from live prices
  useEffect(() => {
    if (!Object.keys(prices).length) return;
    setPositions(pos => pos.map(p => {
      if (p.kind === 'stock' && prices[p.sym]) {
        return { ...p, curPrice: parseFloat(prices[p.sym].price.toFixed(2)) };
      }
      return p;
    }));
  }, [prices]);

  // Watchlist helpers
  function addToWatchlist(item) {
    if (watchlist.find(w => w.sym === item.sym && w.kind === item.kind)) return false;
    if (watchlist.length >= 50) return false;
    const newWL = [...watchlist, item];
    setWatchlist(newWL);
    savePortfolio({ balance, watchlist: newWL, darkMode });
    return true;
  }
  function removeFromWatchlist(index) {
    const newWL = watchlist.filter((_, i) => i !== index);
    setWatchlist(newWL);
    savePortfolio({ balance, watchlist: newWL, darkMode });
  }
  function toggleDark(on) {
    setDarkMode(on);
    savePortfolio({ balance, watchlist, darkMode: on });
  }
  async function resetAccount() {
    setBalance(INIT_BAL);
    setPositions([]);
    setHistory([]);
    try { await axios.delete(`${API}/api/trades/session/${SESSION_ID}`); } catch(e) {}
    savePortfolio({ balance: INIT_BAL, watchlist, darkMode });
  }

  const fmtP = (p) => p >= 1000 ? p.toLocaleString('en-IN', { maximumFractionDigits: 2 }) : (p||0).toFixed(2);
  const fmtPnl = (v) => (v >= 0 ? '+' : '') + '₹' + Math.abs(Math.round(v)).toLocaleString('en-IN');

  return (
    <AppContext.Provider value={{
      prices, marketOpen, wsConnected, connecting,
      balance, positions, history, watchlist,
      darkMode, apiKey,
      connectTwelveData, buyOption, buyStock, exitPosition,
      addToWatchlist, removeFromWatchlist, toggleDark, resetAccount,
      fmtP, fmtPnl, SESSION_ID
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
