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
  ChevronLeft,
  ChevronRight,
  Settings,
  Users,
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
} from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
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
}

type MenuSection = {
  label: string | null
  items: MenuItem[]
}

const menuSections: MenuSection[] = [
  {
    label: null,
    items: [
      { href: '/dashboard',              label: 'Overview',      icon: LayoutDashboard },
      { href: '/dashboard/agents',       label: 'Agentes de IA', icon: Bot },
      { href: '/dashboard/conversations', label: 'Conversas',    icon: Inbox },
    ],
  },
  {
    label: 'Plataforma',
    items: [
      { href: '/dashboard/skills',         label: 'Skills',        icon: Sparkles },
      { href: '/dashboard/mcp',            label: 'MCP Servers',   icon: Network },
      { href: '/dashboard/knowledge',      label: 'Knowledge Base', icon: Database },
      { href: '/dashboard/workflows',      label: 'Workflows',     icon: Workflow },
      { href: '/dashboard/orchestrations', label: 'Orquestrações', icon: Users },
      { href: '/dashboard/files',          label: 'IDE',           icon: Terminal },
      { href: '/dashboard/integrations',   label: 'Integrações',   icon: Plug },
    ],
  },
  {
    label: 'Threads',
    items: [
      { href: '/dashboard/threads/calendar',  label: 'Calendário', icon: CalendarDays },
      { href: '/dashboard/threads/analytics', label: 'Analytics',  icon: BarChart2 },
      { href: '/dashboard/threads/campaigns', label: 'Campanhas',  icon: Megaphone },
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

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
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
      <aside className={cn(
        "hidden h-full flex-col border-r border-sidebar-border bg-sidebar lg:flex transition-all duration-300",
        collapsed ? "w-20" : "w-64"
      )}>
        <div className="flex flex-1 flex-col gap-2 p-3 overflow-hidden">
          {/* Workspace Selector */}
          {!collapsed && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 w-full px-3 py-2 rounded-lg hover:bg-sidebar-accent/30 transition-colors mb-1 group">
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
              <DropdownMenuContent align="start" className="w-56">
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
          )}

          <div className="flex items-center justify-between mb-1">
            {!collapsed && <div className="text-[10px] font-semibold text-foreground-tertiary uppercase tracking-widest px-1">Menu</div>}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCollapsed(!collapsed)}
                  className={cn("h-7 w-7 p-0", collapsed && "mx-auto")}
                >
                  {collapsed ? (
                    <ChevronRight className="h-4 w-4" />
                  ) : (
                    <ChevronLeft className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                {collapsed ? 'Expandir menu' : 'Recolher menu'}
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Scrollable nav area */}
          <nav className="flex flex-col gap-3 flex-1 overflow-y-auto scrollbar-none pr-0.5">
            {menuSections.map((section, si) => (
              <div key={si} className="flex flex-col gap-0.5">
                {/* Section label (expanded) or divider (collapsed) */}
                {section.label && !collapsed && (
                  <div className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-widest text-foreground-tertiary">
                    {section.label}
                  </div>
                )}
                {section.label && collapsed && si > 0 && (
                  <div className="mx-3 border-t border-sidebar-border/50 my-1.5" />
                )}

                {section.items.map((item) => {
                  const isActive =
                    item.href === '/dashboard'
                      ? pathname === '/dashboard'
                      : pathname === item.href || pathname.startsWith(item.href + '/')
                  const Icon = item.icon

                  const linkElement = (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'hover-scale flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all',
                        isActive
                          ? 'bg-sidebar-accent text-white'
                          : 'text-foreground-secondary hover:bg-sidebar-accent/50 hover:text-foreground',
                        collapsed && 'justify-center px-0'
                      )}
                    >
                      <Icon className="h-4.5 w-4.5 flex-shrink-0 h-[18px] w-[18px]" />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </Link>
                  )

                  if (collapsed) {
                    return (
                      <Tooltip key={item.href}>
                        <TooltipTrigger asChild>{linkElement}</TooltipTrigger>
                        <TooltipContent side="right">{item.label}</TooltipContent>
                      </Tooltip>
                    )
                  }

                  return linkElement
                })}
              </div>
            ))}
          </nav>
        </div>

        {!collapsed && (
          <div className="border-t border-sidebar-border p-3">
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
        )}
      </aside>
    </TooltipProvider>
  )
}
