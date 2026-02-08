'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Progress } from '@/components/ui/progress'
import {
  Target,
  Clock,
  AlertCircle,
  MessageSquare,
  TrendingUp,
  CheckCircle,
  Activity
} from 'lucide-react'

interface Workflow {
  id: string
  name: string
  description: string
  icon: any
  color: string
  active: boolean
  executions_today: number
  success_rate: number
}

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([
    {
      id: 'lead-qualification',
      name: 'Qualificação de Leads',
      description: 'Analisa automaticamente conversas e atribui score de qualificação baseado em interesse, orçamento e urgência',
      icon: Target,
      color: 'text-blue-400',
      active: true,
      executions_today: 47,
      success_rate: 94
    },
    {
      id: 'smart-followup',
      name: 'Follow-up Inteligente',
      description: 'Envia mensagens de acompanhamento automáticas após 24h, 48h e 72h de inatividade do lead',
      icon: Clock,
      color: 'text-purple-400',
      active: true,
      executions_today: 23,
      success_rate: 78
    },
    {
      id: 'hot-lead-alert',
      name: 'Alerta de Lead Quente',
      description: 'Notifica gerente via email/SMS quando um lead atinge score superior a 80 pontos',
      icon: AlertCircle,
      color: 'text-red-400',
      active: true,
      executions_today: 12,
      success_rate: 100
    },
    {
      id: 'auto-response',
      name: 'Resposta Automática',
      description: 'Responde automaticamente novas mensagens usando Groq AI com contexto da conversa anterior',
      icon: MessageSquare,
      color: 'text-green-400',
      active: true,
      executions_today: 156,
      success_rate: 89
    }
  ])

  const handleToggle = (workflowId: string) => {
    setWorkflows(prev =>
      prev.map(workflow =>
        workflow.id === workflowId
          ? { ...workflow, active: !workflow.active }
          : workflow
      )
    )
  }

  const totalExecutions = workflows.reduce((sum, w) => sum + w.executions_today, 0)
  const avgSuccessRate = Math.round(
    workflows.reduce((sum, w) => sum + w.success_rate, 0) / workflows.length
  )

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-3xl font-bold text-white">Automações Internas</h1>
        <p className="text-white/60 mt-1">Sistema de workflows automatizados da Sofia</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/60">Workflows Ativos</p>
                <p className="text-3xl font-bold text-white mt-2">
                  {workflows.filter(w => w.active).length}/{workflows.length}
                </p>
              </div>
              <Activity className="h-12 w-12 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/60">Execuções Hoje</p>
                <p className="text-3xl font-bold text-white mt-2">
                  {totalExecutions}
                </p>
              </div>
              <TrendingUp className="h-12 w-12 text-purple-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/60">Taxa de Sucesso</p>
                <p className="text-3xl font-bold text-white mt-2">
                  {avgSuccessRate}%
                </p>
              </div>
              <CheckCircle className="h-12 w-12 text-green-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {workflows.map((workflow) => {
          const Icon = workflow.icon
          return (
            <Card key={workflow.id} className="glass-card hover-scale">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-lg bg-white/5`}>
                      <Icon className={`h-6 w-6 ${workflow.color}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-white text-lg">
                          {workflow.name}
                        </CardTitle>
                        {workflow.active && (
                          <Badge variant="default" className="bg-green-500 text-white text-xs">
                            Ativo
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="text-white/60 mt-2">
                        {workflow.description}
                      </CardDescription>
                    </div>
                  </div>
                  <Switch
                    checked={workflow.active}
                    onCheckedChange={() => handleToggle(workflow.id)}
                  />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 rounded-lg bg-white/5">
                      <p className="text-xs text-white/60">Execuções Hoje</p>
                      <p className="text-2xl font-bold text-white mt-1">
                        {workflow.executions_today}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-white/5">
                      <p className="text-xs text-white/60">Taxa de Sucesso</p>
                      <p className="text-2xl font-bold text-white mt-1">
                        {workflow.success_rate}%
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white/60">Performance</span>
                      <span className="text-white font-medium">
                        {workflow.success_rate}%
                      </span>
                    </div>
                    <Progress value={workflow.success_rate} className="h-2" />
                  </div>

                  {workflow.active && (
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-green-500/10 border border-green-500/20">
                      <CheckCircle className="h-4 w-4 text-green-400" />
                      <span className="text-xs text-green-400">
                        Workflow em execução
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-white">Como Funcionam as Automações</CardTitle>
          <CardDescription className="text-white/60">
            Sistema interno de workflows sem dependências externas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-4 p-4 rounded-lg bg-white/5">
              <div className="h-8 w-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold flex-shrink-0">
                1
              </div>
              <div>
                <h4 className="text-white font-medium">Trigger Automático</h4>
                <p className="text-sm text-white/60 mt-1">
                  Workflows são acionados por eventos como nova mensagem, tempo decorrido ou score de lead
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 rounded-lg bg-white/5">
              <div className="h-8 w-8 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 font-bold flex-shrink-0">
                2
              </div>
              <div>
                <h4 className="text-white font-medium">Processamento Inteligente</h4>
                <p className="text-sm text-white/60 mt-1">
                  IA da Sofia analisa contexto, histórico e dados do lead para tomar decisões
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 rounded-lg bg-white/5">
              <div className="h-8 w-8 rounded-full bg-green-500/20 flex items-center justify-center text-green-400 font-bold flex-shrink-0">
                3
              </div>
              <div>
                <h4 className="text-white font-medium">Ação Executada</h4>
                <p className="text-sm text-white/60 mt-1">
                  Sistema executa a ação (envio de mensagem, notificação, atualização de dados)
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 rounded-lg bg-white/5">
              <div className="h-8 w-8 rounded-full bg-yellow-500/20 flex items-center justify-center text-yellow-400 font-bold flex-shrink-0">
                4
              </div>
              <div>
                <h4 className="text-white font-medium">Logging e Analytics</h4>
                <p className="text-sm text-white/60 mt-1">
                  Todas as execuções são registradas para análise de performance e otimização
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
