require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const WebSocket = require('ws');

const app = express();
app.use(cors({ origin: process.env.CLIENT_URL || '*' }));
app.use(express.json());

// ── CONNECT MONGODB ──
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/papertrade')
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('MongoDB error:', err.message));

// ── MODELS ──
const TradeSchema = new mongoose.Schema({
  sessionId: String,
  kind: String,
  sym: String,
  name: String,
  strike: Number,
  type: String,
  side: String,
  prem: Number,
  price: Number,
  qty: Number,
  lot: Number,
  expiry: String,
  index: String,
  status: { type: String, default: 'open' },
  curPrem: Number,
  curPrice: Number,
  exitPrem: Number,
  pnl: Number,
  date: String,
  createdAt: { type: Date, default: Date.now }
});

const PortfolioSchema = new mongoose.Schema({
  sessionId: { type: String, unique: true },
  balance: { type: Number, default: 500000 },
  watchlist: { type: Array, default: [] },
  darkMode: { type: Boolean, default: false },
  updatedAt: { type: Date, default: Date.now }
});

const Trade = mongoose.model('Trade', TradeSchema);
const Portfolio = mongoose.model('Portfolio', PortfolioSchema);

// ── IN-MEMORY LIVE PRICES ──
const prices = {};

// ── TWELVE DATA SYMBOLS (free tier: 8 max) ──
const TWELVE_SYMBOLS = [
  { td: 'NIFTY',      our: 'NSE:NIFTY50',    name: 'Nifty 50',    base: 23777 },
  { td: 'BANKNIFTY',  our: 'NSE:BANKNIFTY',  name: 'Bank Nifty',  base: 54200 },
  { td: 'SENSEX',     our: 'BSE:SENSEX',      name: 'Sensex',      base: 76704 },
  { td: 'FINNIFTY',   our: 'NSE:FINNIFTY',   name: 'Fin Nifty',   base: 23140 },
  { td: 'HDFCBANK',   our: 'NSE:HDFCBANK',   name: 'HDFC Bank',   base: 1721  },
  { td: 'RELIANCE',   our: 'NSE:RELIANCE',   name: 'Reliance',    base: 1284  },
  { td: 'TCS',        our: 'NSE:TCS',        name: 'TCS',         base: 3542  },
  { td: 'INFY',       our: 'NSE:INFY',       name: 'Infosys',     base: 1628  },
];

// Seed prices with base values
TWELVE_SYMBOLS.forEach(s => {
  prices[s.our] = { price: s.base, base: s.base, chg: 0, name: s.name };
});

// ── MARKET HOURS CHECK (IST) ──
function isMarketOpen() {
  const ist = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const day = ist.getDay();
  const mins = ist.getHours() * 60 + ist.getMinutes();
  if (day === 0 || day === 6) return false;
  return mins >= 9 * 60 + 15 && mins <= 15 * 60 + 30;
}

// ── TWELVE DATA WEBSOCKET ──
let tdWs = null;
let tdApiKey = null;
let reconnectTimer = null;

function connectTwelveData(apiKey) {
  if (tdWs) { tdWs.terminate(); tdWs = null; }
  if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }

  tdApiKey = apiKey;
  console.log('🔌 Connecting to Twelve Data WebSocket...');

  tdWs = new WebSocket(`wss://ws.twelvedata.com/v1/quotes/price?apikey=${apiKey}`);

  tdWs.on('open', () => {
    console.log('✅ Twelve Data WS connected');
    tdWs.send(JSON.stringify({
      action: 'subscribe',
      params: { symbols: TWELVE_SYMBOLS.map(s => {
        if (s.td === 'SENSEX') return s.td + ':BSE';
        return s.td + ':NSE';
      }).join(',') }
    }));
  });

  tdWs.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.event === 'price' && msg.symbol && msg.price) {
        const sym = msg.symbol.split(':')[0];
        const entry = TWELVE_SYMBOLS.find(s => s.td === sym);
        if (entry) {
          const ltp = parseFloat(msg.price);
          const prev = prices[entry.our]?.base || ltp;
          prices[entry.our] = {
            price: ltp,
            base: prev,
            chg: prev ? ((ltp - prev) / prev * 100) : 0,
            name: entry.name,
            timestamp: Date.now()
          };
        }
      }
      if (msg.event === 'heartbeat') console.log('💓 WS heartbeat');
    } catch(e) { /* ignore */ }
  });

  tdWs.on('error', (err) => console.error('TW WS error:', err.message));

  tdWs.on('close', (code) => {
    console.log(`WS closed (${code}), reconnecting in 5s...`);
    reconnectTimer = setTimeout(() => connectTwelveData(tdApiKey), 5000);
  });
}

// ── REST FALLBACK — fetch latest prices via REST ──
async function fetchRestPrices(apiKey) {
  try {
    const symbols = TWELVE_SYMBOLS.map(s =>
      s.td === 'SENSEX' ? s.td + ':BSE' : s.td + ':NSE'
    ).join(',');
    const res = await fetch(
      `https://api.twelvedata.com/price?symbol=${symbols}&apikey=${apiKey}`
    );
    const data = await res.json();
    TWELVE_SYMBOLS.forEach(s => {
      const key = s.td === 'SENSEX' ? s.td + ':BSE' : s.td + ':NSE';
      const q = data[key] || data[s.td];
      if (q?.price) {
        const ltp = parseFloat(q.price);
        const base = prices[s.our]?.base || ltp;
        prices[s.our] = { price: ltp, base, chg: base ? ((ltp-base)/base*100) : 0, name: s.name, timestamp: Date.now() };
      }
    });
    console.log('✅ REST prices fetched');
  } catch(e) { console.error('REST fetch error:', e.message); }
}

// ── API ROUTES ──

// Health check
app.get('/', (req, res) => {
  res.json({
    status: 'Paper Trade API running',
    market_open: isMarketOpen(),
    ws_connected: tdWs?.readyState === 1,
    prices_count: Object.keys(prices).length
  });
});

// Get all live prices
app.get('/api/prices', (req, res) => {
  res.json({
    data: prices,
    market_open: isMarketOpen(),
    timestamp: Date.now()
  });
});

// Connect Twelve Data (save API key)
app.post('/api/connect', async (req, res) => {
  const { apiKey } = req.body;
  if (!apiKey) return res.status(400).json({ error: 'apiKey required' });

  try {
    const testRes = await fetch(`https://api.twelvedata.com/price?symbol=NIFTY:NSE&apikey=${apiKey}`);
    const testData = await testRes.json();
    if (testData.status === 'error') {
      return res.status(401).json({ error: 'Invalid API key: ' + testData.message });
    }
    await fetchRestPrices(apiKey);
    connectTwelveData(apiKey);
    res.json({ success: true, message: 'Connected to Twelve Data' });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// WS status
app.get('/api/status', (req, res) => {
  res.json({
    ws_connected: tdWs?.readyState === 1,
    market_open: isMarketOpen(),
    api_key_set: !!tdApiKey,
    symbols: TWELVE_SYMBOLS.map(s => ({
      sym: s.our,
      name: s.name,
      price: prices[s.our]?.price,
      chg: prices[s.our]?.chg
    }))
  });
});

// ── PORTFOLIO ROUTES ──
app.get('/api/portfolio/:sessionId', async (req, res) => {
  try {
    let p = await Portfolio.findOne({ sessionId: req.params.sessionId });
    if (!p) p = await Portfolio.create({ sessionId: req.params.sessionId });
    res.json(p);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/portfolio/:sessionId', async (req, res) => {
  try {
    const p = await Portfolio.findOneAndUpdate(
      { sessionId: req.params.sessionId },
      { ...req.body, updatedAt: new Date() },
      { upsert: true, new: true }
    );
    res.json(p);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── TRADES ROUTES ──
app.get('/api/trades/:sessionId', async (req, res) => {
  try {
    const trades = await Trade.find({ sessionId: req.params.sessionId }).sort({ createdAt: -1 });
    res.json(trades);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/trades', async (req, res) => {
  try {
    const trade = await Trade.create(req.body);
    res.json(trade);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/trades/:id', async (req, res) => {
  try {
    const trade = await Trade.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(trade);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/trades/session/:sessionId', async (req, res) => {
  try {
    await Trade.deleteMany({ sessionId: req.params.sessionId });
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server on port ${PORT}`));
