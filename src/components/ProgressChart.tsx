import { TrendingUp } from 'lucide-react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import Card from './ui/Card'
import type { DailyAccuracy } from '../types'

interface ProgressChartProps {
  data: DailyAccuracy[]
}

function ProgressChart({ data }: ProgressChartProps) {
  return (
    <Card data-testid="progress-chart">
      <div className="flex items-center gap-1.5">
        <TrendingUp size={14} className="text-brand-500" aria-hidden="true" />
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Progress (last 30 days)</p>
      </div>
      {data.length === 0 ? (
        <p className="mt-3 text-sm text-ink-400">Not enough data yet — keep chatting!</p>
      ) : (
        <div className="mt-3 h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="accuracyFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#863bff" stopOpacity={0.28} />
                  <stop offset="100%" stopColor="#863bff" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e2ef" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: '#746d8e' }}
                axisLine={{ stroke: '#e5e2ef' }}
                tickLine={false}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 11, fill: '#746d8e' }}
                unit="%"
                axisLine={false}
                tickLine={false}
                width={38}
              />
              <Tooltip
                content={(props) => {
                  const day = props.payload?.[0]?.payload as DailyAccuracy | undefined
                  if (!props.active || !day) return null

                  return (
                    <div className="rounded-xl border border-ink-200 bg-white px-3 py-2 text-xs shadow-lg shadow-ink-900/10">
                      <p className="font-semibold text-ink-900">{day.date}</p>
                      <p className="text-ink-600">
                        {day.correctMessages}/{day.totalMessages} correct
                      </p>
                    </div>
                  )
                }}
              />
              <Area
                type="monotone"
                dataKey="accuracy"
                stroke="#863bff"
                strokeWidth={2.5}
                fill="url(#accuracyFill)"
                dot={{ r: 3, fill: '#863bff', strokeWidth: 0 }}
                activeDot={{ r: 5, fill: '#7118f0', strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  )
}

export default ProgressChart
