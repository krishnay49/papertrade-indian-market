# Paper Trade — Indian Market

A full-stack paper trading app built with MERN stack + Twelve Data WebSocket for real-time prices.

## Tech Stack
- **Frontend**: React + React Router
- **Backend**: Node.js + Express
- **Database**: MongoDB Atlas (free)
- **Real-time prices**: Twelve Data WebSocket (free tier — 8 symbols)
- **Hosting**: Railway (backend) + Netlify (frontend)

---

## Step 1 — Get Free API Keys

### Twelve Data (live prices)
1. Go to **twelvedata.com** → Sign Up (free)
2. Dashboard → API Keys → copy your key
3. Free tier: 8 symbols live via WebSocket

### MongoDB Atlas (database)
1. Go to **mongodb.com/atlas** → Sign Up (free)
2. Create a free cluster (M0)
3. Database Access → Add User (username + password)
4. Network Access → Add IP → Allow from anywhere (0.0.0.0/0)
5. Connect → Drivers → copy connection string
   - Looks like: `mongodb+srv://user:pass@cluster.mongodb.net/papertrade`

---

## Step 2 — Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/papertrade-indian-market.git
git push -u origin main
```

---

## Step 3 — Deploy Backend on Railway

1. Go to **railway.app** → New Project → Deploy from GitHub
2. Connect your GitHub repo
3. Settings:
   - **Root Directory**: `server`
   - **Build Command**: `npm install`
   - **Start Command**: `node src/index.js`
4. Add Environment Variables:
   ```
   MONGODB_URI = mongodb+srv://user:pass@cluster.mongodb.net/papertrade
   CLIENT_URL  = https://YOUR-NETLIFY-APP.netlify.app
   PORT        = 5000
   ```
5. Click **Deploy** → copy your Railway URL (e.g. `https://papertrade-indian-market-production.up.railway.app`)

---

## Step 4 — Deploy Frontend on Netlify

1. Go to **netlify.com** → New Site → Import from GitHub
2. Settings:
   - **Base directory**: `client`
   - **Build command**: `npm install && npm run build`
   - **Publish directory**: `client/build`
3. Add Environment Variable:
   ```
   REACT_APP_API_URL = https://your-railway-app-url.up.railway.app
   ```
4. Click **Deploy**

---

## Step 5 — Connect in the App

1. Open your Netlify URL
2. Go to **Settings** tab
3. Paste your **Twelve Data API key**
4. Click **⚡ Connect**
5. Done — **● LIVE** badge appears, prices stream in real-time

---

## Local Development

```bash
# Install all dependencies
npm run install:all

# Create server/.env from example
cp server/.env.example server/.env
# Fill in your MONGODB_URI and other values

# Run both server and client together
npm run dev
# Server: http://localhost:5000
# Client: http://localhost:3000
```

---

## Free Tier Limits

| Service | Free Limit | Notes |
|---------|-----------|-------|
| Twelve Data | 8 symbols live | Nifty, BankNifty, Sensex, FinNifty, HDFC, Reliance, TCS, Infosys |
| MongoDB Atlas | 512 MB storage | More than enough for trades |
| Railway | $5 free credit/month | Always-on, no cold starts |
| Netlify | 100 GB bandwidth | Unlimited for personal use |

---

## Project Structure

```
papertrade/
├── server/
│   ├── src/
│   │   └── index.js        # Express + WebSocket server
│   ├── package.json
│   └── .env.example
├── client/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   ├── index.js         # React entry point
│   │   ├── context/
│   │   │   └── AppContext.jsx  # Global state + API calls
│   │   ├── components/
│   │   │   ├── TopNav.jsx
│   │   │   ├── BottomNav.jsx
│   │   │   └── TradeModal.jsx
│   │   └── pages/
│   │       ├── Market.jsx
│   │       ├── ChartPage.jsx
│   │       ├── Watchlist.jsx
│   │       ├── Portfolio.jsx
│   │       └── Settings.jsx
│   ├── public/
│   │   └── index.html
│   └── package.json
├── package.json
├── netlify.toml
├── .gitignore
└── README.md
```
