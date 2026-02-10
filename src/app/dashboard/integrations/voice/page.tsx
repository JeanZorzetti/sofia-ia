'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Phone, Loader2, Save, AlertCircle, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

interface VoiceConfig {
  accountSid: string;
  authToken: string;
  phoneNumber: string;
  webhookUrl: string;
  status: string;
}

export default function VoiceIntegrationPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [config, setConfig] = useState<VoiceConfig>({
    accountSid: '',
    authToken: '',
    phoneNumber: '',
    webhookUrl: '',
    status: 'inactive',
  });

  const webhookUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/webhook/twilio`
    : 'https://sofiaia.roilabs.com.br/api/webhook/twilio';

  useEffect(() => {
    fetchConfig();
  }, []);

  async function fetchConfig() {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/integrations?type=voice', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        const voiceIntegration = data.integrations.find((i: any) => i.type === 'voice');

        if (voiceIntegration) {
          setConfig({
            accountSid: voiceIntegration.credentials.accountSid || '',
            authToken: voiceIntegration.credentials.authToken || '',
            phoneNumber: voiceIntegration.config.phoneNumber || '',
            webhookUrl: voiceIntegration.config.webhookUrl || '',
            status: voiceIntegration.status,
          });
        }
      }
    } catch (error) {
      console.error('Error fetching Voice config:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();

    if (!config.accountSid || !config.authToken || !config.phoneNumber) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('token');

      // Verificar se já existe integração
      const response = await fetch('/api/integrations?type=voice', {
        headers: { Authorization: `Bearer ${token}` },
      });

      let integrationId: string | null = null;

      if (response.ok) {
        const data = await response.json();
        const existing = data.integrations.find((i: any) => i.type === 'voice');
        if (existing) {
          integrationId = existing.id;
        }
      }

      const payload = {
        name: 'Twilio Voice',
        type: 'voice',
        config: {
          phoneNumber: config.phoneNumber,
          webhookUrl: webhookUrl,
        },
        credentials: {
          accountSid: config.accountSid,
          authToken: config.authToken,
        },
        status: 'active',
      };

      if (integrationId) {
        // Update
        const updateResponse = await fetch(`/api/integrations/${integrationId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });

        if (updateResponse.ok) {
          toast.success('Configuração atualizada com sucesso');
          fetchConfig();
        } else {
          toast.error('Erro ao atualizar configuração');
        }
      } else {
        // Create
        const createResponse = await fetch('/api/integrations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });

        if (createResponse.ok) {
          toast.success('Integração configurada com sucesso');
          fetchConfig();
        } else {
          toast.error('Erro ao configurar integração');
        }
      }
    } catch (error) {
      console.error('Error saving Voice config:', error);
      toast.error('Erro ao salvar configuração');
    } finally {
      setSaving(false);
    }
  }

  function copyWebhookUrl() {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    toast.success('URL copiada!');
    setTimeout(() => setCopied(false), 2000);
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
            <Phone className="h-8 w-8 text-green-500" />
            Twilio Voice
          </h1>
          <p className="text-white/60 mt-1">Configure integração de voz via Twilio para ligações telefônicas</p>
        </div>
        <Badge className={config.status === 'active' ? 'bg-green-500' : 'bg-gray-500'}>
          {config.status === 'active' ? 'Ativo' : 'Inativo'}
        </Badge>
      </div>

      <Card className="glass-card border-green-500/20">
        <CardHeader>
          <CardTitle className="text-white">Configuração</CardTitle>
          <CardDescription>
            Configure suas credenciais do Twilio para habilitar chamadas de voz
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <Label htmlFor="accountSid">Account SID *</Label>
              <Input
                id="accountSid"
                value={config.accountSid}
                onChange={(e) => setConfig({ ...config, accountSid: e.target.value })}
                placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                required
              />
              <p className="text-xs text-white/40 mt-1">
                Encontre no Twilio Console em Account Info
              </p>
            </div>

            <div>
              <Label htmlFor="authToken">Auth Token *</Label>
              <Input
                id="authToken"
                type="password"
                value={config.authToken}
                onChange={(e) => setConfig({ ...config, authToken: e.target.value })}
                placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                required
              />
              <p className="text-xs text-white/40 mt-1">
                Encontre no Twilio Console em Account Info (clique em "Show" para revelar)
              </p>
            </div>

            <div>
              <Label htmlFor="phoneNumber">Twilio Phone Number *</Label>
              <Input
                id="phoneNumber"
                value={config.phoneNumber}
                onChange={(e) => setConfig({ ...config, phoneNumber: e.target.value })}
                placeholder="+1234567890"
                required
              />
              <p className="text-xs text-white/40 mt-1">
                Número de telefone do Twilio no formato E.164 (ex: +5511999998888)
              </p>
            </div>

            <div>
              <Label>Webhook URL</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={webhookUrl}
                  readOnly
                  className="flex-1 bg-black/30"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={copyWebhookUrl}
                >
                  {copied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-white/40 mt-1">
                Configure esta URL no Twilio Phone Number como "Voice Webhook"
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

      <Card className="glass-card border-yellow-500/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-500" />
            Instruções de Configuração
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-white/80">
          <div>
            <h3 className="font-semibold text-white mb-2">1. Criar Conta no Twilio</h3>
            <p>Acesse <a href="https://www.twilio.com/try-twilio" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">twilio.com/try-twilio</a> e crie uma conta gratuita ou paga.</p>
          </div>

          <div>
            <h3 className="font-semibold text-white mb-2">2. Comprar um Número de Telefone</h3>
            <p>No Twilio Console, vá em Phone Numbers e compre um número que suporte Voice. Números brasileiros começam com +55.</p>
          </div>

          <div>
            <h3 className="font-semibold text-white mb-2">3. Copiar Credenciais</h3>
            <p>No Twilio Console, copie o Account SID e Auth Token da seção Account Info.</p>
          </div>

          <div>
            <h3 className="font-semibold text-white mb-2">4. Configurar Webhook</h3>
            <p>No Twilio Console, clique no número comprado e configure:</p>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>Voice Configuration → "A call comes in" → Webhook → Cole a URL acima</li>
              <li>Método: HTTP POST</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-white mb-2">5. Configurar Agente</h3>
            <p>Vá em Agentes e adicione o canal "Voice" ao agente que deve atender as ligações.</p>
          </div>

          <div>
            <h3 className="font-semibold text-white mb-2">6. Testar</h3>
            <p>Ligue para o número do Twilio e converse com o agente de IA.</p>
          </div>

          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded">
            <p className="font-semibold text-blue-400">Nota sobre Transcrição</p>
            <p className="mt-1">O sistema usará Twilio Speech Recognition para converter voz em texto e Text-to-Speech para as respostas do agente.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
