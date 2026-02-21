// ─────────────────────────────────────────────────────────
// Transform Nodes — data manipulation & transformation
// ─────────────────────────────────────────────────────────

import type { NodeDefinition } from '../types'

export const transformSet: NodeDefinition = {
    type: 'transform_set',
    category: 'transform',
    label: 'Set / Definir Variável',
    description: 'Define ou modifica valores nos dados do workflow.',
    icon: 'PenLine',
    color: 'violet',
    configFields: [
        { key: 'assignments', label: 'Assignments (JSON)', type: 'json', required: true, placeholder: '{"result.name": "value", "result.count": 42}' },
        {
            key: 'mode',
            label: 'Modo',
            type: 'select',
            default: 'merge',
            options: [
                { label: 'Merge (mantém dados existentes)', value: 'merge' },
                { label: 'Replace (substitui tudo)', value: 'replace' },
            ],
        },
    ],
    inputs: [{ name: 'main', type: 'any' }],
    outputs: [{ name: 'main', type: 'any' }],
    execute: async (config, input) => {
        const assignments = config.assignments || {}

        if (config.mode === 'replace') {
            return { output: assignments }
        }

        // Merge: set nested values
        const result = { ...(typeof input === 'object' ? input : { _input: input }) }
        for (const [path, value] of Object.entries(assignments)) {
            setNestedValue(result, path, value)
        }
        return { output: result }
    },
}

export const transformCode: NodeDefinition = {
    type: 'transform_code',
    category: 'transform',
    label: 'Código JavaScript',
    description: 'Executa código JavaScript customizado para transformar dados.',
    icon: 'Code',
    color: 'violet',
    configFields: [
        {
            key: 'code',
            label: 'Código',
            type: 'code',
            required: true,
            placeholder: '// `input` contém os dados de entrada\n// Retorne o resultado com `return`\n\nreturn {\n  processedAt: new Date().toISOString(),\n  itemCount: input.items?.length || 0\n}',
        },
    ],
    inputs: [{ name: 'main', type: 'any' }],
    outputs: [{ name: 'main', type: 'any' }],
    execute: async (config, input) => {
        // Simple sandboxed execution using Function constructor
        // NOTE: This is not a secure sandbox. For production, consider vm2 or isolated-vm.
        try {
            const fn = new Function('input', 'Math', 'Date', 'JSON', 'Array', 'Object', 'String', 'Number', 'Boolean',
                config.code || 'return input'
            )

            const result = fn(input, Math, Date, JSON, Array, Object, String, Number, Boolean)
            return { output: result === undefined ? input : result }
        } catch (error: any) {
            throw new Error(`Code execution error: ${error.message}`)
        }
    },
}

export const transformTemplate: NodeDefinition = {
    type: 'transform_template',
    category: 'transform',
    label: 'Template de Texto',
    description: 'Gera texto usando template com variáveis {{campo}}.',
    icon: 'FileText',
    color: 'violet',
    configFields: [
        { key: 'template', label: 'Template', type: 'text', required: true, placeholder: 'Olá {{name}}, seu pedido #{{orderId}} está {{status}}.' },
        { key: 'outputField', label: 'Nome do campo de saída', type: 'string', default: 'text', placeholder: 'text' },
    ],
    inputs: [{ name: 'main', type: 'any' }],
    outputs: [{ name: 'main', type: 'any' }],
    execute: async (config, input) => {
        const template = config.template || ''
        const result = template.replace(/\{\{([^}]+)\}\}/g, (_: string, path: string) => {
            const value = getNestedValue(input, path.trim())
            if (typeof value === 'object') return JSON.stringify(value)
            return String(value ?? '')
        })

        const outputField = config.outputField || 'text'
        return { output: { ...input, [outputField]: result } }
    },
}

export const transformJsonParse: NodeDefinition = {
    type: 'transform_json_parse',
    category: 'transform',
    label: 'JSON Parse / Stringify',
    description: 'Converte string para JSON ou JSON para string.',
    icon: 'Braces',
    color: 'violet',
    configFields: [
        {
            key: 'direction',
            label: 'Direção',
            type: 'select',
            default: 'parse',
            options: [
                { label: 'Parse (string → JSON)', value: 'parse' },
                { label: 'Stringify (JSON → string)', value: 'stringify' },
            ],
        },
        { key: 'field', label: 'Campo', type: 'string', placeholder: 'data.body', description: 'Campo a converter. Vazio = input inteiro.' },
    ],
    inputs: [{ name: 'main', type: 'any' }],
    outputs: [{ name: 'main', type: 'any' }],
    execute: async (config, input) => {
        const value = config.field ? getNestedValue(input, config.field) : input

        if (config.direction === 'stringify') {
            const result = JSON.stringify(value, null, 2)
            if (config.field) {
                const output = { ...input }
                setNestedValue(output, config.field, result)
                return { output }
            }
            return { output: { json: result } }
        }

        // parse
        const parsed = typeof value === 'string' ? JSON.parse(value) : value
        if (config.field) {
            const output = { ...input }
            setNestedValue(output, config.field, parsed)
            return { output }
        }
        return { output: parsed }
    },
}

export const transformFilter: NodeDefinition = {
    type: 'transform_filter',
    category: 'transform',
    label: 'Filtrar Array',
    description: 'Filtra items de um array com base em uma condição.',
    icon: 'Filter',
    color: 'violet',
    configFields: [
        { key: 'arrayField', label: 'Campo do array', type: 'string', required: true, placeholder: 'data.items' },
        { key: 'conditionField', label: 'Campo do item a avaliar', type: 'string', required: true, placeholder: 'status' },
        {
            key: 'operator',
            label: 'Operador',
            type: 'select',
            default: 'equals',
            options: [
                { label: 'Igual a', value: 'equals' },
                { label: 'Diferente de', value: 'notEquals' },
                { label: 'Contém', value: 'contains' },
                { label: 'Maior que', value: 'gt' },
                { label: 'Menor que', value: 'lt' },
                { label: 'Existe', value: 'exists' },
            ],
        },
        { key: 'value', label: 'Valor', type: 'string', placeholder: 'active' },
    ],
    inputs: [{ name: 'main', type: 'any' }],
    outputs: [{ name: 'main', type: 'any' }],
    execute: async (config, input) => {
        const array = getNestedValue(input, config.arrayField) || []
        if (!Array.isArray(array)) throw new Error(`"${config.arrayField}" is not an array`)

        const filtered = array.filter(item => {
            const fieldValue = getNestedValue(item, config.conditionField)
            switch (config.operator) {
                case 'equals': return String(fieldValue) === String(config.value)
                case 'notEquals': return String(fieldValue) !== String(config.value)
                case 'contains': return String(fieldValue).includes(String(config.value))
                case 'gt': return Number(fieldValue) > Number(config.value)
                case 'lt': return Number(fieldValue) < Number(config.value)
                case 'exists': return fieldValue !== null && fieldValue !== undefined
                default: return true
            }
        })

        return {
            output: {
                ...input,
                filtered,
                originalCount: array.length,
                filteredCount: filtered.length,
            },
        }
    },
}

export const transformAggregate: NodeDefinition = {
    type: 'transform_aggregate',
    category: 'transform',
    label: 'Agregar / Calcular',
    description: 'Calcula soma, média, contagem, min ou max de um array.',
    icon: 'Calculator',
    color: 'violet',
    configFields: [
        { key: 'arrayField', label: 'Campo do array', type: 'string', required: true, placeholder: 'data.items' },
        { key: 'valueField', label: 'Campo do valor', type: 'string', placeholder: 'amount' },
        {
            key: 'operation',
            label: 'Operação',
            type: 'select',
            required: true,
            default: 'count',
            options: [
                { label: 'Contagem', value: 'count' },
                { label: 'Soma', value: 'sum' },
                { label: 'Média', value: 'avg' },
                { label: 'Mínimo', value: 'min' },
                { label: 'Máximo', value: 'max' },
            ],
        },
    ],
    inputs: [{ name: 'main', type: 'any' }],
    outputs: [{ name: 'main', type: 'any' }],
    execute: async (config, input) => {
        const array = getNestedValue(input, config.arrayField) || []
        if (!Array.isArray(array)) throw new Error(`"${config.arrayField}" is not an array`)

        const values = config.valueField
            ? array.map(item => Number(getNestedValue(item, config.valueField)) || 0)
            : array.map(item => Number(item) || 0)

        let result: number

        switch (config.operation) {
            case 'count': result = array.length; break
            case 'sum': result = values.reduce((a, b) => a + b, 0); break
            case 'avg': result = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0; break
            case 'min': result = values.length > 0 ? Math.min(...values) : 0; break
            case 'max': result = values.length > 0 ? Math.max(...values) : 0; break
            default: result = 0
        }

        return {
            output: {
                ...input,
                _aggregate: { operation: config.operation, result, count: array.length },
                result,
            },
        }
    },
}

export const transformDate: NodeDefinition = {
    type: 'transform_date',
    category: 'transform',
    label: 'Data / Hora',
    description: 'Formata, converte ou calcula datas.',
    icon: 'Calendar',
    color: 'violet',
    configFields: [
        {
            key: 'operation',
            label: 'Operação',
            type: 'select',
            default: 'now',
            options: [
                { label: 'Data/hora atual', value: 'now' },
                { label: 'Formatar data', value: 'format' },
                { label: 'Adicionar tempo', value: 'add' },
                { label: 'Diferença entre datas', value: 'diff' },
            ],
        },
        { key: 'dateField', label: 'Campo da data', type: 'string', placeholder: 'createdAt' },
        { key: 'amount', label: 'Quantidade', type: 'number', placeholder: '7' },
        {
            key: 'unit',
            label: 'Unidade',
            type: 'select',
            default: 'days',
            options: [
                { label: 'Minutos', value: 'minutes' },
                { label: 'Horas', value: 'hours' },
                { label: 'Dias', value: 'days' },
                { label: 'Semanas', value: 'weeks' },
                { label: 'Meses', value: 'months' },
            ],
        },
    ],
    inputs: [{ name: 'main', type: 'any' }],
    outputs: [{ name: 'main', type: 'any' }],
    execute: async (config, input) => {
        const now = new Date()

        if (config.operation === 'now') {
            return {
                output: {
                    ...input,
                    _date: {
                        iso: now.toISOString(),
                        timestamp: now.getTime(),
                        formatted: now.toLocaleDateString('pt-BR'),
                    },
                },
            }
        }

        const dateValue = config.dateField ? getNestedValue(input, config.dateField) : now.toISOString()
        const date = new Date(dateValue)

        if (config.operation === 'add') {
            const ms: Record<string, number> = {
                minutes: 60000,
                hours: 3600000,
                days: 86400000,
                weeks: 604800000,
                months: 2592000000,
            }
            const added = new Date(date.getTime() + (config.amount || 0) * (ms[config.unit] || 86400000))
            return {
                output: { ...input, _date: { iso: added.toISOString(), timestamp: added.getTime() } },
            }
        }

        if (config.operation === 'diff') {
            const diffMs = now.getTime() - date.getTime()
            const diffDays = Math.floor(diffMs / 86400000)
            return {
                output: {
                    ...input,
                    _date: { diffMs, diffSeconds: Math.floor(diffMs / 1000), diffMinutes: Math.floor(diffMs / 60000), diffHours: Math.floor(diffMs / 3600000), diffDays },
                },
            }
        }

        // format
        return {
            output: {
                ...input,
                _date: { iso: date.toISOString(), timestamp: date.getTime(), formatted: date.toLocaleDateString('pt-BR') },
            },
        }
    },
}

export const transformNodes: NodeDefinition[] = [
    transformSet,
    transformCode,
    transformTemplate,
    transformJsonParse,
    transformFilter,
    transformAggregate,
    transformDate,
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

function setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.')
    let current = obj
    for (let i = 0; i < keys.length - 1; i++) {
        if (!(keys[i] in current) || typeof current[keys[i]] !== 'object') {
            current[keys[i]] = {}
        }
        current = current[keys[i]]
    }
    current[keys[keys.length - 1]] = value
}
