import { prisma } from './prisma';
import Groq from 'groq-sdk';

// Types
export interface WorkflowTrigger {
  type: 'webhook' | 'schedule' | 'event' | 'manual';
  config: {
    event?: string; // e.g., 'conversation.created', 'lead.qualified', 'lead.score_updated'
    condition?: Record<string, any>; // e.g., { score: { $gt: 80 } }
    schedule?: string; // cron expression
    webhookUrl?: string;
  };
}

export interface WorkflowCondition {
  type: 'if' | 'if_else';
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'not_contains';
  value: any;
  actions: WorkflowAction[];
  elseActions?: WorkflowAction[];
}

export interface WorkflowAction {
  type: 'send_whatsapp' | 'call_api' | 'update_lead' | 'notify_webhook' | 'call_agent';
  config: Record<string, any>;
}

export interface WorkflowExecutionContext {
  lead?: any;
  conversation?: any;
  message?: any;
  trigger?: any;
  [key: string]: any;
}

// Groq client (lazy initialization)
let groqClient: Groq | null = null;

function getGroqClient(): Groq {
  if (!groqClient) {
    groqClient = new Groq({
      apiKey: process.env.GROQ_API_KEY || ''
    });
  }
  return groqClient;
}

// Workflow Executor
export class WorkflowExecutor {
  private workflowId: string;
  private executionId: string;
  private context: WorkflowExecutionContext;

  constructor(workflowId: string, context: WorkflowExecutionContext) {
    this.workflowId = workflowId;
    this.executionId = '';
    this.context = context;
  }

  async execute(): Promise<{ success: boolean; output?: any; error?: string }> {
    const startTime = Date.now();

    try {
      // Create execution record
      const execution = await prisma.workflowExecution.create({
        data: {
          workflowId: this.workflowId,
          status: 'running',
          input: this.context as any,
          startedAt: new Date()
        }
      });
      this.executionId = execution.id;

      // Fetch workflow
      const workflow = await prisma.workflow.findUnique({
        where: { id: this.workflowId }
      });

      if (!workflow) {
        throw new Error('Workflow not found');
      }

      // Check if workflow is active
      if (workflow.status !== 'active') {
        throw new Error('Workflow is not active');
      }

      // Execute conditions (if any)
      const conditions = workflow.conditions as any[];
      const actionsToExecute: WorkflowAction[] = [];

      if (conditions && conditions.length > 0) {
        for (const condition of conditions) {
          if (this.evaluateCondition(condition)) {
            actionsToExecute.push(...(condition.actions || []));
          } else if (condition.elseActions) {
            actionsToExecute.push(...condition.elseActions);
          }
        }
      } else {
        // No conditions, execute all actions
        const workflowActions = Array.isArray(workflow.actions) ? workflow.actions : [];
        actionsToExecute.push(...(workflowActions as unknown as WorkflowAction[]));
      }

      // Execute actions sequentially
      const results: any[] = [];
      for (const action of actionsToExecute) {
        const result = await this.executeAction(action);
        results.push(result);
      }

      // Update execution record with success
      const duration = Date.now() - startTime;
      await prisma.workflowExecution.update({
        where: { id: this.executionId },
        data: {
          status: 'completed',
          output: results as any,
          duration,
          completedAt: new Date()
        }
      });

      // Update workflow stats
      await prisma.workflow.update({
        where: { id: this.workflowId },
        data: {
          lastRun: new Date(),
          runCount: { increment: 1 },
          successCount: { increment: 1 }
        }
      });

      return { success: true, output: results };

    } catch (error: any) {
      // Update execution record with error
      const duration = Date.now() - startTime;

      if (this.executionId) {
        await prisma.workflowExecution.update({
          where: { id: this.executionId },
          data: {
            status: 'failed',
            error: error.message,
            duration,
            completedAt: new Date()
          }
        });
      }

      // Update workflow stats
      await prisma.workflow.update({
        where: { id: this.workflowId },
        data: {
          lastRun: new Date(),
          runCount: { increment: 1 }
        }
      });

      return { success: false, error: error.message };
    }
  }

  private evaluateCondition(condition: WorkflowCondition): boolean {
    const fieldValue = this.getFieldValue(condition.field);
    const targetValue = condition.value;

    switch (condition.operator) {
      case 'eq':
        return fieldValue === targetValue;
      case 'neq':
        return fieldValue !== targetValue;
      case 'gt':
        return fieldValue > targetValue;
      case 'gte':
        return fieldValue >= targetValue;
      case 'lt':
        return fieldValue < targetValue;
      case 'lte':
        return fieldValue <= targetValue;
      case 'contains':
        return String(fieldValue).includes(String(targetValue));
      case 'not_contains':
        return !String(fieldValue).includes(String(targetValue));
      default:
        return false;
    }
  }

  private getFieldValue(field: string): any {
    const parts = field.split('.');
    let value: any = this.context;

    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        return undefined;
      }
    }

    return value;
  }

  private async executeAction(action: WorkflowAction): Promise<any> {
    switch (action.type) {
      case 'send_whatsapp':
        return await this.sendWhatsApp(action.config);
      case 'call_api':
        return await this.callAPI(action.config);
      case 'update_lead':
        return await this.updateLead(action.config);
      case 'notify_webhook':
        return await this.notifyWebhook(action.config);
      case 'call_agent':
        return await this.callAgent(action.config);
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  private async sendWhatsApp(config: any): Promise<any> {
    // Get Evolution API credentials from settings
    const evolutionApiUrl = process.env.EVOLUTION_API_URL;
    const evolutionApiKey = process.env.EVOLUTION_API_KEY;

    if (!evolutionApiUrl || !evolutionApiKey) {
      throw new Error('Evolution API not configured');
    }

    const instanceName = config.instance || 'sofia';
    const phoneNumber = config.to || this.context.lead?.telefone;
    const message = this.interpolateMessage(config.message);

    if (!phoneNumber) {
      throw new Error('No phone number provided');
    }

    // Send message via Evolution API
    const response = await fetch(`${evolutionApiUrl}/message/sendText/${instanceName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': evolutionApiKey
      },
      body: JSON.stringify({
        number: phoneNumber,
        text: message
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to send WhatsApp message: ${response.statusText}`);
    }

    const result = await response.json();
    return { type: 'send_whatsapp', success: true, data: result };
  }

  private async callAPI(config: any): Promise<any> {
    const url = config.url;
    const method = config.method || 'POST';
    const headers = config.headers || {};
    const body = config.body ? this.interpolateObject(config.body) : undefined;

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: body ? JSON.stringify(body) : undefined
    });

    if (!response.ok) {
      throw new Error(`API call failed: ${response.statusText}`);
    }

    const result = await response.json();
    return { type: 'call_api', success: true, data: result };
  }

  private async updateLead(config: any): Promise<any> {
    const leadId = config.leadId || this.context.lead?.id;

    if (!leadId) {
      throw new Error('No lead ID provided');
    }

    const updates: any = {};
    if (config.status !== undefined) updates.status = config.status;
    if (config.score !== undefined) updates.score = config.score;
    if (config.metadata !== undefined) updates.metadata = config.metadata;
    if (config.assignedTo !== undefined) updates.assignedTo = config.assignedTo;

    const lead = await prisma.lead.update({
      where: { id: leadId },
      data: updates
    });

    return { type: 'update_lead', success: true, data: lead };
  }

  private async notifyWebhook(config: any): Promise<any> {
    const url = config.url;
    const payload = this.interpolateObject(config.payload || this.context);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Webhook notification failed: ${response.statusText}`);
    }

    return { type: 'notify_webhook', success: true };
  }

  private async callAgent(config: any): Promise<any> {
    const agentId = config.agentId;
    const message = this.interpolateMessage(config.message);

    if (!agentId) {
      throw new Error('No agent ID provided');
    }

    // Fetch agent
    const agent = await prisma.agent.findUnique({
      where: { id: agentId }
    });

    if (!agent) {
      throw new Error('Agent not found');
    }

    // Call Groq API
    const groq = getGroqClient();
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: agent.systemPrompt
        },
        {
          role: 'user',
          content: message
        }
      ],
      model: agent.model,
      temperature: agent.temperature,
      max_tokens: 1000
    });

    const response = chatCompletion.choices[0]?.message?.content || '';

    return { type: 'call_agent', success: true, data: { response } };
  }

  private interpolateMessage(template: string): string {
    // Replace {{field.path}} with actual values from context
    return template.replace(/\{\{([^}]+)\}\}/g, (match, fieldPath) => {
      const value = this.getFieldValue(fieldPath.trim());
      return value !== undefined ? String(value) : match;
    });
  }

  private interpolateObject(obj: any): any {
    if (typeof obj === 'string') {
      return this.interpolateMessage(obj);
    }
    if (Array.isArray(obj)) {
      return obj.map(item => this.interpolateObject(item));
    }
    if (obj && typeof obj === 'object') {
      const result: any = {};
      for (const key in obj) {
        result[key] = this.interpolateObject(obj[key]);
      }
      return result;
    }
    return obj;
  }
}

// Event listener for workflow triggers
export async function triggerWorkflowsByEvent(
  eventType: string,
  context: WorkflowExecutionContext
): Promise<void> {
  // Find workflows that listen to this event
  const workflows = await prisma.workflow.findMany({
    where: {
      status: 'active'
    }
  });

  for (const workflow of workflows) {
    const trigger = workflow.trigger as any;

    if (trigger.type === 'event' && trigger.config.event === eventType) {
      // Check if trigger condition matches (if any)
      if (trigger.config.condition) {
        const executor = new WorkflowExecutor(workflow.id, context);
        const conditionMet = executor['evaluateCondition']({
          type: 'if',
          field: Object.keys(trigger.config.condition)[0],
          operator: Object.keys(trigger.config.condition[Object.keys(trigger.config.condition)[0]])[0] as any,
          value: trigger.config.condition[Object.keys(trigger.config.condition)[0]][Object.keys(trigger.config.condition[Object.keys(trigger.config.condition)[0]])[0]],
          actions: []
        });

        if (!conditionMet) continue;
      }

      // Execute workflow
      const executor = new WorkflowExecutor(workflow.id, context);
      await executor.execute().catch(error => {
        console.error(`Error executing workflow ${workflow.id}:`, error);
      });
    }
  }
}
