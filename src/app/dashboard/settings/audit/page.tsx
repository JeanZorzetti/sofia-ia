'use client';

import { useState, useEffect } from 'react';
import { Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface AuditLog {
  id: string;
  action: string;
  userId: string | null;
  resourceType: string | null;
  resourceId: string | null;
  details: Record<string, unknown>;
  ipAddress: string | null;
  createdAt: string;
}

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('all');

  useEffect(() => {
    fetchLogs();
  }, [actionFilter]);

  const fetchLogs = async () => {
    try {
      const params = new URLSearchParams();
      if (actionFilter !== 'all') {
        params.append('action', actionFilter);
      }

      const response = await fetch(`/api/audit-logs?${params}`);
      const data = await response.json();
      setLogs(data.logs);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      toast.error('Erro ao carregar logs de auditoria');
    } finally {
      setLoading(false);
    }
  };

  const getActionBadgeVariant = (action: string) => {
    if (action.includes('created')) return 'border-green-500 text-green-500';
    if (action.includes('deleted')) return 'border-red-500 text-red-500';
    if (action.includes('updated')) return 'border-blue-500 text-blue-500';
    return 'border-zinc-500 text-zinc-300';
  };

  const formatAction = (action: string) => {
    const parts = action.split('.');
    if (parts.length === 2) {
      const resource = parts[0];
      const operation = parts[1];
      return `${resource.toUpperCase()}: ${operation}`;
    }
    return action;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-zinc-400">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Logs de Auditoria
          </h1>
          <p className="text-zinc-400 mt-1">
            Histórico de ações realizadas na plataforma
          </p>
        </div>
        <div className="w-48">
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Ações</SelectItem>
              <SelectItem value="user.created">Usuário Criado</SelectItem>
              <SelectItem value="user.updated">Usuário Atualizado</SelectItem>
              <SelectItem value="user.deleted">Usuário Deletado</SelectItem>
              <SelectItem value="api_key.created">API Key Criada</SelectItem>
              <SelectItem value="api_key.deleted">API Key Revogada</SelectItem>
              <SelectItem value="company.updated">Empresa Atualizada</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="border border-zinc-800 rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ação</TableHead>
              <TableHead>Recurso</TableHead>
              <TableHead>Detalhes</TableHead>
              <TableHead>IP</TableHead>
              <TableHead>Data/Hora</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-zinc-400 py-8">
                  Nenhum log encontrado
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    <Badge variant="outline" className={getActionBadgeVariant(log.action)}>
                      {formatAction(log.action)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-zinc-400">
                    {log.resourceType || '-'}
                  </TableCell>
                  <TableCell className="text-zinc-400 max-w-md truncate">
                    {JSON.stringify(log.details)}
                  </TableCell>
                  <TableCell className="text-zinc-400 font-mono text-xs">
                    {log.ipAddress || '-'}
                  </TableCell>
                  <TableCell className="text-zinc-400">
                    {format(new Date(log.createdAt), 'dd/MM/yyyy HH:mm:ss')}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
