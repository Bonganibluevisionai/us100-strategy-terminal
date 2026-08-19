import { fmtClock } from "@/lib/format";
import type { DataSource } from "@/types";

export default function StatusBar({
  symbol,
  source,
  generatedAt,
  refreshing,
}: {
  symbol: string;
  source: DataSource | null;
  generatedAt: number | null;
  refreshing: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-edge bg-surface/60 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.14em] text-muted sm:px-6">
      <span className="truncate">{symbol} · NASDAQ-100 · Strategy Terminal</span>
      <span className="flex shrink-0 items-center gap-4">
        {generatedAt !== null && (
          <span className="hidden tabular-nums md:inline">Updated {fmtClock(generatedAt)}</span>
        )}
        {refreshing && <span className="hidden text-faint sm:inline">syncing…</span>}
        {source === null ? (
          <span className="text-faint">connecting…</span>
        ) : source === "live" ? (
          <span className="flex items-center gap-1.5 text-up">
            <span className="h-1.5 w-1.5 rounded-full bg-up motion-safe:animate-pulse" aria-hidden />
            Live data
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-caution">
            <span className="h-1.5 w-1.5 rounded-full bg-caution motion-safe:animate-pulse" aria-hidden />
            Demo data
          </span>
        )}
      </span>
    </div>
  );
}
