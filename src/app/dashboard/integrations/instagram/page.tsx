'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Instagram, Loader2, Save, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface InstagramConfig {
  appId: string;
  appSecret: string;
  accessToken: string;
  pageId: string;
  webhookVerifyToken: string;
  status: string;
}

export default function InstagramIntegrationPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<InstagramConfig>({
    appId: '',
    appSecret: '',
    accessToken: '',
    pageId: '',
    webhookVerifyToken: '',
    status: 'inactive',
  });

  useEffect(() => {
    fetchConfig();
  }, []);

  async function fetchConfig() {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/integrations?type=instagram', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        const instagramIntegration = data.integrations.find((i: any) => i.type === 'instagram');

        if (instagramIntegration) {
          setConfig({
            appId: instagramIntegration.config.appId || '',
            appSecret: instagramIntegration.credentials.appSecret || '',
            accessToken: instagramIntegration.credentials.accessToken || '',
            pageId: instagramIntegration.config.pageId || '',
            webhookVerifyToken: instagramIntegration.credentials.webhookVerifyToken || '',
            status: instagramIntegration.status,
          });
        }
      }
    } catch (error) {
      console.error('Error fetching Instagram config:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();

    if (!config.appId || !config.appSecret || !config.accessToken) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('token');

      // Verificar se já existe integração
      const response = await fetch('/api/integrations?type=instagram', {
        headers: { Authorization: `Bearer ${token}` },
      });

      let integrationId: string | null = null;

      if (response.ok) {
        const data = await response.json();
        const existing = data.integrations.find((i: any) => i.type === 'instagram');
        if (existing) {
          integrationId = existing.id;
        }
      }

      const payload = {
        name: 'Instagram Direct Messages',
        type: 'instagram',
        config: {
          appId: config.appId,
          pageId: config.pageId,
        },
        credentials: {
          appSecret: config.appSecret,
          accessToken: config.accessToken,
          webhookVerifyToken: config.webhookVerifyToken,
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
      console.error('Error saving Instagram config:', error);
      toast.error('Erro ao salvar configuração');
    } finally {
      setSaving(false);
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
            <Instagram className="h-8 w-8 text-pink-500" />
            Instagram Direct Messages
          </h1>
          <p className="text-white/60 mt-1">Configure a integração com Instagram para receber e responder mensagens diretas</p>
        </div>
        <Badge className={config.status === 'active' ? 'bg-green-500' : 'bg-gray-500'}>
          {config.status === 'active' ? 'Ativo' : 'Inativo'}
        </Badge>
      </div>

      <Card className="glass-card border-pink-500/20">
        <CardHeader>
          <CardTitle className="text-white">Configuração</CardTitle>
          <CardDescription>
            Configure as credenciais do Facebook App para integração com Instagram
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <Label htmlFor="appId">App ID *</Label>
              <Input
                id="appId"
                value={config.appId}
                onChange={(e) => setConfig({ ...config, appId: e.target.value })}
                placeholder="1234567890123456"
                required
              />
            </div>

            <div>
              <Label htmlFor="appSecret">App Secret *</Label>
              <Input
                id="appSecret"
                type="password"
                value={config.appSecret}
                onChange={(e) => setConfig({ ...config, appSecret: e.target.value })}
                placeholder="abcdef1234567890"
                required
              />
            </div>

            <div>
              <Label htmlFor="accessToken">Access Token *</Label>
              <Input
                id="accessToken"
                type="password"
                value={config.accessToken}
                onChange={(e) => setConfig({ ...config, accessToken: e.target.value })}
                placeholder="EAAxxxxxxxxxx"
                required
              />
            </div>

            <div>
              <Label htmlFor="pageId">Instagram Business Account ID</Label>
              <Input
                id="pageId"
                value={config.pageId}
                onChange={(e) => setConfig({ ...config, pageId: e.target.value })}
                placeholder="17841400000000000"
              />
            </div>

            <div>
              <Label htmlFor="webhookVerifyToken">Webhook Verify Token</Label>
              <Input
                id="webhookVerifyToken"
                value={config.webhookVerifyToken}
                onChange={(e) => setConfig({ ...config, webhookVerifyToken: e.target.value })}
                placeholder="my_verify_token_123"
              />
              <p className="text-xs text-white/40 mt-1">
                Use este token no Facebook App Dashboard para verificar o webhook
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
            <h3 className="font-semibold text-white mb-2">1. Criar um Facebook App</h3>
            <p>Acesse o <a href="https://developers.facebook.com/apps" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Facebook Developers</a> e crie um novo app ou use um existente.</p>
          </div>

          <div>
            <h3 className="font-semibold text-white mb-2">2. Adicionar o produto Instagram</h3>
            <p>No dashboard do app, adicione o produto "Instagram" e configure as permissões necessárias (instagram_basic, instagram_manage_messages).</p>
          </div>

          <div>
            <h3 className="font-semibold text-white mb-2">3. Configurar Webhook</h3>
            <p>Configure o webhook URL:</p>
            <code className="block mt-1 p-2 bg-black/30 rounded text-xs">
              https://sofiaia.roilabs.com.br/api/webhook/instagram
            </code>
            <p className="mt-2">Inscreva-se nos eventos: messages, messaging_postbacks</p>
          </div>

          <div>
            <h3 className="font-semibold text-white mb-2">4. Obter Access Token</h3>
            <p>Gere um access token de longa duração através do Graph API Explorer e conecte sua conta Instagram Business.</p>
          </div>

          <div>
            <h3 className="font-semibold text-white mb-2">5. Configurar Agente</h3>
            <p>Após ativar a integração, vá em Agentes e adicione o canal "Instagram" ao agente desejado.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
