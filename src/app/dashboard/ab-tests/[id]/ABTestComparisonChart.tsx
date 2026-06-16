'use client';

// Code-split chart (recharts is heavy + DOM-only). Loaded via next/dynamic
// ({ ssr: false }) from the A/B test detail page so recharts stays out of the
// route's main JS chunk.
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface ABTestBar {
  name: string;
  'Interações': number;
  'Sucessos': number;
  'Taxa Conversão': number;
}

export default function ABTestComparisonChart({ data }: { data: ABTestBar[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
        <XAxis dataKey="name" stroke="rgba(255,255,255,0.5)" />
        <YAxis stroke="rgba(255,255,255,0.5)" />
        <Tooltip
          contentStyle={{
            backgroundColor: 'rgba(0,0,0,0.9)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px',
          }}
        />
        <Legend />
        <Bar dataKey="Interações" fill="#3b82f6" />
        <Bar dataKey="Sucessos" fill="#10b981" />
        <Bar dataKey="Taxa Conversão" fill="#f59e0b" />
      </BarChart>
    </ResponsiveContainer>
  );
}
