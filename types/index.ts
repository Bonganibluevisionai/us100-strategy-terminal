/** One OHLC candle. `time` is a UTC unix timestamp in seconds. */
export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

/** A single point on an overlay line (EMA etc.). */
export interface LinePoint {
  time: number;
  value: number;
}

export type Timeframe = "5m" | "15m" | "1h" | "4h" | "1d";

export const TIMEFRAMES: Timeframe[] = ["5m", "15m", "1h", "4h", "1d"];

export type Trend = "BULLISH" | "BEARISH" | "SIDEWAYS";

export type SignalType = "BUY" | "SELL" | "NO TRADE";

export type SetupGrade = "NO TRADE" | "WEAK SETUP" | "GOOD SETUP" | "STRONG SETUP";

/** One line of the setup checklist shown on the signal card. */
export interface Reason {
  met: boolean;
  text: string;
}

/** How the 0–100 confidence score was earned, factor by factor. */
export interface ScoreBreakdown {
  trendAlignment: number; // max 25
  emaAlignment: number; // max 20
  supportResistance: number; // max 20
  rsi: number; // max 15
  priceAction: number; // max 20
}

/** Entry / stop / target levels for an actionable setup. */
export interface TradePlan {
  entry: number;
  stopLoss: number;
  takeProfit: number;
  riskPoints: number;
  rewardPoints: number;
  riskReward: string; // e.g. "1:2"
  decimals: number; // display precision, scaled to the instrument
}

export interface Signal {
  type: SignalType;
  confidence: number; // 0–100 rules-based score, not a probability of profit
  grade: SetupGrade;
  plan: TradePlan | null; // null when NO TRADE
  reasons: Reason[];
  breakdown: ScoreBreakdown;
  summary: string; // plain-English explanation of the setup
}

/** Latest value of every indicator the dashboard displays. */
export interface IndicatorSnapshot {
  price: number;
  ema20: number;
  ema50: number;
  ema200: number;
  rsi14: number;
  atr14: number;
  support: number | null;
  resistance: number | null;
  swingHigh: number | null;
  swingLow: number | null;
}

export type DataSource = "live" | "demo";

/** Full payload returned by GET /api/analysis. */
export interface AnalysisResponse {
  symbol: string;
  timeframe: Timeframe;
  source: DataSource;
  /** True when the deployment requires the access-code login. */
  gated: boolean;
  providerNote: string | null;
  candles: Candle[];
  overlays: {
    ema20: LinePoint[];
    ema50: LinePoint[];
    ema200: LinePoint[];
  };
  snapshot: IndicatorSnapshot;
  change24h: { points: number; percent: number } | null;
  trend: Trend;
  signal: Signal;
  generatedAt: number; // unix ms
}
