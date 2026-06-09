import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts'
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { InfoIcon } from '@/components/icons'
import { HistoryEntry } from './types'

interface HistoryChartProps {
  data: HistoryEntry[]
  chartConfig: ChartConfig
  activeLines: string[]
  availableRateKeys: string[]
}

export function HistoryChart({
  data,
  chartConfig,
  activeLines,
  availableRateKeys,
}: HistoryChartProps) {
  if (data.length === 0) {
    return (
      <div className="h-87.5 flex flex-col items-center justify-center text-muted-foreground gap-2">
        <InfoIcon className="w-8 h-8 opacity-20" />
        <p>No hay datos suficientes para este periodo.</p>
      </div>
    )
  }

  return (
    <ChartContainer config={chartConfig} className="min-h-87.5 w-full">
      <LineChart
        data={data}
        margin={{ left: 0, right: 0, top: 10, bottom: 10 }}
      >
        <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-muted/50" />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickMargin={12}
          minTickGap={32}
          tickFormatter={(value) => {
            const date = new Date(value)
            return date.toLocaleDateString("es-VE", {
              month: "short",
              day: "numeric",
              timeZone: 'UTC',
            })
          }}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={12}
          tickFormatter={(value) => `${value.toFixed(1)}`}
          domain={['auto', 'auto']}
        />
        <ChartTooltip
          cursor={{ stroke: 'var(--border)', strokeWidth: 1 }}
          content={<ChartTooltipContent indicator="dot" />}
        />
        {availableRateKeys.map((key) => (
          activeLines.includes(key) && (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              stroke={chartConfig[key].color}
              strokeWidth={2.5}
              dot={{ r: 3, fill: chartConfig[key].color, strokeWidth: 0 }}
              activeDot={{ r: 5, strokeWidth: 0 }}
              connectNulls
              animationDuration={1000}
            />
          )
        ))}
      </LineChart>
    </ChartContainer>
  )
}
