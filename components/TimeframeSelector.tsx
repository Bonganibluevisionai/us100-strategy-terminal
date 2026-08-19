import { TIMEFRAMES, type Timeframe } from "@/types";

export default function TimeframeSelector({
  value,
  onChange,
}: {
  value: Timeframe;
  onChange: (timeframe: Timeframe) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Chart timeframe"
      className="flex rounded-md border border-edge bg-surface p-0.5 font-mono text-xs"
    >
      {TIMEFRAMES.map((timeframe) => (
        <button
          key={timeframe}
          aria-pressed={timeframe === value}
          onClick={() => onChange(timeframe)}
          className={`rounded px-3 py-1.5 uppercase tracking-wider transition-colors ${
            timeframe === value
              ? "bg-raised text-ink"
              : "text-muted hover:text-ink"
          }`}
        >
          {timeframe}
        </button>
      ))}
    </div>
  );
}
