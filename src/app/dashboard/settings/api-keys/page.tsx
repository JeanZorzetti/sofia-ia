'use client';

import { useState, useEffect } from 'react';
import { Key, MoreHorizontal, Plus, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface ApiKey {
  id: string;
  name: string;
  key: string;
  userId: string;
  lastUsedAt: string | null;
  status: string;
  createdAt: string;
}

export default function ApiKeysPage() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedKeyId, setSelectedKeyId] = useState<string | null>(null);
  const [newKeyData, setNewKeyData] = useState<{ key: string; name: string } | null>(null);
  const [formData, setFormData] = useState({
    name: '',
  });

  useEffect(() => {
    fetchApiKeys();
  }, []);

  const fetchApiKeys = async () => {
    try {
      const response = await fetch('/api/api-keys');
      const data = await response.json();
      setApiKeys(data.apiKeys);
    } catch (error) {
      console.error('Error fetching API keys:', error);
      toast.error('Erro ao carregar API keys');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      // Get current user ID (in production, get from auth context)
      const userResponse = await fetch('/api/auth/profile');
      const userData = await userResponse.json();

      const response = await fetch('/api/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          userId: userData.user.id,
        }),
      });

      if (!response.ok) throw new Error('Failed to create API key');

      const data = await response.json();
      setNewKeyData({ key: data.apiKey.key, name: data.apiKey.name });
      setFormData({ name: '' });
      fetchApiKeys();
    } catch (error) {
      console.error('Error creating API key:', error);
      toast.error('Erro ao criar API key');
    }
  };

  const handleDelete = async () => {
    if (!selectedKeyId) return;

    try {
      const response = await fetch(`/api/api-keys/${selectedKeyId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete API key');

      toast.success('API key revogada com sucesso');
      setDeleteDialogOpen(false);
      setSelectedKeyId(null);
      fetchApiKeys();
    } catch (error) {
      console.error('Error deleting API key:', error);
      toast.error('Erro ao revogar API key');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado para a área de transferência');
  };

  const closeNewKeyDialog = () => {
    setNewKeyData(null);
    setDialogOpen(false);
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
            <Key className="h-6 w-6" />
            API Keys
          </h1>
          <p className="text-zinc-400 mt-1">
            Gerencie chaves de acesso para integração externa
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nova API Key
            </Button>
          </DialogTrigger>
          <DialogContent>
            {!newKeyData ? (
              <>
                <DialogHeader>
                  <DialogTitle>Criar Nova API Key</DialogTitle>
                  <DialogDescription>
                    Crie uma nova chave de acesso para integração externa
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Nome da Key</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Integração Sistema X"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleCreate}>Criar Key</Button>
                </DialogFooter>
              </>
            ) : (
              <>
                <DialogHeader>
                  <DialogTitle>API Key Criada!</DialogTitle>
                  <DialogDescription>
                    Copie esta chave agora. Por segurança, ela não será exibida novamente.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid gap-2">
                    <Label>Nome</Label>
                    <div className="text-zinc-100 font-mono">{newKeyData.name}</div>
                  </div>
                  <div className="grid gap-2">
                    <Label>API Key</Label>
                    <div className="flex gap-2">
                      <Input value={newKeyData.key} readOnly className="font-mono text-xs" />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => copyToClipboard(newKeyData.key)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={closeNewKeyDialog}>Fechar</Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <div className="border border-zinc-800 rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Key</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Último Uso</TableHead>
              <TableHead>Criada Em</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {apiKeys.map((apiKey) => (
              <TableRow key={apiKey.id}>
                <TableCell className="font-medium text-zinc-100">
                  {apiKey.name}
                </TableCell>
                <TableCell className="font-mono text-xs text-zinc-400">
                  {apiKey.key}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={
                      apiKey.status === 'active'
                        ? 'border-green-500 text-green-500'
                        : 'border-zinc-500 text-zinc-300'
                    }
                  >
                    {apiKey.status === 'active' ? 'Ativa' : 'Revogada'}
                  </Badge>
                </TableCell>
                <TableCell className="text-zinc-400">
                  {apiKey.lastUsedAt
                    ? format(new Date(apiKey.lastUsedAt), 'dd/MM/yyyy HH:mm')
                    : 'Nunca'}
                </TableCell>
                <TableCell className="text-zinc-400">
                  {format(new Date(apiKey.createdAt), 'dd/MM/yyyy')}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Ações</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => {
                          setSelectedKeyId(apiKey.id);
                          setDeleteDialogOpen(true);
                        }}
                        className="text-red-400"
                      >
                        Revogar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Revogação</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja revogar esta API key? Todas as integrações usando
              esta chave irão parar de funcionar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Revogar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
