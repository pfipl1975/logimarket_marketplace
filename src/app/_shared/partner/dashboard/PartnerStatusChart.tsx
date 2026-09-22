import type { DashboardStatus } from "@/lib/partner-dashboard/model-core";

const STATUS_BAR_CLASSES: Record<DashboardStatus, string> = {
  pending_decision: "fill-amber-500",
  accepted: "fill-emerald-600",
  fulfillment_in_progress: "fill-sky-600",
  fulfilled: "fill-brand-teal",
  rejected: "fill-slate-500",
  expired: "fill-rose-600",
  cancelled: "fill-gray-400",
};

const STATUS_MARKER_CLASSES: Record<DashboardStatus, string> = {
  pending_decision: "bg-amber-500",
  accepted: "bg-emerald-600",
  fulfillment_in_progress: "bg-sky-600",
  fulfilled: "bg-brand-teal",
  rejected: "bg-slate-500",
  expired: "bg-rose-600",
  cancelled: "bg-gray-400",
};

export function PartnerStatusChart({
  distribution,
  labels,
  title,
  summary,
  emptyLabel,
}: {
  distribution: Array<{ status: DashboardStatus; count: number }>;
  labels: Record<DashboardStatus, string>;
  title: string;
  summary: string;
  emptyLabel: string;
}) {
  const maximum = Math.max(0, ...distribution.map((item) => item.count));
  const total = distribution.reduce((sum, item) => sum + item.count, 0);
  const chartTop = 18;
  const chartHeight = 126;
  const chartLeft = 34;
  const step = 76;
  const barWidth = 42;

  return (
    <figure className="border border-border-industrial bg-white p-5 shadow-soft sm:p-6">
      <figcaption>
        <h2 className="text-lg font-semibold text-brand-navy">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">{summary}</p>
      </figcaption>

      {total === 0 ? (
        <div className="mt-5 flex min-h-52 items-center justify-center border-t border-border-industrial text-center text-sm text-muted-foreground">
          {emptyLabel}
        </div>
      ) : (
        <>
          <svg
            viewBox="0 0 620 170"
            className="mt-5 h-auto w-full"
            aria-hidden="true"
          >
            <line
              x1={chartLeft}
              x2={chartLeft + step * 7}
              y1={chartTop + chartHeight}
              y2={chartTop + chartHeight}
              className="stroke-border-industrial"
            />
            {distribution.map((item, index) => {
              const height = maximum === 0 ? 0 : (item.count / maximum) * chartHeight;
              const x = chartLeft + index * step + (step - barWidth) / 2;
              const y = chartTop + chartHeight - height;
              return (
                <g key={item.status}>
                  <rect
                    x={x}
                    y={y}
                    width={barWidth}
                    height={height}
                    rx="1"
                    className={STATUS_BAR_CLASSES[item.status]}
                  />
                  <text
                    x={x + barWidth / 2}
                    y={Math.max(14, y - 6)}
                    textAnchor="middle"
                    className="fill-brand-navy text-[11px] font-semibold"
                  >
                    {item.count}
                  </text>
                </g>
              );
            })}
          </svg>
          <ul className="mt-3 grid gap-x-4 gap-y-2 border-t border-border-industrial pt-4 text-sm sm:grid-cols-2">
            {distribution.map((item) => (
              <li key={item.status} className="flex items-center justify-between gap-3">
                <span className="flex min-w-0 items-center gap-2 text-muted-foreground">
                  <span className={`size-2.5 shrink-0 ${STATUS_MARKER_CLASSES[item.status]}`} aria-hidden="true" />
                  <span>{labels[item.status]}</span>
                </span>
                <span className="font-semibold tabular-nums text-brand-navy">{item.count}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </figure>
  );
}
