const priceFormatter = (digits: number) =>
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

export function fmtPrice(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return priceFormatter(digits).format(value);
}

export function fmtSigned(value: number, digits = 1): string {
  return (value >= 0 ? "+" : "") + fmtPrice(value, digits);
}

export function fmtPercent(value: number): string {
  return (value >= 0 ? "+" : "") + value.toFixed(2) + "%";
}

export function fmtClock(unixMs: number): string {
  return new Date(unixMs).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}
