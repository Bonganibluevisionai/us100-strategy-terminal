import type {
  Candle,
  IndicatorSnapshot,
  Reason,
  ScoreBreakdown,
  SetupGrade,
  Signal,
  Trend,
} from "@/types";
import { atr, ema, keyLevels, rsi } from "./indicators";
import { fmtPrice } from "./format";
import { buildTradePlan, MIN_RISK_REWARD } from "./risk";

export const MIN_CANDLES = 220;
export const MIN_SIGNAL_SCORE = 50;

const RSI_EXTREME_OVERBOUGHT = 78;
const RSI_EXTREME_OVERSOLD = 22;

/** How many recent bars are scanned for a pullback into a value zone. */
const PULLBACK_LOOKBACK = 10;

export interface StrategyAnalysis {
  trend: Trend;
  signal: Signal;
  snapshot: IndicatorSnapshot;
}

export function classifyTrend(
  price: number,
  ema20: number,
  ema50: number,
  ema200: number,
): Trend {
  if (price > ema200 && ema20 > ema50 && ema50 > ema200) return "BULLISH";
  if (price < ema200 && ema20 < ema50 && ema50 < ema200) return "BEARISH";
  return "SIDEWAYS";
}

function gradeFor(signalActive: boolean, confidence: number): SetupGrade {
  if (!signalActive || confidence < MIN_SIGNAL_SCORE) return "NO TRADE";
  if (confidence < 70) return "WEAK SETUP";
  if (confidence < 85) return "GOOD SETUP";
  return "STRONG SETUP";
}

/**
 * Trend + pullback + confirmation strategy.
 *
 * A setup only fires when ALL of these hold:
 *  1. the trend classification agrees with the trade direction,
 *  2. price recently pulled back into a value zone (EMA 20 / EMA 50 / S-R),
 *  3. RSI is not at a blocking extreme,
 *  4. the 0-100 confidence score reaches MIN_SIGNAL_SCORE.
 */
export function analyze(candles: Candle[], symbol = "US100"): StrategyAnalysis {
  if (candles.length < MIN_CANDLES) {
    throw new Error(
      `Not enough candles to analyze: need ${MIN_CANDLES}, got ${candles.length}`,
    );
  }

  const closes = candles.map((c) => c.close);
  const i = candles.length - 1;
  const last = candles[i];
  const prev = candles[i - 1];
  const price = last.close;

  const ema20 = ema(closes, 20)[i]!;
  const ema50 = ema(closes, 50)[i]!;
  const ema200 = ema(closes, 200)[i]!;
  const rsi14 = rsi(closes, 14)[i]!;
  const atr14 = atr(candles, 14)[i]!;
  const levels = keyLevels(candles);

  const trend = classifyTrend(price, ema20, ema50, ema200);

  // Evaluate the only direction that makes sense on this side of the EMA 200.
  const direction: "BUY" | "SELL" = price >= ema200 ? "BUY" : "SELL";
  const isBuy = direction === "BUY";

  const breakdown: ScoreBreakdown = {
    trendAlignment: 0,
    emaAlignment: 0,
    supportResistance: 0,
    rsi: 0,
    priceAction: 0,
  };

  // 1. Trend alignment — 25 points
  const trendAligned =
    (isBuy && trend === "BULLISH") || (!isBuy && trend === "BEARISH");
  if (trendAligned) breakdown.trendAlignment = 25;

  // 2. EMA alignment — 10 points per stacked pair, 20 max
  const fastStacked = isBuy ? ema20 > ema50 : ema20 < ema50;
  const slowStacked = isBuy ? ema50 > ema200 : ema50 < ema200;
  breakdown.emaAlignment = (fastStacked ? 10 : 0) + (slowStacked ? 10 : 0);

  // 3. Pullback into a value zone — 20 points inside 0.5 ATR, 10 inside 1 ATR
  const window = candles.slice(-PULLBACK_LOOKBACK);
  const pullbackExtreme = isBuy
    ? Math.min(...window.map((c) => c.low))
    : Math.max(...window.map((c) => c.high));
  const zones: { name: string; value: number }[] = [
    { name: "EMA 20", value: ema20 },
    { name: "EMA 50", value: ema50 },
    isBuy
      ? { name: "support", value: levels.support }
      : { name: "resistance", value: levels.resistance },
  ];
  let pullbackZone = zones[0];
  let pullbackDistance = Math.abs(pullbackExtreme - zones[0].value);
  for (const zone of zones) {
    const distance = Math.abs(pullbackExtreme - zone.value);
    if (distance < pullbackDistance) {
      pullbackZone = zone;
      pullbackDistance = distance;
    }
  }
  if (pullbackDistance <= 0.5 * atr14) breakdown.supportResistance = 20;
  else if (pullbackDistance <= atr14) breakdown.supportResistance = 10;
  const pulledBack = breakdown.supportResistance > 0;

  // 4. RSI — momentum in the trade direction without exhaustion, 15 max
  if (isBuy) {
    if (rsi14 >= 45 && rsi14 <= 68) breakdown.rsi = 15;
    else if ((rsi14 >= 35 && rsi14 < 45) || (rsi14 > 68 && rsi14 <= 75)) breakdown.rsi = 8;
  } else {
    if (rsi14 >= 32 && rsi14 <= 55) breakdown.rsi = 15;
    else if ((rsi14 > 55 && rsi14 <= 65) || (rsi14 >= 25 && rsi14 < 32)) breakdown.rsi = 8;
  }
  const rsiExtreme = isBuy
    ? rsi14 > RSI_EXTREME_OVERBOUGHT
    : rsi14 < RSI_EXTREME_OVERSOLD;

  // 5. Price-action confirmation — closing candle in the trade direction (10)
  //    that also takes out the prior bar's extreme (10)
  const confirmingBody = isBuy ? last.close > last.open : last.close < last.open;
  const tookPrevExtreme = isBuy ? last.close > prev.high : last.close < prev.low;
  breakdown.priceAction = (confirmingBody ? 10 : 0) + (tookPrevExtreme ? 10 : 0);
  const confirmed = confirmingBody;

  const confidence = Math.min(
    100,
    breakdown.trendAlignment +
      breakdown.emaAlignment +
      breakdown.supportResistance +
      breakdown.rsi +
      breakdown.priceAction,
  );

  const signalActive =
    trendAligned &&
    pulledBack &&
    confirmed &&
    !rsiExtreme &&
    confidence >= MIN_SIGNAL_SCORE;

  const reasons: Reason[] = [
    {
      met: trendAligned,
      text: trendAligned
        ? `Market trend is ${trend} — price ${isBuy ? "above" : "below"} EMA 200`
        : `Trend is ${trend} — no clear ${isBuy ? "bullish" : "bearish"} structure`,
    },
    {
      met: fastStacked && slowStacked,
      text:
        fastStacked && slowStacked
          ? `EMAs stacked ${isBuy ? "bullishly (20 > 50 > 200)" : "bearishly (20 < 50 < 200)"}`
          : "EMAs not fully stacked in trend order",
    },
    {
      met: pulledBack,
      text: pulledBack
        ? `Price pulled back into the ${pullbackZone.name} zone`
        : `No pullback to EMA 20 / EMA 50 / ${isBuy ? "support" : "resistance"} yet`,
    },
    {
      met: breakdown.rsi > 0 && !rsiExtreme,
      text: rsiExtreme
        ? `RSI 14 at ${rsi14.toFixed(1)} — extremely ${isBuy ? "overbought" : "oversold"}`
        : breakdown.rsi > 0
          ? `RSI 14 at ${rsi14.toFixed(1)} confirms ${isBuy ? "bullish" : "bearish"} momentum`
          : `RSI 14 at ${rsi14.toFixed(1)} — momentum not supportive`,
    },
    {
      met: confirmed,
      text: !confirmed
        ? `No ${isBuy ? "bullish" : "bearish"} confirmation candle yet`
        : tookPrevExtreme
          ? `${isBuy ? "Bullish" : "Bearish"} candle closed ${isBuy ? "above" : "below"} the prior bar's ${isBuy ? "high" : "low"}`
          : `Last candle closed ${isBuy ? "bullish" : "bearish"}`,
    },
  ];

  const plan = signalActive
    ? buildTradePlan(
        direction,
        price,
        atr14,
        levels.lastSwingLow ? levels.lastSwingLow.price : null,
        levels.lastSwingHigh ? levels.lastSwingHigh.price : null,
      )
    : null;

  const signal: Signal = {
    type: signalActive ? direction : "NO TRADE",
    confidence,
    grade: gradeFor(signalActive, confidence),
    plan,
    reasons,
    breakdown,
    summary: buildSummary({
      symbol,
      signalActive,
      isBuy,
      trend,
      rsi14,
      rsiSupportive: breakdown.rsi > 0,
      pullbackZoneName: pullbackZone.name,
      pulledBack,
      confirmed,
      tookPrevExtreme,
      rsiExtreme,
      confidence,
      stopLoss: plan ? plan.stopLoss : null,
      decimals: plan ? plan.decimals : 1,
    }),
  };

  return {
    trend,
    signal,
    snapshot: {
      price,
      ema20,
      ema50,
      ema200,
      rsi14,
      atr14,
      support: levels.support,
      resistance: levels.resistance,
      swingHigh: levels.lastSwingHigh ? levels.lastSwingHigh.price : null,
      swingLow: levels.lastSwingLow ? levels.lastSwingLow.price : null,
    },
  };
}

function buildSummary(ctx: {
  symbol: string;
  signalActive: boolean;
  isBuy: boolean;
  trend: Trend;
  rsi14: number;
  rsiSupportive: boolean;
  pullbackZoneName: string;
  pulledBack: boolean;
  confirmed: boolean;
  tookPrevExtreme: boolean;
  rsiExtreme: boolean;
  confidence: number;
  stopLoss: number | null;
  decimals: number;
}): string {
  const side = ctx.isBuy ? "bullish" : "bearish";

  if (ctx.signalActive) {
    const confirmation = ctx.tookPrevExtreme
      ? `printed a ${side} candle that closed ${ctx.isBuy ? "above" : "below"} the prior bar's ${ctx.isBuy ? "high" : "low"}`
      : `printed a ${side} confirmation candle`;
    const rsiClause = ctx.rsiSupportive
      ? `RSI 14 at ${ctx.rsi14.toFixed(1)} supports the move without being at an extreme.`
      : `RSI 14 at ${ctx.rsi14.toFixed(1)} is stretched but below a blocking extreme.`;
    return (
      `${ctx.symbol} is in a ${ctx.trend.toLowerCase()} trend on this timeframe, with price ` +
      `${ctx.isBuy ? "above" : "below"} the EMA 200. Price pulled back into the ` +
      `${ctx.pullbackZoneName} zone and ${confirmation}. ${rsiClause} ` +
      `The stop sits behind the recent swing at ${fmtPrice(ctx.stopLoss, ctx.decimals)} and the ` +
      `target is ${MIN_RISK_REWARD}x the risk (1:${MIN_RISK_REWARD}).`
    );
  }

  const missing: string[] = [];
  if (ctx.trend === "SIDEWAYS") {
    missing.push("the trend is sideways rather than clearly bullish or bearish");
  } else if (!ctx.pulledBack) {
    missing.push(
      `price has not pulled back into a value zone (EMA 20 / EMA 50 / ${ctx.isBuy ? "support" : "resistance"})`,
    );
  } else if (!ctx.confirmed) {
    missing.push(
      `the latest candle has not confirmed in the ${side} direction`,
    );
  }
  if (ctx.rsiExtreme) {
    missing.push(`RSI is at an ${ctx.isBuy ? "overbought" : "oversold"} extreme`);
  }
  if (
    ctx.trend !== "SIDEWAYS" &&
    ctx.pulledBack &&
    ctx.confirmed &&
    ctx.confidence < MIN_SIGNAL_SCORE
  ) {
    missing.push(`the setup scores only ${ctx.confidence}/100`);
  }
  if (missing.length === 0) {
    missing.push("not enough conditions line up at the current bar");
  }

  return (
    `No trade right now: ${missing.join("; ")}. The strategy only takes pullback ` +
    `setups in the direction of a clear trend, so it stands aside until every ` +
    `condition lines up.`
  );
}
