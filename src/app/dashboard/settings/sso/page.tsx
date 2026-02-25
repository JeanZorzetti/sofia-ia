'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, Loader2, Save, AlertCircle, Key, Chrome, Building2, ExternalLink, Copy, CheckCircle, Lock } from 'lucide-react';
import { toast } from 'sonner';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://sofiaia.roilabs.com.br';

interface OAuthSsoConfig {
  provider: 'google' | 'microsoft';
  domain: string;
  clientId: string;
  clientSecret: string;
  forced: boolean;
}

interface LegacySsoConfig {
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
  const [copied, setCopied] = useState<string | null>(null);
  const [orgSlug, setOrgSlug] = useState<string | null>(null);

  const [googleConfig, setGoogleConfig] = useState<OAuthSsoConfig>({
    provider: 'google',
    domain: '',
    clientId: '',
    clientSecret: '',
    forced: false,
  });

  const [microsoftConfig, setMicrosoftConfig] = useState<OAuthSsoConfig>({
    provider: 'microsoft',
    domain: '',
    clientId: '',
    clientSecret: '',
    forced: false,
  });

  const [samlConfig, setSamlConfig] = useState<LegacySsoConfig>({
    provider: 'saml',
    enabled: false,
    config: {},
  });

  const [oidcConfig, setOidcConfig] = useState<LegacySsoConfig>({
    provider: 'oidc',
    enabled: false,
    config: {},
  });

  const [activeProvider, setActiveProvider] = useState<string | null>(null);

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
        if (data.google) {
          setGoogleConfig(prev => ({
            ...prev,
            domain: data.google.domain || '',
            clientId: data.google.clientId || '',
            forced: data.google.forced ?? false,
          }));
          setActiveProvider('google');
        }
        if (data.microsoft) {
          setMicrosoftConfig(prev => ({
            ...prev,
            domain: data.microsoft.domain || '',
            clientId: data.microsoft.clientId || '',
            forced: data.microsoft.forced ?? false,
          }));
          setActiveProvider('microsoft');
        }
        if (data.saml) setSamlConfig(data.saml);
        if (data.oidc) setOidcConfig(data.oidc);
        if (data.orgSlug) setOrgSlug(data.orgSlug);
      }
    } catch (error) {
      console.error('Error fetching SSO configs:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveOAuth(config: OAuthSsoConfig) {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/settings/sso', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          provider: config.provider,
          domain: config.domain,
          clientId: config.clientId,
          clientSecret: config.clientSecret,
          forced: config.forced,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.orgSlug) setOrgSlug(data.orgSlug);
        toast.success(`SSO ${config.provider === 'google' ? 'Google Workspace' : 'Microsoft Entra'} configurado!`);
        fetchConfigs();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Erro ao salvar configuração');
      }
    } catch {
      toast.error('Erro ao salvar configuração');
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveLegacy(config: LegacySsoConfig) {
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
    } catch {
      toast.error('Erro ao salvar configuração');
    } finally {
      setSaving(false);
    }
  }

  function handleTestSso(provider: 'google' | 'microsoft') {
    const url = `/api/auth/sso/${provider}?org=${orgSlug || ''}`;
    window.open(url, 'sso-test', 'width=500,height=600');
  }

  function handleCopy(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
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
        <p className="text-white/60 mt-1">
          Configure autenticação empresarial via Google Workspace, Microsoft Entra, SAML 2.0 ou OAuth/OIDC
        </p>
      </div>

      {activeProvider && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-green-500/10 border border-green-500/20">
          <CheckCircle className="h-5 w-5 text-green-400 shrink-0" />
          <p className="text-green-300 text-sm">
            SSO via <strong>{activeProvider === 'google' ? 'Google Workspace' : 'Microsoft Entra'}</strong> está ativo.
            Membros do domínio configurado podem fazer login via SSO.
          </p>
        </div>
      )}

      <Tabs defaultValue="google" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="google">
            <Chrome className="h-4 w-4 mr-2" />
            Google
          </TabsTrigger>
          <TabsTrigger value="microsoft">
            <Building2 className="h-4 w-4 mr-2" />
            Microsoft
          </TabsTrigger>
          <TabsTrigger value="saml">
            <Shield className="h-4 w-4 mr-2" />
            SAML 2.0
          </TabsTrigger>
          <TabsTrigger value="oidc">
            <Key className="h-4 w-4 mr-2" />
            OAuth/OIDC
          </TabsTrigger>
        </TabsList>

        {/* Google Workspace SSO */}
        <TabsContent value="google" className="space-y-6">
          <Card className="glass-card border-blue-500/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Chrome className="h-5 w-5 text-blue-400" />
                    Google Workspace SSO
                  </CardTitle>
                  <CardDescription>
                    Permita que membros da sua empresa façam login com as credenciais Google corporativas
                  </CardDescription>
                </div>
                {activeProvider === 'google' && (
                  <Badge className="bg-green-500">Ativo</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <Label htmlFor="google-domain">Domínio da Empresa</Label>
                <Input
                  id="google-domain"
                  value={googleConfig.domain}
                  onChange={(e) => setGoogleConfig({ ...googleConfig, domain: e.target.value })}
                  placeholder="empresa.com.br"
                  className="mt-1.5"
                />
                <p className="text-xs text-white/40 mt-1">
                  Usuários com email @{googleConfig.domain || 'empresa.com.br'} poderão fazer login via Google SSO
                </p>
              </div>

              <div>
                <Label htmlFor="google-client-id">Client ID (Google OAuth 2.0)</Label>
                <Input
                  id="google-client-id"
                  value={googleConfig.clientId}
                  onChange={(e) => setGoogleConfig({ ...googleConfig, clientId: e.target.value })}
                  placeholder="123456789-abc.apps.googleusercontent.com"
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label htmlFor="google-client-secret">Client Secret</Label>
                <Input
                  id="google-client-secret"
                  type="password"
                  value={googleConfig.clientSecret}
                  onChange={(e) => setGoogleConfig({ ...googleConfig, clientSecret: e.target.value })}
                  placeholder="GOCSPX-..."
                  className="mt-1.5"
                />
              </div>

              <div className="flex items-center gap-3 p-4 rounded-lg bg-white/5 border border-white/10">
                <input
                  type="checkbox"
                  id="google-forced"
                  checked={googleConfig.forced}
                  onChange={(e) => setGoogleConfig({ ...googleConfig, forced: e.target.checked })}
                  className="h-4 w-4"
                />
                <div>
                  <Label htmlFor="google-forced" className="flex items-center gap-2 cursor-pointer">
                    <Lock className="h-4 w-4 text-orange-400" />
                    Forçar SSO — bloquear login com email/senha
                  </Label>
                  <p className="text-xs text-white/40 mt-0.5">
                    Membros do domínio só poderão acessar via Google SSO
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  className="flex-1"
                  onClick={() => handleSaveOAuth(googleConfig)}
                  disabled={saving || !googleConfig.domain || !googleConfig.clientId || !googleConfig.clientSecret}
                >
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  Salvar Configuração Google
                </Button>
                {orgSlug && (
                  <Button
                    variant="outline"
                    onClick={() => handleTestSso('google')}
                    className="gap-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Testar SSO
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card border-yellow-500/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-500" />
                Configuração no Google Cloud Console
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <ol className="space-y-3 text-white/70 list-decimal list-inside">
                <li>Acesse <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline inline-flex items-center gap-1">Google Cloud Console <ExternalLink className="h-3 w-3" /></a></li>
                <li>Crie um projeto ou selecione um existente</li>
                <li>Vá em &ldquo;Credentials&rdquo; → &ldquo;Create Credentials&rdquo; → &ldquo;OAuth Client ID&rdquo;</li>
                <li>Tipo: &ldquo;Web Application&rdquo;</li>
                <li>Adicione este URI como Authorized Redirect URI:</li>
              </ol>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-black/40 font-mono text-xs">
                <code className="flex-1 text-green-300">
                  {APP_URL}/api/auth/sso/google/callback
                </code>
                <button
                  onClick={() => handleCopy(`${APP_URL}/api/auth/sso/google/callback`, 'google-cb')}
                  className="text-white/40 hover:text-white/80"
                >
                  {copied === 'google-cb' ? <CheckCircle className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Microsoft Entra SSO */}
        <TabsContent value="microsoft" className="space-y-6">
          <Card className="glass-card border-purple-500/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-purple-400" />
                    Microsoft Entra ID (Azure AD) SSO
                  </CardTitle>
                  <CardDescription>
                    Login com contas Microsoft corporativas (Office 365 / Entra ID)
                  </CardDescription>
                </div>
                {activeProvider === 'microsoft' && (
                  <Badge className="bg-green-500">Ativo</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <Label htmlFor="ms-domain">Domínio da Empresa</Label>
                <Input
                  id="ms-domain"
                  value={microsoftConfig.domain}
                  onChange={(e) => setMicrosoftConfig({ ...microsoftConfig, domain: e.target.value })}
                  placeholder="empresa.com.br"
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label htmlFor="ms-client-id">Application (Client) ID</Label>
                <Input
                  id="ms-client-id"
                  value={microsoftConfig.clientId}
                  onChange={(e) => setMicrosoftConfig({ ...microsoftConfig, clientId: e.target.value })}
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label htmlFor="ms-client-secret">Client Secret Value</Label>
                <Input
                  id="ms-client-secret"
                  type="password"
                  value={microsoftConfig.clientSecret}
                  onChange={(e) => setMicrosoftConfig({ ...microsoftConfig, clientSecret: e.target.value })}
                  placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  className="mt-1.5"
                />
              </div>

              <div className="flex items-center gap-3 p-4 rounded-lg bg-white/5 border border-white/10">
                <input
                  type="checkbox"
                  id="ms-forced"
                  checked={microsoftConfig.forced}
                  onChange={(e) => setMicrosoftConfig({ ...microsoftConfig, forced: e.target.checked })}
                  className="h-4 w-4"
                />
                <div>
                  <Label htmlFor="ms-forced" className="flex items-center gap-2 cursor-pointer">
                    <Lock className="h-4 w-4 text-orange-400" />
                    Forçar SSO — bloquear login com email/senha
                  </Label>
                  <p className="text-xs text-white/40 mt-0.5">
                    Membros do domínio só poderão acessar via Microsoft SSO
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  className="flex-1"
                  onClick={() => handleSaveOAuth(microsoftConfig)}
                  disabled={saving || !microsoftConfig.domain || !microsoftConfig.clientId || !microsoftConfig.clientSecret}
                >
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  Salvar Configuração Microsoft
                </Button>
                {orgSlug && (
                  <Button
                    variant="outline"
                    onClick={() => handleTestSso('microsoft')}
                    className="gap-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Testar SSO
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card border-yellow-500/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-500" />
                Configuração no Azure Portal
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <ol className="space-y-3 text-white/70 list-decimal list-inside">
                <li>Acesse <a href="https://portal.azure.com/#blade/Microsoft_AAD_IAM/ActiveDirectoryMenuBlade/RegisteredApps" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline inline-flex items-center gap-1">Azure Portal → App Registrations <ExternalLink className="h-3 w-3" /></a></li>
                <li>Clique em &ldquo;New Registration&rdquo;</li>
                <li>Em &ldquo;Redirect URI&rdquo;, selecione &ldquo;Web&rdquo; e adicione:</li>
              </ol>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-black/40 font-mono text-xs">
                <code className="flex-1 text-green-300">
                  {APP_URL}/api/auth/sso/microsoft/callback
                </code>
                <button
                  onClick={() => handleCopy(`${APP_URL}/api/auth/sso/microsoft/callback`, 'ms-cb')}
                  className="text-white/40 hover:text-white/80"
                >
                  {copied === 'ms-cb' ? <CheckCircle className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
              <ol className="space-y-3 text-white/70 list-decimal list-inside" start={4}>
                <li>Copie o &ldquo;Application (Client) ID&rdquo;</li>
                <li>Vá em &ldquo;Certificates &amp; Secrets&rdquo; → &ldquo;New Client Secret&rdquo;</li>
                <li>Copie o &ldquo;Value&rdquo; (não o Secret ID)</li>
              </ol>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SAML 2.0 (legado) */}
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
              <form onSubmit={(e) => { e.preventDefault(); handleSaveLegacy(samlConfig); }} className="space-y-4">
                <div>
                  <Label htmlFor="saml-entityId">Entity ID (Issuer)</Label>
                  <Input
                    id="saml-entityId"
                    value={samlConfig.config.entityId || ''}
                    onChange={(e) => setSamlConfig({ ...samlConfig, config: { ...samlConfig.config, entityId: e.target.value } })}
                    placeholder="https://example.com/saml"
                  />
                </div>
                <div>
                  <Label htmlFor="saml-ssoUrl">SSO URL (Login URL)</Label>
                  <Input
                    id="saml-ssoUrl"
                    value={samlConfig.config.ssoUrl || ''}
                    onChange={(e) => setSamlConfig({ ...samlConfig, config: { ...samlConfig.config, ssoUrl: e.target.value } })}
                    placeholder="https://example.com/saml/sso"
                  />
                </div>
                <div>
                  <Label htmlFor="saml-certificate">X.509 Certificate</Label>
                  <textarea
                    id="saml-certificate"
                    value={samlConfig.config.certificate || ''}
                    onChange={(e) => setSamlConfig({ ...samlConfig, config: { ...samlConfig.config, certificate: e.target.value } })}
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
                  {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Salvando...</> : <><Save className="h-4 w-4 mr-2" />Salvar SAML</>}
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
                  {APP_URL}/api/auth/saml/callback
                </code>
              </div>
              <div>
                <p className="font-semibold text-white">SP Entity ID</p>
                <code className="block mt-1 p-2 bg-black/30 rounded text-xs">{APP_URL}</code>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* OAuth/OIDC (legado) */}
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
              <form onSubmit={(e) => { e.preventDefault(); handleSaveLegacy(oidcConfig); }} className="space-y-4">
                <div>
                  <Label htmlFor="oidc-domain">Domain / Issuer URL</Label>
                  <Input
                    id="oidc-domain"
                    value={oidcConfig.config.domain || ''}
                    onChange={(e) => setOidcConfig({ ...oidcConfig, config: { ...oidcConfig.config, domain: e.target.value } })}
                    placeholder="https://example.auth0.com"
                  />
                </div>
                <div>
                  <Label htmlFor="oidc-clientId">Client ID</Label>
                  <Input
                    id="oidc-clientId"
                    value={oidcConfig.config.clientId || ''}
                    onChange={(e) => setOidcConfig({ ...oidcConfig, config: { ...oidcConfig.config, clientId: e.target.value } })}
                    placeholder="abc123xyz"
                  />
                </div>
                <div>
                  <Label htmlFor="oidc-clientSecret">Client Secret</Label>
                  <Input
                    id="oidc-clientSecret"
                    type="password"
                    value={oidcConfig.config.clientSecret || ''}
                    onChange={(e) => setOidcConfig({ ...oidcConfig, config: { ...oidcConfig.config, clientSecret: e.target.value } })}
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
                  {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Salvando...</> : <><Save className="h-4 w-4 mr-2" />Salvar OAuth/OIDC</>}
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
                  {APP_URL}/api/auth/oidc/callback
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
