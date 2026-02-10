'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, Loader2, Save, AlertCircle, Key } from 'lucide-react';
import { toast } from 'sonner';

interface SsoConfig {
  provider: string;
  enabled: boolean;
  config: {
    entityId?: string;
    ssoUrl?: string;
    certificate?: string;
    clientId?: string;
    clientSecret?: string;
    domain?: string;
  };
}

export default function SsoConfigPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [samlConfig, setSamlConfig] = useState<SsoConfig>({
    provider: 'saml',
    enabled: false,
    config: {},
  });
  const [oidcConfig, setOidcConfig] = useState<SsoConfig>({
    provider: 'oidc',
    enabled: false,
    config: {},
  });

  useEffect(() => {
    fetchConfigs();
  }, []);

  async function fetchConfigs() {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/settings/sso', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.saml) {
          setSamlConfig(data.saml);
        }
        if (data.oidc) {
          setOidcConfig(data.oidc);
        }
      }
    } catch (error) {
      console.error('Error fetching SSO configs:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveSaml(e: React.FormEvent) {
    e.preventDefault();
    await saveConfig(samlConfig);
  }

  async function handleSaveOidc(e: React.FormEvent) {
    e.preventDefault();
    await saveConfig(oidcConfig);
  }

  async function saveConfig(config: SsoConfig) {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/settings/sso', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(config),
      });

      if (response.ok) {
        toast.success('Configuração de SSO salva com sucesso');
        fetchConfigs();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Erro ao salvar configuração');
      }
    } catch (error) {
      console.error('Error saving SSO config:', error);
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
      <div>
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <Shield className="h-8 w-8 text-blue-500" />
          Single Sign-On (SSO)
        </h1>
        <p className="text-white/60 mt-1">Configure autenticação empresarial via SAML 2.0 ou OAuth/OIDC</p>
      </div>

      <Tabs defaultValue="saml" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="saml">
            <Shield className="h-4 w-4 mr-2" />
            SAML 2.0
          </TabsTrigger>
          <TabsTrigger value="oidc">
            <Key className="h-4 w-4 mr-2" />
            OAuth/OIDC
          </TabsTrigger>
        </TabsList>

        <TabsContent value="saml" className="space-y-6">
          <Card className="glass-card border-blue-500/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white">SAML 2.0 Configuration</CardTitle>
                  <CardDescription>Configure SAML para provedores como Okta, Azure AD, Google Workspace</CardDescription>
                </div>
                <Badge className={samlConfig.enabled ? 'bg-green-500' : 'bg-gray-500'}>
                  {samlConfig.enabled ? 'Ativo' : 'Inativo'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveSaml} className="space-y-4">
                <div>
                  <Label htmlFor="saml-entityId">Entity ID (Issuer)</Label>
                  <Input
                    id="saml-entityId"
                    value={samlConfig.config.entityId || ''}
                    onChange={(e) => setSamlConfig({
                      ...samlConfig,
                      config: { ...samlConfig.config, entityId: e.target.value }
                    })}
                    placeholder="https://example.com/saml"
                  />
                </div>

                <div>
                  <Label htmlFor="saml-ssoUrl">SSO URL (Login URL)</Label>
                  <Input
                    id="saml-ssoUrl"
                    value={samlConfig.config.ssoUrl || ''}
                    onChange={(e) => setSamlConfig({
                      ...samlConfig,
                      config: { ...samlConfig.config, ssoUrl: e.target.value }
                    })}
                    placeholder="https://example.com/saml/sso"
                  />
                </div>

                <div>
                  <Label htmlFor="saml-certificate">X.509 Certificate</Label>
                  <textarea
                    id="saml-certificate"
                    value={samlConfig.config.certificate || ''}
                    onChange={(e) => setSamlConfig({
                      ...samlConfig,
                      config: { ...samlConfig.config, certificate: e.target.value }
                    })}
                    placeholder="-----BEGIN CERTIFICATE-----&#10;MIIDXTCCAkWgAwIBAgIJ...&#10;-----END CERTIFICATE-----"
                    rows={6}
                    className="w-full px-3 py-2 bg-black/30 border border-white/10 rounded text-white text-sm font-mono"
                  />
                </div>

                <div className="flex items-center gap-4">
                  <input
                    type="checkbox"
                    id="saml-enabled"
                    checked={samlConfig.enabled}
                    onChange={(e) => setSamlConfig({ ...samlConfig, enabled: e.target.checked })}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="saml-enabled">Habilitar autenticação SAML</Label>
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
                      Salvar Configuração SAML
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
                Service Provider (SP) Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-white/80">
              <div>
                <p className="font-semibold text-white">ACS URL (Assertion Consumer Service)</p>
                <code className="block mt-1 p-2 bg-black/30 rounded text-xs">
                  https://sofiaia.roilabs.com.br/api/auth/saml/callback
                </code>
              </div>
              <div>
                <p className="font-semibold text-white">SP Entity ID</p>
                <code className="block mt-1 p-2 bg-black/30 rounded text-xs">
                  https://sofiaia.roilabs.com.br
                </code>
              </div>
              <p className="text-white/60">Configure estas informações no seu Identity Provider (Okta, Azure AD, etc.)</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="oidc" className="space-y-6">
          <Card className="glass-card border-purple-500/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white">OAuth/OIDC Configuration</CardTitle>
                  <CardDescription>Configure OAuth 2.0 / OpenID Connect para Google, Auth0, etc.</CardDescription>
                </div>
                <Badge className={oidcConfig.enabled ? 'bg-green-500' : 'bg-gray-500'}>
                  {oidcConfig.enabled ? 'Ativo' : 'Inativo'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveOidc} className="space-y-4">
                <div>
                  <Label htmlFor="oidc-domain">Domain / Issuer URL</Label>
                  <Input
                    id="oidc-domain"
                    value={oidcConfig.config.domain || ''}
                    onChange={(e) => setOidcConfig({
                      ...oidcConfig,
                      config: { ...oidcConfig.config, domain: e.target.value }
                    })}
                    placeholder="https://example.auth0.com"
                  />
                </div>

                <div>
                  <Label htmlFor="oidc-clientId">Client ID</Label>
                  <Input
                    id="oidc-clientId"
                    value={oidcConfig.config.clientId || ''}
                    onChange={(e) => setOidcConfig({
                      ...oidcConfig,
                      config: { ...oidcConfig.config, clientId: e.target.value }
                    })}
                    placeholder="abc123xyz"
                  />
                </div>

                <div>
                  <Label htmlFor="oidc-clientSecret">Client Secret</Label>
                  <Input
                    id="oidc-clientSecret"
                    type="password"
                    value={oidcConfig.config.clientSecret || ''}
                    onChange={(e) => setOidcConfig({
                      ...oidcConfig,
                      config: { ...oidcConfig.config, clientSecret: e.target.value }
                    })}
                    placeholder="secret123"
                  />
                </div>

                <div className="flex items-center gap-4">
                  <input
                    type="checkbox"
                    id="oidc-enabled"
                    checked={oidcConfig.enabled}
                    onChange={(e) => setOidcConfig({ ...oidcConfig, enabled: e.target.checked })}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="oidc-enabled">Habilitar autenticação OAuth/OIDC</Label>
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
                      Salvar Configuração OAuth/OIDC
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
                OAuth Redirect URLs
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-white/80">
              <div>
                <p className="font-semibold text-white">Redirect URI / Callback URL</p>
                <code className="block mt-1 p-2 bg-black/30 rounded text-xs">
                  https://sofiaia.roilabs.com.br/api/auth/oidc/callback
                </code>
              </div>
              <p className="text-white/60">Configure esta URL no seu OAuth Provider</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
