'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  Plus, Trash2, Network, RefreshCw, Loader2,
  ChevronDown, ChevronRight, Copy, Check, ExternalLink,
  BookOpen, Server, Zap,
} from 'lucide-react'

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface McpServerTool {
  id: string
  name: string
  description: string | null
  inputSchema: Record<string, unknown> | null
}

interface McpServer {
  id: string
  name: string
  url: string
  description: string | null
  transport: string
  headers: Record<string, string>
  status: string
  createdAt: string
  tools: McpServerTool[]
}

interface CatalogItem {
  id: string
  name: string
  description: string
  category: string
  emoji: string
  urlTemplate: string
  headersTemplate: string
  difficulty: 'easy' | 'medium' | 'advanced'
  isHosted: boolean
  setupHint: string
  docsUrl: string
  tools: string[]
}

// ─── Catalog ──────────────────────────────────────────────────────────────────

const CATALOG_CATEGORIES = [
  { value: 'all',          label: 'Todos' },
  { value: 'development',  label: 'Desenvolvimento' },
  { value: 'data',         label: 'Dados & Banco' },
  { value: 'productivity', label: 'Produtividade' },
  { value: 'search',       label: 'Busca & Web' },
  { value: 'monitoring',   label: 'Monitoramento' },
  { value: 'payments',     label: 'Pagamentos' },
]

const DIFFICULTY: Record<string, { label: string; cls: string }> = {
  easy:     { label: 'Fácil',    cls: 'text-green-400 bg-green-500/15 border-green-500/25' },
  medium:   { label: 'Médio',    cls: 'text-yellow-400 bg-yellow-500/15 border-yellow-500/25' },
  advanced: { label: 'Avançado', cls: 'text-red-400 bg-red-500/15 border-red-500/25' },
}

const MCP_CATALOG: CatalogItem[] = [

  // ── Desenvolvimento ──────────────────────────────────────────────────────
  {
    id: 'github',
    name: 'GitHub',
    description: 'Gerencie repositórios, crie e revise PRs, abra issues e leia código diretamente do GitHub via API oficial.',
    category: 'development',
    emoji: '🐙',
    urlTemplate: 'http://localhost:3100',
    headersTemplate: '{"Authorization": "Bearer SEU_GITHUB_TOKEN"}',
    difficulty: 'easy',
    isHosted: false,
    setupHint: 'GITHUB_TOKEN=ghp_... npx -y @modelcontextprotocol/server-github',
    docsUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/github',
    tools: ['get_file_contents', 'create_pull_request', 'list_issues', 'search_repositories', 'create_issue'],
  },
  {
    id: 'filesystem',
    name: 'Filesystem',
    description: 'Leia e escreva arquivos e diretórios locais com controle granular de acesso a pastas autorizadas.',
    category: 'development',
    emoji: '📁',
    urlTemplate: 'http://localhost:3101',
    headersTemplate: '{}',
    difficulty: 'medium',
    isHosted: false,
    setupHint: 'npx -y @modelcontextprotocol/server-filesystem /caminho/permitido',
    docsUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem',
    tools: ['read_file', 'write_file', 'list_directory', 'create_directory', 'move_file', 'search_files'],
  },
  {
    id: 'playwright',
    name: 'Playwright',
    description: 'Automação de browsers: navegue, clique, preencha formulários, faça screenshots e extraia dados de qualquer site.',
    category: 'development',
    emoji: '🎭',
    urlTemplate: 'http://localhost:3102',
    headersTemplate: '{}',
    difficulty: 'medium',
    isHosted: false,
    setupHint: 'npx -y @executeautomation/playwright-mcp-server',
    docsUrl: 'https://github.com/executeautomation/mcp-playwright',
    tools: ['playwright_navigate', 'playwright_click', 'playwright_fill', 'playwright_screenshot', 'playwright_get_text'],
  },
  {
    id: 'sequential-thinking',
    name: 'Sequential Thinking',
    description: 'Melhora o raciocínio do agente em tarefas complexas com planejamento passo a passo e revisão estruturada de pensamentos.',
    category: 'development',
    emoji: '🧠',
    urlTemplate: 'http://localhost:3103',
    headersTemplate: '{}',
    difficulty: 'easy',
    isHosted: false,
    setupHint: 'npx -y @modelcontextprotocol/server-sequential-thinking',
    docsUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/sequentialthinking',
    tools: ['sequentialthinking'],
  },
  {
    id: 'e2b',
    name: 'E2B Code Sandbox',
    description: 'Execute código Python, JS e mais em sandbox seguro na nuvem. Ideal para análise de dados, scripts e experimentos.',
    category: 'development',
    emoji: '⚡',
    urlTemplate: 'https://mcp.e2b.dev',
    headersTemplate: '{"X-API-Key": "SEU_E2B_API_KEY"}',
    difficulty: 'easy',
    isHosted: true,
    setupHint: 'Hosted — obtenha sua API Key grátis em e2b.dev e configure o header.',
    docsUrl: 'https://github.com/e2b-dev/mcp-server',
    tools: ['run_code', 'create_sandbox', 'list_running_sandboxes'],
  },

  // ── Dados & Banco ────────────────────────────────────────────────────────
  {
    id: 'postgres',
    name: 'PostgreSQL',
    description: 'Execute queries SQL, explore schemas, leia e escreva dados em bancos PostgreSQL de forma segura.',
    category: 'data',
    emoji: '🐘',
    urlTemplate: 'http://localhost:3104',
    headersTemplate: '{}',
    difficulty: 'medium',
    isHosted: false,
    setupHint: 'POSTGRES_URL=postgresql://user:pass@host/db npx -y @modelcontextprotocol/server-postgres',
    docsUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/postgres',
    tools: ['query', 'list_tables', 'describe_table'],
  },
  {
    id: 'sqlite',
    name: 'SQLite',
    description: 'Execute queries e gerencie bancos SQLite locais — ideal para prototipagem rápida e análise de dados offline.',
    category: 'data',
    emoji: '🗄️',
    urlTemplate: 'http://localhost:3105',
    headersTemplate: '{}',
    difficulty: 'easy',
    isHosted: false,
    setupHint: 'npx -y @modelcontextprotocol/server-sqlite /path/to/database.sqlite',
    docsUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/sqlite',
    tools: ['read_query', 'write_query', 'create_table', 'list_tables', 'describe_table'],
  },
  {
    id: 'supabase',
    name: 'Supabase',
    description: 'Gerencie tabelas, storage, autenticação e edge functions diretamente no seu projeto Supabase.',
    category: 'data',
    emoji: '🟢',
    urlTemplate: 'http://localhost:3106',
    headersTemplate: '{"Authorization": "Bearer SEU_SUPABASE_SERVICE_KEY"}',
    difficulty: 'easy',
    isHosted: false,
    setupHint: 'SUPABASE_URL=https://xxx.supabase.co SUPABASE_KEY=eyJ... npx -y @supabase/mcp-server-supabase',
    docsUrl: 'https://github.com/supabase-community/supabase-mcp',
    tools: ['execute_sql', 'list_tables', 'list_edge_functions', 'get_logs'],
  },
  {
    id: 'mongodb',
    name: 'MongoDB',
    description: 'Interaja com coleções MongoDB e Atlas: queries, agregações, índices e insights com controle de acesso embutido.',
    category: 'data',
    emoji: '🍃',
    urlTemplate: 'http://localhost:3107',
    headersTemplate: '{}',
    difficulty: 'medium',
    isHosted: false,
    setupHint: 'MDB_MCP_CONNECTION_STRING=mongodb+srv://... npx -y mongodb-mcp-server',
    docsUrl: 'https://github.com/mongodb-js/mongodb-mcp-server',
    tools: ['find', 'insertOne', 'updateOne', 'deleteOne', 'aggregate', 'listCollections'],
  },
  {
    id: 'redis',
    name: 'Redis',
    description: 'Armazene e recupere dados em cache, gerencie filas e pub/sub — essencial para performance e sessões em aplicações modernas.',
    category: 'data',
    emoji: '🔴',
    urlTemplate: 'http://localhost:3127',
    headersTemplate: '{}',
    difficulty: 'medium',
    isHosted: false,
    setupHint: 'REDIS_URL=redis://localhost:6379 npx -y mcp-server-redis',
    docsUrl: 'https://github.com/modelcontextprotocol/servers',
    tools: ['get', 'set', 'delete', 'keys', 'hget', 'hset', 'lpush', 'lrange'],
  },

  // ── Produtividade ────────────────────────────────────────────────────────
  {
    id: 'notion',
    name: 'Notion',
    description: 'Leia, escreva e pesquise páginas, databases e blocos no Notion para automatizar documentação e gestão de conhecimento.',
    category: 'productivity',
    emoji: '📝',
    urlTemplate: 'http://localhost:3108',
    headersTemplate: '{"Authorization": "Bearer SEU_NOTION_TOKEN"}',
    difficulty: 'easy',
    isHosted: false,
    setupHint: 'NOTION_TOKEN=secret_... npx -y @notionhq/notion-mcp-server',
    docsUrl: 'https://github.com/makenotion/notion-mcp-server',
    tools: ['notion_search', 'notion_get_page', 'notion_create_page', 'notion_update_block', 'notion_query_database'],
  },
  {
    id: 'linear',
    name: 'Linear',
    description: 'Crie e gerencie issues, projetos e sprints no Linear — o gerenciador de tarefas favorito de times de produto modernos.',
    category: 'productivity',
    emoji: '🔷',
    urlTemplate: 'http://localhost:3109',
    headersTemplate: '{"Authorization": "Bearer SEU_LINEAR_API_KEY"}',
    difficulty: 'easy',
    isHosted: false,
    setupHint: 'LINEAR_API_KEY=lin_api_... npx -y mcp-server-linear',
    docsUrl: 'https://github.com/modelcontextprotocol/servers',
    tools: ['create_issue', 'list_issues', 'update_issue', 'get_teams', 'get_projects'],
  },
  {
    id: 'slack',
    name: 'Slack',
    description: 'Leia e envie mensagens, liste canais e pesquise conversas no Slack para integrar agentes ao seu time.',
    category: 'productivity',
    emoji: '💬',
    urlTemplate: 'http://localhost:3110',
    headersTemplate: '{}',
    difficulty: 'medium',
    isHosted: false,
    setupHint: 'SLACK_BOT_TOKEN=xoxb-... SLACK_TEAM_ID=T... npx -y @modelcontextprotocol/server-slack',
    docsUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/slack',
    tools: ['slack_list_channels', 'slack_post_message', 'slack_get_messages', 'slack_reply_to_thread'],
  },
  {
    id: 'zapier',
    name: 'Zapier',
    description: 'Acione qualquer um dos 7.000+ apps conectados ao Zapier — de Google Sheets a Salesforce — com um único MCP.',
    category: 'productivity',
    emoji: '⚡',
    urlTemplate: 'https://mcp.zapier.com',
    headersTemplate: '{"X-API-Key": "SEU_ZAPIER_API_KEY"}',
    difficulty: 'easy',
    isHosted: true,
    setupHint: 'Hosted — ative o MCP em zapier.com/mcp e use o endpoint fornecido.',
    docsUrl: 'https://zapier.com/mcp',
    tools: ['run_zap', 'list_zaps', 'trigger_workflow', 'get_zap_status'],
  },
  {
    id: 'google-calendar',
    name: 'Google Calendar',
    description: 'Crie, leia e gerencie eventos no Google Calendar — agende reuniões, verifique disponibilidade e envie convites automaticamente.',
    category: 'productivity',
    emoji: '📅',
    urlTemplate: 'http://localhost:3118',
    headersTemplate: '{}',
    difficulty: 'advanced',
    isHosted: false,
    setupHint: 'npx -y @modelcontextprotocol/server-google-calendar (requer OAuth2 via Google Cloud Console)',
    docsUrl: 'https://github.com/modelcontextprotocol/servers',
    tools: ['list_events', 'create_event', 'update_event', 'delete_event', 'check_availability'],
  },

  // ── Busca & Web ──────────────────────────────────────────────────────────
  {
    id: 'brave-search',
    name: 'Brave Search',
    description: 'Busque na web de forma privada via Brave Search API — sem rastreamento, gratuito até 2.000 queries/mês.',
    category: 'search',
    emoji: '🦁',
    urlTemplate: 'http://localhost:3111',
    headersTemplate: '{}',
    difficulty: 'easy',
    isHosted: false,
    setupHint: 'BRAVE_API_KEY=BSA... npx -y @modelcontextprotocol/server-brave-search',
    docsUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/brave-search',
    tools: ['brave_web_search', 'brave_local_search'],
  },
  {
    id: 'exa',
    name: 'Exa Search',
    description: 'Busca web otimizada para IA com resultados relevantes, busca semântica e acesso ao conteúdo completo das páginas.',
    category: 'search',
    emoji: '🔍',
    urlTemplate: 'http://localhost:3112',
    headersTemplate: '{"X-API-Key": "SEU_EXA_API_KEY"}',
    difficulty: 'easy',
    isHosted: false,
    setupHint: 'EXA_API_KEY=... npx -y exa-mcp-server',
    docsUrl: 'https://github.com/exa-labs/exa-mcp-server',
    tools: ['web_search', 'get_contents', 'find_similar', 'research_paper_search'],
  },
  {
    id: 'puppeteer',
    name: 'Puppeteer',
    description: 'Controle browsers headless para scraping, automação e captura de screenshots de qualquer página web.',
    category: 'search',
    emoji: '🤖',
    urlTemplate: 'http://localhost:3113',
    headersTemplate: '{}',
    difficulty: 'medium',
    isHosted: false,
    setupHint: 'npx -y @modelcontextprotocol/server-puppeteer',
    docsUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/puppeteer',
    tools: ['puppeteer_navigate', 'puppeteer_screenshot', 'puppeteer_click', 'puppeteer_fill', 'puppeteer_evaluate'],
  },
  {
    id: 'google-maps',
    name: 'Google Maps',
    description: 'Busque lugares, calcule rotas, geocodifique endereços e obtenha informações detalhadas de negócios via Google Maps.',
    category: 'search',
    emoji: '🗺️',
    urlTemplate: 'http://localhost:3114',
    headersTemplate: '{}',
    difficulty: 'easy',
    isHosted: false,
    setupHint: 'GOOGLE_MAPS_API_KEY=AIza... npx -y @modelcontextprotocol/server-google-maps',
    docsUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/google-maps',
    tools: ['maps_geocode', 'maps_reverse_geocode', 'maps_search_places', 'maps_place_details', 'maps_directions'],
  },
  {
    id: 'tavily',
    name: 'Tavily Search',
    description: 'Busca web otimizada para agentes de IA com respostas diretas, citações e suporte a pesquisa profunda em tempo real.',
    category: 'search',
    emoji: '🔎',
    urlTemplate: 'http://localhost:3119',
    headersTemplate: '{"X-Tavily-API-Key": "tvly-..."}',
    difficulty: 'easy',
    isHosted: false,
    setupHint: 'TAVILY_API_KEY=tvly-... npx -y tavily-mcp',
    docsUrl: 'https://github.com/tavily-ai/tavily-mcp',
    tools: ['tavily_search', 'tavily_extract', 'tavily_answer'],
  },

  // ── Monitoramento ────────────────────────────────────────────────────────
  {
    id: 'sentry',
    name: 'Sentry',
    description: 'Consulte erros, exceções e dados de performance do Sentry para acelerar o diagnóstico e resolução de bugs em produção.',
    category: 'monitoring',
    emoji: '🔥',
    urlTemplate: 'http://localhost:3115',
    headersTemplate: '{}',
    difficulty: 'easy',
    isHosted: false,
    setupHint: 'SENTRY_AUTH_TOKEN=sntrys_... npx -y @modelcontextprotocol/server-sentry',
    docsUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/sentry',
    tools: ['get_sentry_issue', 'list_sentry_issues', 'get_sentry_event'],
  },
  {
    id: 'cloudflare',
    name: 'Cloudflare',
    description: 'Gerencie Workers, D1, KV, R2 e DNS diretamente via API da Cloudflare — infra edge na ponta dos dedos.',
    category: 'monitoring',
    emoji: '🌐',
    urlTemplate: 'http://localhost:3116',
    headersTemplate: '{"Authorization": "Bearer SEU_CF_TOKEN"}',
    difficulty: 'medium',
    isHosted: false,
    setupHint: 'CLOUDFLARE_API_TOKEN=... npx -y @cloudflare/mcp-server-cloudflare',
    docsUrl: 'https://github.com/cloudflare/mcp-server-cloudflare',
    tools: ['worker_list', 'worker_get', 'kv_list', 'r2_list', 'd1_query'],
  },
  {
    id: 'datadog',
    name: 'Datadog',
    description: 'Monitore métricas, logs, traces e dashboards de aplicações em produção via API do Datadog.',
    category: 'monitoring',
    emoji: '🐶',
    urlTemplate: 'http://localhost:3120',
    headersTemplate: '{"DD-API-KEY": "SEU_DD_API_KEY", "DD-APPLICATION-KEY": "SEU_DD_APP_KEY"}',
    difficulty: 'medium',
    isHosted: false,
    setupHint: 'DD_API_KEY=... DD_APP_KEY=... npx -y datadog-mcp-server',
    docsUrl: 'https://github.com/DataDog/datadog-mcp-server',
    tools: ['list_monitors', 'query_metrics', 'search_logs', 'get_dashboard', 'list_incidents'],
  },
  {
    id: 'grafana',
    name: 'Grafana',
    description: 'Consulte dashboards, alertas e explore dados de séries temporais diretamente via API do Grafana.',
    category: 'monitoring',
    emoji: '📊',
    urlTemplate: 'http://localhost:3121',
    headersTemplate: '{"Authorization": "Bearer SEU_GRAFANA_TOKEN"}',
    difficulty: 'medium',
    isHosted: false,
    setupHint: 'GRAFANA_URL=http://localhost:3000 GRAFANA_TOKEN=glsa_... npx -y grafana-mcp-server',
    docsUrl: 'https://github.com/grafana/mcp-grafana',
    tools: ['list_dashboards', 'get_dashboard', 'list_alerts', 'query_datasource', 'create_annotation'],
  },
  {
    id: 'axiom',
    name: 'Axiom',
    description: 'Pesquise e analise logs e eventos em tempo real com APL (Axiom Processing Language) — observabilidade moderna para apps.',
    category: 'monitoring',
    emoji: '🪓',
    urlTemplate: 'http://localhost:3122',
    headersTemplate: '{"Authorization": "Bearer SEU_AXIOM_TOKEN"}',
    difficulty: 'easy',
    isHosted: false,
    setupHint: 'AXIOM_TOKEN=xaat-... AXIOM_ORG_ID=... npx -y axiom-mcp',
    docsUrl: 'https://github.com/axiomhq/axiom-mcp',
    tools: ['axiom_query', 'list_datasets', 'ingest_event', 'get_dataset_info'],
  },

  // ── Pagamentos ───────────────────────────────────────────────────────────
  {
    id: 'stripe',
    name: 'Stripe',
    description: 'Consulte clientes, pagamentos, assinaturas, reembolsos e disputas diretamente na sua conta Stripe.',
    category: 'payments',
    emoji: '💳',
    urlTemplate: 'http://localhost:3117',
    headersTemplate: '{"Authorization": "Bearer SEU_STRIPE_SECRET_KEY"}',
    difficulty: 'easy',
    isHosted: false,
    setupHint: 'STRIPE_API_KEY=sk_... npx -y @stripe/mcp-server',
    docsUrl: 'https://github.com/stripe/agent-toolkit',
    tools: ['list_customers', 'get_payment', 'list_subscriptions', 'create_refund', 'list_invoices'],
  },
  {
    id: 'mercadopago',
    name: 'Mercado Pago',
    description: 'Consulte pagamentos, cobranças, assinaturas e transações PIX na maior plataforma de pagamentos da América Latina.',
    category: 'payments',
    emoji: '💙',
    urlTemplate: 'http://localhost:3123',
    headersTemplate: '{"Authorization": "Bearer SEU_MP_ACCESS_TOKEN"}',
    difficulty: 'easy',
    isHosted: false,
    setupHint: 'MP_ACCESS_TOKEN=APP_USR-... npx -y mercadopago-mcp-server',
    docsUrl: 'https://developers.mercadopago.com',
    tools: ['list_payments', 'get_payment', 'create_preference', 'list_subscriptions', 'search_payments'],
  },
  {
    id: 'paypal',
    name: 'PayPal',
    description: 'Consulte transações, reembolsos, disputas e dados de clientes via API do PayPal — suporte a sandbox e produção.',
    category: 'payments',
    emoji: '🅿️',
    urlTemplate: 'http://localhost:3124',
    headersTemplate: '{"Authorization": "Bearer SEU_PAYPAL_TOKEN"}',
    difficulty: 'medium',
    isHosted: false,
    setupHint: 'PAYPAL_CLIENT_ID=... PAYPAL_SECRET=... npx -y paypal-mcp-server',
    docsUrl: 'https://developer.paypal.com',
    tools: ['list_transactions', 'get_order', 'create_order', 'capture_payment', 'list_disputes'],
  },
  {
    id: 'shopify',
    name: 'Shopify',
    description: 'Gerencie pedidos, produtos, clientes e estoque de lojas Shopify diretamente via Admin API.',
    category: 'payments',
    emoji: '🛍️',
    urlTemplate: 'http://localhost:3125',
    headersTemplate: '{"X-Shopify-Access-Token": "shpat_..."}',
    difficulty: 'medium',
    isHosted: false,
    setupHint: 'SHOPIFY_STORE=minha-loja.myshopify.com SHOPIFY_TOKEN=shpat_... npx -y shopify-mcp-server',
    docsUrl: 'https://github.com/shopify/dev-mcp',
    tools: ['list_orders', 'get_order', 'list_products', 'update_inventory', 'list_customers'],
  },
  {
    id: 'pagseguro',
    name: 'PagSeguro / PagBank',
    description: 'Consulte cobranças, transações e assinaturas no PagSeguro — a principal solução de pagamentos brasileira.',
    category: 'payments',
    emoji: '🟡',
    urlTemplate: 'http://localhost:3126',
    headersTemplate: '{"Authorization": "Bearer SEU_PAGSEGURO_TOKEN"}',
    difficulty: 'medium',
    isHosted: false,
    setupHint: 'PAGSEGURO_TOKEN=... npx -y pagseguro-mcp-server',
    docsUrl: 'https://dev.pagseguro.uol.com.br',
    tools: ['list_charges', 'get_charge', 'create_charge', 'list_subscriptions', 'get_transaction'],
  },
]

const defaultForm = {
  name: '',
  url: '',
  description: '',
  headers: '{}',
  setupHint: '',
  fromCatalogId: '',
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function McpPage() {
  const [servers, setServers] = useState<McpServer[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [syncingId, setSyncingId] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [expandedTools, setExpandedTools] = useState<Record<string, boolean>>({})
  const [form, setForm] = useState(defaultForm)
  const [copied, setCopied] = useState(false)
  const [sofiaUrl, setSofiaUrl] = useState('')
  const [catalogCategory, setCatalogCategory] = useState('all')

  useEffect(() => {
    if (typeof window !== 'undefined') setSofiaUrl(`${window.location.origin}/api/mcp`)
    fetchServers()
  }, [])

  const fetchServers = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/mcp/servers')
      const data = await res.json()
      if (data.success) setServers(data.data ?? [])
    } catch (error) {
      console.error('Error fetching MCP servers:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!form.name || !form.url) { alert('Nome e URL são obrigatórios'); return }
    let parsedHeaders: Record<string, string> = {}
    try { parsedHeaders = JSON.parse(form.headers) } catch { alert('Headers deve ser um JSON válido'); return }

    setSaving(true)
    try {
      const res = await fetch('/api/mcp/servers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, url: form.url, description: form.description, headers: parsedHeaders }),
      })
      const data = await res.json()
      if (data.success) { setShowModal(false); setForm(defaultForm); fetchServers() }
      else alert(data.error || 'Erro ao criar servidor MCP')
    } catch { alert('Erro de conexão') }
    finally { setSaving(false) }
  }

  const handleDelete = async (serverId: string) => {
    if (!confirm('Tem certeza que deseja remover este servidor MCP?')) return
    try { await fetch(`/api/mcp/servers/${serverId}`, { method: 'DELETE' }); fetchServers() }
    catch (error) { console.error('Error deleting MCP server:', error) }
  }

  const handleToggle = async (server: McpServer) => {
    setTogglingId(server.id)
    try {
      await fetch(`/api/mcp/servers/${server.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: server.status === 'active' ? 'inactive' : 'active' }),
      })
      fetchServers()
    } catch (error) { console.error('Error toggling MCP server:', error) }
    finally { setTogglingId(null) }
  }

  const handleSyncTools = async (serverId: string) => {
    setSyncingId(serverId)
    try {
      const res = await fetch(`/api/mcp/servers/${serverId}/tools`)
      const data = await res.json()
      if (data.success) { fetchServers(); setExpandedTools((prev) => ({ ...prev, [serverId]: true })) }
      else alert(data.error || 'Erro ao sincronizar tools')
    } catch { alert('Erro de conexão ao sincronizar tools') }
    finally { setSyncingId(null) }
  }

  const handleCopyUrl = async () => {
    try { await navigator.clipboard.writeText(sofiaUrl); setCopied(true); setTimeout(() => setCopied(false), 2000) }
    catch { /* ignore */ }
  }

  const openFromCatalog = (item: CatalogItem) => {
    setForm({
      name: item.name,
      url: item.urlTemplate,
      description: item.description.slice(0, 120),
      headers: item.headersTemplate,
      setupHint: item.setupHint,
      fromCatalogId: item.id,
    })
    setShowModal(true)
  }

  const openBlank = () => {
    setForm(defaultForm)
    setShowModal(true)
  }

  const connectedIds = useMemo(() => new Set(servers.map((s) => s.name.toLowerCase())), [servers])

  const filteredCatalog = useMemo(() =>
    catalogCategory === 'all'
      ? MCP_CATALOG
      : MCP_CATALOG.filter((c) => c.category === catalogCategory),
    [catalogCategory]
  )

  return (
    <div className="space-y-8 p-6">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">MCP Servers</h1>
          <p className="text-white/60 text-sm mt-1">
            Conecte servidores Model Context Protocol para expandir as capacidades dos agentes
          </p>
        </div>
        <button
          onClick={openBlank}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Conectar Servidor
        </button>
      </div>

      {/* ── Info box ───────────────────────────────────────────────────────── */}
      <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
        <p className="text-white/80 text-sm">
          <strong className="text-white">Model Context Protocol (MCP)</strong> é um padrão aberto da Anthropic que permite agentes se conectarem a servidores externos que expõem tools padronizadas via JSON-RPC 2.0.
          Escolha um servidor da biblioteca abaixo ou conecte um servidor personalizado.
        </p>
      </div>

      {/* ── Biblioteca de MCPs ─────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="w-5 h-5 text-purple-400" />
          <h2 className="text-lg font-semibold text-white">Biblioteca de MCPs</h2>
          <span className="text-sm font-normal text-white/40">({MCP_CATALOG.length} servidores)</span>
        </div>

        {/* Category filter */}
        <div className="flex items-center gap-2 flex-wrap mb-5">
          {CATALOG_CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setCatalogCategory(cat.value)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
                catalogCategory === cat.value
                  ? 'bg-purple-500/30 text-purple-300 border-purple-500/40'
                  : 'bg-white/5 text-white/50 border-white/10 hover:bg-white/10 hover:text-white/70'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Catalog grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filteredCatalog.map((item) => {
            const diff = DIFFICULTY[item.difficulty]
            const isConnected = connectedIds.has(item.name.toLowerCase())
            return (
              <div
                key={item.id}
                className="p-4 bg-white/5 border border-white/10 rounded-xl hover:border-white/20 transition-colors flex flex-col gap-3"
              >
                {/* Card header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl leading-none">{item.emoji}</span>
                    <div>
                      <h3 className="font-semibold text-white text-sm">{item.name}</h3>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${diff.cls}`}>
                          {diff.label}
                        </span>
                        {item.isHosted && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full border text-blue-400 bg-blue-500/15 border-blue-500/25 font-medium">
                            Hosted
                          </span>
                        )}
                        {isConnected && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full border text-green-400 bg-green-500/15 border-green-500/25 font-medium">
                            ✓ Conectado
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <a
                    href={item.docsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/10 transition-colors flex-shrink-0"
                    title="Ver documentação"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>

                {/* Description */}
                <p className="text-white/55 text-xs leading-relaxed line-clamp-2">{item.description}</p>

                {/* Tools preview */}
                <div className="flex flex-wrap gap-1">
                  {item.tools.slice(0, 3).map((t) => (
                    <code key={t} className="text-[10px] px-1.5 py-0.5 bg-black/30 rounded text-blue-300/70 font-mono">
                      {t}
                    </code>
                  ))}
                  {item.tools.length > 3 && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-black/20 rounded text-white/30">
                      +{item.tools.length - 3}
                    </span>
                  )}
                </div>

                {/* Action */}
                <button
                  onClick={() => openFromCatalog(item)}
                  className="mt-auto w-full py-1.5 rounded-lg bg-purple-500/20 hover:bg-purple-500/35 border border-purple-500/30 text-purple-300 text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
                >
                  <Zap className="w-3.5 h-3.5" />
                  {isConnected ? 'Conectar outra instância' : 'Conectar este MCP'}
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Polaris IA como Servidor MCP ────────────────────────────────────────── */}
      <div className="p-5 bg-white/5 border border-white/10 rounded-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-purple-500/20">
            <Server className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h2 className="text-white font-semibold">Polaris IA como Servidor MCP</h2>
            <p className="text-white/50 text-sm">Exponha os agentes da Polaris IA para sistemas externos via protocolo MCP</p>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <p className="text-xs text-white/40 mb-1">Endpoint MCP</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-black/40 rounded-lg px-3 py-2 text-green-400 text-sm font-mono">
                {sofiaUrl || 'Carregando...'}
              </code>
              <button
                onClick={handleCopyUrl}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                title="Copiar URL"
              >
                {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <p className="text-xs text-white/40 mb-1">Autenticação</p>
            <code className="block bg-black/40 rounded-lg px-3 py-2 text-yellow-400 text-sm font-mono">
              X-API-Key: sua-api-key
            </code>
            <p className="text-xs text-white/30 mt-1">
              Obtenha sua API Key em{' '}
              <a href="/dashboard/api-keys" className="text-blue-400 hover:underline">
                Configurações {'>'} API Keys
              </a>
            </p>
          </div>

          <div>
            <p className="text-xs text-white/40 mb-2">Tools expostas</p>
            <div className="grid grid-cols-2 gap-2">
              {['list_agents', 'call_agent', 'search_knowledge', 'publish_threads'].map((tool) => (
                <div key={tool} className="flex items-center gap-2 bg-black/30 rounded-lg px-3 py-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400 flex-shrink-0" />
                  <code className="text-purple-300 text-xs font-mono">{tool}</code>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Servidores Conectados ──────────────────────────────────────────── */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
          <Network className="w-5 h-5 text-blue-400" />
          Servidores Conectados
          <span className="text-sm font-normal text-white/40">({servers.length})</span>
        </h2>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-white/40" />
          </div>
        ) : servers.length === 0 ? (
          <div className="text-center py-10 text-white/40 bg-white/5 border border-white/10 rounded-lg">
            <Network className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Nenhum servidor MCP conectado ainda.</p>
            <p className="text-xs mt-1 text-white/30">Escolha um da biblioteca acima ou clique em &ldquo;Conectar Servidor&rdquo;.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {servers.map((server) => (
              <div key={server.id} className="p-4 bg-white/5 border border-white/10 rounded-lg">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${server.status === 'active' ? 'bg-green-400' : 'bg-white/20'}`} />
                      <h3 className="font-medium text-white">{server.name}</h3>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/50">{server.transport}</span>
                      <span className="text-xs text-white/40">
                        {server.tools.length} tool{server.tools.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <p className="text-white/40 text-xs font-mono mb-1 truncate">{server.url}</p>
                    {server.description && <p className="text-white/60 text-sm">{server.description}</p>}

                    {server.tools.length > 0 && (
                      <div className="mt-3">
                        <button
                          onClick={() => setExpandedTools((prev) => ({ ...prev, [server.id]: !prev[server.id] }))}
                          className="flex items-center gap-1 text-xs text-white/40 hover:text-white/70 transition-colors"
                        >
                          {expandedTools[server.id] ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                          Ver tools ({server.tools.length})
                        </button>
                        {expandedTools[server.id] && (
                          <div className="mt-2 grid grid-cols-1 gap-1.5">
                            {server.tools.map((tool) => (
                              <div key={tool.id} className="bg-black/30 rounded-lg px-3 py-2">
                                <div className="flex items-center gap-2">
                                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                                  <code className="text-blue-300 text-xs font-mono">{tool.name}</code>
                                </div>
                                {tool.description && <p className="text-white/40 text-xs mt-0.5 ml-3.5">{tool.description}</p>}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleSyncTools(server.id)}
                      disabled={syncingId === server.id}
                      className="p-1.5 rounded-lg text-blue-400/60 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                      title="Sincronizar tools"
                    >
                      {syncingId === server.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => handleToggle(server)}
                      disabled={togglingId === server.id}
                      className={`relative flex h-6 w-11 flex-shrink-0 items-center justify-start rounded-full p-[2px] transition-all duration-300 ease-in-out focus:outline-none ${
                        server.status === 'active'
                          ? 'bg-gradient-to-r from-blue-500 to-indigo-500 shadow-[0_0_12px_rgba(59,130,246,0.6)]'
                          : 'bg-white/10 hover:bg-white/20'
                      } ${togglingId === server.id ? 'opacity-50 cursor-wait' : 'cursor-pointer hover:scale-105'}`}
                      title={server.status === 'active' ? 'Desabilitar' : 'Habilitar'}
                    >
                      <span className={`flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-sm transition-transform duration-300 ease-in-out ${server.status === 'active' ? 'translate-x-5' : 'translate-x-0'}`}>
                        {togglingId === server.id && <Loader2 className={`h-3 w-3 animate-spin ${server.status === 'active' ? 'text-indigo-500' : 'text-gray-500'}`} />}
                      </span>
                    </button>
                    <button
                      onClick={() => handleDelete(server.id)}
                      className="p-1.5 rounded-lg text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      title="Remover servidor"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Modal ──────────────────────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0f0f10] border border-white/10 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 space-y-4">
              <h2 className="text-xl font-bold text-white">
                {form.fromCatalogId ? `Conectar: ${form.name}` : 'Conectar Servidor MCP'}
              </h2>

              {/* Setup hint from catalog */}
              {form.setupHint && (
                <div className="p-3 bg-black/40 border border-white/10 rounded-lg">
                  <p className="text-xs text-white/40 mb-1.5 font-medium uppercase tracking-wider">Como iniciar o servidor</p>
                  <code className="text-xs text-green-400 font-mono whitespace-pre-wrap break-all">{form.setupHint}</code>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="text-sm text-white/60 block mb-1">Nome *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Ex: GitHub MCP, Postgres Dev..."
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-white/20 focus:outline-none focus:border-blue-500/50"
                  />
                </div>

                <div>
                  <label className="text-sm text-white/60 block mb-1">URL *</label>
                  <input
                    type="url"
                    value={form.url}
                    onChange={(e) => setForm({ ...form, url: e.target.value })}
                    placeholder="https://meu-servidor-mcp.com/mcp"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-white/20 focus:outline-none focus:border-blue-500/50 font-mono"
                  />
                  {form.fromCatalogId && (
                    <p className="text-xs text-white/30 mt-1">Ajuste a porta/host conforme onde você iniciou o servidor.</p>
                  )}
                </div>

                <div>
                  <label className="text-sm text-white/60 block mb-1">Descrição</label>
                  <input
                    type="text"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Para que serve este servidor?"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-white/20 focus:outline-none focus:border-blue-500/50"
                  />
                </div>

                <div>
                  <label className="text-sm text-white/60 block mb-1">Headers HTTP (JSON)</label>
                  <textarea
                    value={form.headers}
                    onChange={(e) => setForm({ ...form, headers: e.target.value })}
                    rows={4}
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-yellow-400 text-xs font-mono placeholder-white/20 focus:outline-none focus:border-blue-500/50 resize-none"
                    spellCheck={false}
                  />
                  <p className="text-xs text-white/30 mt-1">
                    Substitua os valores de placeholder pelas suas credenciais reais.
                  </p>
                </div>
              </div>

              <p className="text-xs text-white/30">
                Ao conectar, as tools do servidor serão sincronizadas automaticamente.
              </p>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => { setShowModal(false); setForm(defaultForm) }}
                  className="flex-1 py-2 bg-white/5 hover:bg-white/10 text-white/70 rounded-lg text-sm transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreate}
                  disabled={saving}
                  className="flex-1 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Conectar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
