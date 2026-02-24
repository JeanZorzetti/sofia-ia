'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Settings, Users, Building2, Key, Shield, Lock, Scale, Palette, Webhook, Gift, Copy, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function SettingsPage() {
  const [referrals, setReferrals] = useState<{ count: number; referralLink: string } | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetch('/api/user/referrals')
      .then(r => r.json())
      .then(d => { if (typeof d.count === 'number') setReferrals(d) })
      .catch(() => {})
  }, [])

  const handleCopy = () => {
    if (!referrals?.referralLink) return
    navigator.clipboard.writeText(referrals.referralLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  const settingsCards = [
    {
      title: 'Gestão de Usuários',
      description: 'Convide e gerencie usuários e permissões',
      icon: Users,
      href: '/dashboard/settings/users',
      color: 'text-blue-500',
    },
    {
      title: 'Perfil da Empresa',
      description: 'Configure as informações da sua empresa',
      icon: Building2,
      href: '/dashboard/settings/company',
      color: 'text-purple-500',
    },
    {
      title: 'API Keys',
      description: 'Gerencie chaves de acesso para integrações',
      icon: Key,
      href: '/dashboard/settings/api-keys',
      color: 'text-yellow-500',
    },
    {
      title: 'Logs de Auditoria',
      description: 'Visualize o histórico de ações na plataforma',
      icon: Shield,
      href: '/dashboard/settings/audit',
      color: 'text-green-500',
    },
    {
      title: 'SSO / SAML',
      description: 'Configure login único com SAML 2.0 ou OAuth/OIDC',
      icon: Lock,
      href: '/dashboard/settings/sso',
      color: 'text-cyan-500',
    },
    {
      title: 'Compliance LGPD',
      description: 'Gerencie privacidade, exportação e exclusão de dados',
      icon: Scale,
      href: '/dashboard/settings/compliance',
      color: 'text-red-500',
    },
    {
      title: 'Whitelabel',
      description: 'Personalize logo, cores e domínio da plataforma',
      icon: Palette,
      href: '/dashboard/settings/whitelabel',
      color: 'text-pink-500',
    },
    {
      title: 'Webhooks',
      description: 'Receba notificações no Slack, Discord, email ou HTTP',
      icon: Webhook,
      href: '/dashboard/settings/webhooks',
      color: 'text-orange-500',
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
          <Settings className="h-6 w-6" />
          Configurações
        </h1>
        <p className="text-zinc-400 mt-1">
          Gerencie as configurações e administração da plataforma
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4">
        {settingsCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.href} href={card.href}>
              <Card className="hover:border-zinc-700 transition-colors cursor-pointer h-full">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-zinc-800 ${card.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <CardTitle className="text-lg">{card.title}</CardTitle>
                  </div>
                  <CardDescription className="mt-2">
                    {card.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Referral card */}
      <Card className="border-green-500/20 bg-green-500/5">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/20 text-green-400">
              <Gift className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg">Programa de Indicação</CardTitle>
              <CardDescription>Ganhe 20–40% de comissão recorrente por cada indicado</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="text-center px-4 py-3 rounded-lg bg-zinc-800 border border-zinc-700">
              <div className="text-3xl font-bold text-green-400">{referrals?.count ?? '—'}</div>
              <div className="text-xs text-zinc-400 mt-0.5">indicação{referrals?.count !== 1 ? 'ões' : ''} ativa{referrals?.count !== 1 ? 's' : ''}</div>
            </div>
            <div className="flex-1">
              <p className="text-sm text-zinc-400 mb-2">Seu link de indicação:</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-green-300 truncate">
                  {referrals?.referralLink ?? 'Carregando...'}
                </code>
                <button
                  onClick={handleCopy}
                  className="flex-shrink-0 p-2 rounded-lg bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 transition-colors"
                  title="Copiar link"
                >
                  {copied ? <CheckCircle className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4 text-zinc-400" />}
                </button>
              </div>
            </div>
          </div>
          <Link href="/afiliados" target="_blank" className="inline-flex items-center gap-1.5 text-sm text-green-400 hover:text-green-300 transition-colors">
            Ver detalhes do programa →
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
