'use client'

import { useState, useEffect, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  MessageSquare,
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
  Pin,
  PinOff,
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

// Visibilidade dirigida por CSS. `expanded` = hover OU foco de teclado dentro da
// sidebar (overlay, via group-hover/group-focus-within do Tailwind v4) OU `pinned`
// (estado React). Conteúdo permanece sempre montado no DOM; só a visibilidade muda
// — substitui o antigo `{!collapsed && ...}`. A parte `pinned && ...` é ligada por
// US3 (fixar + persistência); o reveal por menu aberto (US4) entra via `forceExpanded`.
//
// `group-focus-within/sb` (US4/T011) expande quando QUALQUER item interno recebe
// foco de teclado (FR-013), espelhando o gatilho de hover — sem precisar de estado
// React. O menu de workspace usa portal (foco sai do <aside>), então NÃO dispara
// focus-within; por isso US4/T013 trata "menu aberto" via estado (forceExpanded).
//
// IMPORTANTE: classes COMPLETAS e literais — o scanner do Tailwind v4 não detecta
// nomes de classe montados dinamicamente (ex.: `group-hover/sb:${x}`).
const EXPAND = {
  block: 'hidden group-hover/sb:block group-focus-within/sb:block',
  flex: 'hidden group-hover/sb:flex group-focus-within/sb:flex',
  inline: 'hidden group-hover/sb:inline group-focus-within/sb:inline',
} as const

// Store externo da preferência "fixada" (US3). Lido via useSyncExternalStore: o
// server snapshot é sempre `false` (= rail), e o client snapshot vem do
// localStorage — React reconcilia após a hidratação, sem mismatch e sem chamar
// setState dentro de um effect (data-model: "leitura após mount").
const PIN_KEY = 'sofia_sidebar_pinned'
const pinListeners = new Set<() => void>()

function subscribePinned(callback: () => void) {
  if (typeof window === 'undefined') return () => {}
  pinListeners.add(callback)
  // `storage` cobre mudança em OUTRA aba; a própria aba notifica via writePinned.
  window.addEventListener('storage', callback)
  return () => {
    pinListeners.delete(callback)
    window.removeEventListener('storage', callback)
  }
}
function getPinnedSnapshot() {
  try {
    return localStorage.getItem(PIN_KEY) === '1'
  } catch {
    return false
  }
}
function getPinnedServerSnapshot() {
  return false
}
// Persiste apenas `pinned` ('1'/'0') e notifica os assinantes da própria aba
// (o evento `storage` não dispara para quem fez a escrita).
function writePinned(next: boolean) {
  try {
    localStorage.setItem(PIN_KEY, next ? '1' : '0')
  } catch { /* ignore */ }
  pinListeners.forEach((cb) => cb())
}

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  // Preferência de sidebar fixada (US3). Default `false` no servidor (rail) e
  // valor real do localStorage no cliente — sem hydration mismatch (ver store).
  const pinned = useSyncExternalStore(subscribePinned, getPinnedSnapshot, getPinnedServerSnapshot)
  const [usage, setUsage] = useState<UsageData | null>(null)
  const [orgs, setOrgs] = useState<OrgItem[]>([])
  const [activeWorkspace, setActiveWorkspace] = useState<string>('personal')
  // Menu de workspace aberto (US4/T013). Mantém a sidebar expandida mesmo sem
  // hover/foco (FR-015) — o dropdown é portaled, então focus-within não o cobre.
  // Transitório: NUNCA persistido (data-model §invariantes).
  const [menuOpen, setMenuOpen] = useState(false)

  // Alterna fixar/soltar; só `pinned` é persistido (hover/foco/menu são
  // transitórios — data-model §invariantes).
  const togglePinned = () => writePinned(!pinned)

  // Reveal dirigido por estado React (complementa hover/focus-within do CSS):
  // `pinned` (preferência) ou `menuOpen` (workspace aberto) força a visão expandida.
  // OBS: só `pinned` altera o footprint (empurra o <main>); `menuOpen` é overlay.
  const forceExpanded = pinned || menuOpen

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
        data-menu-open={menuOpen}
        className={cn(
          'group/sb sidebar-root relative hidden h-full shrink-0 lg:block w-20 transition-[width] duration-300 ease-out',
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
            'absolute inset-y-0 left-0 z-[60] flex w-20 flex-col overflow-hidden border-r border-sidebar-border bg-sidebar transition-[width] duration-300 ease-out group-hover/sb:w-64 group-focus-within/sb:w-64',
            pinned
              ? 'w-64'
              : 'group-hover/sb:shadow-2xl group-hover/sb:shadow-black/50 group-focus-within/sb:shadow-2xl group-focus-within/sb:shadow-black/50',
            // Menu de workspace aberto (US4/T013): overlay expandido (w-64 + sombra)
            // SEM virar in-flow — não empurra o <main> (só `pinned` empurra).
            !pinned && menuOpen && 'w-64 shadow-2xl shadow-black/50'
          )}
        >
          <div className="flex flex-1 flex-col gap-2 p-3 overflow-hidden">
            {/* Workspace Selector — visível apenas quando expandida */}
            <div className={cn('mb-1', EXPAND.block, forceExpanded && 'block')}>
              <DropdownMenu onOpenChange={setMenuOpen}>
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

            {/* Eyebrow "Menu" + controle Fixar/Soltar — apenas expandida.
                O botão de fixar alterna `pinned` (persistido) → rail vira footprint
                in-flow w-64 que empurra o <main> (T010, ligado na fundação). */}
            <div className={cn('mb-1 px-1 items-center justify-between', EXPAND.flex, forceExpanded && 'flex')}>
              <div className="text-[10px] font-semibold text-foreground-tertiary uppercase tracking-widest">
                Menu
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={togglePinned}
                    aria-label={pinned ? 'Soltar menu' : 'Fixar menu'}
                    aria-pressed={pinned}
                    title={pinned ? 'Soltar menu' : 'Fixar menu'}
                    className="flex h-6 w-6 items-center justify-center rounded-md text-foreground-tertiary hover:bg-sidebar-accent/50 hover:text-foreground transition-colors"
                  >
                    {pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">{pinned ? 'Soltar menu' : 'Fixar menu'}</TooltipContent>
              </Tooltip>
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
                          forceExpanded && 'block'
                        )}
                      >
                        {section.label}
                      </div>
                      {si > 0 && (
                        <div
                          className={cn(
                            'mx-3 my-1.5 border-t border-sidebar-border/50',
                            'block group-hover/sb:hidden group-focus-within/sb:hidden',
                            forceExpanded && 'hidden'
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
                              'justify-center px-0 group-hover/sb:justify-start group-hover/sb:px-3 group-focus-within/sb:justify-start group-focus-within/sb:px-3',
                              forceExpanded && 'justify-start px-3',
                              isActive
                                ? 'bg-sidebar-accent text-white'
                                : 'text-foreground-secondary hover:bg-sidebar-accent/50 hover:text-foreground'
                            )}
                          >
                            <Icon className="h-[18px] w-[18px] flex-shrink-0" />
                            <span className={cn('truncate', EXPAND.block, forceExpanded && 'block')}>
                              {item.label}
                            </span>
                            {item.badge === 'principal' && (
                              <span
                                className={cn(
                                  'ml-auto rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide bg-gradient-to-r from-purple-500/25 to-blue-500/25 text-purple-200 border border-purple-400/30',
                                  EXPAND.inline,
                                  forceExpanded && 'inline'
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
                                  forceExpanded && 'flex'
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
          <div className={cn('border-t border-sidebar-border p-3', EXPAND.block, forceExpanded && 'block')}>
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
          </div>
        </div>
      </aside>
    </TooltipProvider>
  )
}
