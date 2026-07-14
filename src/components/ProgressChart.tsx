import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { DailyAccuracy } from '../types'

interface ProgressChartProps {
  data: DailyAccuracy[]
}

/** Tooltip mostra a fração real de acertos do dia (ex: "15/20 correct"), não só o percentual do eixo Y. */
function ProgressChart({ data }: ProgressChartProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4" data-testid="progress-chart">
      <p className="mb-2 text-sm font-medium text-gray-500">Progress (last 30 days)</p>
      {data.length === 0 ? (
        <p className="text-sm text-gray-400">Not enough data yet — keep chatting!</p>
      ) : (
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
              <Tooltip
                content={(props) => {
                  const day = props.payload?.[0]?.payload as DailyAccuracy | undefined
                  if (!props.active || !day) return null

                  return (
                    <div className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs shadow-sm">
                      <p className="font-medium text-gray-900">{day.date}</p>
                      <p className="text-gray-600">
                        {day.correctMessages}/{day.totalMessages} correct
                      </p>
                    </div>
                  )
                }}
              />
              <Line type="monotone" dataKey="accuracy" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

export default ProgressChart
