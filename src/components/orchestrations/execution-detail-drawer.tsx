'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle
} from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
  Database,
  ChevronDown,
  ChevronRight,
  Copy,
  Download,
  Play,
  RotateCcw,
  FileJson,
  FileSpreadsheet,
  FileText,
  Scissors,
  Printer,
  Share2,
  Link,
} from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { TimelineGantt } from './timeline-gantt'

interface StepResult {
  agentId: string
  agentName: string
  role: string
  input: any
  output: string
  timestamp: string
  model?: string
  startedAt?: string
  completedAt?: string
  durationMs?: number
  tokensUsed?: number
  status?: string
  totalTasks?: number
  completedTasks?: number
  failedTasks?: number
  taskResults?: {
    taskId: string
    taskTitle: string
    success: boolean
    durationMs: number
    output?: string
    outputPreview?: string
    error?: string
  }[]
}

interface Execution {
  id: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'rate_limited' | 'cancelled'
  input: any
  output: any
  error: string | null
  startedAt: string
  completedAt: string | null
  agentResults: StepResult[]
  orchestrationId?: string
}

interface ExecutionDetailDrawerProps {
  execution: Execution | null
  open: boolean
  onClose: () => void
  onReExecute?: (executionId: string) => void
  onReExecuteFromStep?: (executionId: string, stepIndex: number) => void
  onResume?: (executionId: string, resumeFromTask: string) => void
}

export function ExecutionDetailDrawer({
  execution,
  open,
  onClose,
  onReExecute,
  onReExecuteFromStep,
  onResume
}: ExecutionDetailDrawerProps) {
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set())
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set())
  const [sharing, setSharing] = useState(false)
  const [shareUrl, setShareUrl] = useState<string | null>(null)

  if (!execution) return null

  const handleShare = async () => {
    if (!execution.orchestrationId) return
    setSharing(true)
    try {
      const res = await fetch(
        `/api/orchestrations/${execution.orchestrationId}/executions/${execution.id}/share`,
        { method: 'POST' }
      )
      const data = await res.json()
      if (data.success) {
        setShareUrl(data.shareUrl)
        navigator.clipboard.writeText(data.shareUrl).catch(() => {})
        toast.success('Link copiado para a área de transferência!')
      } else {
        toast.error('Erro ao gerar link de compartilhamento')
      }
    } catch {
      toast.error('Erro ao gerar link de compartilhamento')
    } finally {
      setSharing(false)
    }
  }

  const toggleStep = (index: number) => {
    const newExpanded = new Set(expandedSteps)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedSteps(newExpanded)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copiado para área de transferência')
  }

  const downloadJSON = (data: any, filename: string) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Download iniciado')
  }

  const downloadCSV = () => {
    const headers = ['Step', 'Agente', 'Papel', 'Duração (ms)', 'Tokens', 'Status']
    const rows = execution.agentResults.map((step, index) => [
      (index + 1).toString(),
      step.agentName,
      step.role,
      step.durationMs?.toString() || '-',
      step.tokensUsed?.toString() || '-',
      'Concluído'
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `execution-${execution.id}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('CSV exportado com sucesso')
  }

  const downloadPDF = () => {
    const mdContent = `# Execução ${execution.id}

**Status:** ${execution.status}
**Início:** ${formatDate(execution.startedAt)}
**Término:** ${execution.completedAt ? formatDate(execution.completedAt) : 'Em andamento'}
**Duração:** ${formatDuration(totalDuration || undefined)}
**Tokens Totais:** ${totalTokens.toLocaleString()}

## Input

${typeof execution.input === 'string' ? execution.input : JSON.stringify(execution.input, null, 2)}

## Resultados por Agente

${execution.agentResults.map((step, index) => `
### Step ${index + 1}: ${step.role}

- **Agente:** ${step.agentName}
- **Duração:** ${formatDuration(step.durationMs)}
- **Tokens:** ${step.tokensUsed || 0}

**Output:**

${step.output}
`).join('\n')}

## Output Final

${typeof execution.output === 'string' ? execution.output : JSON.stringify(execution.output, null, 2)}
`

    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      toast.error('Permissão para abrir nova janela foi bloqueada pelo navegador')
      return
    }

    printWindow.document.write(`
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Execução ${execution.id}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; line-height: 1.6; color: #1a1a1a; padding: 32px; max-width: 900px; margin: 0 auto; }
    h1 { font-size: 22px; font-weight: 700; margin-bottom: 8px; color: #111; }
    h2 { font-size: 16px; font-weight: 600; margin-top: 24px; margin-bottom: 12px; padding-bottom: 4px; border-bottom: 1px solid #e5e7eb; color: #374151; }
    h3 { font-size: 14px; font-weight: 600; margin-top: 16px; margin-bottom: 8px; color: #4b5563; }
    .meta { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin: 16px 0; padding: 16px; background: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb; }
    .meta-item { display: flex; flex-direction: column; gap: 2px; }
    .meta-label { font-size: 10px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.05em; }
    .meta-value { font-size: 13px; font-weight: 600; color: #111; }
    .step { margin: 16px 0; padding: 16px; border: 1px solid #e5e7eb; border-radius: 8px; page-break-inside: avoid; }
    .step-header { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
    .step-num { width: 24px; height: 24px; border-radius: 50%; background: #dbeafe; color: #1d4ed8; font-weight: 700; font-size: 11px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .step-title { font-weight: 600; font-size: 13px; }
    .step-agent { font-size: 11px; color: #6b7280; }
    .step-meta { display: flex; gap: 16px; margin-bottom: 12px; }
    .step-meta span { font-size: 11px; color: #6b7280; }
    .label { font-size: 10px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
    .content-box { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px; margin-bottom: 12px; white-space: pre-wrap; word-break: break-word; font-size: 11px; font-family: 'Courier New', monospace; max-height: 200px; overflow: hidden; }
    .output-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 12px; white-space: pre-wrap; word-break: break-word; font-size: 11px; }
    .final-output { background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 16px; margin-top: 12px; white-space: pre-wrap; word-break: break-word; font-size: 12px; }
    .error-box { background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 12px; color: #b91c1c; font-size: 11px; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 10px; font-weight: 600; }
    .badge-success { background: #dcfce7; color: #15803d; }
    .badge-failed { background: #fee2e2; color: #b91c1c; }
    .badge-running { background: #dbeafe; color: #1d4ed8; }
    .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 10px; color: #9ca3af; }
    @media print {
      body { padding: 20px; }
      .step { break-inside: avoid; }
      h2 { break-before: auto; }
    }
  </style>
</head>
<body>
  <h1>Relatório de Execução</h1>
  <p style="color: #6b7280; font-size: 11px; margin-bottom: 4px;">ID: ${execution.id}</p>
  <span class="badge ${execution.status === 'completed' ? 'badge-success' : execution.status === 'failed' ? 'badge-failed' : 'badge-running'}">
    ${execution.status === 'completed' ? 'Sucesso' : execution.status === 'failed' ? 'Falha' : execution.status}
  </span>

  <div class="meta">
    <div class="meta-item">
      <span class="meta-label">Início</span>
      <span class="meta-value">${formatDate(execution.startedAt)}</span>
    </div>
    <div class="meta-item">
      <span class="meta-label">Término</span>
      <span class="meta-value">${execution.completedAt ? formatDate(execution.completedAt) : 'Em andamento'}</span>
    </div>
    <div class="meta-item">
      <span class="meta-label">Duração Total</span>
      <span class="meta-value">${formatDuration(totalDuration || undefined)}</span>
    </div>
    <div class="meta-item">
      <span class="meta-label">Tokens Totais</span>
      <span class="meta-value">${totalTokens.toLocaleString()}</span>
    </div>
  </div>

  <h2>Input da Execução</h2>
  <div class="content-box">${typeof execution.input === 'string' ? execution.input : JSON.stringify(execution.input, null, 2)}</div>

  <h2>Steps por Agente (${execution.agentResults.length})</h2>
  ${execution.agentResults.map((step, index) => `
    <div class="step">
      <div class="step-header">
        <div class="step-num">${index + 1}</div>
        <div>
          <div class="step-title">${step.role}</div>
          <div class="step-agent">${step.agentName}${step.model ? ` • ${step.model}` : ''}</div>
        </div>
      </div>
      <div class="step-meta">
        <span>Duração: <strong>${formatDuration(step.durationMs)}</strong></span>
        <span>Tokens: <strong>${step.tokensUsed || 0}</strong></span>
      </div>
      <div class="label">Output:</div>
      <div class="output-box">${step.output}</div>
    </div>
  `).join('')}

  ${execution.output ? `
    <h2>Output Final</h2>
    <div class="final-output">${typeof execution.output === 'string' ? execution.output : JSON.stringify(execution.output, null, 2)}</div>
  ` : ''}

  ${execution.error ? `
    <h2>Erro</h2>
    <div class="error-box">${execution.error}</div>
  ` : ''}

  <div class="footer">
    Gerado em ${new Date().toLocaleString('pt-BR')} • Sofia AI Platform
  </div>

  <script>
    window.onload = function() {
      window.print();
      setTimeout(function() { window.close(); }, 1000);
    }
  </script>
</body>
</html>
    `)
    printWindow.document.close()
    toast.success('PDF pronto para impressão/download')
  }

  const downloadMarkdown = () => {
    const mdContent = `# Execução ${execution.id}

**Status:** ${execution.status}
**Início:** ${formatDate(execution.startedAt)}
**Término:** ${execution.completedAt ? formatDate(execution.completedAt) : 'Em andamento'}
**Duração:** ${formatDuration(totalDuration || undefined)}
**Tokens Totais:** ${totalTokens.toLocaleString()}

## Input
\`\`\`json
${JSON.stringify(execution.input, null, 2)}
\`\`\`

## Steps

${execution.agentResults.map((step, index) => `
### Step ${index + 1}: ${step.role}

- **Agente:** ${step.agentName}
- **Duração:** ${formatDuration(step.durationMs)}
- **Tokens:** ${step.tokensUsed || 0}
${step.model ? `- **Modelo:** ${step.model}` : ''}

#### Input
\`\`\`
${typeof step.input === 'string' ? step.input : JSON.stringify(step.input, null, 2)}
\`\`\`

#### Output
\`\`\`
${step.output}
\`\`\`
`).join('\n')}

## Output Final

\`\`\`json
${typeof execution.output === 'string' ? execution.output : JSON.stringify(execution.output, null, 2)}
\`\`\`
`

    const blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `execution-${execution.id}.md`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Markdown exportado com sucesso')
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR')
  }

  const formatDuration = (ms?: number) => {
    if (!ms) return '-'
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(2)}s`
  }

  const totalDuration = execution.completedAt && execution.startedAt
    ? new Date(execution.completedAt).getTime() - new Date(execution.startedAt).getTime()
    : null

  const totalTokens = execution.agentResults.reduce((sum, r) => sum + (r.tokensUsed || 0), 0)

  const getStatusBadge = () => {
    switch (execution.status) {
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
      case 'running':
        return (
          <Badge className="bg-blue-500 gap-1">
            <Clock className="h-3 w-3 animate-spin" />
            Executando
          </Badge>
        )
      case 'rate_limited':
        return (
          <Badge className="bg-amber-500 gap-1">
            <Clock className="h-3 w-3" />
            Limite atingido
          </Badge>
        )
      default:
        return <Badge variant="outline">Pendente</Badge>
    }
  }

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full bg-gray-900 border-white/20 text-white overflow-hidden flex flex-col" style={{ maxWidth: '1200px' }}>
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle className="text-white">Detalhes da Execução</SheetTitle>
            <div className="flex items-center gap-2">
              {getStatusBadge()}

              {/* Share Button */}
              {execution.status === 'completed' && execution.orchestrationId && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleShare}
                  disabled={sharing}
                  className="gap-1"
                >
                  {shareUrl ? <Link className="h-3 w-3" /> : <Share2 className="h-3 w-3" />}
                  {sharing ? 'Gerando...' : shareUrl ? 'Link copiado' : 'Compartilhar'}
                </Button>
              )}

              {/* Export Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="outline" className="gap-1">
                    <Download className="h-3 w-3" />
                    Exportar
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-gray-800 border-white/20">
                  <DropdownMenuItem onClick={downloadPDF} className="gap-2 cursor-pointer">
                    <Printer className="h-4 w-4" />
                    <span>PDF (imprimir)</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={downloadMarkdown} className="gap-2 cursor-pointer">
                    <FileText className="h-4 w-4" />
                    <span>Markdown (.md)</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => downloadJSON(execution, `execution-${execution.id}.json`)} className="gap-2 cursor-pointer">
                    <FileJson className="h-4 w-4" />
                    <span>JSON (.json)</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={downloadCSV} className="gap-2 cursor-pointer">
                    <FileSpreadsheet className="h-4 w-4" />
                    <span>CSV (.csv)</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {(execution.status === 'completed' || execution.status === 'failed') && onReExecute && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onReExecute(execution.id)}
                  className="gap-1"
                >
                  <RotateCcw className="h-3 w-3" />
                  Re-executar
                </Button>
              )}

              {execution.status === 'rate_limited' && onResume && (() => {
                const splitterResult = execution.agentResults.find(
                  (r: any) => r.agentId === 'task-splitter' && r.remainingTasks?.length > 0
                ) as any
                if (!splitterResult) return null
                const firstRemaining = splitterResult.remainingTasks[0]
                return (
                  <Button
                    size="sm"
                    onClick={() => onResume(execution.id, firstRemaining.id)}
                    className="gap-1 bg-amber-500 hover:bg-amber-600 text-black font-medium"
                  >
                    <Play className="h-3 w-3" />
                    Continuar ({splitterResult.remainingTasks.length} tasks restantes)
                  </Button>
                )
              })()}
            </div>
          </div>
          <SheetDescription className="text-white/60">
            ID: {execution.id}
          </SheetDescription>
        </SheetHeader>

        {/* Metrics Summary */}
        <div className="grid grid-cols-3 gap-4 my-4">
          <div className="bg-white/5 rounded-lg p-3 border border-white/10">
            <div className="flex items-center gap-2 text-white/60 text-xs mb-1">
              <Clock className="h-3 w-3" />
              <span>Duração</span>
            </div>
            <p className="text-lg font-semibold text-white">
              {formatDuration(totalDuration || undefined)}
            </p>
          </div>

          <div className="bg-white/5 rounded-lg p-3 border border-white/10">
            <div className="flex items-center gap-2 text-white/60 text-xs mb-1">
              <Zap className="h-3 w-3" />
              <span>Tokens</span>
            </div>
            <p className="text-lg font-semibold text-white">
              {totalTokens.toLocaleString()}
            </p>
          </div>

          <div className="bg-white/5 rounded-lg p-3 border border-white/10">
            <div className="flex items-center gap-2 text-white/60 text-xs mb-1">
              <Database className="h-3 w-3" />
              <span>Steps</span>
            </div>
            <p className="text-lg font-semibold text-white">
              {execution.agentResults.length}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="steps" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="bg-white/5 border border-white/10">
            <TabsTrigger value="steps">Steps ({execution.agentResults.length})</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="input">Input</TabsTrigger>
            <TabsTrigger value="output">Output</TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 mt-4">
            {/* Steps Tab */}
            <TabsContent value="steps" className="space-y-3 mt-0">
              {execution.agentResults.map((step, index) => {
                const isExpanded = expandedSteps.has(index)

                return (
                  <div
                    key={index}
                    className="bg-white/5 rounded-lg border border-white/10 overflow-hidden"
                  >
                    {/* Step Header */}
                    <button
                      onClick={() => toggleStep(index)}
                      className="w-full p-4 flex items-center justify-between hover:bg-white/10 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${step.agentId === 'task-splitter'
                          ? 'bg-amber-500/20 text-amber-300'
                          : step.status === 'rejected'
                            ? 'bg-red-500/20 text-red-300'
                            : 'bg-blue-500/20 text-blue-300'
                          }`}>
                          {step.agentId === 'task-splitter'
                            ? <Scissors className="h-4 w-4" />
                            : (index + 1)
                          }
                        </div>
                        <div className="text-left">
                          <p className="font-medium text-white">{step.role}</p>
                          <p className="text-xs text-white/60">
                            {step.agentId === 'task-splitter' && step.totalTasks
                              ? `${step.completedTasks || 0}/${step.totalTasks} tasks${step.failedTasks ? ` (${step.failedTasks} falhas)` : ''}`
                              : step.agentName
                            }
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {step.agentId === 'task-splitter' && step.status === 'splitting' && (
                          <Badge variant="secondary" className="text-[10px] bg-amber-500/20 text-amber-300 animate-pulse">
                            Em execução
                          </Badge>
                        )}
                        {step.durationMs !== undefined && step.durationMs > 0 && (
                          <Badge variant="secondary" className="text-[10px] bg-white/10">
                            {formatDuration(step.durationMs)}
                          </Badge>
                        )}
                        {step.tokensUsed !== undefined && step.tokensUsed > 0 && (
                          <Badge variant="secondary" className="text-[10px] bg-purple-500/20 text-purple-300">
                            {step.tokensUsed} tokens
                          </Badge>
                        )}
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-white/60" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-white/60" />
                        )}
                      </div>
                    </button>

                    {/* Step Details */}
                    {isExpanded && (
                      <div className="px-4 pb-4 space-y-3 border-t border-white/10 min-w-0">
                        {/* Input */}
                        <div>
                          <div className="flex items-center justify-between mb-2 mt-3">
                            <p className="text-xs text-white/40 font-mono">Input:</p>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 px-2 text-xs"
                              onClick={() => copyToClipboard(
                                typeof step.input === 'string' ? step.input : JSON.stringify(step.input, null, 2)
                              )}
                            >
                              <Copy className="h-3 w-3 mr-1" />
                              Copiar
                            </Button>
                          </div>
                          <pre className="text-xs bg-black/20 p-2 rounded overflow-x-auto text-white/80 font-mono max-h-32 overflow-y-auto whitespace-pre-wrap break-words">
                            {typeof step.input === 'string'
                              ? step.input
                              : JSON.stringify(step.input, null, 2)}
                          </pre>
                        </div>

                        {/* Output */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs text-white/40 font-mono">Output:</p>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 px-2 text-xs"
                              onClick={() => copyToClipboard(step.output)}
                            >
                              <Copy className="h-3 w-3 mr-1" />
                              Copiar
                            </Button>
                          </div>
                          <pre className="text-xs bg-black/20 p-2 rounded overflow-x-auto text-white/90 font-mono max-h-48 overflow-y-auto whitespace-pre-wrap break-words">
                            {step.output}
                          </pre>
                        </div>

                        {/* Task Splitter Progress */}
                        {step.agentId === 'task-splitter' && step.taskResults && step.taskResults.length > 0 && (
                          <div>
                            <p className="text-xs text-white/40 font-mono mb-2">Task Progress:</p>

                            {/* Progress Bar */}
                            {step.totalTasks && (
                              <div className="mb-3">
                                <div className="flex justify-between text-[10px] text-white/40 mb-1">
                                  <span>{step.completedTasks || 0} de {step.totalTasks} tasks</span>
                                  <span>{Math.round(((step.completedTasks || 0) / step.totalTasks) * 100)}%</span>
                                </div>
                                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-gradient-to-r from-amber-500 to-green-500 rounded-full transition-all duration-500"
                                    style={{ width: `${((step.completedTasks || 0) / step.totalTasks) * 100}%` }}
                                  />
                                </div>
                              </div>
                            )}

                            {/* Individual Task Results */}
                            <div className="space-y-1">
                              {step.taskResults.map((taskResult, taskIdx) => {
                                const taskKey = `${index}-${taskIdx}`
                                const isTaskExpanded = expandedTasks.has(taskKey)

                                return (
                                  <div key={taskIdx} className="bg-black/20 rounded border border-white/5">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        const newSet = new Set(expandedTasks)
                                        if (newSet.has(taskKey)) {
                                          newSet.delete(taskKey)
                                        } else {
                                          newSet.add(taskKey)
                                        }
                                        setExpandedTasks(newSet)
                                      }}
                                      className="w-full px-3 py-2 flex items-center justify-between hover:bg-white/5 transition-colors"
                                    >
                                      <div className="flex items-center gap-2">
                                        <span className={`text-sm ${taskResult.success ? 'text-green-400' : 'text-red-400'}`}>
                                          {taskResult.success ? '✅' : '❌'}
                                        </span>
                                        <span className="text-xs text-white/80 font-medium">
                                          {taskResult.taskId}: {taskResult.taskTitle}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-[10px] text-white/40">
                                          {formatDuration(taskResult.durationMs)}
                                        </span>
                                        {isTaskExpanded
                                          ? <ChevronDown className="h-3 w-3 text-white/40" />
                                          : <ChevronRight className="h-3 w-3 text-white/40" />
                                        }
                                      </div>
                                    </button>
                                    {isTaskExpanded && (
                                      <div className="px-3 pb-2 border-t border-white/5">
                                        {taskResult.error ? (
                                          <p className="text-xs text-red-300 mt-2">{taskResult.error}</p>
                                        ) : (
                                          <pre className="text-[11px] bg-black/30 p-2 mt-2 rounded text-white/80 font-mono max-h-32 overflow-y-auto whitespace-pre-wrap break-words">
                                            {taskResult.output || taskResult.outputPreview || 'Sem output'}
                                          </pre>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}

                        {/* Metadata */}
                        <div className="flex flex-wrap items-center gap-2 pt-2">
                          {step.model && (
                            <Badge variant="secondary" className="text-[10px] bg-white/10">
                              {step.model}
                            </Badge>
                          )}
                          {step.completedAt && (
                            <span className="text-[10px] text-white/40">
                              {formatDate(step.completedAt)}
                            </span>
                          )}
                        </div>

                        {/* Re-execute from step - full width, always visible */}
                        {(execution.status === 'completed' || execution.status === 'failed') && onReExecuteFromStep && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onReExecuteFromStep(execution.id, index)}
                            className="w-full mt-3 gap-2 text-blue-300 border-blue-500/30 hover:bg-blue-500/20"
                          >
                            <Play className="h-3 w-3" />
                            Re-executar a partir deste step
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}

              {execution.agentResults.length === 0 && (
                <p className="text-center text-white/60 py-8">
                  Nenhum step executado ainda
                </p>
              )}
            </TabsContent>

            {/* Timeline Tab */}
            <TabsContent value="timeline" className="mt-0">
              {totalDuration && totalDuration > 0 ? (
                <TimelineGantt
                  steps={execution.agentResults}
                  totalDuration={totalDuration}
                />
              ) : (
                <p className="text-center text-white/60 py-8">
                  Dados de duração não disponíveis
                </p>
              )}
            </TabsContent>

            {/* Input Tab */}
            <TabsContent value="input" className="mt-0">
              <div className="bg-white/5 rounded-lg border border-white/10 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-white">Entrada da Execução</h3>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(JSON.stringify(execution.input, null, 2))}
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      Copiar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => downloadJSON(execution.input, `execution-${execution.id}-input.json`)}
                    >
                      <Download className="h-3 w-3 mr-1" />
                      Download
                    </Button>
                  </div>
                </div>
                <pre className="text-xs bg-black/20 p-3 rounded overflow-x-auto text-white/90 font-mono max-h-96 overflow-y-auto">
                  {JSON.stringify(execution.input, null, 2)}
                </pre>
              </div>
            </TabsContent>

            {/* Output Tab */}
            <TabsContent value="output" className="mt-0">
              {execution.output ? (
                <div className="bg-white/5 rounded-lg border border-white/10 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-white">Saída da Execução</h3>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(
                          typeof execution.output === 'string'
                            ? execution.output
                            : JSON.stringify(execution.output, null, 2)
                        )}
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        Copiar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => downloadJSON(execution.output, `execution-${execution.id}-output.json`)}
                      >
                        <Download className="h-3 w-3 mr-1" />
                        Download
                      </Button>
                    </div>
                  </div>
                  <pre className="text-xs bg-black/20 p-3 rounded overflow-x-auto text-white/90 font-mono max-h-96 overflow-y-auto whitespace-pre-wrap">
                    {typeof execution.output === 'string'
                      ? execution.output
                      : JSON.stringify(execution.output, null, 2)}
                  </pre>
                </div>
              ) : execution.error ? (
                <div className="bg-red-500/10 rounded-lg border border-red-500/20 p-4">
                  <h3 className="text-sm font-medium text-red-400 mb-2">Erro na Execução</h3>
                  <p className="text-xs text-red-300/80">{execution.error}</p>
                </div>
              ) : (
                <p className="text-center text-white/60 py-8">
                  Execução ainda não concluída
                </p>
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>

        {/* Footer */}
        <div className="pt-4 border-t border-white/10 text-xs text-white/40">
          Iniciado em: {formatDate(execution.startedAt)}
          {execution.completedAt && ` • Concluído em: ${formatDate(execution.completedAt)}`}
        </div>
      </SheetContent>
    </Sheet>
  )
}
