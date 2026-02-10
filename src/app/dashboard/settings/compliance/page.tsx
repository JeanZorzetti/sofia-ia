'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Shield, Loader2, Download, Trash2, FileText, Database, Users, Activity } from 'lucide-react';
import { toast } from 'sonner';

interface ComplianceLog {
  id: string;
  action: string;
  category: string;
  details: any;
  createdAt: string;
}

interface ComplianceStats {
  totalLeads: number;
  activeConsents: number;
  dataExports: number;
  dataDeletions: number;
  retentionPeriodDays: number;
}

export default function CompliancePage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ComplianceStats>({
    totalLeads: 0,
    activeConsents: 0,
    dataExports: 0,
    dataDeletions: 0,
    retentionPeriodDays: 730,
  });
  const [logs, setLogs] = useState<ComplianceLog[]>([]);
  const [leadEmail, setLeadEmail] = useState('');
  const [exportingData, setExportingData] = useState(false);

  useEffect(() => {
    fetchStats();
    fetchLogs();
  }, []);

  async function fetchStats() {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/settings/compliance/stats', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching compliance stats:', error);
    }
  }

  async function fetchLogs() {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/settings/compliance/logs', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs || []);
      }
    } catch (error) {
      console.error('Error fetching compliance logs:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleExportData(e: React.FormEvent) {
    e.preventDefault();

    if (!leadEmail) {
      toast.error('Informe o email do lead');
      return;
    }

    setExportingData(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/settings/compliance/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email: leadEmail }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `lead-data-${leadEmail}-${new Date().toISOString()}.json`;
        a.click();
        toast.success('Dados exportados com sucesso');
        setLeadEmail('');
        fetchLogs();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Erro ao exportar dados');
      }
    } catch (error) {
      console.error('Error exporting data:', error);
      toast.error('Erro ao exportar dados');
    } finally {
      setExportingData(false);
    }
  }

  async function handleDeleteData() {
    if (!leadEmail) {
      toast.error('Informe o email do lead');
      return;
    }

    if (!confirm(`Tem certeza que deseja deletar TODOS os dados do lead ${leadEmail}? Esta ação não pode ser desfeita.`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/settings/compliance/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email: leadEmail }),
      });

      if (response.ok) {
        toast.success('Dados deletados com sucesso');
        setLeadEmail('');
        fetchStats();
        fetchLogs();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Erro ao deletar dados');
      }
    } catch (error) {
      console.error('Error deleting data:', error);
      toast.error('Erro ao deletar dados');
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
    <div className="space-y-6 animate-fade-in-up max-w-6xl">
      <div>
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <Shield className="h-8 w-8 text-green-500" />
          Compliance LGPD
        </h1>
        <p className="text-white/60 mt-1">Gestão de privacidade e conformidade com a Lei Geral de Proteção de Dados</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-sm flex items-center gap-2">
              <Users className="h-4 w-4" />
              Total de Leads
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-white">{stats.totalLeads}</p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-sm flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Consentimentos Ativos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-400">{stats.activeConsents}</p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-sm flex items-center gap-2">
              <Download className="h-4 w-4" />
              Exportações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-400">{stats.dataExports}</p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-sm flex items-center gap-2">
              <Trash2 className="h-4 w-4" />
              Deleções
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-400">{stats.dataDeletions}</p>
          </CardContent>
        </Card>
      </div>

      {/* Data Subject Rights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="glass-card border-blue-500/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Download className="h-5 w-5 text-blue-400" />
              Direito de Portabilidade (Art. 18, V)
            </CardTitle>
            <CardDescription>Exportar dados de um lead em formato legível por máquina</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleExportData} className="space-y-4">
              <Input
                type="email"
                placeholder="email@lead.com"
                value={leadEmail}
                onChange={(e) => setLeadEmail(e.target.value)}
                required
              />
              <Button type="submit" disabled={exportingData} className="w-full">
                {exportingData ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Exportando...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Exportar Dados do Lead
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="glass-card border-red-500/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-400" />
              Direito de Eliminação (Art. 18, VI)
            </CardTitle>
            <CardDescription>Deletar permanentemente todos os dados de um lead</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={(e) => { e.preventDefault(); handleDeleteData(); }} className="space-y-4">
              <Input
                type="email"
                placeholder="email@lead.com"
                value={leadEmail}
                onChange={(e) => setLeadEmail(e.target.value)}
                required
              />
              <Button type="submit" variant="destructive" className="w-full">
                <Trash2 className="h-4 w-4 mr-2" />
                Deletar Dados do Lead
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Retention Policy */}
      <Card className="glass-card border-purple-500/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Database className="h-5 w-5 text-purple-400" />
            Política de Retenção de Dados
          </CardTitle>
          <CardDescription>Configure o período de retenção de dados pessoais</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
            <div>
              <p className="text-white font-medium">Período de Retenção</p>
              <p className="text-sm text-white/60">Dados são automaticamente anonimizados após este período</p>
            </div>
            <Badge className="bg-purple-500">
              {stats.retentionPeriodDays} dias
            </Badge>
          </div>
          <p className="text-xs text-white/40">
            De acordo com a LGPD Art. 15, os dados pessoais devem ser eliminados após o término do tratamento.
            Configure o período apropriado para seu caso de uso.
          </p>
        </CardContent>
      </Card>

      {/* Activity Log */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Registro de Atividades (últimas 20)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-white/60 text-center py-8">Nenhuma atividade registrada</p>
          ) : (
            <div className="space-y-2">
              {logs.slice(0, 20).map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <div className="flex-1">
                    <p className="text-white font-medium">{log.action}</p>
                    <p className="text-xs text-white/60">
                      {log.category} • {new Date(log.createdAt).toLocaleString('pt-BR')}
                    </p>
                  </div>
                  <Badge variant="outline">{log.category}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
