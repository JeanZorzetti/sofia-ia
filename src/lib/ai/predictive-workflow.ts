// src/lib/ai/predictive-workflow.ts
import { z } from 'zod';

// Interfaces e tipos
type TriggerType = 'lead_created' | 'message_sent' | 'property_viewed' | 'contract_signed';
type NodeType = 'action' | 'condition' | 'delay' | 'notification' | 'data_update' | 'integration';

interface WorkflowBuildContext {
  triggerType: TriggerType;
  userData: Record<string, any>;
  companySize: 'small' | 'medium' | 'enterprise';
  industry: string;
}

interface WorkflowNodeSuggestion {
  nodeId: string;
  type: NodeType;
  label: string;
  confidence: number; // 0-1
  metadata: {
    description: string;
    example: string;
    successRate: number;
  };
}

// Schemas Zod para validação
const WorkflowBuildContextSchema = z.object({
  triggerType: z.enum(['lead_created', 'message_sent', 'property_viewed', 'contract_signed']),
  userData: z.record(z.any()),
  companySize: z.enum(['small', 'medium', 'enterprise']),
  industry: z.string(),
});

const WorkflowNodeSuggestionSchema = z.object({
  nodeId: z.string(),
  type: z.enum(['action', 'condition', 'delay', 'notification', 'data_update', 'integration']),
  label: z.string(),
  confidence: z.number().min(0).max(1),
  metadata: z.object({
    description: z.string(),
    example: z.string(),
    successRate: z.number().min(0).max(100),
  }),
});

// Classe principal do motor preditivo
export class PredictiveWorkflowEngine {
  // Banco de dados simulado de padrões de workflow
  private workflowPatterns = [
    {
      trigger: 'lead_created',
      sequence: ['notification', 'delay', 'notification'],
      industry: 'real_estate',
      successRate: 0.85
    },
    {
      trigger: 'message_sent',
      sequence: ['data_update', 'condition', 'notification'],
      industry: 'real_estate',
      successRate: 0.72
    }
  ];

  async suggestNextNode(context: WorkflowBuildContext): Promise<WorkflowNodeSuggestion> {
    // Validação do contexto
    WorkflowBuildContextSchema.parse(context);
    
    // Simulação de análise de padrões
    const relevantPatterns = this.workflowPatterns.filter(pattern => 
      pattern.trigger === context.triggerType && 
      pattern.industry === context.industry
    );
    
    // Seleciona o próximo nó mais provável baseado em padrões históricos
    const nextNodeType = relevantPatterns.length > 0 
      ? relevantPatterns[0].sequence[0] 
      : 'notification'; // fallback
    
    // Calcula confiança baseada na taxa de sucesso
    const confidence = relevantPatterns.length > 0 
      ? relevantPatterns[0].successRate 
      : 0.5;
    
    // Retorna sugestão formatada
    return {
      nodeId: `suggested-${Date.now()}`,
      type: nextNodeType as NodeType,
      label: this.getNodeLabel(nextNodeType as NodeType),
      confidence,
      metadata: {
        description: this.getNodeDescription(nextNodeType as NodeType),
        example: this.getNodeExample(nextNodeType as NodeType, context.triggerType),
        successRate: confidence * 100
      }
    };
  }

  private getNodeLabel(nodeType: NodeType): string {
    const labels: Record<NodeType, string> = {
      action: 'Ação Personalizada',
      condition: 'Condição Lógica',
      delay: 'Atraso Temporizado',
      notification: 'Enviar Notificação',
      data_update: 'Atualizar Dados',
      integration: 'Integração Externa'
    };
    return labels[nodeType] || 'Nova Ação';
  }

  private getNodeDescription(nodeType: NodeType): string {
    const descriptions: Record<NodeType, string> = {
      action: 'Executa uma ação personalizada definida pelo usuário',
      condition: 'Avalia uma condição para determinar o próximo passo',
      delay: 'Adiciona um intervalo de tempo antes da próxima ação',
      notification: 'Envia uma notificação por email, SMS ou WhatsApp',
      data_update: 'Atualiza informações no cadastro do lead',
      integration: 'Conecta com sistemas externos como CRM ou Zapier'
    };
    return descriptions[nodeType] || 'Descrição não disponível';
  }

  private getNodeExample(nodeType: NodeType, trigger: TriggerType): string {
    const examples: Record<NodeType, Record<TriggerType, string>> = {
      notification: {
        lead_created: 'Enviar mensagem de boas-vindas para o novo lead',
        message_sent: 'Notificar equipe sobre nova mensagem do lead',
        property_viewed: 'Enviar lembrete de visita agendada',
        contract_signed: 'Enviar confirmação de assinatura do contrato'
      },
      condition: {
        lead_created: 'Verificar se lead já existe no sistema',
        message_sent: 'Checar se mensagem foi lida',
        property_viewed: 'Avaliar se lead tem histórico de visitas',
        contract_signed: 'Validar se contrato foi assinado digitalmente'
      },
      delay: {
        lead_created: 'Aguardar 24 horas antes de enviar follow-up',
        message_sent: 'Esperar resposta por 1 hora antes de escalar',
        property_viewed: 'Pausar 48 horas antes de enviar pesquisa de satisfação',
        contract_signed: 'Aguardar confirmação bancária por 2 dias'
      }
    };
    
    // Para tipos sem exemplos específicos, usar genérico
    return examples[nodeType]?.[trigger] || 'Exemplo não disponível para este tipo';
  }
}

// Tipos exportáveis
export type { WorkflowBuildContext, WorkflowNodeSuggestion, TriggerType, NodeType };
