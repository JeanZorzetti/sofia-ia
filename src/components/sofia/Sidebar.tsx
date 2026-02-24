'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
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
  FolderOpen,
  Terminal,
  Layers,
  Key,
  Gift
} from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

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
  userId?: string
}

export function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [usage, setUsage] = useState<UsageData | null>(null)

  useEffect(() => {
    fetch('/api/user/usage')
      .then((r) => r.json())
      .then((data) => { if (data.plan) setUsage(data) })
      .catch(() => {})
  }, [])

  return (
    <TooltipProvider>
      <aside className={cn(
        "hidden h-full flex-col border-r border-sidebar-border bg-sidebar lg:flex transition-all duration-300",
        collapsed ? "w-20" : "w-64"
      )}>
        <div className="flex flex-1 flex-col gap-2 p-4">
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
                  {/* Agentes */}
                  {usage.agents.limit !== -1 && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-foreground-secondary">
                        <span>Agentes</span>
                        <span>{usage.agents.current}/{usage.agents.limit}</span>
                      </div>
                      <Progress
                        value={usage.agents.percentage}
                        className={`h-1.5 ${usage.agents.percentage >= 90 ? '[&>div]:bg-red-500' : usage.agents.percentage >= 70 ? '[&>div]:bg-yellow-500' : ''}`}
                      />
                    </div>
                  )}
                  {/* Mensagens */}
                  {usage.messages.limit !== -1 && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-foreground-secondary">
                        <span>Mensagens/mês</span>
                        <span>{usage.messages.current.toLocaleString()}/{usage.messages.limit.toLocaleString()}</span>
                      </div>
                      <Progress
                        value={usage.messages.percentage}
                        className={`h-1.5 ${usage.messages.percentage >= 90 ? '[&>div]:bg-red-500' : usage.messages.percentage >= 70 ? '[&>div]:bg-yellow-500' : ''}`}
                      />
                    </div>
                  )}
                  {usage.agents.limit === -1 && usage.messages.limit === -1 && (
                    <p className="text-xs text-foreground-tertiary">Uso ilimitado ✓</p>
                  )}
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
