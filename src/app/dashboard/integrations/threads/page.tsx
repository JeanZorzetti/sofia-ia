'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Unlink,
  Sparkles,
  Send,
  AtSign,
} from 'lucide-react'
import { toast } from 'sonner'

interface ThreadsStatus {
  connected: boolean
  username?: string
  tokenExpired?: boolean
  tokenExpiresAt?: string
  connectedAt?: string
}

export default function ThreadsPage() {
  const [status, setStatus] = useState<ThreadsStatus | null>(null)
  const [loadingStatus, setLoadingStatus] = useState(true)

  // Manual post state
  const [manualText, setManualText] = useState('')
  const [publishingManual, setPublishingManual] = useState(false)

  // AI orchestration state
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiContext, setAiContext] = useState('')
  const [aiImageUrl, setAiImageUrl] = useState('')
  const [generatingAI, setGeneratingAI] = useState(false)
  const [lastGenerated, setLastGenerated] = useState('')

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/threads/status')
      const data = await res.json()
      if (data.success) setStatus(data.data)
    } finally {
      setLoadingStatus(false)
    }
  }, [])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  const handleDisconnect = async () => {
    if (!confirm('Desconectar conta do Threads?')) return
    await fetch('/api/threads/status', { method: 'DELETE' })
    toast.success('Conta desconectada')
    fetchStatus()
  }

  const handleConnect = () => {
    window.location.href = '/api/threads/auth'
  }

  const handlePublishManual = async () => {
    if (!manualText.trim()) return
    setPublishingManual(true)
    try {
      const res = await fetch('/api/threads/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: manualText }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Post publicado com sucesso!')
        setManualText('')
      } else {
        toast.error(data.error || 'Erro ao publicar')
      }
    } finally {
      setPublishingManual(false)
    }
  }

  const handleOrchestrate = async () => {
    if (!aiPrompt.trim()) return
    setGeneratingAI(true)
    setLastGenerated('')
    try {
      const res = await fetch('/api/threads/orchestrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: aiPrompt,
          context: aiContext || undefined,
          imageUrl: aiImageUrl || undefined,
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Post gerado e publicado!')
        setLastGenerated(data.data.generatedText)
        setAiPrompt('')
        setAiContext('')
        setAiImageUrl('')
      } else {
        toast.error(data.error || 'Erro na orquestração')
        if (data.generatedText) setLastGenerated(data.generatedText)
      }
    } finally {
      setGeneratingAI(false)
    }
  }

  if (loadingStatus) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const isConnected = status?.connected && !status?.tokenExpired

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/integrations">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-800">
            <AtSign className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Threads</h1>
            <p className="text-sm text-muted-foreground">Publicação via Meta Threads API</p>
          </div>
        </div>
      </div>

      {/* Status da conexão */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Status da Conexão</CardTitle>
        </CardHeader>
        <CardContent>
          {isConnected ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <div>
                  <p className="font-medium">
                    @{status?.username ?? 'desconhecido'}
                  </p>
                  {status?.tokenExpiresAt && (
                    <p className="text-xs text-muted-foreground">
                      Token válido até{' '}
                      {new Date(status.tokenExpiresAt).toLocaleDateString('pt-BR')}
                    </p>
                  )}
                </div>
                <Badge variant="default" className="bg-green-600">Conectado</Badge>
              </div>
              <Button variant="outline" size="sm" onClick={handleDisconnect}>
                <Unlink className="mr-2 h-4 w-4" />
                Desconectar
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-zinc-500" />
                <p className="text-muted-foreground">
                  {status?.tokenExpired ? 'Token expirado — reconecte sua conta' : 'Nenhuma conta conectada'}
                </p>
              </div>
              <Button onClick={handleConnect}>
                <AtSign className="mr-2 h-4 w-4" />
                Conectar Threads
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {isConnected && (
        <>
          {/* Post manual */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Send className="h-4 w-4" />
                Publicar Post
              </CardTitle>
              <CardDescription>Escreva e publique diretamente no Threads</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Texto do post</Label>
                <Textarea
                  placeholder="O que você quer compartilhar?"
                  value={manualText}
                  onChange={(e) => setManualText(e.target.value)}
                  maxLength={500}
                  rows={4}
                />
                <p className="text-xs text-muted-foreground text-right">
                  {manualText.length}/500
                </p>
              </div>
              <Button
                onClick={handlePublishManual}
                disabled={publishingManual || !manualText.trim()}
              >
                {publishingManual ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                Publicar
              </Button>
            </CardContent>
          </Card>

          {/* Orquestração IA */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-400" />
                Gerar com IA e Publicar
              </CardTitle>
              <CardDescription>
                Descreva o que quer comunicar — a IA gera o texto e publica
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Prompt</Label>
                <Textarea
                  placeholder="Ex: Anuncie que lançamos uma nova funcionalidade de agendamento..."
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>
                  Contexto adicional{' '}
                  <span className="text-muted-foreground">(opcional)</span>
                </Label>
                <Textarea
                  placeholder="Cole aqui qualquer informação extra que a IA deve considerar..."
                  value={aiContext}
                  onChange={(e) => setAiContext(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>
                  URL de imagem{' '}
                  <span className="text-muted-foreground">(opcional)</span>
                </Label>
                <Input
                  placeholder="https://..."
                  value={aiImageUrl}
                  onChange={(e) => setAiImageUrl(e.target.value)}
                />
              </div>
              <Button
                onClick={handleOrchestrate}
                disabled={generatingAI || !aiPrompt.trim()}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {generatingAI ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                Gerar e Publicar
              </Button>

              {lastGenerated && (
                <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-4">
                  <p className="mb-1 text-xs font-medium text-zinc-400">Texto gerado e publicado:</p>
                  <p className="text-sm whitespace-pre-wrap">{lastGenerated}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
