// ─────────────────────────────────────────────────────────
// Action Nodes — integrations & side effects
// ─────────────────────────────────────────────────────────

import type { NodeDefinition } from '../types'

export const actionHttp: NodeDefinition = {
    type: 'action_http',
    category: 'action',
    label: 'HTTP Request',
    description: 'Faz uma requisição HTTP para qualquer API ou endpoint.',
    icon: 'Globe',
    color: 'blue',
    configFields: [
        {
            key: 'method',
            label: 'Método',
            type: 'select',
            required: true,
            default: 'GET',
            options: [
                { label: 'GET', value: 'GET' },
                { label: 'POST', value: 'POST' },
                { label: 'PUT', value: 'PUT' },
                { label: 'PATCH', value: 'PATCH' },
                { label: 'DELETE', value: 'DELETE' },
            ],
        },
        { key: 'url', label: 'URL', type: 'string', required: true, placeholder: 'https://api.exemplo.com/data' },
        { key: 'headers', label: 'Headers (JSON)', type: 'json', placeholder: '{"Authorization": "Bearer token"}' },
        { key: 'body', label: 'Body', type: 'json', placeholder: '{"key": "value"}' },
        {
            key: 'responseType',
            label: 'Tipo de Resposta',
            type: 'select',
            default: 'json',
            options: [
                { label: 'JSON', value: 'json' },
                { label: 'Texto', value: 'text' },
            ],
        },
    ],
    inputs: [{ name: 'main', type: 'any' }],
    outputs: [{ name: 'main', type: 'any' }],
    execute: async (config, input) => {
        const { method, url, headers, body, responseType } = config

        // Resolve template expressions in URL and body
        const resolvedUrl = resolveExpressions(url, input)
        const resolvedBody = body ? resolveExpressions(JSON.stringify(body), input) : undefined

        const fetchOptions: RequestInit = {
            method: method || 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...(headers || {}),
            },
        }

        if (resolvedBody && method !== 'GET') {
            fetchOptions.body = resolvedBody
        }

        const response = await fetch(resolvedUrl, fetchOptions)

        const responseData = responseType === 'text'
            ? await response.text()
            : await response.json()

        return {
            output: {
                status: response.status,
                statusText: response.statusText,
                headers: Object.fromEntries(response.headers.entries()),
                data: responseData,
            },
        }
    },
}

export const actionDelay: NodeDefinition = {
    type: 'action_delay',
    category: 'action',
    label: 'Delay',
    description: 'Aguarda um período de tempo antes de continuar.',
    icon: 'Timer',
    color: 'blue',
    configFields: [
        { key: 'duration', label: 'Duração', type: 'number', required: true, placeholder: '5' },
        {
            key: 'unit',
            label: 'Unidade',
            type: 'select',
            default: 'seconds',
            options: [
                { label: 'Segundos', value: 'seconds' },
                { label: 'Minutos', value: 'minutes' },
                { label: 'Horas', value: 'hours' },
            ],
        },
    ],
    inputs: [{ name: 'main', type: 'any' }],
    outputs: [{ name: 'main', type: 'any' }],
    execute: async (config, input, context) => {
        const multipliers: Record<string, number> = { seconds: 1000, minutes: 60000, hours: 3600000 }
        const ms = (config.duration || 1) * (multipliers[config.unit] || 1000)

        await new Promise<void>((resolve, reject) => {
            const timer = setTimeout(resolve, Math.min(ms, 300000)) // max 5 min
            if (context.signal) {
                context.signal.addEventListener('abort', () => {
                    clearTimeout(timer)
                    reject(new Error('Execution cancelled'))
                })
            }
        })

        return { output: input }
    },
}

export const actionAiAgent: NodeDefinition = {
    type: 'action_ai_agent',
    category: 'action',
    label: 'Agente IA (Sofia)',
    description: 'Envia um prompt a um agente IA da Sofia e retorna a resposta.',
    icon: 'Bot',
    color: 'blue',
    configFields: [
        { key: 'agentId', label: 'ID do Agente', type: 'string', required: true, placeholder: 'UUID do agente' },
        { key: 'prompt', label: 'Prompt', type: 'text', required: true, placeholder: 'Analise os seguintes dados: {{data}}' },
        { key: 'model', label: 'Modelo (override)', type: 'string', placeholder: 'Deixe vazio para usar o modelo do agente' },
    ],
    inputs: [{ name: 'main', type: 'any' }],
    outputs: [{ name: 'main', type: 'any' }],
    execute: async (config, input) => {
        const prompt = resolveExpressions(config.prompt || '', input)

        // Call the internal agent API
        const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/agents/${config.agentId}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: prompt,
                ...(config.model ? { model: config.model } : {}),
            }),
        })

        if (!response.ok) {
            const error = await response.text()
            throw new Error(`Agent API error (${response.status}): ${error}`)
        }

        const data = await response.json()

        return {
            output: {
                response: data.response || data.message || data,
                agentId: config.agentId,
                model: config.model,
            },
        }
    },
}

export const actionWebhookResponse: NodeDefinition = {
    type: 'action_webhook_response',
    category: 'action',
    label: 'Webhook Response',
    description: 'Retorna uma resposta ao webhook que disparou o flow.',
    icon: 'Reply',
    color: 'blue',
    configFields: [
        { key: 'statusCode', label: 'Status Code', type: 'number', default: 200 },
        { key: 'body', label: 'Body da Resposta', type: 'json', placeholder: '{"success": true, "data": {{input}}}' },
        { key: 'headers', label: 'Headers', type: 'json', placeholder: '{}' },
    ],
    inputs: [{ name: 'main', type: 'any' }],
    outputs: [{ name: 'main', type: 'any' }],
    execute: async (config, input, context) => {
        // Store the response in context for the webhook handler to pick up
        context.variables['_webhookResponse'] = {
            statusCode: config.statusCode || 200,
            headers: config.headers || {},
            body: config.body ? JSON.parse(resolveExpressions(JSON.stringify(config.body), input)) : input,
        }
        return { output: input }
    },
}

export const actionDatabase: NodeDefinition = {
    type: 'action_database',
    category: 'action',
    label: 'Consulta SQL',
    description: 'Executa query SQL no banco de dados PostgreSQL.',
    icon: 'Database',
    color: 'blue',
    configFields: [
        {
            key: 'operation',
            label: 'Operação',
            type: 'select',
            required: true,
            default: 'query',
            options: [
                { label: 'SELECT (query)', value: 'query' },
                { label: 'INSERT', value: 'insert' },
                { label: 'UPDATE', value: 'update' },
                { label: 'DELETE', value: 'delete' },
            ],
        },
        { key: 'sql', label: 'SQL', type: 'code', required: true, placeholder: 'SELECT * FROM users WHERE id = $1' },
        { key: 'params', label: 'Parâmetros (JSON array)', type: 'json', placeholder: '["{{input.userId}}"]' },
    ],
    inputs: [{ name: 'main', type: 'any' }],
    outputs: [{ name: 'main', type: 'any' }],
    execute: async (config, input) => {
        // For safety, we use prisma.$queryRawUnsafe with parameterization
        const { PrismaClient } = await import('@prisma/client')
        const prisma = new PrismaClient()

        try {
            const params = config.params
                ? JSON.parse(resolveExpressions(JSON.stringify(config.params), input))
                : []

            const result = await prisma.$queryRawUnsafe(config.sql, ...params)
            return { output: { rows: result, rowCount: Array.isArray(result) ? result.length : 0 } }
        } finally {
            await prisma.$disconnect()
        }
    },
}

export const actionNotification: NodeDefinition = {
    type: 'action_notification',
    category: 'action',
    label: 'Notificação',
    description: 'Envia notificação in-app ou por email.',
    icon: 'Bell',
    color: 'blue',
    configFields: [
        {
            key: 'channel',
            label: 'Canal',
            type: 'select',
            default: 'in_app',
            options: [
                { label: 'In-App', value: 'in_app' },
                { label: 'Email', value: 'email' },
            ],
        },
        { key: 'title', label: 'Título', type: 'string', required: true, placeholder: 'Workflow concluído' },
        { key: 'message', label: 'Mensagem', type: 'text', required: true, placeholder: 'O flow {{flowName}} foi executado com sucesso.' },
        { key: 'recipient', label: 'Destinatário (email ou userId)', type: 'string', placeholder: 'user@example.com' },
    ],
    inputs: [{ name: 'main', type: 'any' }],
    outputs: [{ name: 'main', type: 'any' }],
    execute: async (config, input) => {
        // For now, log the notification. In production, integrate with notification service
        const title = resolveExpressions(config.title || '', input)
        const message = resolveExpressions(config.message || '', input)

        console.log(`[Notification] ${config.channel}: "${title}" - ${message}`)

        return {
            output: {
                sent: true,
                channel: config.channel,
                title,
                message,
                recipient: config.recipient,
            },
        }
    },
}

export const actionSubflow: NodeDefinition = {
    type: 'action_subflow',
    category: 'action',
    label: 'Sub-Flow',
    description: 'Executa outro flow como sub-rotina, passando dados de entrada.',
    icon: 'GitBranch',
    color: 'violet',
    configFields: [
        { key: 'flowId', label: 'Flow ID', type: 'string', required: true, placeholder: 'UUID do flow a executar' },
        {
            key: 'passInput',
            label: 'Passar dados de entrada',
            type: 'boolean',
            default: true,
            description: 'Se ativado, os dados de entrada deste nó são passados como triggerData do sub-flow.',
        },
    ],
    inputs: [{ name: 'main', type: 'any' }],
    outputs: [{ name: 'main', type: 'any' }],
    execute: async (config, input, context) => {
        const currentDepth = context.depth || 0
        const MAX_DEPTH = 5

        if (currentDepth >= MAX_DEPTH) {
            throw new Error(`Profundidade máxima de sub-flows excedida (${MAX_DEPTH}). Possível loop infinito.`)
        }

        if (!config.flowId) {
            throw new Error('Flow ID é obrigatório para o nó Sub-Flow.')
        }

        // Dynamic import to avoid circular dependency
        const { executeFlow } = await import('../flow-engine')

        const result = await executeFlow(config.flowId, {
            triggerData: config.passInput !== false ? input : {},
            mode: 'subflow',
        })

        if (result.status === 'failed') {
            throw new Error(`Sub-flow falhou: ${result.error || 'Erro desconhecido'}`)
        }

        // Find the last successful node's output
        const lastOutput = Object.values(result.nodeResults)
            .filter(r => r.status === 'success' && r.output !== undefined)
            .pop()?.output || {}

        return {
            output: {
                subflowResult: lastOutput,
                executionId: result.executionId,
                status: result.status,
                duration: result.duration,
            },
        }
    },
}

export const actionNodes: NodeDefinition[] = [
    actionHttp,
    actionDelay,
    actionAiAgent,
    actionWebhookResponse,
    actionDatabase,
    actionNotification,
    actionSubflow,
]

// ── Helpers ──────────────────────────────────────────────

/**
 * Template expression resolver.
 * Replaces {{path.to.value}} with values from input data.
 * Also supports {{var.name}} for flow variables via context.
 */
export function resolveExpressions(template: string, data: any, variables?: Record<string, any>): string {
    return template.replace(/\{\{([^}]+)\}\}/g, (_, path) => {
        const keys = path.trim().split('.')

        // Handle {{var.name}} — flow variables
        if (keys[0] === 'var' && variables) {
            const varName = keys.slice(1).join('.')
            const val = variables[varName]
            if (val === undefined || val === null) return ''
            if (typeof val === 'object') return JSON.stringify(val)
            return String(val)
        }

        let value = data
        for (const key of keys) {
            if (value === null || value === undefined) return ''
            value = value[key]
        }
        if (typeof value === 'object') return JSON.stringify(value)
        return String(value ?? '')
    })
}
