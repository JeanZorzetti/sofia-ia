'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface TimelinePoint {
  date: string
  runs: number
  tasks: number
  cost: number
}

export default function TeamsActivityChart({ data }: { data: TimelinePoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
        <XAxis
          dataKey="date"
          stroke="rgba(255,255,255,0.5)"
          style={{ fontSize: '12px' }}
        />
        <YAxis
          yAxisId="left"
          stroke="rgba(255,255,255,0.5)"
          style={{ fontSize: '12px' }}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          stroke="rgba(255,255,255,0.5)"
          style={{ fontSize: '12px' }}
          tickFormatter={(v: number) => `$${v.toFixed(3)}`}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'rgba(0,0,0,0.9)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px',
            color: 'white',
          }}

        />
        <Legend wrapperStyle={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px' }} />
        <Line
          yAxisId="left"
          type="monotone"
          dataKey="runs"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={{ fill: '#3b82f6', r: 4 }}
          name="Execuções"
        />
        <Line
          yAxisId="left"
          type="monotone"
          dataKey="tasks"
          stroke="#8b5cf6"
          strokeWidth={2}
          dot={{ fill: '#8b5cf6', r: 4 }}
          name="Tasks"
        />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="cost"
          stroke="#f59e0b"
          strokeWidth={2}
          dot={{ fill: '#f59e0b', r: 4 }}
          name="Custo (USD)"
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
