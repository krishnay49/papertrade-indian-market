import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const API_KEY = process.env.TWELVE_API_KEY;

/*
  Convert TradingView format → Twelve Data format

  Example:
  NSE:NIFTY  →  NIFTY.NSE
  NSE:RELIANCE → RELIANCE.NSE
  BSE:SENSEX → SENSEX.BSE
*/
function convertToTwelve(symbol) {
  if (!symbol) return null;

  if (symbol.includes(":")) {
    const [exchange, sym] = symbol.split(":");
    return `${sym}.${exchange}`;
  }

  return symbol;
}

/*
  GET SINGLE PRICE
  Example call:
  /api/price?symbol=NSE:NIFTY
*/
app.get("/api/price", async (req, res) => {
  try {
    const rawSymbol = req.query.symbol;

    if (!rawSymbol) {
      return res.status(400).json({
        error: "Symbol is required",
      });
    }

    const twelveSymbol = convertToTwelve(rawSymbol);

    const url = `https://api.twelvedata.com/price?symbol=${twelveSymbol}&apikey=${API_KEY}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status === "error") {
      return res.status(400).json(data);
    }

    res.json(data);
  } catch (error) {
    console.error("Price API Error:", error);
    res.status(500).json({
      error: "Server error while fetching price",
    });
  }
});

/*
  GET MULTIPLE PRICES
  Example:
  /api/prices?symbols=NSE:NIFTY,NSE:RELIANCE
*/
app.get("/api/prices", async (req, res) => {
  try {
    const symbols = req.query.symbols;

    if (!symbols) {
      return res.status(400).json({
        error: "Symbols are required",
      });
    }

    const symbolArray = symbols.split(",");
    const convertedSymbols = symbolArray
      .map((s) => convertToTwelve(s.trim()))
      .join(",");

    const url = `https://api.twelvedata.com/price?symbol=${convertedSymbols}&apikey=${API_KEY}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status === "error") {
      return res.status(400).json(data);
    }

    res.json(data);
  } catch (error) {
    console.error("Prices API Error:", error);
    res.status(500).json({
      error: "Server error while fetching prices",
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
