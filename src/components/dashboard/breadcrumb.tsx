'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight, Home } from 'lucide-react'

const routeNames: Record<string, string> = {
  dashboard: 'Dashboard',
  agents: 'Agentes de IA',
  conversations: 'Conversas',
  knowledge: 'Knowledge Base',
  workflows: 'Workflows',
  integrations: 'Integrações',
  analytics: 'Analytics',
  templates: 'Templates',
  whatsapp: 'WhatsApp',
  'sdr-config': 'SDR Config',
  billing: 'Billing',
  settings: 'Configurações',
}

export function Breadcrumb() {
  const pathname = usePathname()
  const paths = pathname.split('/').filter(Boolean)

  if (paths.length <= 1) return null

  const breadcrumbs = paths.map((path, index) => {
    const href = '/' + paths.slice(0, index + 1).join('/')
    const name = routeNames[path] || path
    return { href, name, isLast: index === paths.length - 1 }
  })

  return (
    <nav className="mb-4 flex items-center gap-2 text-sm text-foreground-secondary">
      <Link
        href="/dashboard"
        className="flex items-center gap-1 hover:text-foreground transition-colors"
      >
        <Home className="h-4 w-4" />
      </Link>
      {breadcrumbs.map((crumb, index) => (
        <div key={crumb.href} className="flex items-center gap-2">
          <ChevronRight className="h-4 w-4" />
          {crumb.isLast ? (
            <span className="font-medium text-foreground">{crumb.name}</span>
          ) : (
            <Link
              href={crumb.href}
              className="hover:text-foreground transition-colors"
            >
              {crumb.name}
            </Link>
          )}
        </div>
      ))}
    </nav>
  )
}
