'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Search, FileText, Bot, Workflow, MessageSquare, Database, BarChart3, Plug, LayoutTemplate, Settings } from 'lucide-react'
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'

interface SearchItem {
  id: string
  title: string
  description?: string
  icon: any
  href: string
  category: string
}

const defaultItems: SearchItem[] = [
  { id: '1', title: 'Dashboard', icon: BarChart3, href: '/dashboard', category: 'Navegação' },
  { id: '2', title: 'Agentes de IA', icon: Bot, href: '/dashboard/agents', category: 'Navegação' },
  { id: '3', title: 'Conversas', icon: MessageSquare, href: '/dashboard/conversations', category: 'Navegação' },
  { id: '4', title: 'Knowledge Base', icon: Database, href: '/dashboard/knowledge', category: 'Navegação' },
  { id: '5', title: 'Workflows', icon: Workflow, href: '/dashboard/workflows', category: 'Navegação' },
  { id: '6', title: 'Integrações', icon: Plug, href: '/dashboard/integrations', category: 'Navegação' },
  { id: '7', title: 'Analytics', icon: BarChart3, href: '/dashboard/analytics', category: 'Navegação' },
  { id: '8', title: 'Templates', icon: LayoutTemplate, href: '/dashboard/templates', category: 'Navegação' },
  { id: '9', title: 'Criar Novo Agente', icon: Bot, href: '/dashboard/agents?create=true', category: 'Ações' },
  { id: '10', title: 'Criar Novo Workflow', icon: Workflow, href: '/dashboard/workflows?create=true', category: 'Ações' },
]

export function CommandPalette() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [filteredItems, setFilteredItems] = useState<SearchItem[]>(defaultItems)
  const [selectedIndex, setSelectedIndex] = useState(0)

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault()
      setOpen((prev) => !prev)
    }
  }, [])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  useEffect(() => {
    if (query.trim() === '') {
      setFilteredItems(defaultItems)
    } else {
      const lowerQuery = query.toLowerCase()
      const filtered = defaultItems.filter(
        (item) =>
          item.title.toLowerCase().includes(lowerQuery) ||
          item.category.toLowerCase().includes(lowerQuery) ||
          item.description?.toLowerCase().includes(lowerQuery)
      )
      setFilteredItems(filtered)
    }
    setSelectedIndex(0)
  }, [query])

  const handleSelect = (href: string) => {
    setOpen(false)
    setQuery('')
    router.push(href)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev + 1) % filteredItems.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % filteredItems.length)
    } else if (e.key === 'Enter' && filteredItems[selectedIndex]) {
      e.preventDefault()
      handleSelect(filteredItems[selectedIndex].href)
    } else if (e.key === 'Escape') {
      setOpen(false)
      setQuery('')
    }
  }

  const groupedItems = filteredItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = []
    }
    acc[item.category].push(item)
    return acc
  }, {} as Record<string, SearchItem[]>)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[600px] p-0 gap-0">
        <div className="flex items-center border-b px-4 py-3">
          <Search className="mr-2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Buscar páginas, agentes, workflows..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyPress}
            className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            autoFocus
          />
          <kbd className="ml-auto hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            ESC
          </kbd>
        </div>

        <div className="max-h-[400px] overflow-y-auto p-2">
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Nenhum resultado encontrado
            </div>
          ) : (
            <div className="space-y-2">
              {Object.entries(groupedItems).map(([category, items]) => (
                <div key={category}>
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                    {category}
                  </div>
                  <div className="space-y-1">
                    {items.map((item, idx) => {
                      const globalIdx = filteredItems.indexOf(item)
                      const Icon = item.icon
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleSelect(item.href)}
                          className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                            selectedIndex === globalIdx
                              ? 'bg-accent text-accent-foreground'
                              : 'hover:bg-accent/50'
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                          <div className="flex-1">
                            <div className="font-medium">{item.title}</div>
                            {item.description && (
                              <div className="text-xs text-muted-foreground">
                                {item.description}
                              </div>
                            )}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t px-4 py-2 text-xs text-muted-foreground">
          <span className="flex items-center justify-between">
            <span>Pressione ↑ ↓ para navegar</span>
            <span>↵ para selecionar</span>
          </span>
        </div>
      </DialogContent>
    </Dialog>
  )
}
