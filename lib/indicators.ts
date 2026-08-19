import type { Candle, LinePoint } from "@/types";

/**
 * Exponential moving average, seeded with the SMA of the first `period`
 * values. Entries before the seed have no value and are null.
 */
export function ema(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = new Array(values.length).fill(null);
  if (values.length < period) return out;

  let seed = 0;
  for (let i = 0; i < period; i++) seed += values[i];
  let prev = seed / period;
  out[period - 1] = prev;

  const k = 2 / (period + 1);
  for (let i = period; i < values.length; i++) {
    prev = values[i] * k + prev * (1 - k);
    out[i] = prev;
  }
  return out;
}

/** EMA of candle closes as chart-ready line points (seed nulls skipped). */
export function emaLine(candles: Candle[], period: number): LinePoint[] {
  const series = ema(
    candles.map((c) => c.close),
    period,
  );
  const points: LinePoint[] = [];
  for (let i = 0; i < series.length; i++) {
    const value = series[i];
    if (value !== null) points.push({ time: candles[i].time, value });
  }
  return points;
}

/** Relative Strength Index with Wilder's smoothing. */
export function rsi(closes: number[], period = 14): (number | null)[] {
  const out: (number | null)[] = new Array(closes.length).fill(null);
  if (closes.length <= period) return out;

  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const change = closes[i] - closes[i - 1];
    if (change > 0) avgGain += change;
    else avgLoss -= change;
  }
  avgGain /= period;
  avgLoss /= period;
  out[period] = toRsi(avgGain, avgLoss);

  for (let i = period + 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    avgGain = (avgGain * (period - 1) + Math.max(change, 0)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(-change, 0)) / period;
    out[i] = toRsi(avgGain, avgLoss);
  }
  return out;
}

function toRsi(avgGain: number, avgLoss: number): number {
  if (avgLoss === 0) return 100;
  return 100 - 100 / (1 + avgGain / avgLoss);
}

/** Average True Range with Wilder's smoothing. */
export function atr(candles: Candle[], period = 14): (number | null)[] {
  const out: (number | null)[] = new Array(candles.length).fill(null);
  if (candles.length <= period) return out;

  const trueRanges: number[] = [0];
  for (let i = 1; i < candles.length; i++) {
    const c = candles[i];
    const prevClose = candles[i - 1].close;
    trueRanges.push(
      Math.max(c.high - c.low, Math.abs(c.high - prevClose), Math.abs(c.low - prevClose)),
    );
  }

  let value = 0;
  for (let i = 1; i <= period; i++) value += trueRanges[i];
  value /= period;
  out[period] = value;

  for (let i = period + 1; i < candles.length; i++) {
    value = (value * (period - 1) + trueRanges[i]) / period;
    out[i] = value;
  }
  return out;
}

export interface SwingPoint {
  index: number;
  time: number;
  price: number;
}

/** Swing high: a bar whose high is strictly above the `k` bars on each side. */
export function swingHighs(candles: Candle[], k = 3): SwingPoint[] {
  const swings: SwingPoint[] = [];
  for (let i = k; i < candles.length - k; i++) {
    let isSwing = true;
    for (let j = 1; j <= k && isSwing; j++) {
      if (candles[i].high <= candles[i - j].high || candles[i].high <= candles[i + j].high) {
        isSwing = false;
      }
    }
    if (isSwing) swings.push({ index: i, time: candles[i].time, price: candles[i].high });
  }
  return swings;
}

/** Swing low: a bar whose low is strictly below the `k` bars on each side. */
export function swingLows(candles: Candle[], k = 3): SwingPoint[] {
  const swings: SwingPoint[] = [];
  for (let i = k; i < candles.length - k; i++) {
    let isSwing = true;
    for (let j = 1; j <= k && isSwing; j++) {
      if (candles[i].low >= candles[i - j].low || candles[i].low >= candles[i + j].low) {
        isSwing = false;
      }
    }
    if (isSwing) swings.push({ index: i, time: candles[i].time, price: candles[i].low });
  }
  return swings;
}

export interface KeyLevels {
  support: number;
  resistance: number;
  lastSwingHigh: SwingPoint | null;
  lastSwingLow: SwingPoint | null;
}

/** Only swings inside this many recent bars count as tradeable levels. */
const LEVEL_LOOKBACK = 120;

/**
 * Support = the highest recent swing low below the current close.
 * Resistance = the lowest recent swing high above the current close.
 * Falls back to the extremes of the last 60 bars when no swing qualifies.
 */
export function keyLevels(candles: Candle[]): KeyLevels {
  const close = candles[candles.length - 1].close;
  const fromIndex = Math.max(0, candles.length - LEVEL_LOOKBACK);

  const highs = swingHighs(candles).filter((s) => s.index >= fromIndex);
  const lows = swingLows(candles).filter((s) => s.index >= fromIndex);

  const lowsBelow = lows.filter((s) => s.price < close);
  const highsAbove = highs.filter((s) => s.price > close);

  const recent = candles.slice(-60);
  const support =
    lowsBelow.length > 0
      ? Math.max(...lowsBelow.map((s) => s.price))
      : Math.min(...recent.map((c) => c.low));
  const resistance =
    highsAbove.length > 0
      ? Math.min(...highsAbove.map((s) => s.price))
      : Math.max(...recent.map((c) => c.high));

  return {
    support,
    resistance,
    lastSwingHigh: highs.length > 0 ? highs[highs.length - 1] : null,
    lastSwingLow: lows.length > 0 ? lows[lows.length - 1] : null,
  };
}
