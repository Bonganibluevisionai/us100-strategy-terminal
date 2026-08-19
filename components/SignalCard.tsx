import { fmtPrice } from "@/lib/format";
import type { Signal } from "@/types";
import ConfidenceMeter from "./ConfidenceMeter";

const SIGNAL_COLOR: Record<Signal["type"], string> = {
  BUY: "text-up",
  SELL: "text-down",
  "NO TRADE": "text-muted",
};

export default function SignalCard({ signal }: { signal: Signal }) {
  const { plan } = signal;

  return (
    <section
      aria-label="Strategy signal"
      className="flex flex-col gap-5 rounded-lg border border-edge bg-surface p-5"
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-faint">
          Strategy Signal
        </span>
        <span className="rounded border border-edge bg-raised/60 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
          {signal.grade}
        </span>
      </div>

      <div className="flex items-baseline justify-between">
        <span
          className={`font-mono text-4xl font-semibold tracking-tight ${SIGNAL_COLOR[signal.type]}`}
        >
          {signal.type}
        </span>
        <span className="font-mono text-sm tabular-nums text-muted">
          <span className="text-lg text-ink">{signal.confidence}</span>/100
        </span>
      </div>

      <ConfidenceMeter score={signal.confidence} signal={signal.type} />

      {plan ? (
        <dl className="divide-y divide-edge/70 border-y border-edge/70 font-mono text-sm tabular-nums">
          <Row label="Entry" value={fmtPrice(plan.entry, plan.decimals)} />
          <Row
            label="Stop loss"
            value={fmtPrice(plan.stopLoss, plan.decimals)}
            valueClass="text-down"
            sub={`${fmtPrice(plan.riskPoints, plan.decimals)} pts risk`}
          />
          <Row
            label="Take profit"
            value={fmtPrice(plan.takeProfit, plan.decimals)}
            valueClass="text-up"
            sub={`${fmtPrice(plan.rewardPoints, plan.decimals)} pts reward`}
          />
          <Row label="Risk / reward" value={plan.riskReward} />
        </dl>
      ) : (
        <p className="rounded border border-dashed border-edge bg-raised/40 px-3 py-4 text-center font-mono text-xs uppercase tracking-[0.14em] text-faint">
          Standing aside — no levels published
        </p>
      )}

      <div>
        <h3 className="text-[11px] font-medium uppercase tracking-[0.16em] text-faint">
          Setup checklist
        </h3>
        <ul className="mt-2 space-y-1.5 text-[13px]">
          {signal.reasons.map((reason) => (
            <li key={reason.text} className="flex gap-2">
              <span
                className={`font-mono ${reason.met ? "text-up" : "text-faint"}`}
                aria-hidden
              >
                {reason.met ? "✓" : "✗"}
              </span>
              <span className={reason.met ? "text-ink/90" : "text-faint"}>
                {reason.text}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <p className="text-[13px] leading-relaxed text-muted">{signal.summary}</p>

      <p className="border-t border-edge/70 pt-3 text-[11px] leading-relaxed text-faint">
        Risk 1% per trade · minimum R/R 1:2. Confidence is a rules-based score,
        not a probability of profit. Educational only — not financial advice.
      </p>
    </section>
  );
}

function Row({
  label,
  value,
  valueClass,
  sub,
}: {
  label: string;
  value: string;
  valueClass?: string;
  sub?: string;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <dt className="text-xs uppercase tracking-[0.12em] text-muted">{label}</dt>
      <dd className="text-right">
        <span className={valueClass ?? "text-ink"}>{value}</span>
        {sub && <span className="ml-2 text-[11px] text-faint">{sub}</span>}
      </dd>
    </div>
  );
}
