'use client';

import Link from 'next/link';
import { Settings, Users, Building2, Key, Shield } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function SettingsPage() {
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
    </div>
  );
}
