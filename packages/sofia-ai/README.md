# sofia-ai SDK

SDK JavaScript/TypeScript oficial para integrar a API REST do [Sofia AI](https://sofiaia.roilabs.com.br) em qualquer aplicação.

## Instalacao

```bash
npm install sofia-ai
# ou
yarn add sofia-ai
# ou
pnpm add sofia-ai
```

## Quickstart

```typescript
import { SofiaClient } from 'sofia-ai';

const client = new SofiaClient({
  apiKey: 'sk_live_sua_chave_aqui',
  // baseUrl: 'https://sofiaia.roilabs.com.br' // opcional
});
```

## Chat com Agente

```typescript
const { reply, conversationId } = await client.chat(
  'agent-id-aqui',
  'Olá! Quero saber mais sobre os planos.'
);

console.log(reply); // Resposta do agente

// Continuar a conversa
const followUp = await client.chat(
  'agent-id-aqui',
  'Qual é o preço do plano Pro?',
  { conversationId }
);
```

## Executar Orquestracao

```typescript
// Execucao assincrona — retorna imediatamente
const { executionId } = await client.execute(
  'orchestration-id-aqui',
  'Crie um relatório de vendas de fevereiro 2026',
  { variables: { mes: 'fevereiro', ano: '2026' } }
);

// Consultar status manualmente
const execution = await client.getExecution(executionId);
console.log(execution.status); // 'pending' | 'running' | 'completed' | 'failed'
```

## Executar e Aguardar Resultado

```typescript
// Atalho: executa e aguarda automaticamente via polling
const result = await client.executeAndWait(
  'orchestration-id-aqui',
  'Analise os dados de vendas',
  {
    intervalMs: 3000,  // checar a cada 3 segundos (padrão)
    timeoutMs: 300000, // timeout de 5 minutos (padrão)
  }
);

console.log(result.output); // Saída final da orquestração
console.log(result.tokensUsed); // Tokens consumidos
console.log(result.durationMs); // Tempo de execução em ms
```

## Listar Recursos

```typescript
// Listar agentes
const agents = await client.listAgents();

// Listar orquestracoes
const orchestrations = await client.listOrchestrations();
```

## Tratamento de Erros

```typescript
try {
  const result = await client.executeAndWait('orch-id', 'input');
} catch (error) {
  if (error.message.includes('401')) {
    console.error('API key inválida');
  } else if (error.message.includes('timeout')) {
    console.error('Execução demorou mais de 5 minutos');
  } else {
    console.error('Erro:', error.message);
  }
}
```

## Referencia da API

| Metodo | Descricao |
|--------|-----------|
| `client.listAgents()` | Lista todos os agentes ativos |
| `client.listOrchestrations()` | Lista todas as orquestracoes ativas |
| `client.chat(agentId, message, opts?)` | Envia mensagem para um agente |
| `client.execute(orchId, input, opts?)` | Inicia execucao assincrona |
| `client.getExecution(id)` | Consulta status de uma execucao |
| `client.waitForExecution(id, interval?, timeout?)` | Aguarda conclusao com polling |
| `client.executeAndWait(orchId, input, opts?)` | Executa e aguarda resultado |

## Autenticacao

Gere sua API key em [sofiaia.roilabs.com.br/dashboard/api-keys](https://sofiaia.roilabs.com.br/dashboard/api-keys).

## Licenca

MIT — ROI Labs 2026
