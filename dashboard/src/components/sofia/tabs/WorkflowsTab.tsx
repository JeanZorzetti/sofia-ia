import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Zap, 
  Play, 
  Pause, 
  Settings, 
  Plus, 
  ArrowRight,
  MessageSquare,
  Database,
  Mail,
  Clock,
  CheckCircle
} from 'lucide-react';

const workflowTemplates = [
  {
    id: 'lead-qualification',
    name: 'Qualificação de Leads',
    description: 'Workflow automático para qualificar leads do WhatsApp',
    status: 'active',
    triggers: ['Nova mensagem no WhatsApp'],
    actions: ['Qualificar interesse', 'Agendar visita', 'Enviar para CRM'],
    icon: MessageSquare,
    color: 'text-green-400',
  },
  {
    id: 'follow-up',
    name: 'Follow-up Inteligente',
    description: 'Acompanhamento automático de prospects',
    status: 'draft',
    triggers: ['Lead sem resposta há 24h'],
    actions: ['Enviar mensagem de follow-up', 'Reagendar contato'],
    icon: Clock,
    color: 'text-blue-400',
  },
  {
    id: 'crm-sync',
    name: 'Sincronização CRM',
    description: 'Sincroniza dados entre WhatsApp e CRM',
    status: 'active',
    triggers: ['Lead qualificado'],
    actions: ['Criar contato no CRM', 'Definir pipeline', 'Notificar corretor'],
    icon: Database,
    color: 'text-purple-400',
  },
  {
    id: 'email-campaign',
    name: 'Campanha de Email',
    description: 'Envia emails personalizados baseados no interesse',
    status: 'paused',
    triggers: ['Lead interessado em imóvel específico'],
    actions: ['Enviar email com detalhes', 'Agendar chamada'],
    icon: Mail,
    color: 'text-orange-400',
  },
];

const workflowNodes = [
  { id: 'trigger', type: 'trigger', label: 'WhatsApp Message', x: 100, y: 100 },
  { id: 'condition', type: 'condition', label: 'Interest Level?', x: 300, y: 100 },
  { id: 'qualify', type: 'action', label: 'Qualify Lead', x: 500, y: 50 },
  { id: 'schedule', type: 'action', label: 'Schedule Visit', x: 500, y: 150 },
  { id: 'crm', type: 'action', label: 'Add to CRM', x: 700, y: 100 },
];

export const WorkflowsTab = () => {
  const [selectedWorkflow, setSelectedWorkflow] = useState<string | null>(null);
  const [showCanvas, setShowCanvas] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'paused': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'draft': return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <Play className="h-3 w-3" />;
      case 'paused': return <Pause className="h-3 w-3" />;
      case 'draft': return <Settings className="h-3 w-3" />;
      default: return <Settings className="h-3 w-3" />;
    }
  };

  const WorkflowCanvas = () => {
    if (!showCanvas) return null;

    return (
      <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <Card className="glass-card w-full max-w-6xl h-[80vh]">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-foreground font-light tracking-wider-sofia">
              Editor de Workflow
            </CardTitle>
            <Button variant="outline" onClick={() => setShowCanvas(false)}>
              Fechar
            </Button>
          </CardHeader>
          <CardContent className="h-full">
            <div className="relative w-full h-full bg-background-secondary rounded-card overflow-hidden">
              {/* Canvas Grid */}
              <div 
                className="absolute inset-0 opacity-20"
                style={{
                  backgroundImage: `
                    linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
                  `,
                  backgroundSize: '20px 20px'
                }}
              />
              
              {/* Workflow Nodes */}
              {workflowNodes.map((node) => (
                <div
                  key={node.id}
                  className="absolute glass-card p-3 cursor-move hover-scale"
                  style={{ left: node.x, top: node.y }}
                >
                  <div className="flex items-center space-x-2">
                    {node.type === 'trigger' && <Zap className="h-4 w-4 text-green-400" />}
                    {node.type === 'condition' && <CheckCircle className="h-4 w-4 text-blue-400" />}
                    {node.type === 'action' && <ArrowRight className="h-4 w-4 text-purple-400" />}
                    <span className="text-sm font-light text-foreground">{node.label}</span>
                  </div>
                </div>
              ))}
              
              {/* Connection Lines */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none">
                <defs>
                  <marker
                    id="arrowhead"
                    markerWidth="10"
                    markerHeight="7"
                    refX="9"
                    refY="3.5"
                    orient="auto"
                  >
                    <polygon
                      points="0 0, 10 3.5, 0 7"
                      fill="rgba(255,255,255,0.5)"
                    />
                  </marker>
                </defs>
                <line
                  x1="200"
                  y1="112"
                  x2="280"
                  y2="112"
                  stroke="rgba(255,255,255,0.5)"
                  strokeWidth="2"
                  markerEnd="url(#arrowhead)"
                />
                <line
                  x1="400"
                  y1="100"
                  x2="480"
                  y2="75"
                  stroke="rgba(255,255,255,0.5)"
                  strokeWidth="2"
                  markerEnd="url(#arrowhead)"
                />
                <line
                  x1="400"
                  y1="125"
                  x2="480"
                  y2="162"
                  stroke="rgba(255,255,255,0.5)"
                  strokeWidth="2"
                  markerEnd="url(#arrowhead)"
                />
                <line
                  x1="600"
                  y1="112"
                  x2="680"
                  y2="112"
                  stroke="rgba(255,255,255,0.5)"
                  strokeWidth="2"
                  markerEnd="url(#arrowhead)"
                />
              </svg>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <>
      <div className="space-y-8 animate-fade-in-up">
        {/* Header */}
        <div className="text-center space-y-4">
          <h2 className="text-foreground">Workflows N8N</h2>
          <p className="text-foreground-secondary">
            Automatize processos e conecte suas ferramentas
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex justify-between items-center">
          <div className="flex space-x-4">
            <Button className="button-luxury" onClick={() => setShowCanvas(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Workflow
            </Button>
            <Button variant="outline">
              <Zap className="h-4 w-4 mr-2" />
              Templates
            </Button>
          </div>
          
          <div className="flex items-center space-x-4 text-sm text-foreground-secondary">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              <span>4 Ativos</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-yellow-500 rounded-full" />
              <span>1 Pausado</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-gray-500 rounded-full" />
              <span>1 Rascunho</span>
            </div>
          </div>
        </div>

        {/* Workflow Templates */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {workflowTemplates.map((workflow) => {
            const Icon = workflow.icon;
            return (
              <Card 
                key={workflow.id} 
                className={`
                  glass-card hover-scale cursor-pointer transition-all duration-300
                  ${selectedWorkflow === workflow.id ? 'ring-2 ring-primary' : ''}
                `}
                onClick={() => setSelectedWorkflow(workflow.id)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <Icon className={`h-6 w-6 ${workflow.color}`} />
                      <div>
                        <CardTitle className="text-foreground font-light tracking-wider-sofia">
                          {workflow.name}
                        </CardTitle>
                        <p className="text-foreground-secondary text-sm mt-1">
                          {workflow.description}
                        </p>
                      </div>
                    </div>
                    <Badge className={`${getStatusColor(workflow.status)} border`}>
                      <div className="flex items-center space-x-1">
                        {getStatusIcon(workflow.status)}
                        <span className="capitalize">{workflow.status}</span>
                      </div>
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div>
                    <h4 className="text-sm font-light text-foreground mb-2">Triggers:</h4>
                    <div className="space-y-1">
                      {workflow.triggers.map((trigger, index) => (
                        <div key={index} className="text-sm text-foreground-secondary flex items-center space-x-2">
                          <div className="w-1 h-1 bg-green-400 rounded-full" />
                          <span>{trigger}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-light text-foreground mb-2">Actions:</h4>
                    <div className="space-y-1">
                      {workflow.actions.map((action, index) => (
                        <div key={index} className="text-sm text-foreground-secondary flex items-center space-x-2">
                          <ArrowRight className="w-3 h-3" />
                          <span>{action}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-between pt-4 border-t border-glass-border">
                    <Button variant="ghost" size="sm" onClick={() => setShowCanvas(true)}>
                      <Settings className="h-4 w-4 mr-2" />
                      Editar
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className={workflow.status === 'active' ? 'text-yellow-400' : 'text-green-400'}
                    >
                      {workflow.status === 'active' ? (
                        <>
                          <Pause className="h-4 w-4 mr-2" />
                          Pausar
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4 mr-2" />
                          Ativar
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="glass-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-foreground-secondary text-sm">Execuções Hoje</p>
                  <p className="text-2xl font-extralight text-foreground">1,247</p>
                </div>
                <Zap className="h-8 w-8 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-foreground-secondary text-sm">Taxa de Sucesso</p>
                  <p className="text-2xl font-extralight text-foreground">98.7%</p>
                </div>
                <CheckCircle className="h-8 w-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-foreground-secondary text-sm">Tempo Médio</p>
                  <p className="text-2xl font-extralight text-foreground">2.3s</p>
                </div>
                <Clock className="h-8 w-8 text-purple-400" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <WorkflowCanvas />
    </>
  );
};