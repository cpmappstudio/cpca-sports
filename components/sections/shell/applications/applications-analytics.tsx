"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Label,
  PolarGrid,
  PolarRadiusAxis,
  RadialBar,
  RadialBarChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ApplicationListItem } from "@/lib/applications/list-types";
import {
  calculateApplicationAnalytics,
  calculatePaymentStatusDistribution,
  type PaymentStatusKey,
} from "@/lib/applications/analytics";

type RangeDays = 30 | 56;

interface ApplicationsAnalyticsProps {
  applications: ApplicationListItem[];
  now: number;
}

export function ApplicationsAnalytics({
  applications,
  now,
}: ApplicationsAnalyticsProps) {
  const locale = useLocale();
  const t = useTranslations("Applications.analytics");
  const [rangeDays, setRangeDays] = useState<RangeDays>(56);
  const analytics = useMemo(
    () =>
      calculateApplicationAnalytics(applications, rangeDays, t("other"), now),
    [applications, now, rangeDays, t],
  );
  const numberFormatter = useMemo(
    () => new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }),
    [locale],
  );
  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        style: "currency",
        currency: "USD",
      }),
    [locale],
  );
  const formatMoney = (cents: number) => currencyFormatter.format(cents / 100);
  const trendConfig = {
    applications: {
      label: t("applications"),
      color: "var(--chart-1)",
    },
  } satisfies ChartConfig;
  const programConfig = {
    count: {
      label: t("applications"),
      color: "var(--chart-2)",
    },
  } satisfies ChartConfig;
  const collectionConfig = {
    value: {
      label: t("collected"),
      color: "var(--color-green-500)",
    },
  } satisfies ChartConfig;

  const radialValue =
    analytics.payments.collectionRate === null
      ? 0
      : analytics.payments.collectionRateVisual;
  const collectionRateDisplay =
    analytics.payments.collectionRate === null
      ? "—"
      : `${Math.round(analytics.payments.collectionRateVisual)}%`;
  const radialData = [
    {
      value: radialValue === 0 ? 0 : 1,
      fill: "var(--color-collected)",
    },
  ];

  const programChartHeight = Math.max(28, analytics.programs.length * 22);

  return (
    <div className="flex w-full max-w-full flex-wrap items-start justify-start gap-x-7 gap-y-3 sm:justify-end">
      <div className="relative h-24 w-44 shrink-0">
        <select
          aria-label={t("range")}
          value={rangeDays}
          onChange={(event) =>
            setRangeDays(Number(event.target.value) as RangeDays)
          }
          className="absolute top-0 right-0 z-10 rounded-sm bg-transparent text-[11px] text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value={30}>{t("ranges.30d")}</option>
          <option value={56}>{t("ranges.8w")}</option>
        </select>
        <ChartContainer
          config={trendConfig}
          className="h-24 w-full aspect-auto"
          initialDimension={{ width: 176, height: 96 }}
          aria-label={t("trendAriaLabel", {
            count: analytics.trend.currentTotal,
          })}
        >
          <AreaChart
            accessibilityLayer
            aria-label={t("trendAriaLabel", {
              count: analytics.trend.currentTotal,
            })}
            data={analytics.trend.data}
            margin={{ top: 4, right: 2, bottom: 0, left: 2 }}
          >
            <defs>
              <linearGradient
                id="applicationsTrend"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="5%"
                  stopColor="var(--color-applications)"
                  stopOpacity={0.3}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-applications)"
                  stopOpacity={0.02}
                />
              </linearGradient>
            </defs>
            <XAxis dataKey="start" hide />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  indicator="line"
                  labelFormatter={(_, payload) => {
                    const point = payload?.[0]?.payload as
                      (typeof analytics.trend.data)[number] | undefined;
                    return point
                      ? formatTrendPeriod(
                          point.start,
                          point.end,
                          analytics.trend.bucketDays,
                          locale,
                        )
                      : null;
                  }}
                />
              }
            />
            <Area
              type="monotone"
              dataKey="applications"
              stroke="var(--color-applications)"
              strokeWidth={2}
              fill="url(#applicationsTrend)"
              dot={false}
              activeDot={{ r: 3 }}
            />
          </AreaChart>
        </ChartContainer>
      </div>

      <div className="h-24 w-56 shrink-0">
        {analytics.programs.length === 0 ? (
          <p className="flex h-24 items-start text-lg text-muted-foreground">
            —
          </p>
        ) : (
          <ChartContainer
            config={programConfig}
            className="w-full aspect-auto"
            style={{ height: programChartHeight }}
            initialDimension={{ width: 224, height: programChartHeight }}
            aria-label={t("programAriaLabel")}
          >
            <BarChart
              accessibilityLayer
              aria-label={t("programAriaLabel")}
              data={analytics.programs}
              layout="vertical"
              margin={{ top: 0, right: 4, bottom: 0, left: 0 }}
            >
              <YAxis
                dataKey="name"
                type="category"
                tickLine={false}
                axisLine={false}
                width={86}
                tick={{ fontSize: 10 }}
                tickFormatter={(value: string) => truncate(value, 13)}
              />
              <XAxis dataKey="count" type="number" hide />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    hideIndicator
                    labelFormatter={(_, payload) => {
                      const program = payload?.[0]?.payload as
                        (typeof analytics.programs)[number] | undefined;
                      return program?.name;
                    }}
                    formatter={(_, __, item) => {
                      const program = item.payload as
                        (typeof analytics.programs)[number] | undefined;
                      return program ? (
                        <ChartTooltipRow
                          label={t("applications")}
                          value={t("countAndPercentage", {
                            count: program.count,
                            percentage: numberFormatter.format(
                              program.percentage,
                            ),
                          })}
                        />
                      ) : null;
                    }}
                  />
                }
              />
              <Bar dataKey="count" fill="var(--color-count)" radius={4} />
            </BarChart>
          </ChartContainer>
        )}
      </div>

      <ChartContainer
        config={collectionConfig}
        className="size-24 aspect-square"
        initialDimension={{ width: 96, height: 96 }}
        aria-label={t("collectionAriaLabel", {
          rate: collectionRateDisplay,
        })}
      >
        <RadialBarChart
          accessibilityLayer
          aria-label={t("collectionAriaLabel", {
            rate: collectionRateDisplay,
          })}
          data={radialData}
          startAngle={90}
          endAngle={90 - radialValue * 3.6}
          innerRadius="72%"
          outerRadius="100%"
        >
          <PolarGrid
            gridType="circle"
            radialLines={false}
            stroke="none"
            className="first:fill-muted last:fill-background"
            polarRadius={[48, 36]}
          />
          <ChartTooltip
            cursor={false}
            position={{ x: -96, y: 104 }}
            allowEscapeViewBox={{ x: true, y: true }}
            wrapperStyle={{ zIndex: 50, pointerEvents: "none" }}
            content={
              <ChartTooltipContent
                hideLabel
                hideIndicator
                className="w-48 min-w-0"
                formatter={() =>
                  analytics.payments.collectionRate === null ? (
                    <p>{t("noAmountDue")}</p>
                  ) : (
                    <div className="grid w-full gap-1.5">
                      <ChartTooltipRow
                        label={t("statuses.paid")}
                        value={formatMoney(analytics.payments.totalPaid)}
                      />
                      <ChartTooltipRow
                        label={t("due")}
                        value={formatMoney(analytics.payments.totalDue)}
                      />
                      <ChartTooltipRow
                        label={t("remaining")}
                        value={formatMoney(analytics.payments.totalRemaining)}
                      />
                    </div>
                  )
                }
              />
            }
          />
          <RadialBar
            dataKey="value"
            fill="var(--color-value)"
            cornerRadius={10}
          />
          <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
            <Label
              content={({ viewBox }) => {
                if (!viewBox || !("cx" in viewBox) || !("cy" in viewBox)) {
                  return null;
                }

                return (
                  <text
                    x={viewBox.cx}
                    y={viewBox.cy}
                    textAnchor="middle"
                    dominantBaseline="middle"
                  >
                    <tspan
                      x={viewBox.cx}
                      y={viewBox.cy - 5}
                      className="fill-foreground text-base font-semibold"
                    >
                      {collectionRateDisplay}
                    </tspan>
                    <tspan
                      x={viewBox.cx}
                      y={viewBox.cy + 12}
                      className="fill-muted-foreground text-[9px]"
                    >
                      {t("collected")}
                    </tspan>
                  </text>
                );
              }}
            />
          </PolarRadiusAxis>
        </RadialBarChart>
      </ChartContainer>
    </div>
  );
}

export function ApplicationPaymentStatusChart({
  applications,
}: {
  applications: ApplicationListItem[];
}) {
  const locale = useLocale();
  const t = useTranslations("Applications.analytics");
  const statuses = useMemo(
    () => calculatePaymentStatusDistribution(applications),
    [applications],
  );
  const numberFormatter = useMemo(
    () => new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }),
    [locale],
  );
  const config = {
    paid: {
      label: t("statuses.paid"),
      color:
        "color-mix(in oklch, var(--primary-foreground) 90%, var(--primary))",
    },
    partial: {
      label: t("statuses.partial"),
      color:
        "color-mix(in oklch, var(--primary-foreground) 72%, var(--primary))",
    },
    unpaid: {
      label: t("statuses.unpaid"),
      color:
        "color-mix(in oklch, var(--primary-foreground) 54%, var(--primary))",
    },
    noPaymentRequired: {
      label: t("statuses.noPaymentRequired"),
      color:
        "color-mix(in oklch, var(--primary-foreground) 36%, var(--primary))",
    },
  } satisfies ChartConfig;

  const data = [
    {
      name: "applications",
      ...Object.fromEntries(
        statuses.map(({ status, percentage }) => [status, percentage]),
      ),
    },
  ];

  if (applications.length === 0) return null;

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={t("paymentStatusAriaLabel")}
            className="block h-4 w-full cursor-help"
          >
            <ChartContainer
              config={config}
              className="pointer-events-none h-4 w-full aspect-auto"
              initialDimension={{ width: 96, height: 16 }}
              aria-label={t("paymentStatusAriaLabel")}
            >
              <BarChart
                accessibilityLayer
                aria-label={t("paymentStatusAriaLabel")}
                data={data}
                layout="vertical"
                margin={{ top: 0, right: 0, bottom: 10, left: 0 }}
              >
                <XAxis type="number" domain={[0, 100]} hide />
                <YAxis dataKey="name" type="category" hide />

                {(Object.keys(config) as PaymentStatusKey[]).map((status) => (
                  <Bar
                    key={status}
                    dataKey={status}
                    stackId="paymentStatus"
                    fill={`var(--color-${status})`}
                    radius={1}
                    barSize={6}
                  />
                ))}
              </BarChart>
            </ChartContainer>
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" sideOffset={6} className="z-100 w-48">
          <div className="grid w-full gap-1.5">
            {statuses.map((status) => (
              <div
                key={status.status}
                className="flex items-center justify-between gap-4"
              >
                <span className="flex min-w-0 items-center gap-1.5 text-background/70">
                  <span
                    className="size-2 shrink-0 rounded-[2px]"
                    style={{ backgroundColor: config[status.status].color }}
                  />
                  <span className="truncate">
                    {config[status.status].label}
                  </span>
                </span>
                <span className="shrink-0 font-mono font-medium text-background tabular-nums">
                  {t("countAndPercentage", {
                    count: status.count,
                    percentage: numberFormatter.format(status.percentage),
                  })}
                </span>
              </div>
            ))}
          </div>
        </TooltipContent>
      </Tooltip>
      <ul className="sr-only">
        {statuses.map((status) => (
          <li key={status.status}>
            {config[status.status].label}:{" "}
            {t("countAndPercentage", {
              count: status.count,
              percentage: numberFormatter.format(status.percentage),
            })}
          </li>
        ))}
      </ul>
    </>
  );
}

function ChartTooltipRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-32 flex-1 items-center justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="shrink-0 font-mono font-medium text-foreground tabular-nums">
        {value}
      </span>
    </div>
  );
}

function truncate(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;
}

function formatTrendPeriod(
  start: number,
  end: number,
  bucketDays: number,
  locale: string,
) {
  const formatter = new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
  if (bucketDays === 1) return formatter.format(start);
  return `${formatter.format(start)} – ${formatter.format(end)}`;
}
