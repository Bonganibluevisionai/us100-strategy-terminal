import type { TradePlan } from "@/types";

/** Fixed fraction of the account risked on any single setup. */
export const RISK_PER_TRADE = 0.01;

/** Take profit is always this multiple of the stop distance. */
export const MIN_RISK_REWARD = 2;

/** Price precision scaled to the instrument: indices 1dp, stocks/ETFs 2dp, FX-scale 4dp. */
function decimalsFor(price: number): number {
  if (price >= 1000) return 1;
  if (price >= 10) return 2;
  return 4;
}

/**
 * Builds entry / stop / target levels for a setup.
 *
 * The stop goes behind the most recent swing (low for BUY, high for SELL)
 * plus a quarter-ATR buffer. If that swing stop would be unusably tight
 * (< 0.5 ATR) or unusably wide (> 2.5 ATR) — or no swing exists — it falls
 * back to a plain 1.5 ATR stop. Take profit is MIN_RISK_REWARD x the risk.
 *
 * Risk and reward points are derived from the already-rounded levels so the
 * published numbers are always self-consistent.
 */
export function buildTradePlan(
  direction: "BUY" | "SELL",
  entry: number,
  atrValue: number,
  swingLow: number | null,
  swingHigh: number | null,
): TradePlan {
  const buffer = 0.25 * atrValue;
  const fallbackDistance = 1.5 * atrValue;

  let stopDistance = fallbackDistance;
  if (direction === "BUY" && swingLow !== null) {
    const swingDistance = entry - (swingLow - buffer);
    if (swingDistance >= 0.5 * atrValue && swingDistance <= 2.5 * atrValue) {
      stopDistance = swingDistance;
    }
  } else if (direction === "SELL" && swingHigh !== null) {
    const swingDistance = swingHigh + buffer - entry;
    if (swingDistance >= 0.5 * atrValue && swingDistance <= 2.5 * atrValue) {
      stopDistance = swingDistance;
    }
  }

  const decimals = decimalsFor(entry);
  const round = (n: number) => Number(n.toFixed(decimals));

  const sign = direction === "BUY" ? 1 : -1;
  const roundedEntry = round(entry);
  const stopLoss = round(entry - sign * stopDistance);
  const takeProfit = round(entry + sign * stopDistance * MIN_RISK_REWARD);

  return {
    entry: roundedEntry,
    stopLoss,
    takeProfit,
    riskPoints: round(Math.abs(roundedEntry - stopLoss)),
    rewardPoints: round(Math.abs(takeProfit - roundedEntry)),
    riskReward: `1:${MIN_RISK_REWARD}`,
    decimals,
  };
}
