// ─────────────────────────────────────────────────────────
// Trigger Nodes
// ─────────────────────────────────────────────────────────

import type { NodeDefinition } from '../types'

export const triggerManual: NodeDefinition = {
    type: 'trigger_manual',
    category: 'trigger',
    label: 'Trigger Manual',
    description: 'Execução manual via botão. Ponto de entrada do workflow.',
    icon: 'Play',
    color: 'emerald',
    configFields: [
        {
            key: 'inputLabel',
            label: 'Label do input',
            type: 'string',
            placeholder: 'Descreva o que o usuário deve inserir...',
            description: 'Texto exibido no campo de input ao executar manualmente',
        },
    ],
    inputs: [],
    outputs: [{ name: 'main', type: 'any' }],
    execute: async (config, input) => {
        return { output: input }
    },
}

export const triggerWebhook: NodeDefinition = {
    type: 'trigger_webhook',
    category: 'trigger',
    label: 'Webhook',
    description: 'Recebe dados via HTTP POST. Gera uma URL única para integração.',
    icon: 'Webhook',
    color: 'emerald',
    configFields: [
        {
            key: 'method',
            label: 'Método HTTP',
            type: 'select',
            default: 'POST',
            options: [
                { label: 'POST', value: 'POST' },
                { label: 'GET', value: 'GET' },
                { label: 'PUT', value: 'PUT' },
            ],
        },
        {
            key: 'authType',
            label: 'Autenticação',
            type: 'select',
            default: 'none',
            options: [
                { label: 'Nenhuma', value: 'none' },
                { label: 'Header Token', value: 'header' },
                { label: 'Query Param', value: 'query' },
            ],
        },
        {
            key: 'authToken',
            label: 'Token',
            type: 'string',
            placeholder: 'Token secreto para validação',
        },
    ],
    inputs: [],
    outputs: [{ name: 'main', type: 'any' }],
    execute: async (_config, input) => {
        // Webhook data is passed as input from the trigger endpoint
        return { output: input }
    },
}

export const triggerCron: NodeDefinition = {
    type: 'trigger_cron',
    category: 'trigger',
    label: 'Agendamento (Cron)',
    description: 'Executa automaticamente em horários programados.',
    icon: 'Clock',
    color: 'emerald',
    configFields: [
        {
            key: 'expression',
            label: 'Expressão Cron',
            type: 'string',
            placeholder: '0 9 * * 1-5 (seg-sex 9h)',
            required: true,
            description: 'Formato: minuto hora dia mês dia-semana',
        },
        {
            key: 'timezone',
            label: 'Timezone',
            type: 'string',
            default: 'America/Sao_Paulo',
            placeholder: 'America/Sao_Paulo',
        },
    ],
    inputs: [],
    outputs: [{ name: 'main', type: 'any' }],
    execute: async (config) => {
        return {
            output: {
                triggeredAt: new Date().toISOString(),
                cron: config.expression,
                timezone: config.timezone || 'America/Sao_Paulo',
            },
        }
    },
}

export const triggerEvent: NodeDefinition = {
    type: 'trigger_event',
    category: 'trigger',
    label: 'Evento do Sistema',
    description: 'Disparado por eventos internos da Sofia (ex: agente concluiu, novo lead).',
    icon: 'Zap',
    color: 'emerald',
    configFields: [
        {
            key: 'eventName',
            label: 'Nome do Evento',
            type: 'select',
            required: true,
            options: [
                { label: 'Agente concluiu execução', value: 'agent.completed' },
                { label: 'Orquestração concluiu', value: 'orchestration.completed' },
                { label: 'Novo template deployado', value: 'template.deployed' },
                { label: 'Flow falhou', value: 'flow.failed' },
                { label: 'Customizado', value: 'custom' },
            ],
        },
        {
            key: 'customEvent',
            label: 'Nome do evento customizado',
            type: 'string',
            placeholder: 'meu.evento.custom',
        },
    ],
    inputs: [],
    outputs: [{ name: 'main', type: 'any' }],
    execute: async (_config, input) => {
        return { output: input }
    },
}

export const triggerNodes: NodeDefinition[] = [
    triggerManual,
    triggerWebhook,
    triggerCron,
    triggerEvent,
]
