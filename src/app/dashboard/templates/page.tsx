'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Building,
  Headphones,
  TrendingUp,
  Users,
  DollarSign,
  Scale,
  Bot,
  Workflow,
  Search,
  ArrowRight,
  Sparkles,
  Download
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

const categoryIcons: Record<string, any> = {
  'Imobiliário': Building,
  'Atendimento': Headphones,
  'Vendas': TrendingUp,
  'RH': Users,
  'Financeiro': DollarSign,
  'Jurídico': Scale,
}

interface Template {
  id: string
  name: string
  description: string
  category: string
  type: 'agent' | 'workflow'
  icon: string | null
  config: any
  isOfficial: boolean
  usageCount: number
  createdAt: string
  updatedAt: string
}

export default function TemplatesPage() {
  const router = useRouter()
  const [templates, setTemplates] = useState<Template[]>([])
  const [filteredTemplates, setFilteredTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [deployingId, setDeployingId] = useState<string | null>(null)

  useEffect(() => {
    fetchTemplates()
  }, [])

  useEffect(() => {
    filterTemplates()
  }, [templates, searchQuery, categoryFilter, typeFilter])

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/templates')
      const result = await response.json()

      if (result.success) {
        setTemplates(result.data)
      }
    } catch (error) {
      console.error('Error fetching templates:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterTemplates = () => {
    let filtered = [...templates]

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        t => t.name.toLowerCase().includes(query) ||
             t.description.toLowerCase().includes(query)
      )
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(t => t.category === categoryFilter)
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(t => t.type === typeFilter)
    }

    setFilteredTemplates(filtered)
  }

  const handleDeploy = async (templateId: string) => {
    setDeployingId(templateId)

    try {
      const user = localStorage.getItem('user')
      const userId = user ? JSON.parse(user).id : null

      if (!userId) {
        toast.error('Usuário não autenticado')
        return
      }

      toast.loading('Fazendo deploy do template...')

      const response = await fetch(`/api/templates/${templateId}/deploy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      })

      const result = await response.json()

      if (result.success) {
        toast.success('Template implantado com sucesso!', {
          description: result.type === 'agent' ? 'Agente criado' : 'Workflow criado'
        })
        setTimeout(() => {
          if (result.type === 'agent') {
            router.push(`/dashboard/agents/${result.data.id}`)
          } else if (result.type === 'workflow') {
            router.push(`/dashboard/workflows/${result.data.id}`)
          }
        }, 500)
      } else {
        toast.error('Erro ao fazer deploy', {
          description: result.error || 'Tente novamente'
        })
      }
    } catch (error) {
      console.error('Error deploying template:', error)
      toast.error('Erro ao fazer deploy', {
        description: 'Verifique sua conexão e tente novamente'
      })
    } finally {
      setDeployingId(null)
    }
  }

  const categories = ['all', ...Array.from(new Set(templates.map(t => t.category)))]

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-foreground-secondary">Carregando templates...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-foreground">Templates</h1>
        <p className="text-foreground-secondary">
          Biblioteca de templates prontos para uso. Deploy com 1 click.
        </p>
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-tertiary" />
            <Input
              placeholder="Buscar templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas Categorias</SelectItem>
              {categories.filter(c => c !== 'all').map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos Tipos</SelectItem>
              <SelectItem value="agent">Agentes</SelectItem>
              <SelectItem value="workflow">Workflows</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {filteredTemplates.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="mb-4 rounded-full bg-muted p-4">
              <Sparkles className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mb-2 text-xl font-semibold">Nenhum template encontrado</h3>
            <p className="text-center text-foreground-secondary">
              Tente ajustar os filtros ou buscar por outro termo.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredTemplates.map((template) => {
            const CategoryIcon = categoryIcons[template.category] || Bot
            const TypeIcon = template.type === 'agent' ? Bot : Workflow

            return (
              <Card key={template.id} className="flex flex-col">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <CategoryIcon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex flex-col">
                        <CardTitle className="text-lg">{template.name}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">
                            <TypeIcon className="mr-1 h-3 w-3" />
                            {template.type === 'agent' ? 'Agente' : 'Workflow'}
                          </Badge>
                          {template.isOfficial && (
                            <Badge variant="default" className="text-xs">
                              <Sparkles className="mr-1 h-3 w-3" />
                              Oficial
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1">
                  <CardDescription className="line-clamp-3">
                    {template.description}
                  </CardDescription>
                  <div className="mt-4 flex items-center gap-2 text-xs text-foreground-tertiary">
                    <Download className="h-3 w-3" />
                    <span>{template.usageCount} usos</span>
                    <span>•</span>
                    <span>{template.category}</span>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button
                    className="w-full"
                    onClick={() => handleDeploy(template.id)}
                    disabled={deployingId === template.id}
                  >
                    {deployingId === template.id ? (
                      <>
                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Implantando...
                      </>
                    ) : (
                      <>
                        Deploy com 1 Click
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
