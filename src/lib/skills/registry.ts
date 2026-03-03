export interface BuiltinSkill {
  name: string
  description: string
  type: 'tool' | 'prompt'
  category: string
  toolDefinition?: object
  toolCode?: string
  promptBlock?: string
}

export const BUILTIN_SKILLS: BuiltinSkill[] = [
  {
    name: 'Busca na Web',
    description: 'Busca informações atualizadas na web via DuckDuckGo',
    type: 'tool',
    category: 'research',
    toolDefinition: {
      name: 'web_search',
      description: 'Busca informações na web. Use quando precisar de dados atuais ou informações externas.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Termo de busca' },
        },
        required: ['query'],
      },
    },
    toolCode: `
async function main(input) {
  const query = encodeURIComponent(input.query);
  const url = \`https://api.duckduckgo.com/?q=\${query}&format=json&no_html=1&skip_disambig=1\`;
  // Sandbox blocks fetch, return mock for now
  return { query: input.query, note: 'Web search tool registered. Execute via server-side fetch.' };
}
return main(input);
    `.trim(),
  },
  {
    name: 'Requisição HTTP',
    description: 'Faz chamadas HTTP para APIs externas',
    type: 'tool',
    category: 'integration',
    toolDefinition: {
      name: 'http_request',
      description: 'Faz uma requisição HTTP para uma URL externa.',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'URL da requisição' },
          method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'DELETE'], description: 'Método HTTP' },
          body: { type: 'string', description: 'Body JSON (opcional)' },
        },
        required: ['url', 'method'],
      },
    },
    toolCode: `
function main(input) {
  return {
    url: input.url,
    method: input.method,
    note: 'HTTP request tool registered. Execute via server-side fetch in production.',
  };
}
return main(input);
    `.trim(),
  },
  {
    name: 'Executar Código',
    description: 'Executa um snippet JavaScript em sandbox seguro',
    type: 'tool',
    category: 'development',
    toolDefinition: {
      name: 'run_code',
      description: 'Executa código JavaScript em sandbox. Use para cálculos, transformações de dados ou lógica customizada.',
      parameters: {
        type: 'object',
        properties: {
          code: { type: 'string', description: 'Código JavaScript a executar. Use return para retornar um valor.' },
          input: { type: 'object', description: 'Dados de entrada disponíveis como variável "input"' },
        },
        required: ['code'],
      },
    },
    toolCode: `
function main(input) {
  try {
    const fn = new Function('input', input.code);
    const result = fn(input.input || {});
    return { success: true, result };
  } catch (e) {
    return { success: false, error: e.message };
  }
}
return main(input);
    `.trim(),
  },
  {
    name: 'Especialista em Threads',
    description: 'Injeta expertise completa sobre o algoritmo e estratégia do Threads (Meta)',
    type: 'prompt',
    category: 'social-media',
    promptBlock: `## Expertise: Algoritmo e Estratégia do Threads (Meta)

Você tem conhecimento profundo sobre o Threads. Aplique sempre:

**Sinais de ranking (do mais ao menos pesado):** DM shares > Replies em cadeia > Watch time > Visitas ao perfil > Reposts > Curtidas

**Formato ideal de post:**
- Gancho forte na primeira linha (para o scroll)
- Máximo 500 caracteres
- Tom autêntico, não corporativo
- Apenas 1 topic tag
- Sem CTAs explícitas ("curta", "compartilhe")
- Terminar com pergunta ou opinião que gera reply

**O que evitar:** engagement bait, conteúdo repetitivo, muitas hashtags, posts puramente promocionais

**Benchmark saudável:** taxa de engajamento 4–5%`,
  },
  {
    name: 'Expert em Vendas',
    description: 'Técnicas de vendas consultivas, SPIN Selling e gestão de objeções',
    type: 'prompt',
    category: 'sales',
    promptBlock: `## Expertise: Vendas Consultivas

Você aplica metodologias de vendas de alto desempenho:

**SPIN Selling:** Faça perguntas de Situação, Problema, Implicação e Necessidade antes de apresentar a solução.

**Gestão de objeções:** Acolha a objeção, valide a preocupação, reframe com benefício, confirme resolução.

**Princípios:** Ouça mais do que fala. Identifique a dor real antes de qualquer proposta. Use prova social e casos de uso concretos. Crie urgência genuína, nunca artificial.

**Tom:** Consultivo, empático, direto. Nunca pressione. Seja um parceiro, não um vendedor.`,
  },
  {
    name: 'Analista de Dados',
    description: 'Análise de métricas, padrões e geração de insights acionáveis',
    type: 'prompt',
    category: 'analytics',
    promptBlock: `## Expertise: Análise de Dados e Métricas

Você analisa dados com rigor e clareza:

**Metodologia:** Observe os dados brutos → identifique padrões → formule hipóteses → valide com evidências → gere recomendações acionáveis.

**Output sempre inclui:** (1) O que os dados mostram, (2) Por que isso provavelmente acontece, (3) O que fazer a respeito.

**Cuidados:** Diferencie correlação de causalidade. Sinalize quando o volume de dados for insuficiente. Não invente insights — se os dados não dizem, diga que não dizem.

**Tom:** Objetivo, preciso, sem jargões desnecessários. Use tabelas e listas quando facilitar a leitura.`,
  },
  {
    name: 'Redator Digital',
    description: 'Escrita persuasiva para web, redes sociais e email marketing',
    type: 'prompt',
    category: 'content',
    promptBlock: `## Expertise: Redação Digital

Você escreve conteúdo que engaja, converte e retém atenção:

**Estrutura:** Use o framework AIDA (Atenção → Interesse → Desejo → Ação) ou PAS (Problema → Agitação → Solução) conforme o objetivo.

**Boas práticas:** Frases curtas. Parágrafos de 2–3 linhas. Voz ativa. Palavras concretas, não abstratas. Sempre um único CTA claro.

**Para redes sociais:** Gancho na primeira linha. Valor imediato. Sem firulas. Autenticidade acima de perfeição.

**Para email:** Assunto com curiosidade ou benefício claro. Primeiro parágrafo deve capturar em 5 segundos. PS ao final (segundo elemento mais lido).

**Tom:** Adapte ao público e contexto. Prefira linguagem acessível sem ser simplória.`,
  },
]
