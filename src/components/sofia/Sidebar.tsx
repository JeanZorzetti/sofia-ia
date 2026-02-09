'use client'

import { useState } from 'react'
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
} from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
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
    href: '/dashboard/templates',
    label: 'Templates',
    icon: LayoutTemplate,
  },
  {
    href: '/dashboard/whatsapp',
    label: 'WhatsApp',
    icon: MessageSquare,
  },
  {
    href: '/dashboard/sdr-config',
    label: 'SDR Config',
    icon: Bot,
  },
  {
    href: '/dashboard/billing',
    label: 'Billing',
    icon: CreditCard,
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  const tokensUsed = 32450
  const tokensTotal = 50000
  const tokensPercentage = (tokensUsed / tokensTotal) * 100

  return (
    <aside className={cn(
      "hidden h-full flex-col border-r border-sidebar-border bg-sidebar lg:flex transition-all duration-300",
      collapsed ? "w-20" : "w-64"
    )}>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="mb-2 flex items-center justify-between">
          {!collapsed && <div className="text-xs font-semibold text-foreground-tertiary">Menu</div>}
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
        </div>
        <nav className="flex flex-col gap-1">
          {menuItems.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon

            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
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
          })}
        </nav>
      </div>

      {!collapsed && (
        <div className="border-t border-sidebar-border p-4">
          <div className="glass-card rounded-lg p-4">
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="text-foreground-secondary">Tokens Usados</span>
              <span className="font-medium text-foreground">
                {tokensUsed.toLocaleString()} / {tokensTotal.toLocaleString()}
              </span>
            </div>
            <Progress value={tokensPercentage} className="h-2" />
            <p className="mt-2 text-xs text-foreground-tertiary">
              {(100 - tokensPercentage).toFixed(1)}% disponível
            </p>
          </div>
        </div>
      )}
    </aside>
  )
}
