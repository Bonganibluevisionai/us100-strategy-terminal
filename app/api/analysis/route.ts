import { NextResponse } from "next/server";
import { emaLine } from "@/lib/indicators";
import { getMarketCandles } from "@/lib/marketData";
import { analyze } from "@/lib/strategy";
import { TIMEFRAMES, type AnalysisResponse, type Timeframe } from "@/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const requested = searchParams.get("timeframe") ?? "1h";

  if (!TIMEFRAMES.includes(requested as Timeframe)) {
    return NextResponse.json(
      { error: `Invalid timeframe "${requested}". Use one of: ${TIMEFRAMES.join(", ")}` },
      { status: 400 },
    );
  }
  const timeframe = requested as Timeframe;

  try {
    const { candles, source, note, symbol } = await getMarketCandles(timeframe);
    const { trend, signal, snapshot } = analyze(candles, symbol);

    const last = candles[candles.length - 1];
    const reference =
      timeframe === "1d"
        ? candles[candles.length - 2]
        : candles.find((c) => c.time >= last.time - 24 * 60 * 60);
    const change24h =
      reference && reference.time < last.time
        ? {
            points: last.close - reference.close,
            percent: ((last.close - reference.close) / reference.close) * 100,
          }
        : null;

    const payload: AnalysisResponse = {
      symbol,
      timeframe,
      source,
      providerNote: note,
      candles,
      overlays: {
        ema20: emaLine(candles, 20),
        ema50: emaLine(candles, 50),
        ema200: emaLine(candles, 200),
      },
      snapshot,
      change24h,
      trend,
      signal,
      generatedAt: Date.now(),
    };

    return NextResponse.json(payload);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Analysis failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
