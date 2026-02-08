'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  MessageSquare,
  Bot,
  Workflow,
  CreditCard,
} from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

const menuItems = [
  {
    href: '/dashboard',
    label: 'Overview',
    icon: LayoutDashboard,
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
    href: '/dashboard/workflows',
    label: 'Workflows',
    icon: Workflow,
  },
  {
    href: '/dashboard/billing',
    label: 'Billing',
    icon: CreditCard,
  },
]

export function Sidebar() {
  const pathname = usePathname()

  const tokensUsed = 32450
  const tokensTotal = 50000
  const tokensPercentage = (tokensUsed / tokensTotal) * 100

  return (
    <aside className="hidden h-full w-64 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
      <div className="flex flex-1 flex-col gap-2 p-4">
        <nav className="flex flex-col gap-1">
          {menuItems.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'hover-scale flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all',
                  isActive
                    ? 'bg-sidebar-accent text-white'
                    : 'text-foreground-secondary hover:bg-sidebar-accent/50 hover:text-foreground'
                )}
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>
      </div>

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
    </aside>
  )
}
