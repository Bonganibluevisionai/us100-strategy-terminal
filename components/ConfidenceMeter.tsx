import type { SignalType } from "@/types";

const SEGMENTS = 20;

export default function ConfidenceMeter({
  score,
  signal,
}: {
  score: number;
  signal: SignalType;
}) {
  const filled = Math.round((score / 100) * SEGMENTS);
  const fill =
    signal === "BUY" ? "bg-up" : signal === "SELL" ? "bg-down" : "bg-muted";

  return (
    <div>
      <div
        className="flex gap-[3px]"
        role="img"
        aria-label={`Confidence score ${score} out of 100`}
      >
        {Array.from({ length: SEGMENTS }, (_, i) => (
          <span
            key={i}
            className={`h-2 flex-1 rounded-[1px] ${i < filled ? fill : "bg-raised"}`}
          />
        ))}
      </div>
      <div className="mt-1.5 flex justify-between font-mono text-[10px] tabular-nums text-faint">
        <span>0</span>
        <span>100</span>
      </div>
    </div>
  );
}
