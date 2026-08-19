import { fmtPercent, fmtPrice, fmtSigned } from "@/lib/format";
import type { Timeframe, Trend } from "@/types";
import TimeframeSelector from "./TimeframeSelector";

const TREND_STYLES: Record<Trend, string> = {
  BULLISH: "border-up/40 bg-up/10 text-up",
  BEARISH: "border-down/40 bg-down/10 text-down",
  SIDEWAYS: "border-edge bg-raised/60 text-muted",
};

/** What the shown symbol actually is, so live proxy data is never mislabelled. */
const SUBTITLES: Record<string, string> = {
  US100: "NASDAQ-100 Index",
  NDX: "NASDAQ-100 Index",
  QQQ: "NASDAQ-100 ETF · US100 proxy",
};

export default function PriceHeader({
  symbol,
  price,
  change,
  trend,
  timeframe,
  onTimeframeChange,
}: {
  symbol: string;
  price: number | null;
  change: { points: number; percent: number } | null;
  trend: Trend | null;
  timeframe: Timeframe;
  onTimeframeChange: (timeframe: Timeframe) => void;
}) {
  const changeUp = (change?.points ?? 0) >= 0;

  return (
    <header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
      <div>
        <div className="flex items-baseline gap-3">
          <h1 className="font-mono text-2xl font-semibold tracking-tight">{symbol}</h1>
          {trend && (
            <span
              className={`rounded border px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.14em] ${TREND_STYLES[trend]}`}
            >
              {trend}
            </span>
          )}
        </div>
        <p className="mt-0.5 text-xs uppercase tracking-[0.14em] text-faint">
          {SUBTITLES[symbol] ?? "Configured market symbol"}
        </p>
        <div className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <span className="font-mono text-5xl font-semibold tabular-nums tracking-tight sm:text-6xl">
            {fmtPrice(price)}
          </span>
          {change && (
            <span
              className={`font-mono text-sm tabular-nums ${changeUp ? "text-up" : "text-down"}`}
            >
              {fmtSigned(change.points)} ({fmtPercent(change.percent)}) 24h
            </span>
          )}
        </div>
      </div>
      <TimeframeSelector value={timeframe} onChange={onTimeframeChange} />
    </header>
  );
}
