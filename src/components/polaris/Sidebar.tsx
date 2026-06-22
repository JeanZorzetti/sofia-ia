'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  MessageSquare,
  MessageCircle,
  Bot,
  Workflow,
  CreditCard,
  Inbox,
  Database,
  BarChart3,
  Plug,
  LayoutTemplate,
  Settings,
  FlaskConical,
  Activity,
  Store,
  Terminal,
  Layers,
  Key,
  Gift,
  Building2,
  ChevronDown,
  Plus,
  User,
  TrendingUp,
  Sparkles,
  Network,
  CalendarDays,
  BarChart2,
  Megaphone,
  Code2,
  Cpu,
  Users2,
} from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

interface OrgItem {
  id: string
  name: string
  slug: string
  role: string
}

type MenuItem = {
  href: string
  label: string
  icon: React.ElementType
  // 'principal' = Teams (a feature principal); 'teams' = surface que roda através do Teams
  badge?: 'principal' | 'teams'
}

type MenuSection = {
  label: string | null
  items: MenuItem[]
}

const menuSections: MenuSection[] = [
  {
    label: null,
    items: [
      { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
    ],
  },
  {
    // A feature principal. Os surfaces abaixo rodam através do Teams (Fases 1-3 da subordinação).
    label: 'Teams',
    items: [
      { href: '/dashboard/teams',             label: 'Teams',     icon: Users2,    badge: 'principal' },
      { href: '/dashboard/conversations',     label: 'Conversas', icon: Inbox,     badge: 'teams' },
      { href: '/dashboard/workflows',         label: 'Workflows', icon: Workflow,  badge: 'teams' },
      { href: '/dashboard/threads/campaigns', label: 'Campanhas', icon: Megaphone, badge: 'teams' },
    ],
  },
  {
    // Capacidades que os agentes de um time usam (era "Plataforma").
    label: 'Capacidades',
    items: [
      { href: '/dashboard/agents',       label: 'Agentes de IA', icon: Bot },
      { href: '/dashboard/skills',       label: 'Skills',        icon: Sparkles },
      { href: '/dashboard/mcp',          label: 'MCP Servers',   icon: Network },
      { href: '/dashboard/knowledge',    label: 'Knowledge Base', icon: Database },
      { href: '/dashboard/models',       label: 'Modelos',       icon: Cpu },
      { href: '/dashboard/files',        label: 'IDE',           icon: Terminal },
      { href: '/dashboard/integrations', label: 'Integrações',   icon: Plug },
    ],
  },
  {
    label: 'Threads',
    items: [
      { href: '/dashboard/threads/calendar',  label: 'Calendário', icon: CalendarDays },
      { href: '/dashboard/threads/analytics', label: 'Analytics',  icon: BarChart2 },
    ],
  },
  {
    label: 'Crescimento',
    items: [
      { href: '/dashboard/analytics',  label: 'Analytics',    icon: BarChart3 },
      { href: '/dashboard/ab-tests',   label: 'A/B Tests',    icon: FlaskConical },
      { href: '/dashboard/monitoring', label: 'Monitoramento', icon: Activity },
    ],
  },
  {
    label: 'Distribuição',
    items: [
      { href: '/dashboard/whatsapp',   label: 'WhatsApp',   icon: MessageSquare },
      { href: '/dashboard/templates',  label: 'Templates',  icon: LayoutTemplate },
      { href: '/dashboard/marketplace', label: 'Marketplace', icon: Store },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { href: '/dashboard/billing',    label: 'Billing',       icon: CreditCard },
      { href: '/dashboard/whitelabel', label: 'White-label',   icon: Layers },
      { href: '/dashboard/api-keys',   label: 'API Keys',      icon: Key },
      { href: '/dashboard/settings',   label: 'Configurações', icon: Settings },
      { href: '/dashboard/dev-chat',   label: 'Dev Playground', icon: Code2 },
    ],
  },
]

interface UsageData {
  plan: string
  planData: { name: string }
  agents: { current: number; limit: number; percentage: number }
  messages: { current: number; limit: number; percentage: number }
  knowledgeBases: { current: number; limit: number; percentage: number }
  userId?: string
}

// Visibilidade dirigida por CSS. `expanded` = hover (overlay, via group-hover do
// Tailwind v4, já restrito a @media (hover: hover)) OU `pinned` (estado React).
// Conteúdo permanece sempre montado no DOM; só a visibilidade muda — substitui o
// antigo `{!collapsed && ...}`. A parte `pinned && ...` fica inerte no MVP (US1)
// e é ligada por US3 (controle de fixar + persistência).
//
// IMPORTANTE: classes COMPLETAS e literais — o scanner do Tailwind v4 não detecta
// nomes de classe montados dinamicamente (ex.: `group-hover/sb:${x}`).
const EXPAND = {
  block: 'hidden group-hover/sb:block',
  flex: 'hidden group-hover/sb:flex',
  inline: 'hidden group-hover/sb:inline',
} as const

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  // Preferência de sidebar fixada (US3 liga o controle + persistência). No MVP
  // (US1) permanece `false`: a expansão é exclusivamente por hover (CSS).
  const [pinned] = useState(false)
  const [usage, setUsage] = useState<UsageData | null>(null)
  const [orgs, setOrgs] = useState<OrgItem[]>([])
  const [activeWorkspace, setActiveWorkspace] = useState<string>('personal')

  useEffect(() => {
    fetch('/api/user/usage')
      .then((r) => r.json())
      .then((data) => { if (data.plan) setUsage(data) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetch('/api/organizations')
      .then((r) => r.json())
      .then((data) => { if (data.success) setOrgs(data.data) })
      .catch(() => {})
  }, [])

  const handleWorkspaceChange = (orgSlug: string | 'personal') => {
    setActiveWorkspace(orgSlug)
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('sofia_active_workspace', orgSlug)
      }
    } catch { /* ignore */ }
    router.refresh()
  }

  const currentWorkspaceName =
    activeWorkspace === 'personal'
      ? 'Pessoal'
      : orgs.find((o) => o.slug === activeWorkspace)?.name || 'Pessoal'

  return (
    <TooltipProvider>
      {/*
        Footprint do rail no fluxo flex: w-20 (rail) ou w-64 (fixado, empurra o
        <main>). O painel interno absoluto cresce sobre o conteúdo no hover SEM
        alterar este footprint → zero layout shift (FR-003/SC-003).
      */}
      <aside
        data-pinned={pinned}
        className={cn(
          'group/sb relative hidden h-full shrink-0 lg:block w-20 transition-[width] duration-300 ease-out',
          pinned && 'w-64'
        )}
      >
        {/*
          z-[60] coloca o painel ACIMA da Navbar (sticky z-50): no hover o painel
          cresce sobre a faixa da navbar; sem isso o topo do painel (workspace
          selector) ficaria escondido atrás dela. O dropdown de workspace usa
          z-[70] para ficar acima do painel.
        */}
        <div
          className={cn(
            'absolute inset-y-0 left-0 z-[60] flex w-20 flex-col overflow-hidden border-r border-sidebar-border bg-sidebar transition-[width] duration-300 ease-out group-hover/sb:w-64',
            pinned ? 'w-64' : 'group-hover/sb:shadow-2xl group-hover/sb:shadow-black/50'
          )}
        >
          <div className="flex flex-1 flex-col gap-2 p-3 overflow-hidden">
            {/* Workspace Selector — visível apenas quando expandida */}
            <div className={cn('mb-1', EXPAND.block, pinned && 'block')}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 w-full px-3 py-2 rounded-lg hover:bg-sidebar-accent/30 transition-colors group">
                    <div className="h-6 w-6 rounded bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center flex-shrink-0">
                      {activeWorkspace === 'personal' ? (
                        <User className="h-3.5 w-3.5 text-white" />
                      ) : (
                        <Building2 className="h-3.5 w-3.5 text-white" />
                      )}
                    </div>
                    <span className="text-sm font-medium text-foreground flex-1 text-left truncate">
                      {currentWorkspaceName}
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 text-foreground-tertiary flex-shrink-0" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56 z-[70]">
                  <DropdownMenuLabel className="text-xs text-foreground-tertiary uppercase tracking-wide">
                    Workspace
                  </DropdownMenuLabel>
                  <DropdownMenuItem
                    onClick={() => handleWorkspaceChange('personal')}
                    className={cn(activeWorkspace === 'personal' && 'bg-sidebar-accent/50')}
                  >
                    <User className="h-4 w-4 mr-2" />
                    Pessoal
                  </DropdownMenuItem>
                  {orgs.length > 0 && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuLabel className="text-xs text-foreground-tertiary uppercase tracking-wide">
                        Organizações
                      </DropdownMenuLabel>
                      {orgs.map((org) => (
                        <DropdownMenuItem
                          key={org.slug}
                          onClick={() => handleWorkspaceChange(org.slug)}
                          className={cn(activeWorkspace === org.slug && 'bg-sidebar-accent/50')}
                        >
                          <Building2 className="h-4 w-4 mr-2" />
                          <span className="truncate">{org.name}</span>
                        </DropdownMenuItem>
                      ))}
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/settings/team" className="flex items-center">
                      <Plus className="h-4 w-4 mr-2" />
                      Nova Organização
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Eyebrow "Menu" — apenas expandida */}
            <div className={cn('mb-1 px-1', EXPAND.block, pinned && 'block')}>
              <div className="text-[10px] font-semibold text-foreground-tertiary uppercase tracking-widest">
                Menu
              </div>
            </div>

            {/* Scrollable nav area */}
            <nav className="flex flex-col gap-3 flex-1 overflow-y-auto sidebar-scroll pr-0.5">
              {menuSections.map((section, si) => (
                <div key={si} className="flex flex-col gap-0.5">
                  {/* Rótulo da seção (expandida) ou divisor (rail) */}
                  {section.label && (
                    <>
                      <div
                        className={cn(
                          'px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-widest text-foreground-tertiary',
                          EXPAND.block,
                          pinned && 'block'
                        )}
                      >
                        {section.label}
                      </div>
                      {si > 0 && (
                        <div
                          className={cn(
                            'mx-3 my-1.5 border-t border-sidebar-border/50',
                            'block group-hover/sb:hidden',
                            pinned && 'hidden'
                          )}
                        />
                      )}
                    </>
                  )}

                  {section.items.map((item) => {
                    const isActive =
                      item.href === '/dashboard'
                        ? pathname === '/dashboard'
                        : pathname === item.href || pathname.startsWith(item.href + '/')
                    const Icon = item.icon

                    return (
                      <Tooltip key={item.href}>
                        <TooltipTrigger asChild>
                          <Link
                            href={item.href}
                            className={cn(
                              'hover-scale flex items-center gap-3 rounded-lg py-2 text-sm font-medium transition-all',
                              'justify-center px-0 group-hover/sb:justify-start group-hover/sb:px-3',
                              pinned && 'justify-start px-3',
                              isActive
                                ? 'bg-sidebar-accent text-white'
                                : 'text-foreground-secondary hover:bg-sidebar-accent/50 hover:text-foreground'
                            )}
                          >
                            <Icon className="h-[18px] w-[18px] flex-shrink-0" />
                            <span className={cn('truncate', EXPAND.block, pinned && 'block')}>
                              {item.label}
                            </span>
                            {item.badge === 'principal' && (
                              <span
                                className={cn(
                                  'ml-auto rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide bg-gradient-to-r from-purple-500/25 to-blue-500/25 text-purple-200 border border-purple-400/30',
                                  EXPAND.inline,
                                  pinned && 'inline'
                                )}
                              >
                                Principal
                              </span>
                            )}
                            {item.badge === 'teams' && (
                              <span
                                className={cn(
                                  'ml-auto items-center text-purple-400/70',
                                  EXPAND.flex,
                                  pinned && 'flex'
                                )}
                              >
                                <Users2 className="h-3.5 w-3.5" />
                              </span>
                            )}
                          </Link>
                        </TooltipTrigger>
                        {/* Dica no rail (FR-005/SC-004). Quando expandida, o rótulo já está visível. */}
                        <TooltipContent side="right">{item.label}</TooltipContent>
                      </Tooltip>
                    )
                  })}
                </div>
              ))}
            </nav>
          </div>

          {/* Cartões do rodapé — visíveis apenas quando expandida */}
          <div className={cn('border-t border-sidebar-border p-3', EXPAND.block, pinned && 'block')}>
            <div className="glass-card rounded-lg p-3 space-y-3">
              {usage ? (
                <>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-foreground-tertiary font-medium uppercase tracking-wide">
                      Plano {usage.planData?.name || usage.plan}
                    </span>
                    <Link href="/dashboard/billing" className="text-blue-400 hover:text-blue-300 text-xs">
                      Upgrade
                    </Link>
                  </div>

                  {(() => {
                    const rows = [
                      { label: 'Agentes', data: usage.agents },
                      { label: 'Mensagens/mês', data: usage.messages, format: (n: number) => n.toLocaleString() },
                      { label: 'Knowledge Bases', data: usage.knowledgeBases },
                    ]
                    const hasLimits = rows.some(r => r.data?.limit !== -1)

                    if (!hasLimits) {
                      return <p className="text-xs text-foreground-tertiary">Uso ilimitado ✓</p>
                    }

                    const nearLimit = usage.plan === 'free' && rows.some(r => r.data?.limit !== -1 && (r.data?.percentage ?? 0) >= 80)

                    return (
                      <>
                        {rows.map(row => row.data?.limit !== -1 && (
                          <div key={row.label} className="space-y-1">
                            <div className="flex justify-between text-xs text-foreground-secondary">
                              <span>{row.label}</span>
                              <span className={(row.data?.percentage ?? 0) >= 80 ? 'text-amber-400' : ''}>
                                {row.format ? row.format(row.data.current) : row.data.current}
                                /{row.format ? row.format(row.data.limit) : row.data.limit}
                              </span>
                            </div>
                            <Progress
                              value={row.data?.percentage ?? 0}
                              className={`h-1.5 ${
                                (row.data?.percentage ?? 0) >= 100 ? '[&>div]:bg-red-500' :
                                (row.data?.percentage ?? 0) >= 80 ? '[&>div]:bg-amber-500' : ''
                              }`}
                            />
                          </div>
                        ))}
                        {nearLimit && (
                          <Link
                            href="/dashboard/billing"
                            className="flex items-center justify-center gap-1.5 w-full text-xs font-semibold text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 rounded-lg py-1.5 transition-colors mt-1"
                          >
                            <TrendingUp className="w-3 h-3" />
                            Quase no limite — Upgrade
                          </Link>
                        )}
                      </>
                    )
                  })()}
                </>
              ) : (
                <div className="space-y-2">
                  <div className="h-3 w-24 rounded bg-white/10 animate-pulse" />
                  <div className="h-1.5 w-full rounded bg-white/10 animate-pulse" />
                </div>
              )}
            </div>

            {/* Affiliate referral card */}
            <Link
              href={usage?.userId ? `/afiliados?ref=${usage.userId}` : '/afiliados'}
              target="_blank"
              className="mt-3 flex items-center gap-2.5 rounded-lg bg-green-500/10 border border-green-500/20 px-3 py-2.5 hover:bg-green-500/20 transition-colors group"
            >
              <Gift className="h-4 w-4 text-green-400 flex-shrink-0" />
              <div>
                <div className="text-xs font-semibold text-green-400 leading-tight">Indique e Ganhe</div>
                <div className="text-[10px] text-green-400/60 leading-tight">20–40% de comissão recorrente</div>
              </div>
            </Link>

            {/* Talk to founder */}
            <a
              href="https://wa.me/5562983443919"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 flex items-center gap-2.5 rounded-lg bg-[#25D366]/10 border border-[#25D366]/20 px-3 py-2.5 hover:bg-[#25D366]/20 transition-colors"
            >
              <MessageCircle className="h-4 w-4 text-[#25D366] flex-shrink-0" />
              <div>
                <div className="text-xs font-semibold text-[#25D366] leading-tight">Falar com o Fundador</div>
                <div className="text-[10px] text-[#25D366]/60 leading-tight">Suporte direto via WhatsApp</div>
              </div>
            </a>
          </div>
        </div>
      </aside>
    </TooltipProvider>
  )
}
