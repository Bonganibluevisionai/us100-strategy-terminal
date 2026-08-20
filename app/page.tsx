"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import IndicatorGrid from "@/components/IndicatorGrid";
import PriceChart from "@/components/PriceChart";
import PriceHeader from "@/components/PriceHeader";
import SignalCard from "@/components/SignalCard";
import StatusBar from "@/components/StatusBar";
import type { AnalysisResponse, Timeframe } from "@/types";

const REFRESH_INTERVAL_MS = 60_000;

export default function Dashboard() {
  const [timeframe, setTimeframe] = useState<Timeframe>("1h");
  const [data, setData] = useState<AnalysisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const requestSeq = useRef(0);

  const load = useCallback(async (tf: Timeframe) => {
    const seq = ++requestSeq.current;
    setLoading(true);
    try {
      const res = await fetch(`/api/analysis?timeframe=${tf}`, { cache: "no-store" });
      if (res.status === 401) {
        // Session expired or the access code was rotated — back to the gate.
        window.location.href = "/login";
        return;
      }
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(body?.error ?? `Request failed with status ${res.status}`);
      }
      if (body === null) {
        throw new Error("The analysis API returned a malformed response");
      }
      if (seq !== requestSeq.current) return; // a newer request superseded this one
      setData(body as AnalysisResponse);
      setError(null);
    } catch (err) {
      if (seq !== requestSeq.current) return;
      setError(err instanceof Error ? err.message : "Failed to load market data");
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(timeframe);
    const id = setInterval(() => load(timeframe), REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [timeframe, load]);

  return (
    <div className="min-h-screen">
      <StatusBar
        symbol={data?.symbol ?? "US100"}
        source={data?.source ?? null}
        generatedAt={data?.generatedAt ?? null}
        refreshing={loading && data !== null}
        gated={data?.gated ?? false}
      />

      <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
        <PriceHeader
          symbol={data?.symbol ?? "US100"}
          price={data?.snapshot.price ?? null}
          change={data?.change24h ?? null}
          trend={data?.trend ?? null}
          timeframe={timeframe}
          onTimeframeChange={setTimeframe}
        />

        {error && (
          <div
            role="alert"
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-down/40 bg-down/10 px-4 py-3 text-sm text-ink"
          >
            <span>{error}</span>
            <button
              onClick={() => load(timeframe)}
              className="rounded border border-edge bg-surface px-3 py-1 font-mono text-xs uppercase tracking-wider text-muted hover:text-ink"
            >
              Retry
            </button>
          </div>
        )}

        {data ? (
          <>
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
              <div className="min-w-0 rounded-lg border border-edge bg-surface p-3">
                <PriceChart data={data} />
              </div>
              <SignalCard signal={data.signal} />
            </div>

            <IndicatorGrid snapshot={data.snapshot} />

            {data.providerNote && (
              <p
                className={`font-mono text-[11px] uppercase tracking-[0.14em] ${
                  data.source === "demo" ? "text-caution" : "text-faint"
                }`}
              >
                {data.providerNote}
              </p>
            )}
          </>
        ) : (
          !error && <Skeleton />
        )}

        <footer className="border-t border-edge pt-4 text-[11px] leading-relaxed text-faint">
          Rules-based technical analysis for educational purposes only — not
          financial advice, and not a live trading system. Built with Next.js,
          Tailwind CSS and Lightweight Charts.
        </footer>
      </main>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]" aria-busy>
      <div className="h-[420px] animate-pulse rounded-lg border border-edge bg-surface sm:h-[500px]" />
      <div className="h-[420px] animate-pulse rounded-lg border border-edge bg-surface sm:h-[500px]" />
      <div className="col-span-full h-40 animate-pulse rounded-lg border border-edge bg-surface" />
    </div>
  );
}
