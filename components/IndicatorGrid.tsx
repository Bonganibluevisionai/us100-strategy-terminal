import { fmtPrice } from "@/lib/format";
import type { IndicatorSnapshot } from "@/types";

export default function IndicatorGrid({ snapshot }: { snapshot: IndicatorSnapshot }) {
  const { price } = snapshot;

  const emaTiles = [
    { label: "EMA 20", value: snapshot.ema20, dot: "bg-[#53B1FD]" },
    { label: "EMA 50", value: snapshot.ema50, dot: "bg-[#E8A33D]" },
    { label: "EMA 200", value: snapshot.ema200, dot: "bg-[#A8B3C9]" },
  ];

  return (
    <section
      aria-label="Technical indicators"
      className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-edge bg-edge md:grid-cols-4"
    >
      {emaTiles.map((tile) => (
        <Tile
          key={tile.label}
          label={tile.label}
          dot={tile.dot}
          value={fmtPrice(tile.value)}
          sub={price >= tile.value ? "price above" : "price below"}
          subClass={price >= tile.value ? "text-up" : "text-down"}
        />
      ))}
      <Tile
        label="RSI 14"
        value={snapshot.rsi14.toFixed(1)}
        sub={rsiLabel(snapshot.rsi14)}
        subClass="text-muted"
      >
        <RsiBar value={snapshot.rsi14} />
      </Tile>
      <Tile
        label="ATR 14"
        value={fmtPrice(snapshot.atr14)}
        sub="avg range per bar"
        subClass="text-muted"
      />
      <Tile
        label="Support"
        value={fmtPrice(snapshot.support)}
        sub="nearest level below"
        subClass="text-muted"
      />
      <Tile
        label="Resistance"
        value={fmtPrice(snapshot.resistance)}
        sub="nearest level above"
        subClass="text-muted"
      />
      <Tile
        label="Swing H / L"
        value={`${fmtPrice(snapshot.swingHigh)} / ${fmtPrice(snapshot.swingLow)}`}
        sub="latest confirmed swings"
        subClass="text-muted"
      />
    </section>
  );
}

function rsiLabel(value: number): string {
  if (value >= 70) return "overbought zone";
  if (value <= 30) return "oversold zone";
  return "neutral zone";
}

function Tile({
  label,
  value,
  sub,
  subClass,
  dot,
  children,
}: {
  label: string;
  value: string;
  sub: string;
  subClass: string;
  dot?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="bg-surface px-4 py-3.5">
      <div className="flex items-center gap-1.5">
        {dot && <span className={`h-1.5 w-1.5 rounded-full ${dot}`} aria-hidden />}
        <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-faint">
          {label}
        </span>
      </div>
      <div className="mt-1.5 truncate font-mono text-lg tabular-nums text-ink">{value}</div>
      {children}
      <div className={`mt-0.5 text-[11px] ${subClass}`}>{sub}</div>
    </div>
  );
}

function RsiBar({ value }: { value: number }) {
  const position = Math.min(100, Math.max(0, value));
  return (
    <div className="relative mt-2 h-1 rounded-full bg-raised">
      <div className="absolute inset-y-0 left-[30%] w-px bg-faint/60" aria-hidden />
      <div className="absolute inset-y-0 left-[70%] w-px bg-faint/60" aria-hidden />
      <div
        className="absolute -top-0.5 h-2 w-2 -translate-x-1/2 rounded-full bg-ink"
        style={{ left: `${position}%` }}
        aria-hidden
      />
    </div>
  );
}
