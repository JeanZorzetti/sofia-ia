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
  Network,
  Search,
  ArrowRight,
  Sparkles,
  Download,
  Code2,
  Server,
  Layers,
  Globe,
  Database,
  TestTube,
  ShieldCheck,
  CircleDollarSign,
  Siren,
  GitBranch,
  GitMerge,
  Brain,
  MessageSquareCode,
  Shield,
  ClipboardCheck,
  FileText,
  ScrollText,
  BarChart3,
  Gauge,
  Tag
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
  'Marketing': Building,
  'Atendimento': Headphones,
  'Vendas': TrendingUp,
  'RH': Users,
  'Financeiro': DollarSign,
  'Jurídico': Scale,
  'Tecnologia': Code2,
}

const subcategoryIcons: Record<string, any> = {
  'Engenharia': Code2,
  'DevOps & Infra': Server,
  'Dados & IA': Brain,
  'Banco de Dados': Database,
  'QA & Testes': TestTube,
  'Segurança': Shield,
  'Produto': FileText,
  'Gestão Tech': BarChart3,
}

const subcategoryColors: Record<string, string> = {
  'Engenharia': 'bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 border-blue-500/20',
  'DevOps & Infra': 'bg-orange-500/10 text-orange-500 hover:bg-orange-500/20 border-orange-500/20',
  'Dados & IA': 'bg-purple-500/10 text-purple-500 hover:bg-purple-500/20 border-purple-500/20',
  'Banco de Dados': 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border-emerald-500/20',
  'QA & Testes': 'bg-green-500/10 text-green-500 hover:bg-green-500/20 border-green-500/20',
  'Segurança': 'bg-red-500/10 text-red-500 hover:bg-red-500/20 border-red-500/20',
  'Produto': 'bg-cyan-500/10 text-cyan-500 hover:bg-cyan-500/20 border-cyan-500/20',
  'Gestão Tech': 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border-amber-500/20',
}

const templateIconMap: Record<string, any> = {
  'Code2': Code2,
  'Server': Server,
  'Layers': Layers,
  'TestTube': TestTube,
  'Database': Database,
  'Globe': Globe,
  'ShieldCheck': ShieldCheck,
  'CircleDollarSign': CircleDollarSign,
  'Siren': Siren,
  'GitBranch': GitBranch,
  'Brain': Brain,
  'MessageSquareCode': MessageSquareCode,
  'Shield': Shield,
  'ClipboardCheck': ClipboardCheck,
  'FileText': FileText,
  'ScrollText': ScrollText,
  'BarChart3': BarChart3,
  'Gauge': Gauge,
  'Network': Network,
  'GitMerge': GitMerge,
  'Workflow': Workflow,
}

interface Template {
  id: string
  name: string
  description: string
  category: string
  subcategory: string | null
  type: 'agent' | 'workflow' | 'orchestration'
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
  const [subcategoryFilter, setSubcategoryFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [deployingId, setDeployingId] = useState<string | null>(null)

  useEffect(() => {
    fetchTemplates()
  }, [])

  useEffect(() => {
    filterTemplates()
  }, [templates, searchQuery, categoryFilter, subcategoryFilter, typeFilter])

  // Reset subcategory filter when category changes
  useEffect(() => {
    setSubcategoryFilter('all')
  }, [categoryFilter])

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

    if (subcategoryFilter !== 'all') {
      filtered = filtered.filter(t => t.subcategory === subcategoryFilter)
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(t => t.type === typeFilter)
    }

    setFilteredTemplates(filtered)
  }

  const handleDeploy = async (templateId: string) => {
    setDeployingId(templateId)

    // Get userId from auth API (not localStorage)
    let userId: string | null = null
    try {
      const profileRes = await fetch('/api/auth/profile')
      const profileData = await profileRes.json()
      userId = profileData?.user?.id || profileData?.id || null
    } catch {
      userId = null
    }

    if (!userId) {
      toast.error('Usuário não autenticado')
      setDeployingId(null)
      return
    }

    try {
      toast.loading('Fazendo deploy do template...')

      const response = await fetch(`/api/templates/${templateId}/deploy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      })

      const result = await response.json()

      if (result.success) {
        toast.success('Template implantado com sucesso!', {
          description: result.type === 'agent' ? 'Agente criado' : result.type === 'orchestration' ? 'Orquestração criada' : 'Workflow criado'
        })
        setTimeout(() => {
          if (result.type === 'agent') {
            router.push(`/dashboard/agents/${result.data.id}`)
          } else if (result.type === 'workflow') {
            router.push(`/dashboard/workflows/${result.data.id}`)
          } else if (result.type === 'orchestration') {
            router.push(`/dashboard/orchestrations/${result.data.id}`)
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
  const subcategories = Array.from(
    new Set(
      templates
        .filter(t => categoryFilter === 'all' ? true : t.category === categoryFilter)
        .map(t => t.subcategory)
        .filter((s): s is string => s !== null && s !== undefined)
    )
  ).sort()

  const getTemplateIcon = (template: Template) => {
    if (template.icon && templateIconMap[template.icon]) {
      return templateIconMap[template.icon]
    }
    return categoryIcons[template.category] || Bot
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
          <p className="text-white/50">Carregando templates...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-white">Templates</h1>
        <p className="text-white/60">
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
              <SelectItem value="orchestration">Orquestrações</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Subcategory chips */}
      {subcategories.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <Tag className="h-4 w-4 text-foreground-tertiary flex-shrink-0" />
          <button
            onClick={() => setSubcategoryFilter('all')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors whitespace-nowrap ${subcategoryFilter === 'all'
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-muted/50 text-foreground-secondary hover:bg-muted border-border'
              }`}
          >
            Todas
          </button>
          {subcategories.map((sub) => {
            const SubIcon = subcategoryIcons[sub] || Code2
            const isActive = subcategoryFilter === sub
            const colorClass = subcategoryColors[sub] || 'bg-muted/50 text-foreground-secondary hover:bg-muted border-border'
            return (
              <button
                key={sub}
                onClick={() => setSubcategoryFilter(sub)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors whitespace-nowrap ${isActive
                  ? 'bg-primary text-primary-foreground border-primary'
                  : colorClass
                  }`}
              >
                <SubIcon className="h-3 w-3" />
                {sub}
              </button>
            )
          })}
        </div>
      )}

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
            const TemplateIcon = getTemplateIcon(template)
            const TypeIcon = template.type === 'agent' ? Bot : template.type === 'orchestration' ? Network : Workflow
            const subColor = template.subcategory ? subcategoryColors[template.subcategory] : null

            return (
              <Card key={template.id} className="flex flex-col">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <TemplateIcon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex flex-col">
                        <CardTitle className="text-lg">{template.name}</CardTitle>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <Badge variant="secondary" className="text-xs">
                            <TypeIcon className="mr-1 h-3 w-3" />
                            {template.type === 'agent' ? 'Agente' : template.type === 'orchestration' ? 'Orquestração' : 'Workflow'}
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
                  <div className="mt-4 flex items-center gap-2 text-xs text-foreground-tertiary flex-wrap">
                    <Download className="h-3 w-3" />
                    <span>{template.usageCount} usos</span>
                    <span>•</span>
                    <span>{template.category}</span>
                    {template.subcategory && (
                      <>
                        <span>•</span>
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium ${subColor || ''}`}>
                          {template.subcategory}
                        </span>
                      </>
                    )}
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
