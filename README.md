# US100 Strategy Terminal

A rules-based **NASDAQ-100 (US100) strategy analysis dashboard** built with Next.js, TypeScript, Tailwind CSS and TradingView Lightweight Charts. It classifies the market trend, detects trend-pullback-confirmation setups, and publishes BUY / SELL / NO TRADE analysis with entry, stop loss, take profit, risk/reward and a 0–100 confidence score.

> **Educational project.** The confidence score is a rules-based checklist score, not a probability of profit. Nothing here is financial advice, and the app never places trades.

## Features

- **Live dashboard** — current US100 price, 24h change, market trend badge, and a professional dark candlestick chart with EMA 20 / 50 / 200 overlays plus support, resistance, entry, stop and target levels drawn on the chart.
- **Five timeframes** — 5m, 15m, 1h, 4h, 1d.
- **Technical analysis** — EMA 20/50/200, RSI 14 (Wilder), ATR 14 (Wilder), swing highs/lows, support and resistance.
- **Signal card** — signal, confidence meter, grade (NO TRADE / WEAK / GOOD / STRONG), full trade plan, a setup checklist, and a plain-English explanation of why the setup does or does not qualify.
- **Demo mode out of the box** — with no API key the app generates deterministic, clearly-labelled DEMO DATA, so it runs (and deploys) before you configure a provider.

## The strategy in one paragraph

Trend + pullback + confirmation. The trend is **BULLISH** when price is above the EMA 200 and the EMAs stack 20 > 50 > 200 (mirrored for **BEARISH**, otherwise **SIDEWAYS**). A BUY needs a bullish trend, a recent pullback into a value zone (EMA 20, EMA 50 or support), an RSI that is not at an overbought extreme, and a bullish confirmation candle — mirrored for SELL. The stop goes behind the recent swing (with an ATR fallback), the target is always 2x the risk (1:2), and suggested risk is 1% per trade. If any condition is missing, the system says **NO TRADE** rather than forcing a signal.

### Confidence score (max 100)

| Factor | Points |
| --- | --- |
| Trend alignment | 25 |
| EMA alignment | 20 |
| Pullback to support/resistance zone | 20 |
| RSI confirmation | 15 |
| Price-action confirmation | 20 |

0–49 → NO TRADE · 50–69 → WEAK SETUP · 70–84 → GOOD SETUP · 85–100 → STRONG SETUP.

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000 — the app starts in demo mode immediately.

### Environment variables (optional, for live data)

Copy `.env.example` to `.env.local`:

```bash
MARKET_DATA_API_KEY=your_twelve_data_key
MARKET_DATA_SYMBOL=QQQ
```

- Get a free API key at [twelvedata.com](https://twelvedata.com).
- `QQQ` (NASDAQ-100 ETF) is available on the free tier and tracks US100 closely. The `NDX` index itself may require a paid plan — if the provider rejects the symbol (or returns malformed/insufficient data), the app automatically falls back to demo data and a note under the dashboard says why.
- The dashboard always shows the symbol the candles actually describe: `US100` in demo mode, or your configured live symbol (e.g. `QQQ · NASDAQ-100 ETF · US100 proxy`) so proxy data is never mislabelled.
- The key is only ever read inside the Next.js API route (`app/api/analysis/route.ts`), so it is never exposed to the browser.

### Optional login gate

Set `DASHBOARD_ACCESS_CODE` to require an access code before anyone can view
the terminal. Visitors get a login screen at `/login`; a correct code issues
an HTTP-only session cookie (derived by hashing the access code) that lasts
7 days, and every page and API route is enforced by the Next.js middleware. Leave the variable empty (the
default) to keep the dashboard public. Changing the code invalidates all
existing sessions. This is a simple shared-code gate for portfolio use — not
a substitute for real user accounts.

### Production build

```bash
npm run build
npm start
```

## Deploying to Vercel

1. Push this folder to a GitHub repository.
2. On [vercel.com](https://vercel.com), **Add New → Project** and import the repository. Vercel auto-detects Next.js — no configuration needed.
3. (Optional) Under **Settings → Environment Variables**, add `MARKET_DATA_API_KEY` and `MARKET_DATA_SYMBOL` for live data.
4. Deploy. Without env vars the deployed app runs in demo mode.

Or from the CLI: `npx vercel`.

There is no database, no background process and no long-running server — everything is a standard Next.js app with one serverless API route.

## Project structure

```
app/
  api/analysis/route.ts   # serverless endpoint: candles + indicators + signal
  layout.tsx, page.tsx    # dashboard UI (client)
components/               # chart, signal card, indicator grid, header, ...
lib/
  marketData.ts           # provider interface, Twelve Data client, demo generator
  indicators.ts           # EMA, RSI, ATR, swings, support/resistance
  strategy.ts             # trend classification, setup detection, scoring
  risk.ts                 # stop/target construction, 1% risk, 1:2 R/R
types/                    # shared TypeScript types
```

### Swapping the data provider

`lib/marketData.ts` defines a tiny `MarketDataProvider` interface (`getCandles(timeframe, count)`). Implement it for any other API (Polygon, Alpha Vantage, your broker, ...) and use it in `getMarketCandles` — nothing else in the app knows where candles come from.

## Disclaimer

This dashboard analyzes historical price data with simple, transparent rules for educational and portfolio purposes. It does not execute trades, and its output is not investment advice.
