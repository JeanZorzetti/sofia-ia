'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Send, Loader2, Save, AlertCircle, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

interface TelegramConfig {
  botToken: string;
  botUsername: string;
  webhookUrl: string;
  status: string;
}

export default function TelegramIntegrationPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [config, setConfig] = useState<TelegramConfig>({
    botToken: '',
    botUsername: '',
    webhookUrl: '',
    status: 'inactive',
  });

  const webhookUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/webhook/telegram`
    : 'https://sofiaia.roilabs.com.br/api/webhook/telegram';

  useEffect(() => {
    fetchConfig();
  }, []);

  async function fetchConfig() {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/integrations?type=telegram', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        const telegramIntegration = data.integrations.find((i: any) => i.type === 'telegram');

        if (telegramIntegration) {
          setConfig({
            botToken: telegramIntegration.credentials.botToken || '',
            botUsername: telegramIntegration.config.botUsername || '',
            webhookUrl: telegramIntegration.config.webhookUrl || '',
            status: telegramIntegration.status,
          });
        }
      }
    } catch (error) {
      console.error('Error fetching Telegram config:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();

    if (!config.botToken) {
      toast.error('Bot Token é obrigatório');
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('token');

      // Verificar se já existe integração
      const response = await fetch('/api/integrations?type=telegram', {
        headers: { Authorization: `Bearer ${token}` },
      });

      let integrationId: string | null = null;

      if (response.ok) {
        const data = await response.json();
        const existing = data.integrations.find((i: any) => i.type === 'telegram');
        if (existing) {
          integrationId = existing.id;
        }
      }

      const payload = {
        name: 'Telegram Bot',
        type: 'telegram',
        config: {
          botUsername: config.botUsername,
          webhookUrl: webhookUrl,
        },
        credentials: {
          botToken: config.botToken,
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
          // Configurar webhook no Telegram
          await setupWebhook();
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
          // Configurar webhook no Telegram
          await setupWebhook();
          fetchConfig();
        } else {
          toast.error('Erro ao configurar integração');
        }
      }
    } catch (error) {
      console.error('Error saving Telegram config:', error);
      toast.error('Erro ao salvar configuração');
    } finally {
      setSaving(false);
    }
  }

  async function setupWebhook() {
    try {
      // Chamar API do Telegram para configurar webhook
      const response = await fetch(
        `https://api.telegram.org/bot${config.botToken}/setWebhook`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: webhookUrl }),
        }
      );

      const data = await response.json();

      if (data.ok) {
        toast.success('Webhook configurado no Telegram');
      } else {
        toast.warning('Webhook configurado mas não validado pelo Telegram');
      }
    } catch (error) {
      console.error('Error setting up webhook:', error);
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
            <Send className="h-8 w-8 text-blue-500" />
            Telegram Bot
          </h1>
          <p className="text-white/60 mt-1">Configure um bot do Telegram para conversar com seus clientes</p>
        </div>
        <Badge className={config.status === 'active' ? 'bg-green-500' : 'bg-gray-500'}>
          {config.status === 'active' ? 'Ativo' : 'Inativo'}
        </Badge>
      </div>

      <Card className="glass-card border-blue-500/20">
        <CardHeader>
          <CardTitle className="text-white">Configuração</CardTitle>
          <CardDescription>
            Configure seu bot do Telegram usando o token fornecido pelo BotFather
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <Label htmlFor="botToken">Bot Token *</Label>
              <Input
                id="botToken"
                type="password"
                value={config.botToken}
                onChange={(e) => setConfig({ ...config, botToken: e.target.value })}
                placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                required
              />
              <p className="text-xs text-white/40 mt-1">
                Token fornecido pelo @BotFather no Telegram
              </p>
            </div>

            <div>
              <Label htmlFor="botUsername">Bot Username</Label>
              <Input
                id="botUsername"
                value={config.botUsername}
                onChange={(e) => setConfig({ ...config, botUsername: e.target.value })}
                placeholder="@seu_bot"
              />
              <p className="text-xs text-white/40 mt-1">
                Nome de usuário do bot (opcional, apenas para referência)
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
                Esta URL será configurada automaticamente no Telegram ao salvar
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
                  Salvar e Configurar Webhook
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
            <h3 className="font-semibold text-white mb-2">1. Criar um Bot no Telegram</h3>
            <p>Abra o Telegram e procure por <code className="px-2 py-1 bg-black/30 rounded">@BotFather</code></p>
            <p className="mt-1">Envie o comando <code className="px-2 py-1 bg-black/30 rounded">/newbot</code> e siga as instruções</p>
          </div>

          <div>
            <h3 className="font-semibold text-white mb-2">2. Copiar o Token</h3>
            <p>O BotFather fornecerá um token de acesso HTTP. Copie este token e cole no campo "Bot Token" acima.</p>
          </div>

          <div>
            <h3 className="font-semibold text-white mb-2">3. Salvar Configuração</h3>
            <p>Clique em "Salvar e Configurar Webhook" para ativar a integração. O webhook será automaticamente configurado no Telegram.</p>
          </div>

          <div>
            <h3 className="font-semibold text-white mb-2">4. Configurar Agente</h3>
            <p>Vá em Agentes e adicione o canal "Telegram" ao agente que deve responder as mensagens do bot.</p>
          </div>

          <div>
            <h3 className="font-semibold text-white mb-2">5. Testar</h3>
            <p>Abra seu bot no Telegram e envie a mensagem <code className="px-2 py-1 bg-black/30 rounded">/start</code> para iniciar a conversa.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
