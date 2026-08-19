import type { Candle, DataSource, Timeframe } from "@/types";
import { MIN_CANDLES } from "./strategy";

/** Bars requested from the provider / generated for demo mode. */
export const CANDLE_COUNT = 480;

/** Every demo series is rescaled so the latest close lands here. */
const DEMO_LAST_PRICE = 23812.4;

const TIMEFRAME_SECONDS: Record<Timeframe, number> = {
  "5m": 5 * 60,
  "15m": 15 * 60,
  "1h": 60 * 60,
  "4h": 4 * 60 * 60,
  "1d": 24 * 60 * 60,
};

export interface MarketData {
  candles: Candle[];
  source: DataSource;
  note: string | null;
  /** The instrument the candles actually describe (US100 in demo mode). */
  symbol: string;
}

/**
 * Swap providers by implementing this interface and using it in
 * `getMarketCandles` below. Nothing else in the app knows where data
 * comes from.
 */
export interface MarketDataProvider {
  name: string;
  getCandles(timeframe: Timeframe, count: number): Promise<Candle[]>;
}

/* ------------------------------------------------------------------ */
/* Live provider: Twelve Data (https://twelvedata.com)                 */
/* ------------------------------------------------------------------ */

const TWELVE_DATA_INTERVALS: Record<Timeframe, string> = {
  "5m": "5min",
  "15m": "15min",
  "1h": "1h",
  "4h": "4h",
  "1d": "1day",
};

interface TwelveDataValue {
  datetime: string;
  open: string;
  high: string;
  low: string;
  close: string;
}

const twelveData: MarketDataProvider = {
  name: "Twelve Data",

  async getCandles(timeframe, count) {
    const apiKey = process.env.MARKET_DATA_API_KEY;
    if (!apiKey) throw new Error("MARKET_DATA_API_KEY is not set");

    const url = new URL("https://api.twelvedata.com/time_series");
    url.searchParams.set("symbol", liveSymbol());
    url.searchParams.set("interval", TWELVE_DATA_INTERVALS[timeframe]);
    url.searchParams.set("outputsize", String(count));
    url.searchParams.set("timezone", "UTC");
    url.searchParams.set("apikey", apiKey);

    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`provider responded with HTTP ${res.status}`);

    const json = await res.json();
    if (json.status === "error" || !Array.isArray(json.values)) {
      throw new Error(typeof json.message === "string" ? json.message : "provider returned no candles");
    }

    const parsed: Candle[] = (json.values as TwelveDataValue[]).map((v) => ({
      time: parseUtcSeconds(v.datetime),
      open: Number(v.open),
      high: Number(v.high),
      low: Number(v.low),
      close: Number(v.close),
    }));

    // A single NaN bar would silently poison ATR/RSI, so reject the response
    // outright — the caller then falls back to labelled demo data.
    const malformed = parsed.some(
      (c) =>
        !Number.isFinite(c.time) ||
        !Number.isFinite(c.open) ||
        !Number.isFinite(c.high) ||
        !Number.isFinite(c.low) ||
        !Number.isFinite(c.close) ||
        c.high < c.low,
    );
    if (malformed) throw new Error("provider returned malformed candles");

    // Twelve Data usually returns newest-first, but never trust ordering:
    // sort ascending and drop duplicate timestamps (the chart requires both).
    parsed.sort((a, b) => a.time - b.time);
    const candles = parsed.filter(
      (c, idx) => idx === 0 || c.time !== parsed[idx - 1].time,
    );

    if (candles.length < MIN_CANDLES) {
      throw new Error(
        `provider returned only ${candles.length} candles (need ${MIN_CANDLES})`,
      );
    }
    return candles;
  },
};

function liveSymbol(): string {
  return process.env.MARKET_DATA_SYMBOL || "QQQ";
}

/** Twelve Data sends "2026-08-19 14:30:00" (with timezone=UTC) or "2026-08-19". */
function parseUtcSeconds(datetime: string): number {
  const iso = datetime.includes(":")
    ? datetime.replace(" ", "T") + "Z"
    : datetime + "T00:00:00Z";
  return Math.floor(Date.parse(iso) / 1000);
}

/* ------------------------------------------------------------------ */
/* Demo provider: seeded synthetic candles, clearly labelled DEMO      */
/* ------------------------------------------------------------------ */

interface DemoScenario {
  seed: number;
  /** Per-bar volatility in points, roughly scaled to the timeframe. */
  vol: number;
  /** [bars, drift-per-bar in volatility units] — must sum to CANDLE_COUNT minus any tail. */
  segments: [number, number][];
  /** Optional crafted final bars that complete a textbook setup. */
  tail: "bullish-confirm" | "bearish-confirm" | "none";
}

/**
 * Each timeframe gets a different, deterministic market story so the demo
 * showcases every state: 1h = bullish pullback (BUY), 4h = bearish pullback
 * (SELL), 15m = chop (NO TRADE), 1d = extended uptrend with no pullback yet.
 */
const DEMO_SCENARIOS: Record<Timeframe, DemoScenario> = {
  "5m": {
    seed: 11,
    vol: 14,
    segments: [
      [160, 0.06],
      [90, -0.15],
      [120, 0.18],
      [110, 0.02],
    ],
    tail: "none",
  },
  "15m": {
    seed: 23,
    vol: 26,
    segments: [
      [48, 0.14],
      [48, -0.14],
      [48, 0.14],
      [48, -0.14],
      [48, 0.14],
      [48, -0.14],
      [48, 0.14],
      [48, -0.14],
      [48, 0.12],
      [48, -0.12],
    ],
    tail: "none",
  },
  "1h": {
    seed: 47,
    vol: 55,
    segments: [
      [150, 0.1],
      [130, 0.3],
      [80, -0.06],
      [93, 0.34],
      [24, -0.44],
    ],
    tail: "bullish-confirm",
  },
  "4h": {
    seed: 61,
    vol: 110,
    segments: [
      [150, -0.06],
      [130, -0.28],
      [80, 0.06],
      [97, -0.32],
      [20, 0.4],
    ],
    tail: "bearish-confirm",
  },
  "1d": {
    seed: 83,
    vol: 230,
    segments: [
      [100, 0.05],
      [140, 0.2],
      [80, 0.08],
      [100, 0.3],
      [60, 0.5],
    ],
    tail: "none",
  },
};

/** Deterministic PRNG so demo charts are stable between requests. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateDemoCandles(timeframe: Timeframe): Candle[] {
  const scenario = DEMO_SCENARIOS[timeframe];
  const rng = mulberry32(scenario.seed);
  // Sum of six uniforms, normalized: a good-enough standard normal.
  const gauss = () => (rng() + rng() + rng() + rng() + rng() + rng() - 3) / 0.707;

  const tailBars = scenario.tail === "none" ? 0 : 3;
  const bodies: Omit<Candle, "time">[] = [];
  let price = 20000;

  for (const [bars, drift] of scenario.segments) {
    for (let b = 0; b < bars; b++) {
      const open = price;
      const close = open + (drift + gauss()) * scenario.vol;
      const high = Math.max(open, close) + Math.abs(gauss()) * 0.35 * scenario.vol;
      const low = Math.min(open, close) - Math.abs(gauss()) * 0.35 * scenario.vol;
      bodies.push({ open, high, low, close });
      price = close;
    }
  }

  // Crafted confirmation bars so the showcase setups complete cleanly.
  // The bullish tail ends with a candle closing above the prior high (full
  // confirmation); the bearish tail ends with a smaller bearish candle that
  // holds above the prior low, showing a partial-confirmation grade.
  if (scenario.tail !== "none") {
    const vol = scenario.vol;
    const bullish = scenario.tail === "bullish-confirm";
    const bodySizes = bullish ? [-0.2, 0.7, 0.9] : [0.2, -0.6, -0.05];
    const sweeps = [0.3, 0.45, 0.15];
    for (let n = 0; n < bodySizes.length; n++) {
      const open = price;
      const close = open + bodySizes[n] * vol;
      const high = Math.max(open, close) + (bullish ? 0.08 : sweeps[n]) * vol;
      const low = Math.min(open, close) - (bullish ? sweeps[n] : 0.08) * vol;
      bodies.push({ open, high, low, close });
      price = close;
    }
  }

  // Rescale so every timeframe agrees on the current price.
  const scale = DEMO_LAST_PRICE / price;
  const round1 = (n: number) => Math.round(n * scale * 10) / 10;

  // Timestamps: a contiguous grid ending at the latest completed bar.
  const step = TIMEFRAME_SECONDS[timeframe];
  const total = scenario.segments.reduce((sum, [bars]) => sum + bars, 0) + tailBars;
  const end = Math.floor(Date.now() / 1000 / step) * step;

  return bodies.map((b, idx) => ({
    time: end - (total - 1 - idx) * step,
    open: round1(b.open),
    high: round1(b.high),
    low: round1(b.low),
    close: round1(b.close),
  }));
}

/* ------------------------------------------------------------------ */
/* Entry point used by the API route                                   */
/* ------------------------------------------------------------------ */

export async function getMarketCandles(timeframe: Timeframe): Promise<MarketData> {
  if (process.env.MARKET_DATA_API_KEY) {
    try {
      const candles = await twelveData.getCandles(timeframe, CANDLE_COUNT);
      return {
        candles,
        source: "live",
        note: `Live ${liveSymbol()} candles via ${twelveData.name}`,
        symbol: liveSymbol(),
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "unknown error";
      return {
        candles: generateDemoCandles(timeframe),
        source: "demo",
        note: `Live data unavailable (${message}) — showing demo data`,
        symbol: "US100",
      };
    }
  }

  return {
    candles: generateDemoCandles(timeframe),
    source: "demo",
    note: "No API key configured — showing generated demo data",
    symbol: "US100",
  };
}
