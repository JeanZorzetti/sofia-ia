'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Plus, Play, Square, Trophy, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

interface ABTest {
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
  totalInteractions: number;
  winnerAgentId: string | null;
  winnerAgentName: string | null;
  interactionsCount: number;
  createdAt: string;
}

interface Agent {
  id: string;
  name: string;
  description: string;
}

export default function ABTestsPage() {
  const [tests, setTests] = useState<ABTest[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    agentAId: '',
    agentBId: '',
    trafficSplit: 50,
  });

  useEffect(() => {
    fetchTests();
    fetchAgents();
  }, []);

  async function fetchTests() {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/ab-tests', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setTests(data.tests);
      }
    } catch (error) {
      console.error('Error fetching A/B tests:', error);
      toast.error('Erro ao carregar testes');
    } finally {
      setLoading(false);
    }
  }

  async function fetchAgents() {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/agents', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setAgents(data.agents.filter((a: Agent) => a.id));
      }
    } catch (error) {
      console.error('Error fetching agents:', error);
    }
  }

  async function handleCreateTest(e: React.FormEvent) {
    e.preventDefault();

    if (!formData.name || !formData.agentAId || !formData.agentBId) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    if (formData.agentAId === formData.agentBId) {
      toast.error('Selecione agentes diferentes');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/ab-tests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success('Teste A/B criado com sucesso');
        setDialogOpen(false);
        setFormData({
          name: '',
          description: '',
          agentAId: '',
          agentBId: '',
          trafficSplit: 50,
        });
        fetchTests();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Erro ao criar teste');
      }
    } catch (error) {
      console.error('Error creating A/B test:', error);
      toast.error('Erro ao criar teste');
    }
  }

  async function handleStartTest(testId: string) {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/ab-tests/${testId}/start`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        toast.success('Teste iniciado com sucesso');
        fetchTests();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Erro ao iniciar teste');
      }
    } catch (error) {
      console.error('Error starting test:', error);
      toast.error('Erro ao iniciar teste');
    }
  }

  async function handleStopTest(testId: string) {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/ab-tests/${testId}/stop`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`Teste finalizado! Vencedor: ${data.results.winner}`);
        fetchTests();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Erro ao parar teste');
      }
    } catch (error) {
      console.error('Error stopping test:', error);
      toast.error('Erro ao parar teste');
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'draft':
        return <Badge variant="secondary">Rascunho</Badge>;
      case 'running':
        return <Badge className="bg-green-500">Em execução</Badge>;
      case 'completed':
        return <Badge className="bg-blue-500">Concluído</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-white/60" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Testes A/B de Agentes</h1>
          <p className="text-white/60 mt-1">Compare performance de diferentes agentes</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Criar Teste A/B
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Criar Novo Teste A/B</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateTest} className="space-y-4">
              <div>
                <Label htmlFor="name">Nome do Teste</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Teste de Tom de Voz - Formal vs Casual"
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descreva o objetivo do teste..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="agentA">Agente A (Variante)</Label>
                  <Select value={formData.agentAId} onValueChange={(value) => setFormData({ ...formData, agentAId: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o agente A" />
                    </SelectTrigger>
                    <SelectContent>
                      {agents.map((agent) => (
                        <SelectItem key={agent.id} value={agent.id}>
                          {agent.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="agentB">Agente B (Variante)</Label>
                  <Select value={formData.agentBId} onValueChange={(value) => setFormData({ ...formData, agentBId: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o agente B" />
                    </SelectTrigger>
                    <SelectContent>
                      {agents.map((agent) => (
                        <SelectItem key={agent.id} value={agent.id}>
                          {agent.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="trafficSplit">Divisão de Tráfego (%)</Label>
                <div className="flex items-center gap-4">
                  <Input
                    id="trafficSplit"
                    type="number"
                    min="1"
                    max="99"
                    value={formData.trafficSplit}
                    onChange={(e) => setFormData({ ...formData, trafficSplit: parseInt(e.target.value) })}
                  />
                  <span className="text-sm text-white/60">
                    A: {formData.trafficSplit}% | B: {100 - formData.trafficSplit}%
                  </span>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">Criar Teste</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {tests.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <TrendingUp className="h-12 w-12 text-white/40 mb-4" />
            <p className="text-white/60 text-center">
              Nenhum teste A/B criado ainda.
              <br />
              Comece criando seu primeiro teste para comparar agentes.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {tests.map((test) => (
            <Card key={test.id} className="glass-card">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-white">{test.name}</CardTitle>
                    {test.description && (
                      <CardDescription className="mt-1">{test.description}</CardDescription>
                    )}
                  </div>
                  {getStatusBadge(test.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <p className="text-xs text-white/60 mb-1">Agente A</p>
                    <p className="text-white font-medium">{test.agentAName}</p>
                    <p className="text-xs text-white/40 mt-1">{test.trafficSplit}% tráfego</p>
                  </div>
                  <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                    <p className="text-xs text-white/60 mb-1">Agente B</p>
                    <p className="text-white font-medium">{test.agentBName}</p>
                    <p className="text-xs text-white/40 mt-1">{100 - test.trafficSplit}% tráfego</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-white/10">
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-white/60">
                      {test.interactionsCount} interações
                    </span>
                    {test.winnerAgentId && (
                      <div className="flex items-center gap-1 text-yellow-400">
                        <Trophy className="h-4 w-4" />
                        <span>Vencedor: {test.winnerAgentName}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {test.status === 'draft' && (
                      <Button size="sm" onClick={() => handleStartTest(test.id)}>
                        <Play className="h-3 w-3 mr-1" />
                        Iniciar
                      </Button>
                    )}
                    {test.status === 'running' && (
                      <Button size="sm" variant="destructive" onClick={() => handleStopTest(test.id)}>
                        <Square className="h-3 w-3 mr-1" />
                        Parar
                      </Button>
                    )}
                    <Link href={`/dashboard/ab-tests/${test.id}`}>
                      <Button size="sm" variant="outline">
                        Ver Detalhes
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
