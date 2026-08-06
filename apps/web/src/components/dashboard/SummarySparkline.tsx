import { Area, AreaChart, ResponsiveContainer } from 'recharts'

import { cn } from '#/lib/utils.ts'

export interface SparklinePoint {
  /** UTC day, yyyy-mm-dd. */
  date: string
  value: number
}

interface SummarySparklineProps {
  /** Daily series, oldest first — real backend data, not decoration. */
  data: Array<SparklinePoint>
  /** Accessible summary of what the series shows. */
  label: string
  /**
   * Sizing/color overrides. The line strokes with `currentColor`, so pick the
   * theme color via a `text-*` token class here (e.g. `text-emerald-500`).
   */
  className?: string
}

/**
 * Compact area sparkline for dashboard summary cards: a smooth monotone line
 * over a faint fill, with no axes, grid, tooltip, or legend — the card's
 * headline number and trend caption carry the exact values, the sparkline
 * carries the shape.
 */
function SummarySparkline({ data, label, className }: SummarySparklineProps) {
  return (
    <div
      className={cn('h-10 w-full text-primary', className)}
      role="img"
      aria-label={label}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 4, right: 2, bottom: 0, left: 2 }}
        >
          <Area
            type="monotone"
            dataKey="value"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            fill="currentColor"
            fillOpacity={0.12}
            dot={false}
            activeDot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

export { SummarySparkline }
