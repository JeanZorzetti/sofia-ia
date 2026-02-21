Como implementar Agentes de IA e Orquestrações num projeto Next.js
Stack usada: Next.js 15+, Prisma, PostgreSQL, Groq SDK

1. Banco de dados — Schema Prisma
São 4 tabelas essenciais:


// prisma/schema.prisma

model Agent {
  id           String   @id @default(uuid()) @db.Uuid
  name         String   @db.VarChar(255)
  description  String?  @db.Text
  systemPrompt String   @map("system_prompt") @db.Text
  model        String   @default("llama-3.3-70b-versatile") @db.VarChar(100)
  temperature  Float    @default(0.7)
  status       String   @default("active") @db.VarChar(20)
  createdBy    String   @map("created_by") @db.Uuid
  config       Json     @default("{}")
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  @@map("agents")
}

model AgentOrchestration {
  id          String   @id @default(uuid()) @db.Uuid
  name        String   @db.VarChar(255)
  description String?  @db.Text
  agents      Json     @default("[]")   // array de { agentId, role, prompt? }
  strategy    String   @default("sequential") // sequential | parallel | consensus
  status      String   @default("active")
  createdBy   String   @map("created_by") @db.Uuid
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  executions OrchestrationExecution[]

  @@map("agent_orchestrations")
}

model OrchestrationExecution {
  id              String    @id @default(uuid()) @db.Uuid
  orchestrationId String    @map("orchestration_id") @db.Uuid
  status          String    @default("pending") // pending | running | completed | failed
  currentAgentId  String?   @map("current_agent_id")
  agentResults    Json      @default("[]") @map("agent_results")
  input           Json      @default("{}")
  output          Json?
  error           String?   @db.Text
  durationMs      Int?      @map("duration_ms")
  tokensUsed      Int?      @map("tokens_used")
  startedAt       DateTime  @default(now()) @map("started_at")
  completedAt     DateTime? @map("completed_at")
  createdAt       DateTime  @default(now()) @map("created_at")

  orchestration AgentOrchestration @relation(fields: [orchestrationId], references: [id], onDelete: Cascade)

  @@map("orchestration_executions")
}

npx prisma db push
2. A lib principal — chatWithAgent
Essa função é o coração: recebe um agentId, busca as configs do banco e faz a chamada à IA.


// src/lib/groq.ts
import Groq from 'groq-sdk'

let _groq: Groq | null = null

// Lazy init — evita erro de env var em build time
function getGroqClient() {
  if (!_groq) _groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
  return _groq
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export async function chatWithAgent(agentId: string, messages: ChatMessage[]) {
  const { prisma } = await import('@/lib/prisma')

  // 1. Busca configurações do agente no banco
  const agent = await prisma.agent.findUnique({ where: { id: agentId } })
  if (!agent) throw new Error('Agent not found')

  // 2. Usa o systemPrompt do agente como instrução base
  const systemPrompt = agent.systemPrompt

  // 3. Chama a IA com o modelo e temperature configurados por agente
  const completion = await getGroqClient().chat.completions.create({
    model: agent.model,
    messages: [{ role: 'system', content: systemPrompt }, ...messages],
    temperature: agent.temperature,
    max_tokens: 1024,
  })

  return {
    message: completion.choices[0]?.message?.content || '',
    model: completion.model,
    usage: completion.usage,
  }
}
3. API de Agentes — CRUD

// src/app/api/agents/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/agents — lista todos
export async function GET() {
  const agents = await prisma.agent.findMany({
    orderBy: { createdAt: 'desc' }
  })
  return NextResponse.json({ success: true, data: agents })
}

// POST /api/agents — cria novo agente
export async function POST(request: NextRequest) {
  const { name, description, systemPrompt, model, temperature } = await request.json()

  if (!name || !systemPrompt) {
    return NextResponse.json({ error: 'name e systemPrompt são obrigatórios' }, { status: 400 })
  }

  const agent = await prisma.agent.create({
    data: {
      name,
      description,
      systemPrompt,
      model: model || 'llama-3.3-70b-versatile',
      temperature: temperature ?? 0.7,
      createdBy: 'USER_ID_AQUI', // vem do auth
    }
  })

  return NextResponse.json({ success: true, data: agent }, { status: 201 })
}
4. API de Orquestrações — CRUD

// src/app/api/orchestrations/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/orchestrations
export async function GET() {
  const orchestrations = await prisma.agentOrchestration.findMany({
    include: { executions: { take: 1, orderBy: { createdAt: 'desc' } } }
  })
  return NextResponse.json({ success: true, data: orchestrations })
}

// POST /api/orchestrations
// body: { name, description, strategy, agents: [{ agentId, role, prompt? }] }
export async function POST(request: NextRequest) {
  const { name, description, agents, strategy } = await request.json()

  if (!name || !agents?.length) {
    return NextResponse.json({ error: 'name e agents são obrigatórios' }, { status: 400 })
  }

  const orchestration = await prisma.agentOrchestration.create({
    data: {
      name,
      description,
      agents,       // salva o array de steps como JSON
      strategy: strategy || 'sequential',
      createdBy: 'USER_ID_AQUI',
    }
  })

  return NextResponse.json({ success: true, data: orchestration })
}
5. A execução — o núcleo do sistema multi-agentes
Essa é a parte mais importante. Existem 3 estratégias:


// src/app/api/orchestrations/[id]/execute/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { chatWithAgent } from '@/lib/groq'

export const maxDuration = 300 // 5 min para execuções longas

interface AgentStep {
  agentId: string
  role: string
  prompt?: string // instrução extra opcional para esse step
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { input } = await request.json()

  const orchestration = await prisma.agentOrchestration.findUnique({ where: { id } })
  if (!orchestration) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Cria o registro de execução
  const execution = await prisma.orchestrationExecution.create({
    data: { orchestrationId: id, input, status: 'running' }
  })

  const agents = orchestration.agents as unknown as AgentStep[]
  const agentResults: any[] = []

  try {
    let finalOutput: any = null

    // ─── ESTRATÉGIA 1: SEQUENTIAL ──────────────────────────────────────────────
    // Cada agente recebe a saída do agente anterior
    if (orchestration.strategy === 'sequential') {
      let currentInput = input

      for (const agentStep of agents) {
        // Marca qual agente está processando agora (para o frontend acompanhar)
        await prisma.orchestrationExecution.update({
          where: { id: execution.id },
          data: { currentAgentId: agentStep.agentId }
        })

        const messages = [{
          role: 'user' as const,
          // Se o step tem um prompt específico, inclui como instrução extra
          content: agentStep.prompt
            ? `INSTRUÇÃO: ${agentStep.prompt}\n\nDADOS:\n${JSON.stringify(currentInput)}`
            : typeof currentInput === 'string' ? currentInput : JSON.stringify(currentInput)
        }]

        const startTime = Date.now()
        const response = await chatWithAgent(agentStep.agentId, messages)
        const durationMs = Date.now() - startTime

        const stepResult = {
          agentId: agentStep.agentId,
          role: agentStep.role,
          input: currentInput,
          output: response.message,
          durationMs,
          tokensUsed: response.usage?.total_tokens || 0,
          timestamp: new Date().toISOString(),
        }

        agentResults.push(stepResult)

        // Salva resultados parciais no banco — permite polling no frontend
        await prisma.orchestrationExecution.update({
          where: { id: execution.id },
          data: { agentResults }
        })

        // A saída desse agente vira a entrada do próximo
        currentInput = response.message
      }

      finalOutput = agentResults[agentResults.length - 1]?.output

    // ─── ESTRATÉGIA 2: PARALLEL ────────────────────────────────────────────────
    // Todos os agentes processam o mesmo input ao mesmo tempo
    } else if (orchestration.strategy === 'parallel') {
      const promises = agents.map(async (agentStep) => {
        const messages = [{
          role: 'user' as const,
          content: typeof input === 'string' ? input : JSON.stringify(input)
        }]
        const response = await chatWithAgent(agentStep.agentId, messages)
        return { agentId: agentStep.agentId, role: agentStep.role, output: response.message }
      })

      const results = await Promise.all(promises)
      agentResults.push(...results)
      finalOutput = results.map(r => `${r.role}: ${r.output}`).join('\n\n')

    // ─── ESTRATÉGIA 3: CONSENSUS ───────────────────────────────────────────────
    // Todos processam em paralelo e a resposta mais comum vence
    } else if (orchestration.strategy === 'consensus') {
      const promises = agents.map(async (agentStep) => {
        const messages = [{ role: 'user' as const, content: JSON.stringify(input) }]
        const response = await chatWithAgent(agentStep.agentId, messages)
        return { agentId: agentStep.agentId, role: agentStep.role, output: response.message }
      })

      const results = await Promise.all(promises)
      agentResults.push(...results)

      // Conta frequência de cada resposta e escolhe a mais comum
      const freq: Record<string, number> = {}
      results.forEach(r => { freq[r.output] = (freq[r.output] || 0) + 1 })
      const consensus = Object.keys(freq).reduce((a, b) => freq[a] > freq[b] ? a : b)
      finalOutput = { consensus, votes: freq, all: results }
    }

    // Calcula métricas agregadas
    const completedAt = new Date()
    const durationMs = completedAt.getTime() - execution.startedAt.getTime()
    const tokensUsed = agentResults.reduce((sum, r) => sum + (r.tokensUsed || 0), 0)

    await prisma.orchestrationExecution.update({
      where: { id: execution.id },
      data: { status: 'completed', output: finalOutput, agentResults, completedAt, durationMs, tokensUsed }
    })

    return NextResponse.json({ success: true, data: { executionId: execution.id, output: finalOutput } })

  } catch (error: any) {
    await prisma.orchestrationExecution.update({
      where: { id: execution.id },
      data: { status: 'failed', error: error.message, completedAt: new Date() }
    })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
6. Acompanhamento em tempo real — SSE
Para o frontend ver cada agente processando sem precisar ficar fazendo polling:


// src/app/api/orchestrations/[id]/stream/route.ts
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const encoder = new TextEncoder()
  let isClosed = false

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (event: string, data: any) => {
        if (isClosed) return
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
        } catch {
          isClosed = true
        }
      }

      sendEvent('connected', { orchestrationId: id })

      // Polling no banco a cada 1s — envia atualizações para o cliente
      const interval = setInterval(async () => {
        if (isClosed) { clearInterval(interval); return }

        const execution = await prisma.orchestrationExecution.findFirst({
          where: { orchestrationId: id },
          orderBy: { createdAt: 'desc' }
        })

        if (execution) {
          sendEvent('execution-update', execution)
          if (['completed', 'failed'].includes(execution.status)) {
            clearInterval(interval)
          }
        }
      }, 1000)

      request.signal.addEventListener('abort', () => {
        isClosed = true
        clearInterval(interval)
      })
    },

    cancel() { isClosed = true }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    }
  })
}
No frontend, consome com:


// IMPORTANTE: callbacks devem ser gerenciadas via ref para
// não causar reconexões a cada render
const onUpdateRef = useRef(onUpdate)
useEffect(() => { onUpdateRef.current = onUpdate }, [onUpdate])

useEffect(() => {
  const eventSource = new EventSource(`/api/orchestrations/${id}/stream`)

  eventSource.addEventListener('execution-update', (e) => {
    const data = JSON.parse(e.data)
    onUpdateRef.current?.(data)
  })

  eventSource.onerror = () => {
    // Só reconecta se a conexão realmente fechou (readyState === 2)
    if (eventSource.readyState === 2) {
      setTimeout(() => { /* reconecta */ }, 2000)
    }
  }

  return () => eventSource.close()
}, [id]) // ← só id como dependência, nunca callbacks
Fluxo completo resumido

POST /api/agents           → cria agente com systemPrompt + model + temperature
POST /api/orchestrations   → cria orquestração com lista de agentIds + strategy
POST /api/orchestrations/:id/execute  → dispara execução
GET  /api/orchestrations/:id/stream   → SSE para acompanhar em tempo real
O que acontece por dentro da execução sequential:

input do usuário
     │
     ▼
 [Agente 1]  ← usa seu systemPrompt + input
     │ output vira input do próximo
     ▼
 [Agente 2]  ← usa seu systemPrompt + output do Agente 1
     │
     ▼
 [Agente 3]  ← resultado final
     │
     ▼
 salva em OrchestrationExecution.output
Variáveis de ambiente necessárias

GROQ_API_KEY=gsk_...
DATABASE_URL=postgresql://user:pass@host:5432/db
