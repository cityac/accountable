import type { ReactNode } from "react";

/** The value leads and the label follows, because the reader already has the label. */
export function ChartTooltip({ value, label }: { value: ReactNode; label: ReactNode }) {
  return (
    <div data-testid="chart-tooltip" className="rounded-control bg-panel px-3 py-2 shadow-(--shadow-tooltip)">
      <div className="num text-[14px] leading-5 font-medium">{value}</div>
      <div className="text-[13px] leading-[18px] text-muted">{label}</div>
    </div>
  );
}
