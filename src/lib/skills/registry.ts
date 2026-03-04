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
  // TOOLS — research (6 adicionais → total 7)
  // ─────────────────────────────────────────────────────────────────────────

  {
    name: 'Extrator de Palavras-Chave',
    description: 'Extrai as palavras mais relevantes/frequentes de um texto',
    type: 'tool',
    category: 'research',
    toolDefinition: {
      name: 'extract_keywords',
      description: 'Extrai palavras-chave mais frequentes de um texto, ignorando stopwords comuns.',
      parameters: {
        type: 'object',
        properties: {
          text:  { type: 'string', description: 'Texto a analisar' },
          top_n: { type: 'number', description: 'Quantidade de palavras a retornar (padrão 10)' },
        },
        required: ['text'],
      },
    },
    toolCode: `
function extractKeywords(input) {
  const stopwords = new Set(['de','a','o','que','e','do','da','em','um','para','com','uma','os','no','se','na','por','mais','as','dos','como','mas','ao','ele','das','seu','sua','ou','quando','muito','nos','já','eu','também','só','pelo','pela','até','isso','ela','entre','depois','sem','mesmo','aos','seus','quem','nas','me','esse','eles','você','essa','num','nem','suas','meu','minha','the','and','or','but','in','on','at','to','for','of','with','by','from','is','are','was','were','be','have','has','do','does','this','that','it','we','they','not','if','so','as','all','than','when','there','what','which','who','how','just','only','also','into','over','after','before','about','up','out']);
  const words = input.text.toLowerCase().replace(/[^a-záàâãéèêíìîóòôõúùûç\s]/gi, ' ').split(/\s+/).filter(w => w.length > 3 && !stopwords.has(w));
  const freq = {};
  for (const w of words) freq[w] = (freq[w] || 0) + 1;
  const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, input.top_n || 10);
  return { keywords: sorted.map(([word, count]) => ({ word, count })), total_words: words.length };
}
return extractKeywords(input);
    `.trim(),
  },

  {
    name: 'Sumarizador de Texto',
    description: 'Extrai as N primeiras frases de um texto como resumo',
    type: 'tool',
    category: 'research',
    toolDefinition: {
      name: 'summarize_text',
      description: 'Retorna as primeiras N frases de um texto como resumo automático.',
      parameters: {
        type: 'object',
        properties: {
          text:      { type: 'string', description: 'Texto a resumir' },
          sentences: { type: 'number', description: 'Número de frases (padrão 3)' },
        },
        required: ['text'],
      },
    },
    toolCode: `
function summarize(input) {
  const n = input.sentences || 3;
  const sentences = input.text.match(/[^.!?]+[.!?]+/g) || [input.text];
  const summary = sentences.slice(0, n).join(' ').trim();
  return { summary, sentences_extracted: Math.min(n, sentences.length), total_sentences: sentences.length };
}
return summarize(input);
    `.trim(),
  },

  {
    name: 'Comparador de Textos',
    description: 'Calcula a similaridade entre dois textos (índice Jaccard)',
    type: 'tool',
    category: 'research',
    toolDefinition: {
      name: 'compare_texts',
      description: 'Compara dois textos e retorna um score de similaridade de 0 a 100%.',
      parameters: {
        type: 'object',
        properties: {
          text_a: { type: 'string', description: 'Primeiro texto' },
          text_b: { type: 'string', description: 'Segundo texto' },
        },
        required: ['text_a', 'text_b'],
      },
    },
    toolCode: `
function compareTexts(input) {
  const tokenize = t => new Set(t.toLowerCase().replace(/[^a-záàâãéèêíìîóòôõúùûç\s]/gi, ' ').split(/\s+/).filter(w => w.length > 1));
  const setA = tokenize(input.text_a);
  const setB = tokenize(input.text_b);
  const intersection = new Set([...setA].filter(w => setB.has(w)));
  const union = new Set([...setA, ...setB]);
  const jaccard = union.size === 0 ? 0 : intersection.size / union.size;
  const similarity = Math.round(jaccard * 100);
  return { similarity_percent: similarity, level: similarity >= 80 ? 'muito similar' : similarity >= 50 ? 'moderadamente similar' : similarity >= 20 ? 'pouco similar' : 'muito diferente', common_words: [...intersection].slice(0, 20), words_only_in_a: [...setA].filter(w => !setB.has(w)).length, words_only_in_b: [...setB].filter(w => !setA.has(w)).length };
}
return compareTexts(input);
    `.trim(),
  },

  {
    name: 'Destacador de Termos',
    description: 'Destaca termos de busca em um texto envolvendo-os com marcadores **',
    type: 'tool',
    category: 'research',
    toolDefinition: {
      name: 'highlight_terms',
      description: 'Envolve termos de busca com ** (negrito markdown) em um texto.',
      parameters: {
        type: 'object',
        properties: {
          text:  { type: 'string', description: 'Texto original' },
          terms: { type: 'string', description: 'Termos a destacar, separados por vírgula' },
        },
        required: ['text', 'terms'],
      },
    },
    toolCode: `
function highlightTerms(input) {
  const terms = input.terms.split(',').map(t => t.trim()).filter(Boolean);
  let result = input.text;
  let count = 0;
  for (const term of terms) {
    const lower = term.toLowerCase();
    let lowerResult = result.toLowerCase();
    let idx = lowerResult.indexOf(lower);
    let newResult = '';
    let lastIdx = 0;
    let matches = 0;
    while (idx !== -1) {
      newResult += result.slice(lastIdx, idx) + '**' + result.slice(idx, idx + term.length) + '**';
      lastIdx = idx + term.length;
      matches++;
      lowerResult = result.toLowerCase();
      idx = lowerResult.indexOf(lower, lastIdx);
    }
    newResult += result.slice(lastIdx);
    result = newResult;
    count += matches;
  }
  return { highlighted_text: result, total_highlights: count, terms_used: terms };
}
return highlightTerms(input);
    `.trim(),
  },

  {
    name: 'Extrator de Números',
    description: 'Extrai todos os números de um texto com estatísticas',
    type: 'tool',
    category: 'research',
    toolDefinition: {
      name: 'extract_numbers',
      description: 'Extrai todos os valores numéricos de um texto e calcula estatísticas básicas.',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Texto a analisar' },
        },
        required: ['text'],
      },
    },
    toolCode: `
function extractNumbers(input) {
  const matches = input.text.match(/-?\\d+[.,]?\\d*/g) || [];
  const numbers = matches.map(m => parseFloat(m.replace(',', '.'))).filter(n => !isNaN(n));
  if (numbers.length === 0) return { numbers: [], count: 0, sum: 0, average: 0, min: null, max: null };
  const sum = numbers.reduce((a, b) => a + b, 0);
  return { numbers, count: numbers.length, sum: Math.round(sum * 1000) / 1000, average: Math.round((sum / numbers.length) * 1000) / 1000, min: Math.min(...numbers), max: Math.max(...numbers) };
}
return extractNumbers(input);
    `.trim(),
  },

  {
    name: 'Contador de Seções',
    description: 'Conta headers, listas e parágrafos em um documento markdown',
    type: 'tool',
    category: 'research',
    toolDefinition: {
      name: 'count_sections',
      description: 'Analisa a estrutura de um documento markdown contando headers, listas e parágrafos.',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Texto ou documento markdown' },
        },
        required: ['text'],
      },
    },
    toolCode: `
function countSections(input) {
  const lines = input.text.split('\\n');
  const h1 = lines.filter(l => /^#\\s/.test(l)).length;
  const h2 = lines.filter(l => /^##\\s/.test(l)).length;
  const h3 = lines.filter(l => /^###\\s/.test(l)).length;
  const bulletItems = lines.filter(l => /^[-*+]\\s/.test(l.trim())).length;
  const numberedItems = lines.filter(l => /^\\d+\\.\\s/.test(l.trim())).length;
  const codeBlocks = Math.floor((input.text.match(/\`\`\`/g) || []).length / 2);
  const paragraphs = input.text.split(/\\n\\n+/).filter(p => p.trim() && !/^[#*-]/.test(p.trim())).length;
  return { h1, h2, h3, total_headers: h1 + h2 + h3, bullet_items: bulletItems, numbered_items: numberedItems, code_blocks: codeBlocks, paragraphs, total_lines: lines.length };
}
return countSections(input);
    `.trim(),
  },

  // ─────────────────────────────────────────────────────────────────────────
  // TOOLS — integration (3 adicionais → total 7)
  // ─────────────────────────────────────────────────────────────────────────

  {
    name: 'Validador de CEP',
    description: 'Valida o formato de um CEP brasileiro',
    type: 'tool',
    category: 'integration',
    toolDefinition: {
      name: 'validate_cep',
      description: 'Verifica se um CEP brasileiro está no formato correto (XXXXX-XXX ou XXXXXXXX).',
      parameters: {
        type: 'object',
        properties: {
          cep: { type: 'string', description: 'CEP a validar' },
        },
        required: ['cep'],
      },
    },
    toolCode: `
function validateCep(input) {
  const cleaned = input.cep.replace(/\\D/g, '');
  const valid = /^\\d{8}$/.test(cleaned);
  const formatted = valid ? cleaned.slice(0, 5) + '-' + cleaned.slice(5) : null;
  return { valid, formatted, raw: cleaned, message: valid ? 'CEP válido' : 'CEP inválido — deve ter 8 dígitos numéricos' };
}
return validateCep(input);
    `.trim(),
  },

  {
    name: 'Formatador de Telefone BR',
    description: 'Formata número de telefone para o padrão brasileiro',
    type: 'tool',
    category: 'integration',
    toolDefinition: {
      name: 'format_phone_br',
      description: 'Formata um número de telefone brasileiro para (DDD) XXXX-XXXX ou (DDD) 9XXXX-XXXX.',
      parameters: {
        type: 'object',
        properties: {
          phone: { type: 'string', description: 'Número de telefone (com ou sem formatação)' },
        },
        required: ['phone'],
      },
    },
    toolCode: `
function formatPhoneBr(input) {
  const digits = input.phone.replace(/\\D/g, '');
  let cleaned = digits.startsWith('55') && digits.length > 11 ? digits.slice(2) : digits;
  if (cleaned.length === 11) return { formatted: '(' + cleaned.slice(0,2) + ') ' + cleaned.slice(2,7) + '-' + cleaned.slice(7), type: 'celular', valid: true, ddd: cleaned.slice(0,2) };
  if (cleaned.length === 10) return { formatted: '(' + cleaned.slice(0,2) + ') ' + cleaned.slice(2,6) + '-' + cleaned.slice(6), type: 'fixo', valid: true, ddd: cleaned.slice(0,2) };
  return { formatted: null, valid: false, message: 'Número deve ter 10 (fixo) ou 11 (celular) dígitos', raw: digits };
}
return formatPhoneBr(input);
    `.trim(),
  },

  {
    name: 'Parser de JSON Seguro',
    description: 'Faz parse seguro de JSON com detalhamento de erros e formatação',
    type: 'tool',
    category: 'integration',
    toolDefinition: {
      name: 'parse_json_safe',
      description: 'Faz parse de uma string JSON e retorna o objeto formatado ou uma mensagem de erro clara.',
      parameters: {
        type: 'object',
        properties: {
          json_string: { type: 'string', description: 'String JSON a ser parseada' },
          pretty:      { type: 'boolean', description: 'Retornar JSON formatado (padrão true)' },
        },
        required: ['json_string'],
      },
    },
    toolCode: `
function parseJsonSafe(input) {
  try {
    const parsed = JSON.parse(input.json_string);
    const type = Array.isArray(parsed) ? 'array' : typeof parsed;
    const keys = type === 'object' && parsed !== null ? Object.keys(parsed) : [];
    const pretty = input.pretty !== false ? JSON.stringify(parsed, null, 2) : JSON.stringify(parsed);
    return { success: true, parsed, formatted: pretty, type, keys, length: Array.isArray(parsed) ? parsed.length : keys.length };
  } catch (e) {
    return { success: false, error: e.message, hint: 'Verifique aspas duplas, vírgulas e chaves/colchetes' };
  }
}
return parseJsonSafe(input);
    `.trim(),
  },

  // ─────────────────────────────────────────────────────────────────────────
  // TOOLS — development (2 adicionais → total 7)
  // ─────────────────────────────────────────────────────────────────────────

  {
    name: 'Codificador Base64',
    description: 'Codifica ou decodifica texto em Base64',
    type: 'tool',
    category: 'development',
    toolDefinition: {
      name: 'encode_base64',
      description: 'Codifica texto para Base64 ou decodifica Base64 para texto legível.',
      parameters: {
        type: 'object',
        properties: {
          text:   { type: 'string', description: 'Texto a codificar ou Base64 a decodificar' },
          action: { type: 'string', description: '"encode" (padrão) ou "decode"' },
        },
        required: ['text'],
      },
    },
    toolCode: `
function base64Tool(input) {
  const action = input.action || 'encode';
  try {
    if (action === 'encode') {
      const encoded = typeof Buffer !== 'undefined' ? Buffer.from(input.text).toString('base64') : btoa(unescape(encodeURIComponent(input.text)));
      return { action: 'encode', result: encoded, original_length: input.text.length, encoded_length: encoded.length };
    } else {
      const decoded = typeof Buffer !== 'undefined' ? Buffer.from(input.text, 'base64').toString('utf8') : decodeURIComponent(escape(atob(input.text)));
      return { action: 'decode', result: decoded, encoded_length: input.text.length, decoded_length: decoded.length };
    }
  } catch (e) {
    return { success: false, error: e.message, hint: action === 'decode' ? 'Verifique se o input é Base64 válido' : 'Erro inesperado' };
  }
}
return base64Tool(input);
    `.trim(),
  },

  {
    name: 'Hash de Texto',
    description: 'Gera um hash simples e determinístico de uma string (djb2)',
    type: 'tool',
    category: 'development',
    toolDefinition: {
      name: 'hash_text',
      description: 'Gera um hash numérico determinístico (djb2) e hexadecimal de uma string — útil para IDs, cache keys e deduplicação.',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Texto a ser hasheado' },
        },
        required: ['text'],
      },
    },
    toolCode: `
function hashText(input) {
  let hash = 5381;
  for (let i = 0; i < input.text.length; i++) {
    hash = ((hash << 5) + hash) + input.text.charCodeAt(i);
    hash = hash & hash;
  }
  const unsigned = hash >>> 0;
  const hex = unsigned.toString(16).padStart(8, '0');
  return { hash_decimal: unsigned, hash_hex: hex, hash_short: hex.slice(0, 8), input_length: input.text.length };
}
return hashText(input);
    `.trim(),
  },

  // ─────────────────────────────────────────────────────────────────────────
  // TOOLS — content (2 adicionais → total 7)
  // ─────────────────────────────────────────────────────────────────────────

  {
    name: 'Gerador de Hashtags',
    description: 'Converte palavras-chave de um texto em hashtags formatadas',
    type: 'tool',
    category: 'content',
    toolDefinition: {
      name: 'generate_hashtags',
      description: 'Gera hashtags a partir de um texto ou lista de palavras-chave.',
      parameters: {
        type: 'object',
        properties: {
          text:     { type: 'string', description: 'Texto ou palavras-chave (separados por vírgula ou espaço)' },
          max_tags: { type: 'number', description: 'Máximo de hashtags (padrão 10)' },
          style:    { type: 'string', description: '"camelCase" (padrão) ou "lowercase"' },
        },
        required: ['text'],
      },
    },
    toolCode: `
function generateHashtags(input) {
  const max = input.max_tags || 10;
  const style = input.style || 'camelCase';
  const words = input.text.replace(/[^a-záàâãéèêíìîóòôõúùûçA-Z0-9\\s,]/g, '').split(/[,\\s]+/).filter(w => w.length > 2);
  const toHashtag = w => {
    const clean = w.normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase();
    return style === 'camelCase' ? '#' + clean.charAt(0).toUpperCase() + clean.slice(1) : '#' + clean;
  };
  const unique = [...new Set(words.map(toHashtag))].slice(0, max);
  return { hashtags: unique, count: unique.length, block: unique.join(' ') };
}
return generateHashtags(input);
    `.trim(),
  },

  {
    name: 'Markdown para Texto',
    description: 'Remove formatação markdown e retorna texto limpo',
    type: 'tool',
    category: 'content',
    toolDefinition: {
      name: 'markdown_to_plain',
      description: 'Strip de formatação markdown (headers, bold, italic, links, código) retornando texto puro.',
      parameters: {
        type: 'object',
        properties: {
          markdown: { type: 'string', description: 'Texto em markdown' },
        },
        required: ['markdown'],
      },
    },
    toolCode: `
function markdownToPlain(input) {
  let text = input.markdown;
  text = text.replace(/\`\`\`[\\s\\S]*?\`\`\`/g, '');
  text = text.replace(/\`[^\`]+\`/g, m => m.slice(1,-1));
  text = text.replace(/!\\[([^\\]]*)\\]\\([^)]*\\)/g, '$1');
  text = text.replace(/\\[([^\\]]*)\\]\\([^)]*\\)/g, '$1');
  text = text.replace(/^#{1,6}\\s+/gm, '');
  text = text.replace(/\\*{3}(.+?)\\*{3}/g, '$1');
  text = text.replace(/\\*{2}(.+?)\\*{2}/g, '$1');
  text = text.replace(/\\*(.+?)\\*/g, '$1');
  text = text.replace(/_{2}(.+?)_{2}/g, '$1');
  text = text.replace(/_(.+?)_/g, '$1');
  text = text.replace(/^[-*+]\\s+/gm, '');
  text = text.replace(/^\\d+\\.\\s+/gm, '');
  text = text.replace(/^>\\s*/gm, '');
  text = text.replace(/^[-_*]{3,}$/gm, '');
  text = text.replace(/\\n{3,}/g, '\\n\\n').trim();
  return { plain_text: text, original_length: input.markdown.length, plain_length: text.length, reduction_percent: Math.round((1 - text.length / input.markdown.length) * 100) };
}
return markdownToPlain(input);
    `.trim(),
  },

  // ─────────────────────────────────────────────────────────────────────────
  // TOOLS — social-media (6 adicionais → total 7)
  // ─────────────────────────────────────────────────────────────────────────

  {
    name: 'Extrator de Hashtags',
    description: 'Extrai todas as hashtags de um texto',
    type: 'tool',
    category: 'social-media',
    toolDefinition: {
      name: 'extract_hashtags',
      description: 'Extrai todas as hashtags presentes em um texto e retorna estatísticas.',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Texto com hashtags' },
        },
        required: ['text'],
      },
    },
    toolCode: `
function extractHashtags(input) {
  const matches = input.text.match(/#[a-zA-Z\u00C0-\u024F0-9_]+/g) || [];
  const unique = [...new Set(matches.map(h => h.toLowerCase()))];
  return { hashtags: unique, count: unique.length, all_occurrences: matches.length, list: unique.join(', ') };
}
return extractHashtags(input);
    `.trim(),
  },

  {
    name: 'Contador de Hashtags',
    description: 'Conta hashtags e verifica limites de plataformas',
    type: 'tool',
    category: 'social-media',
    toolDefinition: {
      name: 'count_hashtags',
      description: 'Conta hashtags e verifica recomendações por plataforma (Instagram, LinkedIn, Threads).',
      parameters: {
        type: 'object',
        properties: {
          text:     { type: 'string', description: 'Texto com hashtags' },
          platform: { type: 'string', description: '"instagram", "linkedin", "threads" ou "twitter"' },
        },
        required: ['text'],
      },
    },
    toolCode: `
function countHashtags(input) {
  const tags = input.text.match(/#[a-zA-Z\u00C0-\u024F0-9_]+/g) || [];
  const count = tags.length;
  const limits = { instagram: { max: 30, optimal: '5-10' }, linkedin: { max: 5, optimal: '3-5' }, threads: { max: 10, optimal: '3-5' }, twitter: { max: 2, optimal: '1-2' } };
  const p = input.platform ? input.platform.toLowerCase() : null;
  const limit = p && limits[p] ? limits[p] : null;
  const status = !limit ? 'ok' : count > limit.max ? 'acima do limite' : count === 0 ? 'nenhuma hashtag' : 'ok';
  return { count, tags, status, platform: p || 'not specified', recommendation: limit ? { max: limit.max, optimal: limit.optimal, current_status: status } : null };
}
return countHashtags(input);
    `.trim(),
  },

  {
    name: 'Divisor de Thread',
    description: 'Divide texto longo em posts de 280 caracteres para Twitter/X',
    type: 'tool',
    category: 'social-media',
    toolDefinition: {
      name: 'split_thread',
      description: 'Divide um texto longo em partes de no máximo 280 caracteres, quebrando em pontuação quando possível.',
      parameters: {
        type: 'object',
        properties: {
          text:        { type: 'string', description: 'Texto a dividir' },
          max_chars:   { type: 'number', description: 'Máximo de caracteres por post (padrão 280)' },
          add_counter: { type: 'boolean', description: 'Adicionar "1/N" ao final (padrão true)' },
        },
        required: ['text'],
      },
    },
    toolCode: `
function splitThread(input) {
  const max = input.max_chars || 280;
  const addCounter = input.add_counter !== false;
  const sentences = input.text.match(/[^.!?]+[.!?]+\\s*/g) || [input.text];
  const posts = [];
  let current = '';
  for (const s of sentences) {
    const candidate = (current + s).trim();
    if (candidate.length <= max - (addCounter ? 6 : 0)) { current = candidate + ' '; }
    else { if (current.trim()) posts.push(current.trim()); current = s.trim() + ' '; }
  }
  if (current.trim()) posts.push(current.trim());
  const total = posts.length;
  const numbered = addCounter ? posts.map((p, i) => p + ' ' + (i+1) + '/' + total) : posts;
  return { posts: numbered, count: total, original_chars: input.text.length, longest_post: Math.max(...numbered.map(p => p.length)) };
}
return splitThread(input);
    `.trim(),
  },

  {
    name: 'Validador de Post LinkedIn',
    description: 'Valida comprimento e estrutura de um post para LinkedIn',
    type: 'tool',
    category: 'social-media',
    toolDefinition: {
      name: 'validate_linkedin_post',
      description: 'Verifica se um post atende às boas práticas do LinkedIn: comprimento, hook, hashtags e CTA.',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Texto do post LinkedIn' },
        },
        required: ['text'],
      },
    },
    toolCode: `
function validateLinkedin(input) {
  const text = input.text;
  const chars = text.length;
  const words = text.split(/\\s+/).filter(Boolean).length;
  const hashtags = (text.match(/#[a-zA-Z\u00C0-\u024F0-9_]+/g) || []).length;
  const firstLine = text.split('\\n')[0];
  const hasCTA = /coment|compartilh|segu|salv|curta|link|bio|DM|mensag/i.test(text);
  const issues = [];
  if (chars < 150) issues.push('Muito curto — posts de 150-1300 chars performam melhor');
  if (chars > 3000) issues.push('Muito longo — máximo recomendado é 1300 chars');
  if (hashtags > 5) issues.push('Muitas hashtags — máximo recomendado é 3-5');
  if (hashtags === 0) issues.push('Nenhuma hashtag — adicione 3-5 hashtags relevantes');
  if (firstLine.length > 200) issues.push('Primeira linha muito longa — o hook deve ser curto e impactante');
  if (!hasCTA) issues.push('Sem CTA — adicione uma chamada à ação');
  return { valid: issues.length === 0, chars, words, hashtags, has_cta: hasCTA, hook: firstLine.slice(0, 100), issues, score: Math.max(0, 100 - issues.length * 15) };
}
return validateLinkedin(input);
    `.trim(),
  },

  {
    name: 'Formatador de Caption Instagram',
    description: 'Formata caption para Instagram com bloco de hashtags separado',
    type: 'tool',
    category: 'social-media',
    toolDefinition: {
      name: 'format_instagram_caption',
      description: 'Organiza caption do Instagram: corpo do texto + separador + bloco de hashtags ao final.',
      parameters: {
        type: 'object',
        properties: {
          caption:   { type: 'string', description: 'Texto principal da caption' },
          hashtags:  { type: 'string', description: 'Hashtags separadas por espaço ou vírgula' },
          separator: { type: 'string', description: 'Separador entre texto e hashtags (padrão newlines)' },
        },
        required: ['caption'],
      },
    },
    toolCode: `
function formatInstagramCaption(input) {
  const sep = input.separator || '\\n.\\n.\\n.\\n';
  const rawTags = input.hashtags || '';
  const tags = rawTags.split(/[,\\s]+/).filter(t => t.length > 0).map(t => t.startsWith('#') ? t : '#' + t);
  const body = input.caption.trim();
  const hashBlock = tags.join(' ');
  const full = hashBlock ? body + sep + hashBlock : body;
  const chars = full.length;
  return { formatted: full, body_chars: body.length, hashtag_count: tags.length, total_chars: chars, valid: chars <= 2200, warnings: chars > 2200 ? ['Caption excede 2200 caracteres'] : tags.length > 30 ? ['Mais de 30 hashtags'] : [] };
}
return formatInstagramCaption(input);
    `.trim(),
  },

  {
    name: 'Estimador de Engajamento',
    description: 'Estima score de engajamento de um post baseado em características textuais',
    type: 'tool',
    category: 'social-media',
    toolDefinition: {
      name: 'estimate_engagement',
      description: 'Analisa características de um post (perguntas, emojis, CTA, comprimento) e estima o potencial de engajamento.',
      parameters: {
        type: 'object',
        properties: {
          text:     { type: 'string', description: 'Texto do post' },
          platform: { type: 'string', description: '"instagram", "linkedin", "threads" ou "twitter"' },
        },
        required: ['text'],
      },
    },
    toolCode: `
function estimateEngagement(input) {
  const text = input.text;
  const questions = (text.match(/\\?/g) || []).length;
  const emojis = (text.match(/[\u{1F300}-\u{1FFFF}]|[\u{2600}-\u{26FF}]/gu) || []).length;
  const hasCTA = /coment|compartilh|segu|salv|respond|DM|link|clica|acessa/i.test(text) ? 15 : 0;
  const words = text.split(/\\s+/).filter(Boolean).length;
  const idealWords = { instagram: 80, linkedin: 150, threads: 60, twitter: 30 };
  const platform = (input.platform || 'instagram').toLowerCase();
  const ideal = idealWords[platform] || 100;
  const lengthScore = Math.max(0, 20 - Math.abs(words - ideal) / ideal * 20);
  const story = /você|eu |minha|meu|quando eu|descobri|aprendi/i.test(text) ? 15 : 0;
  const hashtags = (text.match(/#[a-zA-Z\u00C0-\u024F0-9_]+/g) || []).length;
  const hashScore = hashtags > 0 && hashtags <= 10 ? 15 : 0;
  const total = Math.min(100, Math.min(questions * 10, 20) + Math.min(emojis * 3, 15) + hasCTA + Math.round(lengthScore) + story + hashScore);
  return { score: total, level: total >= 70 ? 'Alto' : total >= 40 ? 'Médio' : 'Baixo', tips: [questions === 0 && 'Adicione uma pergunta para estimular comentários', emojis === 0 && 'Use 2-4 emojis para aumentar apelo visual', hasCTA === 0 && 'Adicione um CTA claro'].filter(Boolean) };
}
return estimateEngagement(input);
    `.trim(),
  },

  // ─────────────────────────────────────────────────────────────────────────
  // TOOLS — productivity (5 adicionais → total 7)
  // ─────────────────────────────────────────────────────────────────────────

  {
    name: 'Tempo de Leitura',
    description: 'Calcula o tempo estimado de leitura de um texto',
    type: 'tool',
    category: 'productivity',
    toolDefinition: {
      name: 'time_to_read',
      description: 'Estima o tempo de leitura com base em 200 palavras por minuto (adulto médio).',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Texto a analisar' },
          wpm:  { type: 'number', description: 'Palavras por minuto (padrão 200)' },
        },
        required: ['text'],
      },
    },
    toolCode: `
function timeToRead(input) {
  const wpm = input.wpm || 200;
  const words = input.text.trim().split(/\\s+/).filter(Boolean).length;
  const minutes = words / wpm;
  const mins = Math.floor(minutes);
  const secs = Math.round((minutes - mins) * 60);
  const display = mins > 0 ? (secs > 0 ? mins + 'm ' + secs + 's' : mins + ' min') : secs + 's';
  return { words, wpm, minutes: Math.round(minutes * 10) / 10, display, description: minutes < 1 ? 'Leitura rápida' : minutes < 5 ? 'Leitura curta' : minutes < 15 ? 'Leitura média' : 'Leitura longa' };
}
return timeToRead(input);
    `.trim(),
  },

  {
    name: 'Calculadora de Idade',
    description: 'Calcula a idade exata a partir de uma data de nascimento',
    type: 'tool',
    category: 'productivity',
    toolDefinition: {
      name: 'calculate_age',
      description: 'Calcula idade em anos, meses e dias a partir de uma data de nascimento.',
      parameters: {
        type: 'object',
        properties: {
          birth_date: { type: 'string', description: 'Data de nascimento (YYYY-MM-DD ou DD/MM/YYYY)' },
        },
        required: ['birth_date'],
      },
    },
    toolCode: `
function calculateAge(input) {
  let dateStr = input.birth_date.trim();
  if (/^\\d{2}\\/\\d{2}\\/\\d{4}$/.test(dateStr)) { const p = dateStr.split('/'); dateStr = p[2] + '-' + p[1] + '-' + p[0]; }
  const birth = new Date(dateStr);
  if (isNaN(birth.getTime())) return { error: 'Data inválida. Use YYYY-MM-DD ou DD/MM/YYYY' };
  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();
  let days = now.getDate() - birth.getDate();
  if (days < 0) { months--; days += new Date(now.getFullYear(), now.getMonth(), 0).getDate(); }
  if (months < 0) { years--; months += 12; }
  const totalDays = Math.floor((now - birth) / 86400000);
  const next = new Date(now.getFullYear(), birth.getMonth(), birth.getDate());
  if (next < now) next.setFullYear(now.getFullYear() + 1);
  return { years, months, days, total_days: totalDays, birth_date: birth.toLocaleDateString('pt-BR'), next_birthday_in_days: Math.floor((next - now) / 86400000) };
}
return calculateAge(input);
    `.trim(),
  },

  {
    name: 'Adicionador de Dias Úteis',
    description: 'Adiciona N dias úteis a uma data (ignora fins de semana)',
    type: 'tool',
    category: 'productivity',
    toolDefinition: {
      name: 'add_business_days',
      description: 'Calcula a data resultante após adicionar N dias úteis (segunda a sexta) a uma data inicial.',
      parameters: {
        type: 'object',
        properties: {
          start_date: { type: 'string', description: 'Data inicial (YYYY-MM-DD ou DD/MM/YYYY)' },
          days:       { type: 'number', description: 'Número de dias úteis a adicionar' },
        },
        required: ['start_date', 'days'],
      },
    },
    toolCode: `
function addBusinessDays(input) {
  let dateStr = input.start_date.trim();
  if (/^\\d{2}\\/\\d{2}\\/\\d{4}$/.test(dateStr)) { const p = dateStr.split('/'); dateStr = p[2] + '-' + p[1] + '-' + p[0]; }
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return { error: 'Data inválida' };
  const daysToAdd = Math.abs(Math.round(input.days));
  const direction = input.days < 0 ? -1 : 1;
  let added = 0;
  while (added < daysToAdd) { date.setDate(date.getDate() + direction); const dow = date.getDay(); if (dow !== 0 && dow !== 6) added++; }
  const weekdays = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
  return { result_date: date.toISOString().slice(0, 10), result_date_br: date.toLocaleDateString('pt-BR'), weekday: weekdays[date.getDay()], business_days_added: daysToAdd };
}
return addBusinessDays(input);
    `.trim(),
  },

  {
    name: 'Classificador de Tarefas',
    description: 'Classifica tarefas pela Matriz de Eisenhower (urgente × importante)',
    type: 'tool',
    category: 'productivity',
    toolDefinition: {
      name: 'classify_task',
      description: 'Classifica uma tarefa nos quadrantes da Matriz de Eisenhower com base em urgência e importância.',
      parameters: {
        type: 'object',
        properties: {
          task:      { type: 'string', description: 'Descrição da tarefa' },
          urgent:    { type: 'boolean', description: 'A tarefa é urgente?' },
          important: { type: 'boolean', description: 'A tarefa é importante?' },
        },
        required: ['task', 'urgent', 'important'],
      },
    },
    toolCode: `
function classifyTask(input) {
  const quadrants = {
    'true-true':  { name: 'Fazer Agora',  label: 'Q1 — Urgente e Importante',     action: 'Execute imediatamente',             description: 'Crises, prazos críticos, emergências.' },
    'false-true': { name: 'Agendar',      label: 'Q2 — Não Urgente e Importante', action: 'Agende com antecedência',           description: 'Planejamento, desenvolvimento, relacionamentos.' },
    'true-false': { name: 'Delegar',      label: 'Q3 — Urgente e Não Importante', action: 'Delegue se possível',               description: 'Interrupções, reuniões desnecessárias.' },
    'false-false':{ name: 'Eliminar',     label: 'Q4 — Não Urgente e Não Importante', action: 'Elimine ou adie indefinidamente', description: 'Distrações, trivialidades.' },
  };
  return { task: input.task, urgent: input.urgent, important: input.important, ...quadrants[input.urgent + '-' + input.important] };
}
return classifyTask(input);
    `.trim(),
  },

  {
    name: 'Conversor de Fuso Horário',
    description: 'Converte horário entre fusos usando offsets UTC',
    type: 'tool',
    category: 'productivity',
    toolDefinition: {
      name: 'convert_timezone',
      description: 'Converte um horário de um fuso para outro usando offsets UTC (ex: -3 para Brasil, -5 para Nova York).',
      parameters: {
        type: 'object',
        properties: {
          time:        { type: 'string', description: 'Horário no formato HH:MM (24h)' },
          from_offset: { type: 'number', description: 'Offset UTC de origem (ex: -3 para BRT)' },
          to_offset:   { type: 'number', description: 'Offset UTC de destino (ex: -5 para EST)' },
        },
        required: ['time', 'from_offset', 'to_offset'],
      },
    },
    toolCode: `
function convertTimezone(input) {
  const [hStr, mStr] = input.time.split(':');
  const h = parseInt(hStr, 10), m = parseInt(mStr || '0', 10);
  if (isNaN(h) || isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) return { error: 'Horário inválido. Use HH:MM (24h)' };
  const diffHours = input.to_offset - input.from_offset;
  let totalMins = h * 60 + m + diffHours * 60;
  let dayOffset = 0;
  if (totalMins < 0) { totalMins += 1440; dayOffset = -1; }
  else if (totalMins >= 1440) { totalMins -= 1440; dayOffset = 1; }
  const pad = n => String(n).padStart(2, '0');
  const tzLabel = off => 'UTC' + (off >= 0 ? '+' : '') + off;
  return { original: input.time + ' ' + tzLabel(input.from_offset), converted: pad(Math.floor(totalMins/60)) + ':' + pad(totalMins%60) + ' ' + tzLabel(input.to_offset), hours_difference: diffHours, day_change: dayOffset === 0 ? 'mesmo dia' : dayOffset > 0 ? '+1 dia' : '-1 dia' };
}
return convertTimezone(input);
    `.trim(),
  },

  // ─────────────────────────────────────────────────────────────────────────
  // TOOLS — sales (7 novas → total 7)
  // ─────────────────────────────────────────────────────────────────────────

  {
    name: 'Calculadora de Comissão',
    description: 'Calcula comissão de vendas com base no valor e taxa percentual',
    type: 'tool',
    category: 'sales',
    toolDefinition: {
      name: 'calculate_commission',
      description: 'Calcula a comissão de um vendedor com base no valor vendido e taxa percentual.',
      parameters: {
        type: 'object',
        properties: {
          sale_value:   { type: 'number', description: 'Valor total da venda' },
          rate_percent: { type: 'number', description: 'Taxa de comissão em % (ex: 5 para 5%)' },
          base_salary:  { type: 'number', description: 'Salário base (opcional)' },
        },
        required: ['sale_value', 'rate_percent'],
      },
    },
    toolCode: `
function calculateCommission(input) {
  const commission = input.sale_value * (input.rate_percent / 100);
  const base = input.base_salary || 0;
  const total = base + commission;
  const fmt = n => 'R$ ' + n.toFixed(2).replace('.', ',');
  return { sale_value: input.sale_value, rate_percent: input.rate_percent, commission: Math.round(commission * 100) / 100, base_salary: base, total_earning: Math.round(total * 100) / 100, commission_formatted: fmt(commission), total_formatted: fmt(total) };
}
return calculateCommission(input);
    `.trim(),
  },

  {
    name: 'Calculadora de Desconto',
    description: 'Aplica desconto percentual ou fixo em um preço e mostra a economia',
    type: 'tool',
    category: 'sales',
    toolDefinition: {
      name: 'calculate_discount',
      description: 'Calcula preço final após desconto percentual ou fixo e exibe a economia para o cliente.',
      parameters: {
        type: 'object',
        properties: {
          original_price: { type: 'number', description: 'Preço original' },
          discount:       { type: 'number', description: 'Desconto a aplicar' },
          discount_type:  { type: 'string', description: '"percent" (padrão) ou "fixed"' },
        },
        required: ['original_price', 'discount'],
      },
    },
    toolCode: `
function calculateDiscount(input) {
  const isPercent = (input.discount_type || 'percent') === 'percent';
  const discountValue = isPercent ? input.original_price * (input.discount / 100) : input.discount;
  const finalPrice = Math.max(0, input.original_price - discountValue);
  const fmt = n => 'R$ ' + n.toFixed(2).replace('.', ',');
  return { original_price: input.original_price, discount_applied: Math.round(discountValue * 100) / 100, final_price: Math.round(finalPrice * 100) / 100, savings_percent: Math.round((discountValue / input.original_price) * 1000) / 10, original_formatted: fmt(input.original_price), discount_formatted: fmt(discountValue), final_formatted: fmt(finalPrice), pitch: 'De ' + fmt(input.original_price) + ' por apenas ' + fmt(finalPrice) + ' — economia de ' + fmt(discountValue) + '!' };
}
return calculateDiscount(input);
    `.trim(),
  },

  {
    name: 'Calculadora de LTV',
    description: 'Calcula o Lifetime Value (LTV) de um cliente',
    type: 'tool',
    category: 'sales',
    toolDefinition: {
      name: 'calculate_ltv',
      description: 'Calcula o LTV (Lifetime Value) de um cliente com base no ticket médio, frequência de compra e tempo de retenção.',
      parameters: {
        type: 'object',
        properties: {
          average_ticket:     { type: 'number', description: 'Ticket médio por compra' },
          purchases_per_year: { type: 'number', description: 'Número de compras por ano' },
          retention_years:    { type: 'number', description: 'Tempo médio de retenção do cliente (anos)' },
          margin_percent:     { type: 'number', description: 'Margem de lucro em % (opcional)' },
        },
        required: ['average_ticket', 'purchases_per_year', 'retention_years'],
      },
    },
    toolCode: `
function calculateLTV(input) {
  const ltv = input.average_ticket * input.purchases_per_year * input.retention_years;
  const margin = input.margin_percent ? ltv * (input.margin_percent / 100) : null;
  const fmt = n => 'R$ ' + n.toFixed(2).replace('.', ',');
  return { ltv: Math.round(ltv * 100) / 100, ltv_formatted: fmt(ltv), ltv_with_margin: margin !== null ? Math.round(margin * 100) / 100 : null, ltv_with_margin_formatted: margin !== null ? fmt(margin) : null, annual_value: Math.round(input.average_ticket * input.purchases_per_year * 100) / 100, insight: ltv > 10000 ? 'Cliente de alto valor — invista em retenção' : ltv > 1000 ? 'Cliente de valor médio — foque em aumentar frequência' : 'Cliente de baixo valor — considere upsell' };
}
return calculateLTV(input);
    `.trim(),
  },

  {
    name: 'Calculadora de CAC',
    description: 'Calcula o Custo de Aquisição de Cliente (CAC) e ratio LTV:CAC',
    type: 'tool',
    category: 'sales',
    toolDefinition: {
      name: 'calculate_cac',
      description: 'Calcula o CAC (Custo de Aquisição de Cliente) dividindo investimento total por clientes adquiridos.',
      parameters: {
        type: 'object',
        properties: {
          total_investment:   { type: 'number', description: 'Investimento total em marketing e vendas' },
          customers_acquired: { type: 'number', description: 'Número de clientes adquiridos no período' },
          ltv:                { type: 'number', description: 'LTV médio do cliente (opcional, para calcular ratio LTV:CAC)' },
        },
        required: ['total_investment', 'customers_acquired'],
      },
    },
    toolCode: `
function calculateCAC(input) {
  if (input.customers_acquired === 0) return { error: 'Número de clientes não pode ser zero' };
  const cac = input.total_investment / input.customers_acquired;
  const ltvCacRatio = input.ltv ? input.ltv / cac : null;
  const fmt = n => 'R$ ' + n.toFixed(2).replace('.', ',');
  const health = ltvCacRatio !== null ? (ltvCacRatio >= 3 ? 'Saudável (LTV:CAC ≥ 3:1)' : ltvCacRatio >= 1 ? 'Atenção (LTV:CAC < 3:1)' : 'Crítico (você perde dinheiro por cliente)') : 'Informe o LTV para análise';
  return { cac: Math.round(cac * 100) / 100, cac_formatted: fmt(cac), total_investment: input.total_investment, customers_acquired: input.customers_acquired, ltv_cac_ratio: ltvCacRatio !== null ? Math.round(ltvCacRatio * 10) / 10 : null, health_status: health, payback_months: input.ltv ? Math.ceil(cac / (input.ltv / 12)) : null };
}
return calculateCAC(input);
    `.trim(),
  },

  {
    name: 'Qualificador de Lead BANT',
    description: 'Pontua um lead pelo framework BANT (Budget, Authority, Need, Timeline)',
    type: 'tool',
    category: 'sales',
    toolDefinition: {
      name: 'qualify_lead_bant',
      description: 'Pontua um lead de 0 a 100 pelos critérios BANT: Budget, Authority, Need, Timeline.',
      parameters: {
        type: 'object',
        properties: {
          has_budget:        { type: 'boolean', description: 'O lead tem orçamento definido?' },
          is_decision_maker: { type: 'boolean', description: 'É o tomador de decisão?' },
          has_clear_need:    { type: 'boolean', description: 'Tem necessidade clara e definida?' },
          timeline_months:   { type: 'number', description: 'Prazo para decisão em meses (0 = imediato)' },
        },
        required: ['has_budget', 'is_decision_maker', 'has_clear_need', 'timeline_months'],
      },
    },
    toolCode: `
function qualifyLeadBANT(input) {
  const t = input.timeline_months;
  const scores = { budget: input.has_budget ? 30 : 0, authority: input.is_decision_maker ? 30 : 0, need: input.has_clear_need ? 25 : 0, timeline: t <= 1 ? 15 : t <= 3 ? 12 : t <= 6 ? 8 : t <= 12 ? 4 : 0 };
  const total = Object.values(scores).reduce((a, b) => a + b, 0);
  const tier = total >= 70 ? 'Hot — Priorize agora' : total >= 40 ? 'Warm — Nutra e acompanhe' : 'Cold — Coloque em automação';
  return { score: total, tier, breakdown: scores, recommended_action: total >= 70 ? 'Proposta imediata' : total >= 40 ? 'Demo + follow-up em 3 dias' : 'Email drip + requalificar em 30 dias', disqualifiers: [!input.has_budget && 'Sem orçamento', !input.is_decision_maker && 'Não é tomador de decisão', t > 12 && 'Prazo muito longo'].filter(Boolean) };
}
return qualifyLeadBANT(input);
    `.trim(),
  },

  {
    name: 'Calculadora de Churn',
    description: 'Calcula taxa de churn mensal e projeta impacto na receita',
    type: 'tool',
    category: 'sales',
    toolDefinition: {
      name: 'calculate_churn',
      description: 'Calcula churn rate mensal, MRR perdido e status de saúde da retenção.',
      parameters: {
        type: 'object',
        properties: {
          customers_start: { type: 'number', description: 'Clientes no início do período' },
          customers_lost:  { type: 'number', description: 'Clientes perdidos no período' },
          mrr:             { type: 'number', description: 'MRR atual (opcional, para calcular receita perdida)' },
        },
        required: ['customers_start', 'customers_lost'],
      },
    },
    toolCode: `
function calculateChurn(input) {
  if (input.customers_start === 0) return { error: 'Número inicial de clientes não pode ser zero' };
  const churnRate = input.customers_lost / input.customers_start;
  const churnPercent = Math.round(churnRate * 1000) / 10;
  const mrrLost = input.mrr ? Math.round((input.mrr / input.customers_start) * input.customers_lost * 100) / 100 : null;
  const fmt = n => 'R$ ' + n.toFixed(2).replace('.', ',');
  const health = churnPercent <= 2 ? 'Excelente (< 2%)' : churnPercent <= 5 ? 'Aceitável (2-5%)' : churnPercent <= 10 ? 'Preocupante (5-10%)' : 'Crítico (> 10%)';
  return { churn_rate_percent: churnPercent, retention_rate_percent: Math.round((1 - churnRate) * 1000) / 10, customers_lost: input.customers_lost, customers_remaining: input.customers_start - input.customers_lost, avg_lifetime_months: churnRate > 0 ? Math.round(1 / churnRate) : null, mrr_lost: mrrLost, mrr_lost_formatted: mrrLost !== null ? fmt(mrrLost) : null, health_status: health, benchmark: 'SaaS B2B saudável: < 2% ao mês.' };
}
return calculateChurn(input);
    `.trim(),
  },

  {
    name: 'Calculadora de MRR',
    description: 'Calcula e decompõe o Monthly Recurring Revenue (MRR)',
    type: 'tool',
    category: 'sales',
    toolDefinition: {
      name: 'calculate_mrr',
      description: 'Calcula MRR total, ARR, Net New MRR e crescimento com base em diferentes tipos de receita recorrente.',
      parameters: {
        type: 'object',
        properties: {
          new_mrr:         { type: 'number', description: 'MRR de novos clientes no mês' },
          expansion_mrr:   { type: 'number', description: 'MRR de expansão (upsell/cross-sell)' },
          churn_mrr:       { type: 'number', description: 'MRR perdido por churn' },
          contraction_mrr: { type: 'number', description: 'MRR perdido por downgrade' },
          starting_mrr:    { type: 'number', description: 'MRR no início do mês (opcional)' },
        },
        required: ['new_mrr', 'churn_mrr'],
      },
    },
    toolCode: `
function calculateMRR(input) {
  const newMRR = input.new_mrr || 0, expansionMRR = input.expansion_mrr || 0, churnMRR = input.churn_mrr || 0, contractionMRR = input.contraction_mrr || 0;
  const netNewMRR = newMRR + expansionMRR - churnMRR - contractionMRR;
  const endingMRR = (input.starting_mrr || 0) + netNewMRR;
  const arr = endingMRR * 12;
  const fmt = n => 'R$ ' + n.toFixed(2).replace('.', ',');
  const growthPercent = input.starting_mrr && input.starting_mrr > 0 ? Math.round((netNewMRR / input.starting_mrr) * 1000) / 10 : null;
  return { net_new_mrr: Math.round(netNewMRR * 100) / 100, ending_mrr: Math.round(endingMRR * 100) / 100, arr: Math.round(arr * 100) / 100, ending_mrr_formatted: fmt(endingMRR), arr_formatted: fmt(arr), net_new_mrr_formatted: fmt(netNewMRR), growth_percent: growthPercent, breakdown: { new_mrr: newMRR, expansion_mrr: expansionMRR, churn_mrr: -churnMRR, contraction_mrr: -contractionMRR }, health: netNewMRR > 0 ? 'Crescimento positivo' : netNewMRR === 0 ? 'Estagnado' : 'Encolhendo — reduza churn' };
}
return calculateMRR(input);
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
