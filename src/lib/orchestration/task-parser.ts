/**
 * Task Parser — extracts individual tasks from PM output and builds focused prompts
 * 
 * Used by the Task Splitter node in the orchestration engine to break down
 * a PM's roadmap into individually-executable tasks.
 */

export interface ParsedTask {
    index: number
    id: string           // e.g. "WF-01"
    title: string        // e.g. "Criar suite de testes unitários..."
    body: string         // full task content
    component?: string   // e.g. "Backend", "Frontend"
    priority?: string    // e.g. "Alta (P0)"
    dependencies: string[] // e.g. ["WF-03"]
}

export interface TaskResult {
    task: ParsedTask
    output: string
    success: boolean
    durationMs: number
    error?: string
}

/**
 * Parse tasks from PM output text.
 * 
 * Supports multiple common patterns:
 * - **Task WF-XX:** Title
 * - ### Task XX: Title
 * - Numbered lists with task headers
 * 
 * @param pmOutput - The full text output from the PM agent
 * @param customPattern - Optional custom regex pattern (string form, will be compiled)
 * @returns Array of parsed tasks
 */
export function parseTasks(pmOutput: string, customPattern?: string): ParsedTask[] {
    const tasks: ParsedTask[] = []

    // Default patterns to try, in order of specificity
    const patterns = customPattern
        ? [new RegExp(customPattern, 'gm')]
        : [
            // Pattern 1: **Task WF-XX:** Title (most common in our PM output)
            /\*\*Task\s+(WF-\d+):\*\*\s*(.+)/gm,
            // Pattern 2: ### Task WF-XX: Title
            /###\s*Task\s+(WF-\d+):\s*(.+)/gm,
            // Pattern 3: Generic **Task XX:** Title
            /\*\*Task\s+(\S+):\*\*\s*(.+)/gm,
            // Pattern 4: Numbered tasks (1. **Title**)
            /^\d+\.\s*\*\*(.+?)\*\*/gm,
        ]

    // Split the PM output into sections by task headers
    // We use the first pattern that produces matches
    for (const pattern of patterns) {
        const matches = [...pmOutput.matchAll(pattern)]
        if (matches.length === 0) continue

        for (let i = 0; i < matches.length; i++) {
            const match = matches[i]
            const nextMatch = matches[i + 1]

            const id = match[1] || `TASK-${i + 1}`
            const title = (match[2] || match[1] || '').trim()

            // Extract body: everything between this match and the next
            const bodyStart = match.index! + match[0].length
            const bodyEnd = nextMatch ? nextMatch.index! : pmOutput.length
            const body = pmOutput.slice(bodyStart, bodyEnd).trim()

            // Extract component from body
            const componentMatch = body.match(/\*\*Componente:\*\*\s*(.+)/i)
                || body.match(/- \*\*Componente:\*\*\s*(.+)/i)
            const component = componentMatch?.[1]?.trim()

            // Extract priority
            const priorityMatch = body.match(/\*\*Prioridade:\*\*\s*(.+)/i)
                || body.match(/- \*\*Prioridade:\*\*\s*(.+)/i)
            const priority = priorityMatch?.[1]?.trim()

            // Extract dependencies
            const depsMatch = body.match(/\*\*Dependências?:\*\*\s*(.+)/i)
                || body.match(/- \*\*Dependências?:\*\*\s*(.+)/i)
            const depsStr = depsMatch?.[1]?.trim() || ''
            const dependencies = depsStr
                ? [...depsStr.matchAll(/WF-\d+/g)].map(m => m[0])
                : []

            tasks.push({
                index: i,
                id,
                title,
                body: `**Task ${id}:** ${title}\n${body}`,
                component,
                priority,
                dependencies,
            })
        }

        // If we found tasks with this pattern, stop trying others
        if (tasks.length > 0) break
    }

    return tasks
}

/**
 * Build a focused prompt for one individual task.
 * 
 * In ISOLATED mode, the executor only receives:
 * - The original user request
 * - THIS task's full description
 * - Which task number this is in the sequence
 * 
 * This prevents context overflow and keeps each execution fast.
 */
export function buildTaskPrompt(
    task: ParsedTask,
    totalTasks: number,
    originalInput: string,
    additionalContext?: string
): string {
    const parts: string[] = []

    parts.push(`TAREFA ORIGINAL DO USUÁRIO:\n${originalInput}`)

    parts.push(`\n═══ TASK ${task.index + 1} DE ${totalTasks} ═══`)
    parts.push(`\nVocê está executando a task ${task.index + 1} de ${totalTasks} de um roadmap.`)
    parts.push(`Foque EXCLUSIVAMENTE nesta task. Não tente executar as outras.\n`)
    parts.push(task.body)

    if (additionalContext) {
        parts.push(`\n── CONTEXTO ADICIONAL ──\n${additionalContext}`)
    }

    parts.push(`\n═══ FIM DA TASK ${task.index + 1} ═══`)
    parts.push(`\nExecute esta task completamente. Ao finalizar, confirme o que foi feito.`)

    return parts.join('\n')
}

/**
 * Consolidate results from multiple task executions into a summary.
 * This becomes the output of the Task Splitter step.
 */
export function consolidateResults(results: TaskResult[]): string {
    const parts: string[] = []

    const completed = results.filter(r => r.success).length
    const failed = results.filter(r => !r.success).length
    const totalDuration = results.reduce((sum, r) => sum + r.durationMs, 0)

    parts.push(`# Resultado da Execução — Task Splitter`)
    parts.push(`\n## Resumo`)
    parts.push(`- **Total de tasks:** ${results.length}`)
    parts.push(`- **Concluídas:** ${completed} ✅`)
    if (failed > 0) parts.push(`- **Falhas:** ${failed} ❌`)
    parts.push(`- **Duração total:** ${(totalDuration / 1000).toFixed(1)}s`)

    parts.push(`\n## Detalhes por Task\n`)

    for (const result of results) {
        const status = result.success ? '✅' : '❌'
        const duration = (result.durationMs / 1000).toFixed(1)

        parts.push(`### ${status} Task ${result.task.id}: ${result.task.title} (${duration}s)`)

        if (result.success) {
            // Include a trimmed version of the output (max ~500 chars per task for the summary)
            const summary = result.output.length > 500
                ? result.output.slice(0, 500) + '\n... (output truncado)'
                : result.output
            parts.push(summary)
        } else {
            parts.push(`**Erro:** ${result.error || 'Unknown error'}`)
        }
        parts.push('')
    }

    return parts.join('\n')
}
