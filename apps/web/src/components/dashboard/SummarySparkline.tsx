import { Line, LineChart, ResponsiveContainer } from 'recharts'

import { cn } from '#/lib/utils.ts'

interface SummarySparklineProps {
  /** Series values, plotted left to right. */
  data: Array<number>
  /**
   * Sizing/color overrides. The line strokes with `currentColor`, so pick the
   * theme color via a `text-*` token class here (e.g. `text-emerald-500`).
   */
  className?: string
}

/**
 * Decorative sparkline for dashboard summary cards: a smooth monotone line
 * with small point dots and no axes, grid, tooltip, or legend. Purely visual —
 * it is hidden from assistive tech and accepts no interaction.
 */
function SummarySparkline({ data, className }: SummarySparklineProps) {
  const points = data.map((value, index) => ({ index, value }))
  return (
    <div className={cn('h-10 w-full text-primary', className)} aria-hidden="true">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={points}
          margin={{ top: 4, right: 4, bottom: 4, left: 4 }}
        >
          <Line
            type="monotone"
            dataKey="value"
            stroke="currentColor"
            strokeWidth={3}
            strokeLinecap="round"
            dot={{ r: 2, fill: 'currentColor', strokeWidth: 0 }}
            activeDot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export { SummarySparkline }
