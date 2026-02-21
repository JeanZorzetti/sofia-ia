// ─────────────────────────────────────────────────────────
// Logic Nodes — flow control & branching
// ─────────────────────────────────────────────────────────

import type { NodeDefinition } from '../types'

export const logicIf: NodeDefinition = {
    type: 'logic_if',
    category: 'logic',
    label: 'IF / Condição',
    description: 'Avalia uma condição e direciona para o caminho verdadeiro ou falso.',
    icon: 'GitBranch',
    color: 'amber',
    configFields: [
        { key: 'field', label: 'Campo a avaliar', type: 'string', required: true, placeholder: 'data.status' },
        {
            key: 'operator',
            label: 'Operador',
            type: 'select',
            required: true,
            default: 'equals',
            options: [
                { label: 'Igual a (==)', value: 'equals' },
                { label: 'Diferente de (!=)', value: 'notEquals' },
                { label: 'Maior que (>)', value: 'gt' },
                { label: 'Menor que (<)', value: 'lt' },
                { label: 'Maior ou igual (>=)', value: 'gte' },
                { label: 'Menor ou igual (<=)', value: 'lte' },
                { label: 'Contém', value: 'contains' },
                { label: 'Não contém', value: 'notContains' },
                { label: 'Existe (not null)', value: 'exists' },
                { label: 'Não existe (null)', value: 'notExists' },
                { label: 'Está vazio', value: 'isEmpty' },
                { label: 'Não está vazio', value: 'isNotEmpty' },
            ],
        },
        { key: 'value', label: 'Valor para comparação', type: 'string', placeholder: 'success' },
    ],
    inputs: [{ name: 'main', type: 'any' }],
    outputs: [
        { name: 'true', label: 'Verdadeiro', type: 'any' },
        { name: 'false', label: 'Falso', type: 'any' },
    ],
    execute: async (config, input) => {
        const fieldValue = getNestedValue(input, config.field)
        const compareValue = config.value

        let result = false

        switch (config.operator) {
            case 'equals': result = String(fieldValue) === String(compareValue); break
            case 'notEquals': result = String(fieldValue) !== String(compareValue); break
            case 'gt': result = Number(fieldValue) > Number(compareValue); break
            case 'lt': result = Number(fieldValue) < Number(compareValue); break
            case 'gte': result = Number(fieldValue) >= Number(compareValue); break
            case 'lte': result = Number(fieldValue) <= Number(compareValue); break
            case 'contains': result = String(fieldValue).includes(String(compareValue)); break
            case 'notContains': result = !String(fieldValue).includes(String(compareValue)); break
            case 'exists': result = fieldValue !== null && fieldValue !== undefined; break
            case 'notExists': result = fieldValue === null || fieldValue === undefined; break
            case 'isEmpty': result = !fieldValue || (Array.isArray(fieldValue) && fieldValue.length === 0) || fieldValue === ''; break
            case 'isNotEmpty': result = !!fieldValue && (!Array.isArray(fieldValue) || fieldValue.length > 0) && fieldValue !== ''; break
            default: result = false
        }

        return {
            output: {
                ...input,
                _branch: result ? 'true' : 'false',
                _condition: { field: config.field, operator: config.operator, value: compareValue, result },
            },
        }
    },
}

export const logicSwitch: NodeDefinition = {
    type: 'logic_switch',
    category: 'logic',
    label: 'Switch / Case',
    description: 'Direciona o fluxo com base no valor de um campo (múltiplos caminhos).',
    icon: 'Route',
    color: 'amber',
    configFields: [
        { key: 'field', label: 'Campo a avaliar', type: 'string', required: true, placeholder: 'data.type' },
        { key: 'cases', label: 'Cases (JSON array)', type: 'json', required: true, placeholder: '["success", "error", "pending"]' },
    ],
    inputs: [{ name: 'main', type: 'any' }],
    outputs: [{ name: 'default', label: 'Default', type: 'any' }],
    execute: async (config, input) => {
        const fieldValue = String(getNestedValue(input, config.field))
        const cases: string[] = config.cases || []
        const matchedCase = cases.find(c => String(c) === fieldValue)

        return {
            output: {
                ...input,
                _branch: matchedCase || 'default',
                _switch: { field: config.field, value: fieldValue, matched: matchedCase || 'default' },
            },
        }
    },
}

export const logicLoop: NodeDefinition = {
    type: 'logic_loop',
    category: 'logic',
    label: 'Loop / Iteração',
    description: 'Itera sobre um array, executando os nós seguintes para cada item.',
    icon: 'Repeat',
    color: 'amber',
    configFields: [
        { key: 'arrayField', label: 'Campo do array', type: 'string', required: true, placeholder: 'data.items' },
        { key: 'maxIterations', label: 'Máximo de iterações', type: 'number', default: 100 },
    ],
    inputs: [{ name: 'main', type: 'any' }],
    outputs: [{ name: 'item', label: 'Item', type: 'any' }, { name: 'done', label: 'Concluído', type: 'any' }],
    execute: async (config, input) => {
        const array = getNestedValue(input, config.arrayField) || []

        if (!Array.isArray(array)) {
            throw new Error(`Field "${config.arrayField}" is not an array`)
        }

        const maxIterations = config.maxIterations || 100
        const items = array.slice(0, maxIterations)

        // Emit each item — for now returns all items as output
        // The engine will iterate downstream nodes per item in Phase 5
        return {
            output: {
                items,
                totalCount: array.length,
                processedCount: items.length,
                _branch: 'done',
            },
        }
    },
}

export const logicMerge: NodeDefinition = {
    type: 'logic_merge',
    category: 'logic',
    label: 'Merge / Combinar',
    description: 'Combina dados de múltiplas branches em um único output.',
    icon: 'Merge',
    color: 'amber',
    configFields: [
        {
            key: 'strategy',
            label: 'Estratégia',
            type: 'select',
            default: 'merge',
            options: [
                { label: 'Merge (combinar objetos)', value: 'merge' },
                { label: 'Array (agrupar em lista)', value: 'array' },
                { label: 'Primeiro disponível', value: 'first' },
            ],
        },
    ],
    inputs: [{ name: 'main', type: 'any' }],
    outputs: [{ name: 'main', type: 'any' }],
    execute: async (config, input) => {
        if (config.strategy === 'array') {
            if (typeof input === 'object' && !Array.isArray(input)) {
                return { output: { items: Object.values(input) } }
            }
            return { output: { items: Array.isArray(input) ? input : [input] } }
        }

        if (config.strategy === 'first') {
            if (typeof input === 'object' && !Array.isArray(input)) {
                const firstKey = Object.keys(input)[0]
                return { output: input[firstKey] ?? input }
            }
            return { output: input }
        }

        // Default: merge all inputs
        if (typeof input === 'object' && !Array.isArray(input)) {
            const merged: Record<string, any> = {}
            for (const [, value] of Object.entries(input)) {
                if (typeof value === 'object' && value !== null) {
                    Object.assign(merged, value)
                }
            }
            return { output: merged }
        }
        return { output: input }
    },
}

export const logicStop: NodeDefinition = {
    type: 'logic_stop',
    category: 'logic',
    label: 'Parar Execução',
    description: 'Encerra a execução do workflow neste ponto.',
    icon: 'CircleStop',
    color: 'amber',
    configFields: [
        { key: 'reason', label: 'Motivo', type: 'string', placeholder: 'Condição atingida' },
    ],
    inputs: [{ name: 'main', type: 'any' }],
    outputs: [],
    execute: async (config, input) => {
        return {
            output: {
                stopped: true,
                reason: config.reason || 'Execution stopped by Stop node',
                lastInput: input,
            },
        }
    },
}

export const logicNodes: NodeDefinition[] = [
    logicIf,
    logicSwitch,
    logicLoop,
    logicMerge,
    logicStop,
]

// ── Helpers ──────────────────────────────────────────────

function getNestedValue(obj: any, path: string): any {
    if (!path) return obj
    const keys = path.split('.')
    let current = obj
    for (const key of keys) {
        if (current === null || current === undefined) return undefined
        current = current[key]
    }
    return current
}
