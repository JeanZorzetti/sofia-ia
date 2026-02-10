'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Paintbrush, Loader2, Save, Upload, Globe } from 'lucide-react';
import { toast } from 'sonner';

interface WhitelabelConfig {
  companyName: string;
  logoUrl: string;
  faviconUrl: string;
  primaryColor: string;
  secondaryColor: string;
  customDomain: string;
  footerText: string;
}

export default function WhitelabelPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<WhitelabelConfig>({
    companyName: 'ROI Labs',
    logoUrl: '',
    faviconUrl: '',
    primaryColor: '#3b82f6',
    secondaryColor: '#8b5cf6',
    customDomain: '',
    footerText: 'Powered by ROI Labs',
  });

  useEffect(() => {
    fetchConfig();
  }, []);

  async function fetchConfig() {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/settings/whitelabel', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.config) {
          setConfig(data.config);
        }
      }
    } catch (error) {
      console.error('Error fetching whitelabel config:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/settings/whitelabel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(config),
      });

      if (response.ok) {
        toast.success('Configuração de marca salva com sucesso');
        // Opcionalmente, recarregar a página para aplicar as mudanças
        setTimeout(() => window.location.reload(), 1000);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Erro ao salvar configuração');
      }
    } catch (error) {
      console.error('Error saving whitelabel config:', error);
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
          <Paintbrush className="h-8 w-8 text-purple-500" />
          Whitelabel / Marca Própria
        </h1>
        <p className="text-white/60 mt-1">Personalize a plataforma com sua identidade visual</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Brand Identity */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-white">Identidade da Marca</CardTitle>
            <CardDescription>Configure o nome e logotipo da sua empresa</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="companyName">Nome da Empresa</Label>
              <Input
                id="companyName"
                value={config.companyName}
                onChange={(e) => setConfig({ ...config, companyName: e.target.value })}
                placeholder="Sua Empresa Ltda"
              />
            </div>

            <div>
              <Label htmlFor="logoUrl">URL do Logo</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="logoUrl"
                  value={config.logoUrl}
                  onChange={(e) => setConfig({ ...config, logoUrl: e.target.value })}
                  placeholder="https://example.com/logo.png"
                  className="flex-1"
                />
                <Button type="button" variant="outline" size="sm">
                  <Upload className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-white/40 mt-1">
                Recomendado: PNG transparente, 200x50px
              </p>
              {config.logoUrl && (
                <div className="mt-3 p-4 bg-white/5 rounded-lg">
                  <p className="text-xs text-white/60 mb-2">Preview:</p>
                  <img src={config.logoUrl} alt="Logo preview" className="h-12 object-contain" />
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="faviconUrl">URL do Favicon</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="faviconUrl"
                  value={config.faviconUrl}
                  onChange={(e) => setConfig({ ...config, faviconUrl: e.target.value })}
                  placeholder="https://example.com/favicon.ico"
                  className="flex-1"
                />
                <Button type="button" variant="outline" size="sm">
                  <Upload className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-white/40 mt-1">
                Formato: .ico ou .png, 32x32px ou 16x16px
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Colors */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-white">Paleta de Cores</CardTitle>
            <CardDescription>Defina as cores principais da interface</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="primaryColor">Cor Primária</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    id="primaryColor"
                    value={config.primaryColor}
                    onChange={(e) => setConfig({ ...config, primaryColor: e.target.value })}
                    className="h-10 w-20 rounded border border-white/10 bg-transparent cursor-pointer"
                  />
                  <Input
                    value={config.primaryColor}
                    onChange={(e) => setConfig({ ...config, primaryColor: e.target.value })}
                    placeholder="#3b82f6"
                    className="flex-1"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="secondaryColor">Cor Secundária</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    id="secondaryColor"
                    value={config.secondaryColor}
                    onChange={(e) => setConfig({ ...config, secondaryColor: e.target.value })}
                    className="h-10 w-20 rounded border border-white/10 bg-transparent cursor-pointer"
                  />
                  <Input
                    value={config.secondaryColor}
                    onChange={(e) => setConfig({ ...config, secondaryColor: e.target.value })}
                    placeholder="#8b5cf6"
                    className="flex-1"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 bg-white/5 rounded-lg">
              <p className="text-xs text-white/60 mb-3">Preview:</p>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  style={{ backgroundColor: config.primaryColor }}
                  className="pointer-events-none"
                >
                  Botão Primário
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  style={{ borderColor: config.secondaryColor, color: config.secondaryColor }}
                  className="pointer-events-none"
                >
                  Botão Secundário
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Domain */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Domínio Personalizado
            </CardTitle>
            <CardDescription>Configure um domínio próprio para a plataforma</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="customDomain">Domínio Customizado</Label>
              <Input
                id="customDomain"
                value={config.customDomain}
                onChange={(e) => setConfig({ ...config, customDomain: e.target.value })}
                placeholder="app.suaempresa.com.br"
              />
              <p className="text-xs text-white/40 mt-1">
                Após configurar, aponte um CNAME do seu DNS para: sofiaia.roilabs.com.br
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-white">Rodapé</CardTitle>
            <CardDescription>Texto exibido no rodapé da plataforma</CardDescription>
          </CardHeader>
          <CardContent>
            <div>
              <Label htmlFor="footerText">Texto do Rodapé</Label>
              <Input
                id="footerText"
                value={config.footerText}
                onChange={(e) => setConfig({ ...config, footerText: e.target.value })}
                placeholder="© 2024 Sua Empresa. Todos os direitos reservados."
              />
            </div>
          </CardContent>
        </Card>

        <Button type="submit" disabled={saving} className="w-full">
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Salvar Configurações
            </>
          )}
        </Button>
      </form>
    </div>
  );
}
