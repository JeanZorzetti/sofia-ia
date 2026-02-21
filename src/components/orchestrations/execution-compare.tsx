'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import {
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
  ArrowRight,
  ArrowLeftRight
} from 'lucide-react'

interface StepResult {
  agentId: string
  agentName: string
  role: string
  input: any
  output: string
  timestamp: string
  durationMs?: number
  tokensUsed?: number
}

interface Execution {
  id: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  input: any
  output: any
  error: string | null
  startedAt: string
  completedAt: string | null
  agentResults: StepResult[]
}

interface ExecutionCompareProps {
  execution1: Execution | null
  execution2: Execution | null
  open: boolean
  onClose: () => void
}

export function ExecutionCompare({
  execution1,
  execution2,
  open,
  onClose
}: ExecutionCompareProps) {
  if (!execution1 || !execution2) return null

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR')
  }

  const formatDuration = (ms?: number) => {
    if (!ms) return '-'
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(2)}s`
  }

  const totalDuration1 = execution1.completedAt && execution1.startedAt
    ? new Date(execution1.completedAt).getTime() - new Date(execution1.startedAt).getTime()
    : null

  const totalDuration2 = execution2.completedAt && execution2.startedAt
    ? new Date(execution2.completedAt).getTime() - new Date(execution2.startedAt).getTime()
    : null

  const totalTokens1 = execution1.agentResults.reduce((sum, r) => sum + (r.tokensUsed || 0), 0)
  const totalTokens2 = execution2.agentResults.reduce((sum, r) => sum + (r.tokensUsed || 0), 0)

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <Badge className="bg-green-500 gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Sucesso
          </Badge>
        )
      case 'failed':
        return (
          <Badge className="bg-red-500 gap-1">
            <XCircle className="h-3 w-3" />
            Falhou
          </Badge>
        )
      default:
        return <Badge variant="outline">Outro</Badge>
    }
  }

  const getDiffBadge = (value1: number, value2: number, label: string) => {
    const diff = value2 - value1
    const diffPercent = value1 > 0 ? ((diff / value1) * 100).toFixed(1) : '0'

    if (diff === 0) {
      return <Badge variant="outline" className="text-[10px]">Igual</Badge>
    }

    const color = diff > 0 ? 'bg-red-500/20 text-red-300' : 'bg-green-500/20 text-green-300'
    const sign = diff > 0 ? '+' : ''

    return (
      <Badge variant="secondary" className={`text-[10px] ${color}`}>
        {sign}{diffPercent}%
      </Badge>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl bg-gray-900 border-white/20 text-white max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <ArrowLeftRight className="h-5 w-5" />
            Comparação de Execuções
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1">
          <div className="space-y-6">
            {/* Metrics Comparison */}
            <div className="grid grid-cols-2 gap-4">
              {/* Execution 1 */}
              <Card className="glass-card">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">Execução 1</CardTitle>
                    {getStatusBadge(execution1.status)}
                  </div>
                  <p className="text-xs text-white/60">{formatDate(execution1.startedAt)}</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-white/60">
                      <Clock className="h-3 w-3" />
                      <span>Duração</span>
                    </div>
                    <span className="text-sm font-medium">{formatDuration(totalDuration1 || undefined)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-white/60">
                      <Zap className="h-3 w-3" />
                      <span>Tokens</span>
                    </div>
                    <span className="text-sm font-medium">{totalTokens1.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/60">Steps</span>
                    <span className="text-sm font-medium">{execution1.agentResults.length}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Execution 2 */}
              <Card className="glass-card">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">Execução 2</CardTitle>
                    {getStatusBadge(execution2.status)}
                  </div>
                  <p className="text-xs text-white/60">{formatDate(execution2.startedAt)}</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-white/60">
                      <Clock className="h-3 w-3" />
                      <span>Duração</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{formatDuration(totalDuration2 || undefined)}</span>
                      {totalDuration1 && totalDuration2 && getDiffBadge(totalDuration1, totalDuration2, 'duração')}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-white/60">
                      <Zap className="h-3 w-3" />
                      <span>Tokens</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{totalTokens2.toLocaleString()}</span>
                      {getDiffBadge(totalTokens1, totalTokens2, 'tokens')}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/60">Steps</span>
                    <span className="text-sm font-medium">{execution2.agentResults.length}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Output Comparison */}
            <div>
              <h3 className="text-sm font-medium text-white mb-3">Comparação de Saídas</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 rounded-lg border border-white/10 p-4">
                  <p className="text-xs text-white/40 mb-2">Output Execução 1</p>
                  <pre className="text-xs bg-black/20 p-2 rounded overflow-x-auto text-white/90 font-mono max-h-48 overflow-y-auto whitespace-pre-wrap">
                    {typeof execution1.output === 'string'
                      ? execution1.output
                      : JSON.stringify(execution1.output, null, 2)}
                  </pre>
                </div>
                <div className="bg-white/5 rounded-lg border border-white/10 p-4">
                  <p className="text-xs text-white/40 mb-2">Output Execução 2</p>
                  <pre className="text-xs bg-black/20 p-2 rounded overflow-x-auto text-white/90 font-mono max-h-48 overflow-y-auto whitespace-pre-wrap">
                    {typeof execution2.output === 'string'
                      ? execution2.output
                      : JSON.stringify(execution2.output, null, 2)}
                  </pre>
                </div>
              </div>
            </div>

            {/* Step by Step Comparison */}
            <div>
              <h3 className="text-sm font-medium text-white mb-3">Comparação Step-by-Step</h3>
              <div className="space-y-3">
                {execution1.agentResults.map((step1, index) => {
                  const step2 = execution2.agentResults[index]

                  return (
                    <div key={index} className="grid grid-cols-2 gap-4">
                      {/* Step 1 */}
                      <div className="bg-white/5 rounded-lg border border-white/10 p-3">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-medium text-white">{step1.role}</p>
                          {step1.durationMs && (
                            <Badge variant="secondary" className="text-[10px]">
                              {formatDuration(step1.durationMs)}
                            </Badge>
                          )}
                        </div>
                        <pre className="text-[10px] bg-black/20 p-2 rounded overflow-x-auto text-white/80 font-mono max-h-24 overflow-y-auto whitespace-pre-wrap line-clamp-3">
                          {step1.output}
                        </pre>
                      </div>

                      {/* Step 2 */}
                      <div className="bg-white/5 rounded-lg border border-white/10 p-3">
                        {step2 ? (
                          <>
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-xs font-medium text-white">{step2.role}</p>
                              <div className="flex items-center gap-1">
                                {step2.durationMs && (
                                  <Badge variant="secondary" className="text-[10px]">
                                    {formatDuration(step2.durationMs)}
                                  </Badge>
                                )}
                                {step1.durationMs && step2.durationMs &&
                                  getDiffBadge(step1.durationMs, step2.durationMs, 'step')
                                }
                              </div>
                            </div>
                            <pre className="text-[10px] bg-black/20 p-2 rounded overflow-x-auto text-white/80 font-mono max-h-24 overflow-y-auto whitespace-pre-wrap line-clamp-3">
                              {step2.output}
                            </pre>
                          </>
                        ) : (
                          <p className="text-xs text-white/40 italic">Step não existe nesta execução</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </ScrollArea>

        <div className="pt-4 border-t border-white/10 flex justify-end">
          <Button onClick={onClose} variant="outline">
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
