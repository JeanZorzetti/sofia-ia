'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Send, Loader2, Sparkles, MessageSquare, BarChart3, Table, Hash } from 'lucide-react';

interface NLQueryResult {
  success: boolean;
  interpretation?: string;
  result?: any;
  visualization?: 'number' | 'chart' | 'table' | 'text';
  error?: string;
}

export function NaturalLanguageQuery() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<NLQueryResult | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [history, setHistory] = useState<Array<{ query: string; result: NLQueryResult }>>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/analytics/nl-query')
      .then((res) => res.json())
      .then((data) => {
        if (data.suggestions) {
          setSuggestions(data.suggestions);
        }
      });
  }, []);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!query.trim() || loading) return;

    setLoading(true);
    try {
      const response = await fetch('/api/analytics/nl-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });

      const data = await response.json();
      setResult(data);

      if (data.success) {
        setHistory((prev) => [{ query, result: data }, ...prev].slice(0, 5));
      }
    } catch (error) {
      setResult({ success: false, error: 'Erro ao processar consulta' });
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    inputRef.current?.focus();
  };

  const getVisualizationIcon = (type?: string) => {
    switch (type) {
      case 'number':
        return <Hash className="h-4 w-4" />;
      case 'chart':
        return <BarChart3 className="h-4 w-4" />;
      case 'table':
        return <Table className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-4">
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Sparkles className="h-5 w-5 text-yellow-400" />
            Pergunte aos seus dados
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ex: Quantos leads qualificamos essa semana?"
              className="flex-1"
              disabled={loading}
            />
            <Button type="submit" disabled={loading || !query.trim()}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>

          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion, idx) => (
              <button
                key={idx}
                onClick={() => handleSuggestionClick(suggestion)}
                className="text-xs px-3 py-1 rounded-full bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {result && (
        <Card className={`glass-card ${result.success ? 'border-green-500/30' : 'border-red-500/30'}`}>
          <CardContent className="pt-6 space-y-4">
            {result.success ? (
              <>
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-green-500/20">
                    {getVisualizationIcon(result.visualization)}
                  </div>
                  <div className="flex-1">
                    <p className="text-white text-lg">{result.interpretation}</p>
                    <Badge variant="outline" className="mt-2">
                      {result.visualization === 'number' && 'Número'}
                      {result.visualization === 'chart' && 'Gráfico'}
                      {result.visualization === 'table' && 'Tabela'}
                      {result.visualization === 'text' && 'Texto'}
                    </Badge>
                  </div>
                </div>

                {result.visualization === 'number' && result.result && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
                    {Object.entries(result.result).map(([key, value]) => (
                      <div key={key} className="p-4 rounded-lg bg-white/5">
                        <p className="text-sm text-white/60 capitalize">{key}</p>
                        <p className="text-2xl font-bold text-white">
                          {typeof value === 'number' ? value.toLocaleString('pt-BR') : String(value)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {result.visualization === 'table' && result.result?.leads && (
                  <div className="overflow-x-auto pt-4">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/10">
                          <th className="text-left py-2 text-white/60">Nome</th>
                          <th className="text-left py-2 text-white/60">Score</th>
                          <th className="text-left py-2 text-white/60">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.result.leads.map((lead: any) => (
                          <tr key={lead.id} className="border-b border-white/5">
                            <td className="py-2 text-white">{lead.nome}</td>
                            <td className="py-2">
                              <Badge variant={lead.score > 70 ? 'default' : 'secondary'}>
                                {lead.score}
                              </Badge>
                            </td>
                            <td className="py-2 text-white/60 capitalize">{lead.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center gap-3 text-red-400">
                <span>Erro: {result.error}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {history.length > 0 && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-sm text-white/60">Histórico de consultas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {history.map((item, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setQuery(item.query);
                  setResult(item.result);
                }}
                className="w-full text-left p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
              >
                <p className="text-sm text-white">{item.query}</p>
                <p className="text-xs text-white/40 mt-1">
                  {item.result.interpretation?.slice(0, 60)}...
                </p>
              </button>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
