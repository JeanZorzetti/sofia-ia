'use client'

import { useState, useEffect } from 'react'
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
  TrendingUp
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

const menuItems = [
  {
    href: '/dashboard',
    label: 'Overview',
    icon: LayoutDashboard,
  },
  {
    href: '/dashboard/agents',
    label: 'Agentes de IA',
    icon: Bot,
  },
  {
    href: '/dashboard/conversations',
    label: 'Conversas',
    icon: Inbox,
  },
  {
    href: '/dashboard/knowledge',
    label: 'Knowledge Base',
    icon: Database,
  },
  {
    href: '/dashboard/workflows',
    label: 'Workflows',
    icon: Workflow,
  },
  {
    href: '/dashboard/orchestrations',
    label: 'Orquestrações',
    icon: Users,
  },
  {
    href: '/dashboard/files',
    label: 'IDE',
    icon: Terminal,
  },
  {
    href: '/dashboard/integrations',
    label: 'Integrações',
    icon: Plug,
  },
  {
    href: '/dashboard/analytics',
    label: 'Analytics',
    icon: BarChart3,
  },
  {
    href: '/dashboard/ab-tests',
    label: 'A/B Tests',
    icon: FlaskConical,
  },
  {
    href: '/dashboard/templates',
    label: 'Templates',
    icon: LayoutTemplate,
  },
  {
    href: '/dashboard/marketplace',
    label: 'Marketplace',
    icon: Store,
  },
  {
    href: '/dashboard/monitoring',
    label: 'Monitoramento',
    icon: Activity,
  },
  {
    href: '/dashboard/whatsapp',
    label: 'WhatsApp',
    icon: MessageSquare,
  },
  {
    href: '/dashboard/billing',
    label: 'Billing',
    icon: CreditCard,
  },
  {
    href: '/dashboard/whitelabel',
    label: 'White-label',
    icon: Layers,
  },
  {
    href: '/dashboard/api-keys',
    label: 'API Keys',
    icon: Key,
  },
  {
    href: '/dashboard/settings',
    label: 'Configurações',
    icon: Settings,
  },
  {
    href: '/dashboard/dev-chat',
    label: 'Dev Playground',
    icon: Terminal,
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
    // Store selection in localStorage for persistence across page loads
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
        <div className="flex flex-1 flex-col gap-2 p-4">
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
                      Organizacoes
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
                    Nova Organizacao
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <div className="mb-2 flex items-center justify-between">
            {!collapsed && <div className="text-xs font-semibold text-foreground-tertiary">Menu</div>}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCollapsed(!collapsed)}
                  className="h-8 w-8 p-0"
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
          <nav className="flex flex-col gap-1">
            {menuItems.map((item) => {
              const isActive = pathname === item.href
              const Icon = item.icon

              const linkElement = (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'hover-scale flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all',
                    isActive
                      ? 'bg-sidebar-accent text-white'
                      : 'text-foreground-secondary hover:bg-sidebar-accent/50 hover:text-foreground',
                    collapsed && 'justify-center'
                  )}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              )

              if (collapsed) {
                return (
                  <Tooltip key={item.href}>
                    <TooltipTrigger asChild>
                      {linkElement}
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      {item.label}
                    </TooltipContent>
                  </Tooltip>
                )
              }

              return linkElement
            })}
          </nav>
        </div>

        {!collapsed && (
          <div className="border-t border-sidebar-border p-4">
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

                    // Is any resource at 80%+ on the free plan?
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
          </div>
        )}
      </aside>
    </TooltipProvider>
  )
}
