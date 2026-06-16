'use client'

// Code-split chart (recharts is heavy + DOM-only). Loaded via next/dynamic
// ({ ssr: false }) from the metrics page so recharts stays out of the route's
// main JS chunk.
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

interface SignupPoint { date: string; count: number }

export default function SignupsSparkline({ data }: { data: SignupPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={120}>
      <AreaChart data={data} margin={{ top: 2, right: 2, left: -32, bottom: 0 }}>
        <defs>
          <linearGradient id="signupGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="date"
          tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.3)' }}
          tickFormatter={v => v.slice(5)} // MM-DD
          interval={6}
          tickLine={false}
          axisLine={false}
        />
        <YAxis tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.3)' }} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip
          contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }}
          labelStyle={{ color: 'rgba(255,255,255,0.6)' }}
          itemStyle={{ color: '#60a5fa' }}
        />
        <Area type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} fill="url(#signupGrad)" name="Signups" />
      </AreaChart>
    </ResponsiveContainer>
  )
}
