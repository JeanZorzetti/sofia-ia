'use client';

import { useEffect, useState } from 'react';
import { use } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Loader2, Trophy, Play, Square } from 'lucide-react';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface ABTestDetail {
  test: {
    id: string;
    name: string;
    description: string;
    agentAId: string;
    agentBId: string;
    agentAName: string;
    agentBName: string;
    trafficSplit: number;
    status: string;
    startedAt: string | null;
    endedAt: string | null;
    winnerAgentId: string | null;
  };
  metrics: {
    totalInteractions: number;
    variantA: {
      interactions: number;
      successes: number;
      conversionRate: number;
      agent: any;
    };
    variantB: {
      interactions: number;
      successes: number;
      conversionRate: number;
      agent: any;
    };
  };
}

export default function ABTestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [data, setData] = useState<ABTestDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTestDetail();
  }, [resolvedParams.id]);

  async function fetchTestDetail() {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/ab-tests/${resolvedParams.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const result = await response.json();
        setData(result);
      } else {
        toast.error('Erro ao carregar teste');
        router.push('/dashboard/ab-tests');
      }
    } catch (error) {
      console.error('Error fetching test detail:', error);
      toast.error('Erro ao carregar teste');
    } finally {
      setLoading(false);
    }
  }

  async function handleStartTest() {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/ab-tests/${resolvedParams.id}/start`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        toast.success('Teste iniciado com sucesso');
        fetchTestDetail();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Erro ao iniciar teste');
      }
    } catch (error) {
      console.error('Error starting test:', error);
      toast.error('Erro ao iniciar teste');
    }
  }

  async function handleStopTest() {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/ab-tests/${resolvedParams.id}/stop`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(`Teste finalizado! Vencedor: ${result.results.winner}`);
        fetchTestDetail();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Erro ao parar teste');
      }
    } catch (error) {
      console.error('Error stopping test:', error);
      toast.error('Erro ao parar teste');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-white/60" />
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const chartData = [
    {
      name: 'Variante A',
      Interações: data.metrics.variantA.interactions,
      Sucessos: data.metrics.variantA.successes,
      'Taxa Conversão': data.metrics.variantA.conversionRate,
    },
    {
      name: 'Variante B',
      Interações: data.metrics.variantB.interactions,
      Sucessos: data.metrics.variantB.successes,
      'Taxa Conversão': data.metrics.variantB.conversionRate,
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => router.push('/dashboard/ab-tests')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-white">{data.test.name}</h1>
            {data.test.description && (
              <p className="text-white/60 mt-1">{data.test.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {data.test.status === 'draft' && (
            <Button onClick={handleStartTest}>
              <Play className="h-4 w-4 mr-2" />
              Iniciar Teste
            </Button>
          )}
          {data.test.status === 'running' && (
            <Button variant="destructive" onClick={handleStopTest}>
              <Square className="h-4 w-4 mr-2" />
              Parar Teste
            </Button>
          )}
          <Badge className={
            data.test.status === 'running' ? 'bg-green-500' :
            data.test.status === 'completed' ? 'bg-blue-500' : ''
          }>
            {data.test.status === 'draft' ? 'Rascunho' :
             data.test.status === 'running' ? 'Em execução' :
             data.test.status === 'completed' ? 'Concluído' : data.test.status}
          </Badge>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-white text-sm">Total de Interações</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-white">{data.metrics.totalInteractions}</p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-white text-sm">Divisão de Tráfego</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-white">
              A: {data.test.trafficSplit}% | B: {100 - data.test.trafficSplit}%
            </p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-white text-sm">Status</CardTitle>
          </CardHeader>
          <CardContent>
            {data.test.winnerAgentId ? (
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-400" />
                <p className="text-white">
                  Vencedor: {data.test.winnerAgentId === data.test.agentAId ?
                    data.metrics.variantA.agent.name :
                    data.metrics.variantB.agent.name}
                </p>
              </div>
            ) : (
              <p className="text-white/60">Ainda sem vencedor</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Variants Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="glass-card border-blue-500/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-blue-500"></div>
              Variante A: {data.metrics.variantA.agent.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-white/60">Interações</p>
              <p className="text-2xl font-bold text-white">{data.metrics.variantA.interactions}</p>
            </div>
            <div>
              <p className="text-sm text-white/60">Sucessos</p>
              <p className="text-2xl font-bold text-green-400">{data.metrics.variantA.successes}</p>
            </div>
            <div>
              <p className="text-sm text-white/60">Taxa de Conversão</p>
              <p className="text-2xl font-bold text-white">{data.metrics.variantA.conversionRate}%</p>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-purple-500/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-purple-500"></div>
              Variante B: {data.metrics.variantB.agent.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-white/60">Interações</p>
              <p className="text-2xl font-bold text-white">{data.metrics.variantB.interactions}</p>
            </div>
            <div>
              <p className="text-sm text-white/60">Sucessos</p>
              <p className="text-2xl font-bold text-green-400">{data.metrics.variantB.successes}</p>
            </div>
            <div>
              <p className="text-sm text-white/60">Taxa de Conversão</p>
              <p className="text-2xl font-bold text-white">{data.metrics.variantB.conversionRate}%</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-white">Comparação de Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
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
        </CardContent>
      </Card>
    </div>
  );
}
