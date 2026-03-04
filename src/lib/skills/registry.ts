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

  // ─────────────────────────────────────────────────────────────────────────
  // TOOLS — tipo "tool": código JS executado em sandbox seguro
  // ─────────────────────────────────────────────────────────────────────────

  // ── Busca & Integração ────────────────────────────────────────────────────
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

  // ── Texto & Conteúdo ──────────────────────────────────────────────────────
  {
    name: 'Contador de Palavras',
    description: 'Conta palavras, caracteres, frases e estima tempo de leitura',
    type: 'tool',
    category: 'content',
    toolDefinition: {
      name: 'count_words',
      description: 'Analisa um texto e retorna contagem de palavras, caracteres, frases e tempo estimado de leitura.',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Texto a analisar' },
        },
        required: ['text'],
      },
    },
    toolCode: `
function main(input) {
  const text = String(input.text || '');
  const words = text.trim() === '' ? 0 : text.trim().split(/\\s+/).length;
  const chars = text.length;
  const charsNoSpaces = text.replace(/\\s/g, '').length;
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
  const paragraphs = text.split(/\\n\\n+/).filter(p => p.trim().length > 0).length;
  const readingTimeMin = Math.ceil(words / 200);
  return { words, chars, charsNoSpaces, sentences, paragraphs, readingTimeMin };
}
return main(input);
    `.trim(),
  },

  {
    name: 'Extrator de Emails',
    description: 'Extrai todos os endereços de email de um texto',
    type: 'tool',
    category: 'content',
    toolDefinition: {
      name: 'extract_emails',
      description: 'Extrai todos os endereços de email encontrados em um texto.',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Texto a analisar' },
        },
        required: ['text'],
      },
    },
    toolCode: `
function main(input) {
  const text = String(input.text || '');
  const emailRegex = /[a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,}/g;
  const emails = [...new Set(text.match(emailRegex) || [])];
  return { emails, count: emails.length };
}
return main(input);
    `.trim(),
  },

  {
    name: 'Extrator de URLs',
    description: 'Extrai todos os links/URLs de um texto',
    type: 'tool',
    category: 'content',
    toolDefinition: {
      name: 'extract_urls',
      description: 'Extrai todos os URLs encontrados em um texto.',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Texto a analisar' },
        },
        required: ['text'],
      },
    },
    toolCode: `
function main(input) {
  const text = String(input.text || '');
  const urlRegex = /https?:\\/\\/[^\\s<>"{}|\\\\^\\[\\]\`]+/g;
  const urls = [...new Set(text.match(urlRegex) || [])];
  return { urls, count: urls.length };
}
return main(input);
    `.trim(),
  },

  {
    name: 'Gerador de Slug',
    description: 'Converte texto em slug URL-friendly (ex: "Olá Mundo!" → "ola-mundo")',
    type: 'tool',
    category: 'development',
    toolDefinition: {
      name: 'generate_slug',
      description: 'Converte um texto em slug para uso em URLs. Remove acentos, caracteres especiais e espaços.',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Texto a converter' },
        },
        required: ['text'],
      },
    },
    toolCode: `
function main(input) {
  const text = String(input.text || '');
  const slug = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\\u0300-\\u036f]/g, '')
    .replace(/[^a-z0-9\\s-]/g, '')
    .replace(/\\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return { slug, original: text };
}
return main(input);
    `.trim(),
  },

  {
    name: 'Truncar Texto',
    description: 'Trunca um texto em N palavras ou caracteres com reticências',
    type: 'tool',
    category: 'content',
    toolDefinition: {
      name: 'truncate_text',
      description: 'Trunca texto em um limite de palavras ou caracteres, adicionando "..." ao final.',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Texto a truncar' },
          limit: { type: 'number', description: 'Limite de caracteres (padrão: 280)' },
          mode: { type: 'string', enum: ['chars', 'words'], description: 'Modo: chars ou words (padrão: chars)' },
        },
        required: ['text'],
      },
    },
    toolCode: `
function main(input) {
  const text = String(input.text || '');
  const limit = input.limit || 280;
  const mode = input.mode || 'chars';
  if (mode === 'words') {
    const words = text.split(/\\s+/);
    if (words.length <= limit) return { result: text, truncated: false };
    return { result: words.slice(0, limit).join(' ') + '...', truncated: true, originalWords: words.length };
  }
  if (text.length <= limit) return { result: text, truncated: false };
  return { result: text.slice(0, limit).trimEnd() + '...', truncated: true, originalChars: text.length };
}
return main(input);
    `.trim(),
  },

  {
    name: 'Validador de Formato Threads',
    description: 'Valida posts para o Threads: limite de caracteres, estrutura e boas práticas',
    type: 'tool',
    category: 'social-media',
    toolDefinition: {
      name: 'validate_threads_post',
      description: 'Valida um post (ou array de posts) para publicação no Threads. Verifica limite de caracteres (500 chars por post), ausência de links no texto principal e outras regras da plataforma.',
      parameters: {
        type: 'object',
        properties: {
          posts: {
            type: 'array',
            items: { type: 'string' },
            description: 'Array com o texto de cada post. Para post único, envie array com 1 elemento.',
          },
        },
        required: ['posts'],
      },
    },
    toolCode: `
function main(input) {
  const posts = Array.isArray(input.posts) ? input.posts : [String(input.posts)];
  const MAX_CHARS = 500;
  const results = posts.map((post, i) => {
    const chars = post.length;
    const hasLink = /https?:\\/\\//i.test(post);
    const hasHashtags = (post.match(/#\\w+/g) || []).length;
    const hasExplicitCTA = /\\b(curta|compartilhe|siga|clique|link na bio)\\b/i.test(post);
    const issues = [];
    if (chars > MAX_CHARS) issues.push(\`Excede \${MAX_CHARS} chars (\${chars}/\${MAX_CHARS})\`);
    if (hasHashtags > 1) issues.push(\`Muitas hashtags (\${hasHashtags}) — use no máximo 1\`);
    if (hasExplicitCTA) issues.push('CTA explícita detectada — evite pedir curtidas/compartilhamentos');
    return {
      post: i + 1,
      chars,
      limit: MAX_CHARS,
      valid: issues.length === 0,
      issues,
      hasLink,
      hasHashtags,
    };
  });
  const allValid = results.every(r => r.valid);
  return { valid: allValid, posts: results, totalPosts: posts.length };
}
return main(input);
    `.trim(),
  },

  // ── Data & Analytics (pure JS) ────────────────────────────────────────────
  {
    name: 'Estatísticas de Array',
    description: 'Calcula média, mediana, moda, mín, máx e desvio padrão de um array numérico',
    type: 'tool',
    category: 'analytics',
    toolDefinition: {
      name: 'calculate_stats',
      description: 'Calcula estatísticas descritivas de um array de números: média, mediana, moda, mínimo, máximo, desvio padrão e soma.',
      parameters: {
        type: 'object',
        properties: {
          numbers: {
            type: 'array',
            items: { type: 'number' },
            description: 'Array de números a analisar',
          },
        },
        required: ['numbers'],
      },
    },
    toolCode: `
function main(input) {
  const nums = (input.numbers || []).map(Number).filter(n => !isNaN(n));
  if (nums.length === 0) return { error: 'Array vazio ou sem números válidos' };
  const sorted = [...nums].sort((a, b) => a - b);
  const sum = nums.reduce((a, b) => a + b, 0);
  const mean = sum / nums.length;
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  const freq = {};
  nums.forEach(n => { freq[n] = (freq[n] || 0) + 1; });
  const maxFreq = Math.max(...Object.values(freq));
  const mode = Object.keys(freq).filter(k => freq[k] === maxFreq).map(Number);
  const variance = nums.reduce((acc, n) => acc + Math.pow(n - mean, 2), 0) / nums.length;
  const stdDev = Math.sqrt(variance);
  return {
    count: nums.length, sum: Math.round(sum * 1000) / 1000,
    mean: Math.round(mean * 1000) / 1000,
    median, mode: mode.length === nums.length ? null : mode,
    min: sorted[0], max: sorted[sorted.length - 1],
    stdDev: Math.round(stdDev * 1000) / 1000,
    range: sorted[sorted.length - 1] - sorted[0],
  };
}
return main(input);
    `.trim(),
  },

  {
    name: 'Formatador de Número',
    description: 'Formata números como moeda (BRL/USD), percentual ou decimal com separadores',
    type: 'tool',
    category: 'analytics',
    toolDefinition: {
      name: 'format_number',
      description: 'Formata um número em diferentes formatos: moeda BRL, USD, percentual ou decimal.',
      parameters: {
        type: 'object',
        properties: {
          number: { type: 'number', description: 'Número a formatar' },
          format: {
            type: 'string',
            enum: ['brl', 'usd', 'percent', 'decimal', 'compact'],
            description: 'Formato: brl (R$), usd ($), percent (%), decimal, compact (1K, 1M)',
          },
          decimals: { type: 'number', description: 'Casas decimais (padrão: 2)' },
        },
        required: ['number', 'format'],
      },
    },
    toolCode: `
function main(input) {
  const n = Number(input.number);
  const decimals = input.decimals !== undefined ? input.decimals : 2;
  if (isNaN(n)) return { error: 'Número inválido' };
  let result;
  switch (input.format) {
    case 'brl':
      result = 'R$ ' + n.toFixed(decimals).replace('.', ',').replace(/\\B(?=(\\d{3})+(?!\\d))/g, '.');
      break;
    case 'usd':
      result = '$ ' + n.toFixed(decimals).replace(/\\B(?=(\\d{3})+(?!\\d))/g, ',');
      break;
    case 'percent':
      result = n.toFixed(decimals) + '%';
      break;
    case 'compact':
      if (Math.abs(n) >= 1e9) result = (n / 1e9).toFixed(1) + 'B';
      else if (Math.abs(n) >= 1e6) result = (n / 1e6).toFixed(1) + 'M';
      else if (Math.abs(n) >= 1e3) result = (n / 1e3).toFixed(1) + 'K';
      else result = n.toFixed(decimals);
      break;
    default:
      result = n.toFixed(decimals).replace(/\\B(?=(\\d{3})+(?!\\d))/g, ',');
  }
  return { formatted: result, original: n, format: input.format };
}
return main(input);
    `.trim(),
  },

  {
    name: 'Variação Percentual',
    description: 'Calcula variação percentual entre dois valores (crescimento, queda, ROI)',
    type: 'tool',
    category: 'analytics',
    toolDefinition: {
      name: 'percentage_change',
      description: 'Calcula a variação percentual entre valor anterior e atual. Útil para métricas de crescimento, queda e ROI.',
      parameters: {
        type: 'object',
        properties: {
          previous: { type: 'number', description: 'Valor anterior (base)' },
          current: { type: 'number', description: 'Valor atual' },
        },
        required: ['previous', 'current'],
      },
    },
    toolCode: `
function main(input) {
  const prev = Number(input.previous);
  const curr = Number(input.current);
  if (isNaN(prev) || isNaN(curr)) return { error: 'Valores inválidos' };
  if (prev === 0) return { error: 'Valor anterior não pode ser zero', absolute: curr - prev };
  const change = ((curr - prev) / Math.abs(prev)) * 100;
  const direction = change > 0 ? 'aumento' : change < 0 ? 'queda' : 'sem alteração';
  return {
    previous: prev, current: curr,
    change: Math.round(change * 100) / 100,
    direction,
    absolute: Math.round((curr - prev) * 100) / 100,
    formatted: (change >= 0 ? '+' : '') + Math.round(change * 100) / 100 + '%',
  };
}
return main(input);
    `.trim(),
  },

  {
    name: 'Calculadora de ROI',
    description: 'Calcula ROI, payback e métricas de retorno de investimento',
    type: 'tool',
    category: 'analytics',
    toolDefinition: {
      name: 'calculate_roi',
      description: 'Calcula Return on Investment (ROI), payback e lucro líquido de um investimento.',
      parameters: {
        type: 'object',
        properties: {
          investment: { type: 'number', description: 'Valor investido' },
          revenue: { type: 'number', description: 'Receita gerada' },
          monthlyRevenue: { type: 'number', description: 'Receita mensal (para cálculo de payback)' },
        },
        required: ['investment', 'revenue'],
      },
    },
    toolCode: `
function main(input) {
  const inv = Number(input.investment);
  const rev = Number(input.revenue);
  if (inv <= 0) return { error: 'Investimento deve ser maior que zero' };
  const profit = rev - inv;
  const roi = ((rev - inv) / inv) * 100;
  const monthly = input.monthlyRevenue ? Number(input.monthlyRevenue) : null;
  const paybackMonths = monthly && monthly > 0 ? Math.ceil(inv / monthly) : null;
  return {
    investment: inv, revenue: rev, profit: Math.round(profit * 100) / 100,
    roi: Math.round(roi * 100) / 100,
    roiFormatted: (roi >= 0 ? '+' : '') + Math.round(roi * 100) / 100 + '%',
    paybackMonths,
    paybackFormatted: paybackMonths ? paybackMonths + ' meses' : null,
  };
}
return main(input);
    `.trim(),
  },

  // ── Data & Hora ───────────────────────────────────────────────────────────
  {
    name: 'Diferença Entre Datas',
    description: 'Calcula a diferença entre duas datas em dias, semanas, meses e anos',
    type: 'tool',
    category: 'productivity',
    toolDefinition: {
      name: 'date_diff',
      description: 'Calcula a diferença entre duas datas em múltiplas unidades.',
      parameters: {
        type: 'object',
        properties: {
          start: { type: 'string', description: 'Data inicial (ISO 8601 ou YYYY-MM-DD)' },
          end: { type: 'string', description: 'Data final (ISO 8601 ou YYYY-MM-DD). Deixe vazio para usar hoje.' },
        },
        required: ['start'],
      },
    },
    toolCode: `
function main(input) {
  const start = new Date(input.start);
  const end = input.end ? new Date(input.end) : new Date();
  if (isNaN(start.getTime())) return { error: 'Data inicial inválida' };
  const diffMs = end.getTime() - start.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  const diffWeeks = Math.floor(Math.abs(diffDays) / 7);
  const diffMonths = Math.round(Math.abs(diffDays) / 30.44);
  const diffYears = Math.round(Math.abs(diffDays) / 365.25);
  const past = diffMs < 0;
  return {
    days: diffDays, weeks: past ? -diffWeeks : diffWeeks,
    months: past ? -diffMonths : diffMonths,
    years: past ? -diffYears : diffYears,
    direction: past ? 'passado' : 'futuro',
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
}
return main(input);
    `.trim(),
  },

  {
    name: 'Formatar Data (PT-BR)',
    description: 'Formata datas em diversos formatos: DD/MM/AAAA, extenso, relativo (ex: "há 3 dias")',
    type: 'tool',
    category: 'productivity',
    toolDefinition: {
      name: 'format_date',
      description: 'Formata uma data em diferentes formatos, incluindo formato brasileiro e descrição relativa.',
      parameters: {
        type: 'object',
        properties: {
          date: { type: 'string', description: 'Data a formatar (ISO 8601 ou YYYY-MM-DD)' },
          format: {
            type: 'string',
            enum: ['short', 'long', 'relative', 'iso', 'br'],
            description: 'short: DD/MM/AA | long: 5 de março de 2026 | relative: há 3 dias | iso: YYYY-MM-DD | br: DD/MM/AAAA',
          },
        },
        required: ['date', 'format'],
      },
    },
    toolCode: `
function main(input) {
  const d = new Date(input.date);
  if (isNaN(d.getTime())) return { error: 'Data inválida' };
  const months = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
  const days = ['domingo','segunda-feira','terça-feira','quarta-feira','quinta-feira','sexta-feira','sábado'];
  const pad = n => String(n).padStart(2, '0');
  let result;
  switch (input.format) {
    case 'short':
      result = \`\${pad(d.getDate())}/\${pad(d.getMonth()+1)}/\${String(d.getFullYear()).slice(2)}\`; break;
    case 'br':
      result = \`\${pad(d.getDate())}/\${pad(d.getMonth()+1)}/\${d.getFullYear()}\`; break;
    case 'long':
      result = \`\${days[d.getDay()]}, \${d.getDate()} de \${months[d.getMonth()]} de \${d.getFullYear()}\`; break;
    case 'iso':
      result = d.toISOString().split('T')[0]; break;
    case 'relative': {
      const diff = Math.round((new Date() - d) / 86400000);
      if (diff === 0) result = 'hoje';
      else if (diff === 1) result = 'ontem';
      else if (diff === -1) result = 'amanhã';
      else if (diff > 0) result = \`há \${diff} dias\`;
      else result = \`em \${Math.abs(diff)} dias\`;
      break;
    }
    default: result = d.toISOString();
  }
  return { formatted: result, original: input.date, timestamp: d.getTime() };
}
return main(input);
    `.trim(),
  },

  // ── Validação BR ─────────────────────────────────────────────────────────
  {
    name: 'Validador de CPF',
    description: 'Valida e formata CPF (incluindo dígitos verificadores)',
    type: 'tool',
    category: 'integration',
    toolDefinition: {
      name: 'validate_cpf',
      description: 'Valida se um CPF é válido (verificando os dígitos verificadores) e retorna o CPF formatado.',
      parameters: {
        type: 'object',
        properties: {
          cpf: { type: 'string', description: 'CPF com ou sem formatação' },
        },
        required: ['cpf'],
      },
    },
    toolCode: `
function main(input) {
  const cpf = String(input.cpf).replace(/\\D/g, '');
  if (cpf.length !== 11) return { valid: false, error: 'CPF deve ter 11 dígitos' };
  if (/^(\\d)\\1{10}$/.test(cpf)) return { valid: false, error: 'CPF com todos os dígitos iguais' };
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(cpf[i]) * (10 - i);
  let d1 = (sum * 10) % 11; if (d1 === 10 || d1 === 11) d1 = 0;
  if (d1 !== parseInt(cpf[9])) return { valid: false, error: 'CPF inválido' };
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(cpf[i]) * (11 - i);
  let d2 = (sum * 10) % 11; if (d2 === 10 || d2 === 11) d2 = 0;
  if (d2 !== parseInt(cpf[10])) return { valid: false, error: 'CPF inválido' };
  const formatted = \`\${cpf.slice(0,3)}.\${cpf.slice(3,6)}.\${cpf.slice(6,9)}-\${cpf.slice(9)}\`;
  return { valid: true, formatted, digits: cpf };
}
return main(input);
    `.trim(),
  },

  {
    name: 'Validador de CNPJ',
    description: 'Valida e formata CNPJ (incluindo dígitos verificadores)',
    type: 'tool',
    category: 'integration',
    toolDefinition: {
      name: 'validate_cnpj',
      description: 'Valida se um CNPJ é válido e retorna o CNPJ formatado.',
      parameters: {
        type: 'object',
        properties: {
          cnpj: { type: 'string', description: 'CNPJ com ou sem formatação' },
        },
        required: ['cnpj'],
      },
    },
    toolCode: `
function main(input) {
  const cnpj = String(input.cnpj).replace(/\\D/g, '');
  if (cnpj.length !== 14) return { valid: false, error: 'CNPJ deve ter 14 dígitos' };
  if (/^(\\d)\\1{13}$/.test(cnpj)) return { valid: false, error: 'CNPJ com todos os dígitos iguais' };
  const calc = (len) => {
    let sum = 0, pos = len - 7;
    for (let i = 0; i < len; i++) {
      sum += parseInt(cnpj[i]) * pos--;
      if (pos < 2) pos = 9;
    }
    const r = sum % 11;
    return r < 2 ? 0 : 11 - r;
  };
  if (calc(12) !== parseInt(cnpj[12])) return { valid: false, error: 'CNPJ inválido' };
  if (calc(13) !== parseInt(cnpj[13])) return { valid: false, error: 'CNPJ inválido' };
  const formatted = \`\${cnpj.slice(0,2)}.\${cnpj.slice(2,5)}.\${cnpj.slice(5,8)}/\${cnpj.slice(8,12)}-\${cnpj.slice(12)}\`;
  return { valid: true, formatted, digits: cnpj };
}
return main(input);
    `.trim(),
  },

  {
    name: 'Validador de Email',
    description: 'Valida formato de endereço de email e extrai domínio',
    type: 'tool',
    category: 'integration',
    toolDefinition: {
      name: 'validate_email',
      description: 'Valida se um endereço de email tem formato válido e extrai o domínio.',
      parameters: {
        type: 'object',
        properties: {
          email: { type: 'string', description: 'Endereço de email a validar' },
        },
        required: ['email'],
      },
    },
    toolCode: `
function main(input) {
  const email = String(input.email || '').trim().toLowerCase();
  const regex = /^[a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,}$/;
  const valid = regex.test(email);
  const parts = email.split('@');
  return {
    valid,
    email,
    local: valid ? parts[0] : null,
    domain: valid ? parts[1] : null,
    error: valid ? null : 'Formato de email inválido',
  };
}
return main(input);
    `.trim(),
  },

  {
    name: 'Verificador de Força de Senha',
    description: 'Avalia a força de uma senha e sugere melhorias',
    type: 'tool',
    category: 'development',
    toolDefinition: {
      name: 'check_password_strength',
      description: 'Verifica a força de uma senha com base em comprimento, complexidade e padrões comuns.',
      parameters: {
        type: 'object',
        properties: {
          password: { type: 'string', description: 'Senha a verificar' },
        },
        required: ['password'],
      },
    },
    toolCode: `
function main(input) {
  const p = String(input.password || '');
  const checks = {
    length: p.length >= 8,
    uppercase: /[A-Z]/.test(p),
    lowercase: /[a-z]/.test(p),
    numbers: /[0-9]/.test(p),
    symbols: /[^A-Za-z0-9]/.test(p),
    longEnough: p.length >= 12,
  };
  const score = Object.values(checks).filter(Boolean).length;
  const levels = ['Muito Fraca', 'Fraca', 'Razoável', 'Boa', 'Forte', 'Muito Forte'];
  const suggestions = [];
  if (!checks.length) suggestions.push('Use pelo menos 8 caracteres');
  if (!checks.uppercase) suggestions.push('Adicione letras maiúsculas');
  if (!checks.lowercase) suggestions.push('Adicione letras minúsculas');
  if (!checks.numbers) suggestions.push('Adicione números');
  if (!checks.symbols) suggestions.push('Adicione símbolos (!@#$...)');
  if (!checks.longEnough) suggestions.push('Use 12+ caracteres para maior segurança');
  return { score, level: levels[Math.min(score, 5)], checks, suggestions, length: p.length };
}
return main(input);
    `.trim(),
  },

  {
    name: 'Gerador de UUID',
    description: 'Gera UUIDs v4 únicos para uso como identificadores',
    type: 'tool',
    category: 'development',
    toolDefinition: {
      name: 'generate_uuid',
      description: 'Gera um ou mais UUIDs v4 únicos.',
      parameters: {
        type: 'object',
        properties: {
          count: { type: 'number', description: 'Quantidade de UUIDs a gerar (padrão: 1, máximo: 10)' },
        },
      },
    },
    toolCode: `
function main(input) {
  const count = Math.min(Math.max(parseInt(input.count) || 1, 1), 10);
  const generateUUID = () => {
    let d = Date.now();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = (d + Math.random() * 16) % 16 | 0;
      d = Math.floor(d / 16);
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  };
  const uuids = Array.from({ length: count }, generateUUID);
  return { uuids, count, first: uuids[0] };
}
return main(input);
    `.trim(),
  },

  // ── Marketing & Growth ────────────────────────────────────────────────────
  {
    name: 'Construtor de UTM',
    description: 'Gera URLs com parâmetros UTM para rastreamento de campanhas de marketing',
    type: 'tool',
    category: 'analytics',
    toolDefinition: {
      name: 'build_utm',
      description: 'Cria URLs com parâmetros UTM para rastrear origem, mídia, campanha e conteúdo de links de marketing.',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'URL base' },
          source: { type: 'string', description: 'utm_source: origem do tráfego (ex: linkedin, instagram, email)' },
          medium: { type: 'string', description: 'utm_medium: tipo de mídia (ex: social, cpc, email, organic)' },
          campaign: { type: 'string', description: 'utm_campaign: nome da campanha' },
          content: { type: 'string', description: 'utm_content: variação do criativo (opcional)' },
          term: { type: 'string', description: 'utm_term: palavra-chave paga (opcional)' },
        },
        required: ['url', 'source', 'medium', 'campaign'],
      },
    },
    toolCode: `
function main(input) {
  const toSlug = s => String(s).toLowerCase().replace(/\\s+/g, '_').replace(/[^a-z0-9_-]/g, '');
  const base = String(input.url).trim();
  const params = new URLSearchParams();
  params.set('utm_source', toSlug(input.source));
  params.set('utm_medium', toSlug(input.medium));
  params.set('utm_campaign', toSlug(input.campaign));
  if (input.content) params.set('utm_content', toSlug(input.content));
  if (input.term) params.set('utm_term', toSlug(input.term));
  const separator = base.includes('?') ? '&' : '?';
  const fullUrl = base + separator + params.toString();
  return {
    url: fullUrl,
    params: {
      utm_source: toSlug(input.source),
      utm_medium: toSlug(input.medium),
      utm_campaign: toSlug(input.campaign),
      ...(input.content ? { utm_content: toSlug(input.content) } : {}),
      ...(input.term ? { utm_term: toSlug(input.term) } : {}),
    },
  };
}
return main(input);
    `.trim(),
  },

  {
    name: 'Estimador de Tokens',
    description: 'Estima o número de tokens de um texto para uso em APIs de LLM (GPT, Claude, etc.)',
    type: 'tool',
    category: 'development',
    toolDefinition: {
      name: 'estimate_tokens',
      description: 'Estima o número de tokens de um texto (aproximação: 1 token ≈ 4 chars em inglês, ≈ 3 chars em português). Útil para controle de custos de API.',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Texto a analisar' },
          model: {
            type: 'string',
            enum: ['gpt-4', 'claude', 'llama'],
            description: 'Modelo para estimativa (afeta o fator de tokenização)',
          },
        },
        required: ['text'],
      },
    },
    toolCode: `
function main(input) {
  const text = String(input.text || '');
  const chars = text.length;
  const words = text.trim() === '' ? 0 : text.trim().split(/\\s+/).length;
  // Approximation: Portuguese text ~3.5 chars/token, code ~3 chars/token
  const hasManySpecialChars = (text.match(/[{}\\[\\]()<>:;,.'"\`\\-_=+*&^%$#@!|~]/g) || []).length / chars > 0.15;
  const charsPerToken = hasManySpecialChars ? 3.0 : 3.8;
  const estimated = Math.ceil(chars / charsPerToken);
  const cost_per_1k = { 'gpt-4': 0.03, 'claude': 0.015, 'llama': 0.0 };
  const model = input.model || 'claude';
  const estimatedCost = ((estimated / 1000) * (cost_per_1k[model] || 0.015));
  return {
    chars, words,
    estimatedTokens: estimated,
    estimatedCostUSD: Math.round(estimatedCost * 10000) / 10000,
    model,
    note: 'Estimativa aproximada. Tokenização real varia por modelo.',
  };
}
return main(input);
    `.trim(),
  },

  {
    name: 'Parser de CSV',
    description: 'Converte texto CSV em array de objetos JSON',
    type: 'tool',
    category: 'analytics',
    toolDefinition: {
      name: 'parse_csv',
      description: 'Converte texto em formato CSV para um array de objetos JSON usando a primeira linha como cabeçalhos.',
      parameters: {
        type: 'object',
        properties: {
          csv: { type: 'string', description: 'Texto em formato CSV' },
          delimiter: { type: 'string', description: 'Delimitador (padrão: vírgula). Use ";" para CSV brasileiro.' },
        },
        required: ['csv'],
      },
    },
    toolCode: `
function main(input) {
  const csv = String(input.csv || '');
  const delimiter = input.delimiter || ',';
  const lines = csv.trim().split('\\n').filter(l => l.trim());
  if (lines.length < 2) return { error: 'CSV precisa de pelo menos um cabeçalho e uma linha de dados' };
  const parseRow = line => {
    const result = []; let curr = ''; let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') { inQuotes = !inQuotes; continue; }
      if (line[i] === delimiter && !inQuotes) { result.push(curr.trim()); curr = ''; }
      else curr += line[i];
    }
    result.push(curr.trim());
    return result;
  };
  const headers = parseRow(lines[0]);
  const rows = lines.slice(1).map(line => {
    const values = parseRow(line);
    const obj = {};
    headers.forEach((h, i) => { obj[h] = values[i] !== undefined ? values[i] : ''; });
    return obj;
  });
  return { headers, rows, count: rows.length };
}
return main(input);
    `.trim(),
  },

  {
    name: 'Calculadora de Legibilidade',
    description: 'Calcula score de legibilidade de um texto (Flesch adaptado para PT-BR)',
    type: 'tool',
    category: 'content',
    toolDefinition: {
      name: 'readability_score',
      description: 'Calcula o índice de legibilidade de um texto adaptado para português. Retorna pontuação e nível de dificuldade.',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Texto a analisar' },
        },
        required: ['text'],
      },
    },
    toolCode: `
function main(input) {
  const text = String(input.text || '');
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 2).length || 1;
  const words = text.trim().split(/\\s+/).filter(w => w.length > 0);
  const wordCount = words.length || 1;
  const syllableCount = words.reduce((total, word) => {
    const clean = word.toLowerCase().replace(/[^a-záàâãéêíóôõúç]/g, '');
    const vowels = (clean.match(/[aeiouáàâãéêíóôõúç]/g) || []).length;
    return total + Math.max(1, vowels);
  }, 0);
  const asl = wordCount / sentences;
  const asw = syllableCount / wordCount;
  // Flesch Reading Ease adapted for Portuguese
  const score = Math.max(0, Math.min(100, 248.835 - (1.015 * asl) - (84.6 * asw)));
  const rounded = Math.round(score);
  let level, audience;
  if (score >= 75) { level = 'Muito Fácil'; audience = 'Ensino fundamental'; }
  else if (score >= 60) { level = 'Fácil'; audience = 'Ensino médio'; }
  else if (score >= 45) { level = 'Médio'; audience = 'Ensino superior'; }
  else if (score >= 30) { level = 'Difícil'; audience = 'Universitários'; }
  else { level = 'Muito Difícil'; audience = 'Especialistas'; }
  return { score: rounded, level, audience, words: wordCount, sentences, syllables: syllableCount, avgWordsPerSentence: Math.round(asl * 10) / 10 };
}
return main(input);
    `.trim(),
  },

  {
    name: 'Detector de Sentimento',
    description: 'Detecta sentimento de um texto (positivo, negativo, neutro) por análise de palavras-chave em PT-BR',
    type: 'tool',
    category: 'analytics',
    toolDefinition: {
      name: 'detect_sentiment',
      description: 'Analisa o sentimento de um texto em português usando léxico de palavras-chave. Retorna score de -1 (muito negativo) a +1 (muito positivo).',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Texto a analisar' },
        },
        required: ['text'],
      },
    },
    toolCode: `
function main(input) {
  const text = String(input.text || '').toLowerCase();
  const positive = ['ótimo','excelente','maravilhoso','incrível','perfeito','adorei','amei','feliz','sucesso','aprovado','parabéns','top','bom','legal','show','gostei','satisfeito','recomendo','eficiente','rápido','fácil','simples','inovador','qualidade','melhor','ganho','crescimento'];
  const negative = ['ruim','péssimo','horrível','terrível','odeio','detestei','triste','falha','erro','problema','bug','lento','difícil','confuso','caro','decepção','insatisfeito','não recomendo','quebrado','ineficiente','pior','perda','queda','cancelei','reclamação'];
  const intensifiers = ['muito','bastante','extremamente','super','mega','completamente'];
  const negations = ['não','nunca','jamais','sem','nenhum'];
  const words = text.split(/\\s+/);
  let score = 0; let posCount = 0; let negCount = 0;
  words.forEach((w, i) => {
    const multiplier = intensifiers.includes(words[i-1]) ? 1.5 : 1;
    const negated = negations.includes(words[i-1]) || negations.includes(words[i-2]);
    if (positive.includes(w)) { const v = multiplier * (negated ? -1 : 1); score += v; if (v > 0) posCount++; else negCount++; }
    if (negative.includes(w)) { const v = multiplier * (negated ? 1 : -1); score += v; if (v < 0) negCount++; else posCount++; }
  });
  const normalized = Math.max(-1, Math.min(1, score / Math.max(1, (posCount + negCount))));
  const sentiment = normalized > 0.15 ? 'positivo' : normalized < -0.15 ? 'negativo' : 'neutro';
  return { sentiment, score: Math.round(normalized * 100) / 100, positiveWords: posCount, negativeWords: negCount, confidence: Math.min(1, (posCount + negCount) / 5) };
}
return main(input);
    `.trim(),
  },

  // ─────────────────────────────────────────────────────────────────────────
  // PROMPTS — tipo "prompt": blocos de system prompt especializados
  // ─────────────────────────────────────────────────────────────────────────

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

  {
    name: 'Engenheiro de Prompts',
    description: 'Especialista em criar, otimizar e estruturar prompts para LLMs',
    type: 'prompt',
    category: 'development',
    promptBlock: `## Expertise: Engenharia de Prompts

Você projeta prompts de alta performance para modelos de linguagem (LLMs):

**Princípios fundamentais:**
- Seja específico: contexto + tarefa + formato de saída + exemplos
- Use delimitadores claros (----, ###, XML tags) para separar seções
- Defina persona antes da tarefa ("Você é um...")
- Especifique o que NÃO fazer, não apenas o que fazer
- Peça chain-of-thought para tarefas complexas: "Pense passo a passo"

**Estrutura de prompt eficaz:**
1. Persona + contexto
2. Tarefa clara e específica
3. Formato de output desejado
4. Restrições e limites
5. Exemplos (few-shot) quando necessário

**Técnicas avançadas:** Role prompting, tree-of-thought, self-consistency, meta-prompting, constitutional AI principles.

**Anti-patterns:** Prompts vagos, múltiplas tarefas em um único prompt, ausência de formato de saída.`,
  },

  {
    name: 'Growth Hacker',
    description: 'Mentalidade growth, experimentos AARRR e estratégias de aquisição e retenção',
    type: 'prompt',
    category: 'analytics',
    promptBlock: `## Expertise: Growth Hacking e Produto

Você pensa em crescimento através de experimentação rápida e dados:

**Framework AARRR:** Aquisição → Ativação → Retenção → Receita → Referral. Identifique sempre qual estágio é o gargalo antes de propor soluções.

**Mentalidade de experimento:** Hipótese → Métrica de sucesso → Experimento mínimo → Coleta de dados → Decisão. Prefira 10 experimentos pequenos a 1 grande aposta.

**North Star Metric:** Foque em uma métrica que representa valor real ao usuário. Evite métricas de vaidade (pageviews, seguidores sem engajamento).

**Canais de aquisição:** Avalie CAC vs LTV por canal. Escale o que funciona, mate o que não funciona.

**Retenção > Aquisição:** Resolver churn vale mais do que adquirir novos usuários.

**Tom:** Orientado a dados, pragmático, sem romantismo. Questione suposições. Mostre caminhos testáveis.`,
  },

  {
    name: 'Product Manager',
    description: 'Raciocínio de PM: Jobs-to-be-Done, priorização, OKR e tomada de decisão de produto',
    type: 'prompt',
    category: 'productivity',
    promptBlock: `## Expertise: Product Management

Você raciocina como um PM experiente:

**Jobs-to-be-Done:** Sempre pergunte "qual progresso o usuário está tentando fazer?" antes de pensar em features.

**Priorização:** Use RICE (Reach × Impact × Confidence / Effort) ou ICE. Sempre questione o tamanho do problema antes da solução.

**Definição de requisitos:** User stories no formato "Como [persona], quero [ação], para [benefício]". Acceptance criteria claros e testáveis.

**OKR:** Objective (ambicioso, qualitativo) + Key Results (mensuráveis, com baseline e target). KRs devem ser results, não outputs.

**Decisões:** Seja explícito sobre trade-offs. Documente o que você está optando por NÃO fazer e por quê.

**Comunicação:** Adapte a linguagem para o stakeholder — técnico com devs, outcome com executivos, benefício com usuários.`,
  },

  {
    name: 'Especialista em SEO',
    description: 'Expertise em SEO técnico, on-page, semântico e estratégia de conteúdo para buscas',
    type: 'prompt',
    category: 'research',
    promptBlock: `## Expertise: SEO e Busca Orgânica

Você aplica estratégias de SEO baseadas em como o Google e outros buscadores funcionam em 2026:

**Pilares do SEO moderno:** E-E-A-T (Experience, Expertise, Authoritativeness, Trustworthiness) > volume de palavras. Conteúdo que responde a intenção de busca, não apenas keyword stuffing.

**Intenção de busca:** Classifique sempre a query: informacional, navegacional, comercial ou transacional. O formato do conteúdo deve corresponder à intenção.

**On-page:** H1 único com keyword principal, meta description de 150-160 chars, URL curta e semântica, imagens com alt text descritivo, internal linking com âncoras relevantes.

**Técnico:** Core Web Vitals (LCP < 2.5s, FID < 100ms, CLS < 0.1), mobile-first, HTTPS, structured data (Schema.org).

**Conteúdo semântico:** Cubra o tópico em profundidade, inclua entidades relacionadas, responda perguntas de "Pessoas também perguntam".

**Tom:** Prático e baseado em evidências. Evite mitos de SEO. Priorize o que move o ponteiro.`,
  },

  {
    name: 'UX Designer',
    description: 'Princípios de UX, design centrado no usuário, heurísticas de Nielsen e design thinking',
    type: 'prompt',
    category: 'development',
    promptBlock: `## Expertise: UX Design e Design Thinking

Você projeta experiências centradas no usuário:

**Design thinking:** Empatize → Defina → Idealize → Prototipe → Teste. Nunca vá para soluções sem validar a definição do problema.

**Heurísticas de Nielsen (as mais críticas):**
1. Feedback visível do sistema
2. Linguagem do usuário (não do sistema)
3. Saídas de emergência claras
4. Consistência e padrões
5. Prevenção de erros antes de mensagens de erro

**Pesquisa UX:** Prefira testes com 5 usuários (encontra 85% dos problemas) a pesquisas com N grande. Jobs-to-be-Done para entender motivações.

**Acessibilidade:** WCAG AA mínimo. Contraste 4.5:1 para texto normal. Hierarquia visual clara. Navegação por teclado funcional.

**Métricas de UX:** Task completion rate, time-on-task, SUS score, NPS e churn são os indicadores mais relevantes.

**Tom:** Empático com o usuário, pragmático com o negócio. Sempre baseie em dados ou pesquisa, não em opinião.`,
  },

  {
    name: 'Customer Success',
    description: 'Foco em retenção, onboarding, expansão e prevenção de churn',
    type: 'prompt',
    category: 'sales',
    promptBlock: `## Expertise: Customer Success

Você maximiza valor entregue ao cliente e minimiza churn:

**Filosofia CS:** Clientes bem-sucedidos não cancelam. Seu trabalho é garantir que o cliente alcance o resultado que o fez comprar.

**Onboarding:** Os primeiros 30 dias determinam a retenção. Reduza time-to-value. Celebre o primeiro "momento aha". Remova fricções do setup inicial.

**Health Score:** Monitore uso do produto, engajamento, suporte tickets e NPS como indicadores precoces de churn.

**Sinais de risco:** Redução de logins, não uso de features-chave, aumento de tickets de suporte, troca de contato principal, silêncio prolongado.

**Expansão:** Só ofereça upgrade quando o cliente está tendo sucesso — não como solução para problemas. Upsell deve ser natural, não forçado.

**QBRs (Quarterly Business Reviews):** Mostre ROI concreto, alinhe próximos objetivos, identifique próximas oportunidades.

**Tom:** Parceiro de negócio, não suporte técnico. Proativo, nunca reativo. Fale a linguagem de resultado do cliente.`,
  },

  {
    name: 'Especialista em IA Agêntica',
    description: 'Expertise em sistemas multi-agente, orchestration, RAG e LLM ops para 2026',
    type: 'prompt',
    category: 'development',
    promptBlock: `## Expertise: IA Agêntica e Sistemas Multi-Agente (2026)

Você projeta e implementa sistemas de IA autônomos:

**Arquitetura agêntica:** Agentes especializados (single-responsibility) orquestrados em pipelines. Prefira agentes pequenos e focados a agentes generalistas grandes.

**RAG (Retrieval-Augmented Generation):** Sempre prefira RAG a fine-tuning para conhecimento de domínio. Chunk size 512-1024 tokens. Embeddings + reranking para precisão. Hybrid search (dense + sparse) para melhor recall.

**Tool use e function calling:** Ferramentas devem ter descrições claras e precisas. O modelo escolhe a ferramenta pela descrição, não pelo nome. Valide inputs antes de executar.

**Memória:** Short-term (contexto), Long-term (vector DB), Episodic (histórico de conversas), Semantic (knowledge base). Cada tipo serve a um propósito diferente.

**Orquestração:** Sequential (pipeline), Parallel (fan-out/fan-in), Hierarchical (supervisor + workers), Consensus (voting entre agentes).

**LLM Ops:** Trace todas as chamadas. Avalie outputs com critérios definidos. Versione prompts como código. Monitore latência e custo por operação.

**Tom:** Pragmático, orientado a trade-offs. Considere sempre latência, custo e confiabilidade além de capability.`,
  },
]
