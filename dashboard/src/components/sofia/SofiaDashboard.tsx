import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './Navbar';
import { useAuthContext } from '@/hooks/useAuth';
import { Sidebar } from './Sidebar';
import { OverviewTab } from './tabs/OverviewTab';
import { SDRConfigTab } from './tabs/SDRConfigTab';
import { BillingTab } from './tabs/BillingTab';
import { WorkflowsTab } from './tabs/WorkflowsTab';
import { WhatsAppTab } from './tabs/WhatsAppTab';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, Mail, Lock, User } from 'lucide-react';

interface User {
  email: string;
  name?: string;
  plan?: string;
}

// 🔧 CORREÇÃO DEFINITIVA: Modal de login completamente isolado
const LoginModal = React.memo(({ 
  showLogin, 
  onClose, 
  onLogin 
}: { 
  showLogin: boolean; 
  onClose: () => void; 
  onLogin: (email: string, password: string) => void; 
}) => {
  // 🔧 Estado local isolado no modal
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Reset form quando modal fecha
  useEffect(() => {
    if (!showLogin) {
      setEmail('');
      setPassword('');
    }
  }, [showLogin]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    onLogin(email, password);
  }, [email, password, onLogin]);

  if (!showLogin) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="glass-card w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-12 h-12 bg-primary rounded-full flex items-center justify-center">
            <Sparkles className="h-6 w-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-foreground font-light tracking-wider-sofia">
            Bem-vindo à SOFIA IA
          </CardTitle>
          <p className="text-foreground-secondary">
            Acesse sua conta premium
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-light text-foreground-secondary">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-foreground-tertiary" />
                <Input
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 bg-background-secondary border-glass-border text-foreground"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-light text-foreground-secondary">
                Senha
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-foreground-tertiary" />
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 bg-background-secondary border-glass-border text-foreground"
                  required
                  autoComplete="current-password"
                />
              </div>
            </div>

            <div className="space-y-3 pt-4">
              <Button type="submit" className="w-full button-luxury">
                <User className="h-4 w-4 mr-2" />
                Entrar
              </Button>
              
              <Button 
                type="button"
                variant="outline" 
                className="w-full" 
                onClick={onClose}
              >
                Cancelar
              </Button>
            </div>

            <div className="text-center pt-4 border-t border-glass-border">
              <p className="text-xs text-foreground-tertiary">
                Demo: use qualquer email e senha
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
});

LoginModal.displayName = 'LoginModal';

export const SofiaDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const { auth, logout } = useAuthContext();
  
  // Converter user do JWT para formato do componente
  const user = auth.user ? {
    email: auth.user.username + '@sofia.ai', // Criar email fictício do username
    name: auth.user.username,
    plan: 'professional'
  } : null;

  const handleLogout = useCallback(() => {
    logout();
    setActiveTab('overview');
  }, [logout]);

  const renderTabContent = () => {
    if (!user && ['sdr-config', 'workflows', 'billing', 'whatsapp'].includes(activeTab)) {
      return <LoginPrompt />;
    }

    switch (activeTab) {
      case 'overview':
        return <OverviewTab />;
      case 'sdr-config':
        return <SDRConfigTab />;
      case 'whatsapp':
        return <WhatsAppTab />;
      case 'workflows':
        return <WorkflowsTab />;
      case 'billing':
        return <BillingTab />;
      default:
        return <OverviewTab />;
    }
  };

  // 🔧 CORREÇÃO: Componente estável para evitar re-mount
  const LoginPrompt = useCallback(() => (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="glass-card w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-12 h-12 bg-primary rounded-full flex items-center justify-center">
            <Lock className="h-6 w-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-foreground font-light tracking-wider-sofia">
            Acesso Restrito
          </CardTitle>
          <p className="text-foreground-secondary">
            Faça login para acessar este recurso premium
          </p>
        </CardHeader>
        <CardContent>
          <Button 
            className="w-full button-luxury" 
            onClick={() => setActiveTab('overview')}
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Voltar ao Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  ), []);

  return (
    <div className="min-h-screen bg-background" style={{fontSize: '16px', fontFamily: 'Inter, sans-serif'}}>
      {/* Navbar */}
      <Navbar 
        activeTab={activeTab} 
        onTabChange={setActiveTab}
        user={user}
        onLogout={handleLogout}
      />

      <div className="flex">
        {/* Sidebar - only show when logged in */}
        {user && (
          <div className="hidden lg:block">
            <Sidebar 
              activeTab={activeTab} 
              onTabChange={setActiveTab}
            />
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 p-4 lg:p-6 overflow-x-hidden">
          <div className="mx-auto max-w-7xl">
            {renderTabContent()}
          </div>
        </main>
      </div>

    </div>
  );
};