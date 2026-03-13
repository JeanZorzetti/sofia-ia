'use client'

import { useState, useEffect, Suspense } from 'react'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  CheckCircle,
  XCircle,
  Loader2,
  FolderOpen,
  ArrowLeft,
  RefreshCw,
  Database,
} from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

function GoogleDriveContent() {
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'connected' | 'disconnected'>('loading')
  const [metadata, setMetadata] = useState<Record<string, string>>({})
  const [knowledgeBases, setKnowledgeBases] = useState<Array<{ id: string; name: string; config: Record<string, unknown> }>>([])
  const [folderId, setFolderId] = useState('')
  const [selectedKb, setSelectedKb] = useState('')
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<string | null>(null)

  useEffect(() => {
    checkStatus()
    fetchKnowledgeBases()
  }, [])

  useEffect(() => {
    const success = searchParams.get('success')
    const error = searchParams.get('error')
    if (success) setSyncResult('Conectado com sucesso!')
    if (error) setSyncResult(`Erro: ${error}`)
  }, [searchParams])

  const checkStatus = async () => {
    try {
      const res = await fetch('/api/integrations/google-drive/status')
      if (res.ok) {
        const data = await res.json()
        setStatus(data.connected ? 'connected' : 'disconnected')
        setMetadata(data.metadata || {})
      } else {
        setStatus('disconnected')
      }
    } catch {
      setStatus('disconnected')
    }
  }

  const fetchKnowledgeBases = async () => {
    try {
      const res = await fetch('/api/knowledge')
      if (res.ok) {
        const data = await res.json()
        setKnowledgeBases(
          (data.knowledgeBases || []).map((kb: { id: string; name: string; config: unknown }) => ({
            id: kb.id,
            name: kb.name,
            config: (kb.config || {}) as Record<string, unknown>,
          }))
        )
      }
    } catch {
      // ignore
    }
  }

  const handleConnect = () => {
    window.location.href = '/api/integrations/google-drive/connect'
  }

  const handleDisconnect = async () => {
    if (!confirm('Tem certeza que deseja desconectar o Google Drive?')) return
    try {
      await fetch('/api/integrations/google-drive/disconnect', { method: 'DELETE' })
      setStatus('disconnected')
      setMetadata({})
    } catch {
      alert('Erro ao desconectar')
    }
  }

  const handleSync = async () => {
    if (!selectedKb) {
      alert('Selecione uma base de conhecimento')
      return
    }
    if (!folderId) {
      alert('Informe o ID da pasta do Google Drive')
      return
    }

    setSyncing(true)
    setSyncResult(null)

    try {
      const res = await fetch(`/api/knowledge/${selectedKb}/sync-drive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId }),
      })
      const data = await res.json()

      if (res.ok) {
        const { created, updated, skipped, errors } = data.summary
        setSyncResult(
          `Sincronizado! Criados: ${created} | Atualizados: ${updated} | Sem mudanças: ${skipped} | Erros: ${errors}`
        )
        fetchKnowledgeBases()
      } else {
        setSyncResult(`Erro: ${data.error || 'Falha na sincronização'}`)
      }
    } catch {
      setSyncResult('Erro ao sincronizar')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/integrations">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Integrações
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <FolderOpen className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-bold">Google Drive</h1>
        </div>
      </div>

      {/* Status de conexão */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Status da Conexão</CardTitle>
            {status === 'loading' && <Loader2 className="h-5 w-5 animate-spin" />}
            {status === 'connected' && <Badge className="bg-green-100 text-green-800">Conectado</Badge>}
            {status === 'disconnected' && <Badge variant="secondary">Desconectado</Badge>}
          </div>
          <CardDescription>
            Conecte sua conta Google para sincronizar documentos do Drive com Knowledge Bases.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === 'connected' && (
            <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium text-green-800">{metadata.email || 'Conta Google conectada'}</p>
                {metadata.name && <p className="text-sm text-green-600">{metadata.name}</p>}
              </div>
            </div>
          )}

          {status === 'disconnected' && (
            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
              <XCircle className="h-5 w-5 text-gray-400" />
              <p className="text-sm text-gray-500">Nenhuma conta conectada</p>
            </div>
          )}

          <div className="flex gap-2">
            {status === 'connected' ? (
              <Button variant="destructive" size="sm" onClick={handleDisconnect}>
                Desconectar
              </Button>
            ) : (
              <Button onClick={handleConnect} disabled={status === 'loading'}>
                <FolderOpen className="h-4 w-4 mr-2" />
                Conectar Google Drive
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={checkStatus}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Sincronização */}
      {status === 'connected' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Sincronizar com Knowledge Base
            </CardTitle>
            <CardDescription>
              Importe documentos de uma pasta do Drive para uma base de conhecimento do agente.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Base de Conhecimento</Label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={selectedKb}
                onChange={e => {
                  setSelectedKb(e.target.value)
                  const kb = knowledgeBases.find(k => k.id === e.target.value)
                  if (kb?.config?.driveFolder) {
                    setFolderId(kb.config.driveFolder as string)
                  }
                }}
              >
                <option value="">Selecione...</option>
                {knowledgeBases.map(kb => (
                  <option key={kb.id} value={kb.id}>{kb.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label>ID da Pasta do Google Drive</Label>
              <Input
                placeholder="Ex: 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"
                value={folderId}
                onChange={e => setFolderId(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Abra a pasta no Drive e copie o ID da URL: drive.google.com/drive/folders/<strong>ID_AQUI</strong>
              </p>
            </div>

            <Button onClick={handleSync} disabled={syncing || !selectedKb || !folderId}>
              {syncing ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" />Sincronizando...</>
              ) : (
                <><RefreshCw className="h-4 w-4 mr-2" />Sincronizar agora</>
              )}
            </Button>

            {syncResult && (
              <div className={`p-3 rounded-lg text-sm ${syncResult.startsWith('Erro') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                {syncResult}
              </div>
            )}

            {/* Bases com Drive configurado */}
            {knowledgeBases.some(kb => kb.config?.driveFolder) && (
              <div className="mt-4 space-y-2">
                <p className="text-sm font-medium">Bases sincronizadas automaticamente (cron diário):</p>
                {knowledgeBases
                  .filter(kb => kb.config?.driveFolder)
                  .map(kb => (
                    <div key={kb.id} className="flex items-center gap-2 text-sm p-2 bg-blue-50 rounded">
                      <FolderOpen className="h-4 w-4 text-blue-600" />
                      <span className="font-medium">{kb.name}</span>
                      <span className="text-muted-foreground">→ {String(kb.config.driveFolder)}</span>
                      {!!kb.config.lastSync && (
                        <span className="ml-auto text-xs text-muted-foreground">
                          Último sync: {new Date(String(kb.config.lastSync)).toLocaleDateString('pt-BR')}
                        </span>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Treinamento via WhatsApp */}
      <Card>
        <CardHeader>
          <CardTitle>Treinamento via WhatsApp</CardTitle>
          <CardDescription>
            Envie mensagens com o prefixo <code className="bg-muted px-1 rounded">TreinoIA1212:</code> no WhatsApp para adicionar conteúdo diretamente à base de conhecimento do agente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-3 bg-muted rounded-lg text-sm font-mono">
            TreinoIA1212: O apartamento na Rua das Flores tem 3 quartos, 2 banheiros, 87m², garagem dupla. Condomínio R$450/mês. IPTU R$120/mês. Próximo ao metrô Vila Madalena.
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            O conteúdo será vetorizado e estará disponível para o agente responder perguntas em segundos.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

export default function GoogleDriveIntegrationPage() {
  return (
    <Suspense fallback={<div className="p-6"><Loader2 className="h-6 w-6 animate-spin" /></div>}>
      <GoogleDriveContent />
    </Suspense>
  )
}
