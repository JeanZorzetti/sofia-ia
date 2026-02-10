'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Store, Loader2, Search, Star, Download, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  type: string;
  icon: string;
  usageCount: number;
  rating: number;
  isOfficial: boolean;
  author: string;
  createdAt: string;
}

export default function MarketplacePage() {
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<Template[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => {
    fetchTemplates();
  }, []);

  useEffect(() => {
    filterTemplates();
  }, [templates, searchQuery, categoryFilter, typeFilter]);

  async function fetchTemplates() {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/templates?marketplace=true', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates || []);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  }

  function filterTemplates() {
    let filtered = templates;

    if (searchQuery) {
      filtered = filtered.filter(
        (t) =>
          t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter((t) => t.category === categoryFilter);
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter((t) => t.type === typeFilter);
    }

    setFilteredTemplates(filtered);
  }

  async function handleDeploy(templateId: string) {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/templates/${templateId}/deploy`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        toast.success('Template implantado com sucesso!');
        fetchTemplates();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Erro ao implantar template');
      }
    } catch (error) {
      console.error('Error deploying template:', error);
      toast.error('Erro ao implantar template');
    }
  }

  const categories = ['all', 'Imobiliario', 'Vendas', 'Atendimento', 'RH', 'Financeiro', 'Juridico', 'Outros'];
  const types = ['all', 'agent', 'workflow', 'integration'];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-white/60" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <Store className="h-8 w-8 text-purple-500" />
          Marketplace de Templates
        </h1>
        <p className="text-white/60 mt-1">Explore e implante templates criados pela comunidade</p>
      </div>

      {/* Filters */}
      <Card className="glass-card">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                <Input
                  placeholder="Buscar templates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat === 'all' ? 'Todas Categorias' : cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Tipos</SelectItem>
                <SelectItem value="agent">Agentes</SelectItem>
                <SelectItem value="workflow">Workflows</SelectItem>
                <SelectItem value="integration">Integrações</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-sm">Total de Templates</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-white">{templates.length}</p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-sm">Templates Oficiais</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-400">
              {templates.filter((t) => t.isOfficial).length}
            </p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-sm">Templates da Comunidade</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-purple-400">
              {templates.filter((t) => !t.isOfficial).length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Templates Grid */}
      {filteredTemplates.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Store className="h-12 w-12 text-white/40 mb-4" />
            <p className="text-white/60 text-center">
              Nenhum template encontrado com os filtros selecionados.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => (
            <Card key={template.id} className="glass-card hover:border-white/20 transition-colors">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {template.icon && (
                      <div className="text-3xl">{template.icon}</div>
                    )}
                    <div>
                      <CardTitle className="text-white text-lg">{template.name}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        {template.isOfficial && (
                          <Badge className="bg-blue-500 text-xs">Oficial</Badge>
                        )}
                        <Badge variant="outline" className="text-xs">
                          {template.type === 'agent' ? 'Agente' : template.type === 'workflow' ? 'Workflow' : 'Integração'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-white/70 line-clamp-3">{template.description}</p>

                <div className="flex items-center justify-between text-xs text-white/60">
                  <div className="flex items-center gap-1">
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    <span>{template.rating || 0}/5</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Download className="h-3 w-3" />
                    <span>{template.usageCount} usos</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-white/10">
                  <span className="text-xs text-white/40">Por: {template.author || 'ROI Labs'}</span>
                  <Button size="sm" onClick={() => handleDeploy(template.id)}>
                    <TrendingUp className="h-3 w-3 mr-1" />
                    Implantar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
