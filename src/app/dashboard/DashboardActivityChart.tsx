'use client'

// Code-split chart (recharts is heavy + DOM-only). Loaded via next/dynamic
// ({ ssr: false }) from the dashboard page so recharts stays out of the route's
// main JS chunk.
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface ActivityPoint {
  date: string
  mensagens: number
  conversas: number
  leads: number
}

export default function DashboardActivityChart({ data }: { data: ActivityPoint[] }) {
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
          stroke="rgba(255,255,255,0.5)"
          style={{ fontSize: '12px' }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'rgba(0,0,0,0.9)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px',
            color: 'white'
          }}
        />
        <Line
          type="monotone"
          dataKey="mensagens"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={{ fill: '#3b82f6', r: 4 }}
          name="Mensagens"
        />
        <Line
          type="monotone"
          dataKey="conversas"
          stroke="#10b981"
          strokeWidth={2}
          dot={{ fill: '#10b981', r: 4 }}
          name="Conversas"
        />
        <Line
          type="monotone"
          dataKey="leads"
          stroke="#f59e0b"
          strokeWidth={2}
          dot={{ fill: '#f59e0b', r: 4 }}
          name="Leads"
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
