import type { Locale } from "@/lib/i18n/config";

type ActivityBucket = { dateKey: string; count: number };

function formatBucketDate(dateKey: string, locale: Locale) {
  return new Date(`${dateKey}T00:00:00.000Z`).toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

export function PartnerActivityChart({
  activity,
  locale,
  title,
  summary,
  emptyLabel,
  ordersLabel,
}: {
  activity: ActivityBucket[];
  locale: Locale;
  title: string;
  summary: string;
  emptyLabel: string;
  ordersLabel: string;
}) {
  const maximum = Math.max(0, ...activity.map((bucket) => bucket.count));
  const chartHeight = 160;
  const chartTop = 18;
  const chartLeft = 42;
  const step = 18;
  const barWidth = 12;
  const labelIndexes = new Set([0, 7, 14, 21, 29]);

  return (
    <figure className="border border-border-industrial bg-white p-5 shadow-soft sm:p-6">
      <figcaption>
        <h2 className="text-lg font-semibold text-brand-navy">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">{summary}</p>
      </figcaption>

      {maximum === 0 ? (
        <div className="mt-5 flex min-h-52 items-center justify-center border-t border-border-industrial text-center text-sm text-muted-foreground">
          {emptyLabel}
        </div>
      ) : (
        <>
          <svg
            viewBox="0 0 620 230"
            className="mt-5 h-auto w-full"
            aria-hidden="true"
          >
            {[0, 0.5, 1].map((ratio) => {
              const y = chartTop + chartHeight - ratio * chartHeight;
              return (
                <g key={ratio}>
                  <line
                    x1={chartLeft}
                    x2={chartLeft + step * 30}
                    y1={y}
                    y2={y}
                    className="stroke-border-industrial"
                  />
                  <text x={chartLeft - 8} y={y + 4} textAnchor="end" className="fill-muted-foreground text-[10px]">
                    {Math.round(maximum * ratio)}
                  </text>
                </g>
              );
            })}
            {activity.map((bucket, index) => {
              const height = (bucket.count / maximum) * chartHeight;
              const x = chartLeft + index * step + (step - barWidth) / 2;
              const y = chartTop + chartHeight - height;
              return (
                <g key={bucket.dateKey}>
                  <rect
                    x={x}
                    y={y}
                    width={barWidth}
                    height={height}
                    rx="1"
                    className="fill-brand-teal"
                  />
                  {labelIndexes.has(index) ? (
                    <text
                      x={x + barWidth / 2}
                      y={chartTop + chartHeight + 22}
                      textAnchor="middle"
                      className="fill-muted-foreground text-[10px]"
                    >
                      {formatBucketDate(bucket.dateKey, locale)}
                    </text>
                  ) : null}
                </g>
              );
            })}
          </svg>
          <ol className="sr-only">
            {activity.map((bucket) => (
              <li key={bucket.dateKey}>
                {formatBucketDate(bucket.dateKey, locale)}: {bucket.count} {ordersLabel}
              </li>
            ))}
          </ol>
        </>
      )}
    </figure>
  );
}
