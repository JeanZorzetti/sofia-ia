'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Volume2, Loader2, Save, AlertCircle, Play, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

interface ElevenLabsConfig {
  apiKey: string;
  voiceId: string;
  modelId: string;
  stability: number;
  similarityBoost: number;
  status: string;
}

interface Voice {
  voice_id: string;
  name: string;
  category?: string;
}

const MODELS = [
  { id: 'eleven_multilingual_v2', label: 'Multilingual v2 (Alta qualidade)' },
  { id: 'eleven_turbo_v2_5', label: 'Turbo v2.5 (Rápido)' },
  { id: 'eleven_turbo_v2', label: 'Turbo v2 (Rápido - legado)' },
  { id: 'eleven_monolingual_v1', label: 'Monolingual v1 (Inglês)' },
];

export default function ElevenLabsIntegrationPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [loadingVoices, setLoadingVoices] = useState(false);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [testText, setTestText] = useState('Olá! Sou a Polaris IA, sua assistente virtual.');
  const [config, setConfig] = useState<ElevenLabsConfig>({
    apiKey: '',
    voiceId: '21m00Tcm4TlvDq8ikWAM',
    modelId: 'eleven_multilingual_v2',
    stability: 50,
    similarityBoost: 75,
    status: 'inactive',
  });

  useEffect(() => {
    fetchConfig();
  }, []);

  async function fetchConfig() {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/integrations/elevenlabs', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.integration) {
          setConfig({
            apiKey: '',
            voiceId: data.integration.config?.voiceId || '21m00Tcm4TlvDq8ikWAM',
            modelId: data.integration.config?.modelId || 'eleven_multilingual_v2',
            stability: data.integration.config?.stability ?? 50,
            similarityBoost: data.integration.config?.similarityBoost ?? 75,
            status: data.integration.status,
          });
        }
      }
    } catch (error) {
      console.error('Error fetching ElevenLabs config:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadVoices() {
    if (!config.apiKey) {
      toast.error('Informe a API Key primeiro');
      return;
    }
    setLoadingVoices(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/integrations/elevenlabs/voices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ apiKey: config.apiKey }),
      });

      if (response.ok) {
        const data = await response.json();
        setVoices(data.voices || []);
        toast.success(`${data.voices?.length || 0} vozes carregadas`);
      } else {
        toast.error('Erro ao carregar vozes. Verifique a API Key.');
      }
    } catch {
      toast.error('Erro ao conectar com ElevenLabs');
    } finally {
      setLoadingVoices(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();

    if (!config.apiKey) {
      toast.error('API Key é obrigatória');
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/integrations/elevenlabs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          apiKey: config.apiKey,
          voiceId: config.voiceId,
          modelId: config.modelId,
          stability: config.stability,
          similarityBoost: config.similarityBoost,
        }),
      });

      if (response.ok) {
        toast.success('Configuração salva com sucesso');
        fetchConfig();
      } else {
        const err = await response.json();
        toast.error(err.error || 'Erro ao salvar configuração');
      }
    } catch {
      toast.error('Erro ao salvar configuração');
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    if (!testText.trim()) {
      toast.error('Digite um texto para testar');
      return;
    }

    setTesting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text: testText }),
      });

      if (response.ok) {
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audio.play();
        toast.success('Áudio gerado com sucesso!');
      } else {
        const err = await response.json();
        toast.error(err.error || 'Erro ao gerar áudio');
      }
    } catch {
      toast.error('Erro ao testar TTS');
    } finally {
      setTesting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-white/60" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Volume2 className="h-8 w-8 text-purple-500" />
            ElevenLabs TTS
          </h1>
          <p className="text-white/60 mt-1">
            Converta respostas dos seus agentes em voz realista com IA
          </p>
        </div>
        <Badge className={config.status === 'active' ? 'bg-green-500' : 'bg-gray-500'}>
          {config.status === 'active' ? (
            <span className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3" /> Ativo
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <XCircle className="h-3 w-3" /> Inativo
            </span>
          )}
        </Badge>
      </div>

      {/* Configuração */}
      <Card className="glass-card border-purple-500/20">
        <CardHeader>
          <CardTitle className="text-white">Configuração</CardTitle>
          <CardDescription>
            Configure sua conta ElevenLabs para habilitar texto-para-voz nos agentes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-5">
            {/* API Key */}
            <div>
              <Label htmlFor="apiKey">API Key *</Label>
              <Input
                id="apiKey"
                type="password"
                value={config.apiKey}
                onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                placeholder="sk_..."
                required
              />
              <p className="text-xs text-white/40 mt-1">
                Encontre em elevenlabs.io → Profile → API Key
              </p>
            </div>

            {/* Voice */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label htmlFor="voiceId">Voz Padrão</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-xs text-purple-400 h-6"
                  onClick={loadVoices}
                  disabled={loadingVoices}
                >
                  {loadingVoices ? (
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  ) : null}
                  Carregar vozes
                </Button>
              </div>
              {voices.length > 0 ? (
                <Select
                  value={config.voiceId}
                  onValueChange={(v) => setConfig({ ...config, voiceId: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {voices.map((voice) => (
                      <SelectItem key={voice.voice_id} value={voice.voice_id}>
                        {voice.name}
                        {voice.category ? ` (${voice.category})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id="voiceId"
                  value={config.voiceId}
                  onChange={(e) => setConfig({ ...config, voiceId: e.target.value })}
                  placeholder="21m00Tcm4TlvDq8ikWAM"
                />
              )}
              <p className="text-xs text-white/40 mt-1">
                ID da voz no ElevenLabs. Clique em "Carregar vozes" para ver as disponíveis.
              </p>
            </div>

            {/* Model */}
            <div>
              <Label>Modelo</Label>
              <Select
                value={config.modelId}
                onValueChange={(v) => setConfig({ ...config, modelId: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODELS.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Stability */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Estabilidade</Label>
                <span className="text-xs text-white/60">{config.stability}%</span>
              </div>
              <Slider
                value={[config.stability]}
                onValueChange={([v]) => setConfig({ ...config, stability: v })}
                min={0}
                max={100}
                step={5}
                className="w-full"
              />
              <p className="text-xs text-white/40 mt-1">
                Maior = mais consistente. Menor = mais expressivo.
              </p>
            </div>

            {/* Similarity Boost */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Clareza / Similaridade</Label>
                <span className="text-xs text-white/60">{config.similarityBoost}%</span>
              </div>
              <Slider
                value={[config.similarityBoost]}
                onValueChange={([v]) => setConfig({ ...config, similarityBoost: v })}
                min={0}
                max={100}
                step={5}
                className="w-full"
              />
              <p className="text-xs text-white/40 mt-1">
                Maior = mais fiel à voz original. Menor = mais natural.
              </p>
            </div>

            <Button type="submit" disabled={saving} className="w-full">
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Configuração
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Testar TTS */}
      <Card className="glass-card border-purple-500/20">
        <CardHeader>
          <CardTitle className="text-white">Testar Texto-para-Voz</CardTitle>
          <CardDescription>
            Gere um áudio de teste com a configuração salva
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="testText">Texto para sintetizar</Label>
            <Input
              id="testText"
              value={testText}
              onChange={(e) => setTestText(e.target.value)}
              placeholder="Digite um texto para ouvir..."
            />
          </div>
          <Button
            type="button"
            onClick={handleTest}
            disabled={testing || config.status !== 'active'}
            variant="outline"
            className="w-full border-purple-500/30"
          >
            {testing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Gerando áudio...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Reproduzir
              </>
            )}
          </Button>
          {config.status !== 'active' && (
            <p className="text-xs text-amber-400 text-center">
              Salve a configuração primeiro para habilitar o teste
            </p>
          )}
        </CardContent>
      </Card>

      {/* Instruções */}
      <Card className="glass-card border-yellow-500/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-500" />
            Instruções de Configuração
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-white/80">
          <div>
            <h3 className="font-semibold text-white mb-2">1. Criar Conta no ElevenLabs</h3>
            <p>
              Acesse{' '}
              <a
                href="https://elevenlabs.io"
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-400 hover:underline"
              >
                elevenlabs.io
              </a>{' '}
              e crie uma conta. O plano gratuito oferece 10.000 caracteres/mês.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-white mb-2">2. Obter API Key</h3>
            <p>
              No ElevenLabs, vá em{' '}
              <strong>Profile → API Key</strong> e copie sua chave.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-white mb-2">3. Escolher uma Voz</h3>
            <p>
              Cole a API Key acima e clique em <strong>Carregar vozes</strong> para ver todas as
              vozes disponíveis. Você também pode clonar sua própria voz no ElevenLabs.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-white mb-2">4. Usar nos Agentes</h3>
            <p>
              Após salvar, os agentes com canal de voz usarão automaticamente o ElevenLabs para
              sintetizar as respostas. Configure o canal Voice em cada agente.
            </p>
          </div>

          <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded">
            <p className="font-semibold text-purple-400">Endpoint de geração de áudio</p>
            <p className="mt-1 font-mono text-xs bg-black/30 p-2 rounded break-all">
              POST /api/tts
              {'\n'}{'{'} text: string, voiceId?: string, modelId?: string {'}'}
            </p>
          </div>

          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded">
            <p className="font-semibold text-blue-400">Modelos recomendados</p>
            <ul className="mt-1 space-y-1 text-xs">
              <li><strong>eleven_multilingual_v2</strong> — melhor qualidade, suporta português</li>
              <li><strong>eleven_turbo_v2_5</strong> — geração rápida, boa para tempo real</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
