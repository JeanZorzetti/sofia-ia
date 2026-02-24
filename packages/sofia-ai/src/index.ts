const DEFAULT_BASE_URL = 'https://sofiaia.roilabs.com.br'

export interface SofiaClientOptions {
  apiKey: string
  baseUrl?: string
}

export interface ExecuteOptions {
  variables?: Record<string, string>
}

export interface ChatOptions {
  conversationId?: string
}

export interface Execution {
  id: string
  orchestrationId: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  output: any
  error?: string
  tokensUsed?: number
  durationMs?: number
  createdAt: string
  completedAt?: string
}

export interface ChatResponse {
  reply: string
  conversationId: string
  tokens: number
  model: string
}

export interface Agent {
  id: string
  name: string
  description: string | null
  model: string
  status: string
  memoryEnabled: boolean
  createdAt: string
}

export interface Orchestration {
  id: string
  name: string
  description: string | null
  strategy: string
  status: string
  createdAt: string
}

/**
 * Sofia AI JavaScript SDK
 *
 * @example
 * ```typescript
 * import { SofiaClient } from 'sofia-ai';
 *
 * const client = new SofiaClient({ apiKey: 'sk_live_...' });
 *
 * // Chat com agente
 * const { reply } = await client.chat('agent-id', 'Olá!');
 *
 * // Executar orquestração
 * const { executionId } = await client.execute('orch-id', 'Relatório mensal');
 *
 * // Aguardar resultado
 * const result = await client.waitForExecution(executionId);
 * ```
 */
export class SofiaClient {
  private apiKey: string
  private baseUrl: string

  constructor(options: SofiaClientOptions) {
    if (!options.apiKey) {
      throw new Error('SofiaClient: apiKey é obrigatório')
    }
    this.apiKey = options.apiKey
    this.baseUrl = (options.baseUrl || DEFAULT_BASE_URL).replace(/\/$/, '')
  }

  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${path}`
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }))
      throw new Error(`Sofia AI API error ${response.status}: ${error.error || response.statusText}`)
    }

    return response.json() as Promise<T>
  }

  /**
   * Lista todos os agentes do tenant.
   */
  async listAgents(): Promise<Agent[]> {
    const result = await this.request<{ data: Agent[] }>('/api/v1/agents')
    return result.data
  }

  /**
   * Lista todas as orquestrações do tenant.
   */
  async listOrchestrations(): Promise<Orchestration[]> {
    const result = await this.request<{ data: Orchestration[] }>('/api/v1/orchestrations')
    return result.data
  }

  /**
   * Envia uma mensagem para um agente.
   */
  async chat(agentId: string, message: string, options?: ChatOptions): Promise<ChatResponse> {
    return this.request<ChatResponse>(`/api/v1/agents/${agentId}/chat`, {
      method: 'POST',
      body: JSON.stringify({ message, conversationId: options?.conversationId }),
    })
  }

  /**
   * Inicia a execução de uma orquestração (assíncrono).
   * Retorna o executionId para consultar o status.
   */
  async execute(
    orchestrationId: string,
    input: string,
    options?: ExecuteOptions
  ): Promise<{ executionId: string; status: string }> {
    return this.request<{ executionId: string; status: string }>(
      `/api/v1/orchestrations/${orchestrationId}/execute`,
      {
        method: 'POST',
        body: JSON.stringify({ input, variables: options?.variables }),
      }
    )
  }

  /**
   * Consulta o status de uma execução.
   */
  async getExecution(executionId: string): Promise<Execution> {
    return this.request<Execution>(`/api/v1/executions/${executionId}`)
  }

  /**
   * Aguarda a conclusão de uma execução com polling.
   * @param executionId ID da execução
   * @param intervalMs Intervalo de polling em ms (padrão: 3000)
   * @param timeoutMs Timeout total em ms (padrão: 300000 = 5 min)
   */
  async waitForExecution(
    executionId: string,
    intervalMs = 3000,
    timeoutMs = 300000
  ): Promise<Execution> {
    const startTime = Date.now()

    while (Date.now() - startTime < timeoutMs) {
      await new Promise((r) => setTimeout(r, intervalMs))
      const execution = await this.getExecution(executionId)

      if (execution.status === 'completed') return execution
      if (execution.status === 'failed') {
        throw new Error(`Execution failed: ${execution.error}`)
      }
      if (execution.status === 'cancelled') {
        throw new Error('Execution was cancelled')
      }
    }

    throw new Error(`Execution timeout after ${timeoutMs}ms`)
  }

  /**
   * Atalho: executa uma orquestração e aguarda o resultado.
   */
  async executeAndWait(
    orchestrationId: string,
    input: string,
    options?: ExecuteOptions & { intervalMs?: number; timeoutMs?: number }
  ): Promise<Execution> {
    const { executionId } = await this.execute(orchestrationId, input, options)
    return this.waitForExecution(executionId, options?.intervalMs, options?.timeoutMs)
  }
}

export default SofiaClient
