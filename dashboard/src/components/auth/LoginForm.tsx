/**
 * 🔐 Sofia IA - Formulário de Login
 * Interface moderna para autenticação
 */

import React, { useState } from 'react';
import { Eye, EyeOff, Lock, User, Zap, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/useAuth';

export const LoginForm: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [credentials, setCredentials] = useState({
    username: '',
    password: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { auth, login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    
    try {
      const success = await login(credentials);
      if (!success) {
        // Error is already handled in the auth hook
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setCredentials(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background-secondary to-background p-4">
      <Card className="w-full max-w-md glass-card">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-16 h-16 bg-primary rounded-full flex items-center justify-center mb-4 relative">
            <Zap className="h-8 w-8 text-primary-foreground" />
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
            </div>
          </div>
          
          <CardTitle className="text-2xl font-light tracking-wider text-foreground">
            Sofia IA
          </CardTitle>
          <p className="text-foreground-secondary text-sm mt-1">
            Sistema SDR Inteligente
          </p>
          <p className="text-foreground-tertiary text-xs">
            Entre com suas credenciais para acessar o dashboard
          </p>
        </CardHeader>

        <CardContent className="space-y-4">
          {auth.error && (
            <Alert className="border-red-500/50 bg-red-500/10">
              <AlertCircle className="h-4 w-4 text-red-400" />
              <AlertDescription className="text-red-400">
                {auth.error}
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-light text-foreground-secondary">
                Usuário
              </label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-foreground-tertiary" />
                <Input
                  type="text"
                  placeholder="Digite seu usuário"
                  value={credentials.username}
                  onChange={(e) => handleInputChange('username', e.target.value)}
                  className="pl-10 bg-background-secondary border-glass-border text-foreground"
                  required
                  autoComplete="username"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-light text-foreground-secondary">
                Senha
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-foreground-tertiary" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Digite sua senha"
                  value={credentials.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className="pl-10 pr-10 bg-background-secondary border-glass-border text-foreground"
                  required
                  autoComplete="current-password"
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-foreground-tertiary hover:text-foreground-secondary transition-colors"
                  disabled={isSubmitting}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full button-luxury mt-6"
              disabled={isSubmitting || !credentials.username || !credentials.password}
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Entrando...
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4 mr-2" />
                  Entrar
                </>
              )}
            </Button>
          </form>

          <div className="border-t border-glass-border pt-4 mt-6">
            <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded text-xs">
              <div className="font-medium text-blue-400 mb-2">
                🔐 Credenciais de Demonstração:
              </div>
              <div className="space-y-1 text-blue-300">
                <div><strong>Admin:</strong> admin / secret123</div>
                <div><strong>User:</strong> sofia / secret123</div>
              </div>
            </div>
          </div>

          <div className="text-center pt-2">
            <p className="text-xs text-foreground-tertiary">
              Powered by{' '}
              <span className="text-primary font-medium">ROI Labs</span>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};