'use client'

// Code-split charts (recharts is heavy + DOM-only). Every chart on the analytics
// page is rendered here and loaded via next/dynamic ({ ssr: false }) so recharts
// stays out of the route's main JS chunk and loads once, on demand.
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']

const TOOLTIP_STYLE = {
  backgroundColor: 'rgba(0,0,0,0.9)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '8px',
} as const

interface AgentChartPoint { name: string; conversas: number; resolucao: number }
interface WorkflowChartPoint { name: string; execucoes: number; sucesso: number }

export function AgentPerformanceChart({ data }: { data: AgentChartPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
        <XAxis dataKey="name" stroke="rgba(255,255,255,0.5)" style={{ fontSize: '12px' }} />
        <YAxis stroke="rgba(255,255,255,0.5)" style={{ fontSize: '12px' }} />
        <Tooltip contentStyle={TOOLTIP_STYLE} />
        <Legend />
        <Bar dataKey="conversas" fill="#3b82f6" name="Conversas" />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function AgentResolutionChart({ data }: { data: AgentChartPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} layout="horizontal">
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
        <XAxis type="number" stroke="rgba(255,255,255,0.5)" style={{ fontSize: '12px' }} />
        <YAxis type="category" dataKey="name" stroke="rgba(255,255,255,0.5)" style={{ fontSize: '12px' }} />
        <Tooltip contentStyle={TOOLTIP_STYLE} />
        <Bar dataKey="resolucao" fill="#10b981" name="Taxa de Resolução (%)" />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function WorkflowExecutionsChart({ data }: { data: WorkflowChartPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
        <XAxis dataKey="name" stroke="rgba(255,255,255,0.5)" style={{ fontSize: '12px' }} />
        <YAxis stroke="rgba(255,255,255,0.5)" style={{ fontSize: '12px' }} />
        <Tooltip contentStyle={TOOLTIP_STYLE} />
        <Legend />
        <Bar dataKey="execucoes" fill="#f59e0b" name="Execuções" />
      </BarChart>
    </ResponsiveContainer>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function LeadsFunnelChart({ data }: { data: any[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
        <XAxis type="number" stroke="rgba(255,255,255,0.5)" style={{ fontSize: '12px' }} />
        <YAxis type="category" dataKey="status" stroke="rgba(255,255,255,0.5)" style={{ fontSize: '12px' }} />
        <Tooltip contentStyle={TOOLTIP_STYLE} />
        <Bar dataKey="count" fill="#8b5cf6" name="Leads" />
      </BarChart>
    </ResponsiveContainer>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function LeadsSourcePie({ data }: { data: any[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          dataKey="count"
          nameKey="fonte"
          cx="50%"
          cy="50%"
          outerRadius={100}
          label
        >
          {data.map((entry: any, index: number) => (
            // eslint-disable-next-line react/no-array-index-key
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip contentStyle={TOOLTIP_STYLE} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function LeadsTimelineChart({ data }: { data: any[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
        <XAxis
          dataKey="date"
          stroke="rgba(255,255,255,0.5)"
          style={{ fontSize: '12px' }}
        />
        <YAxis stroke="rgba(255,255,255,0.5)" style={{ fontSize: '12px' }} />
        <Tooltip contentStyle={TOOLTIP_STYLE} />
        <Line
          type="monotone"
          dataKey="count"
          stroke="#ec4899"
          strokeWidth={2}
          dot={{ fill: '#ec4899', r: 4 }}
          name="Leads Criados"
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
