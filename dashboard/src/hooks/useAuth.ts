/**
 * 🔐 Sofia IA - Hook de Autenticação
 * Sistema JWT para proteger APIs do dashboard
 */

import { useState, useEffect, useCallback, createContext, useContext } from 'react';

// Configuração da API
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// Types
interface User {
  id: number;
  username: string;
  role: 'admin' | 'user';
}

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
}

interface LoginCredentials {
  username: string;
  password: string;
}

interface AuthResponse {
  success: boolean;
  data?: {
    token: string;
    user: User;
    expires_in: string;
  };
  error?: string;
}

// Context para autenticação
const AuthContext = createContext<{
  auth: AuthState;
  login: (credentials: LoginCredentials) => Promise<boolean>;
  logout: () => void;
  refreshToken: () => Promise<boolean>;
  isTokenExpired: () => boolean;
} | null>(null);

// Hook principal de autenticação
export const useAuth = () => {
  const [auth, setAuth] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    token: null,
    loading: true,
    error: null
  });

  // Verificar se o token está expirado
  const isTokenExpired = useCallback((): boolean => {
    const token = localStorage.getItem('sofia_token');
    if (!token) return true;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      return payload.exp < currentTime;
    } catch {
      return true;
    }
  }, []);

  // Função de login
  const login = useCallback(async (credentials: LoginCredentials): Promise<boolean> => {
    try {
      setAuth(prev => ({ ...prev, loading: true, error: null }));

      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const result: AuthResponse = await response.json();

      if (response.ok && result.success && result.data) {
        // Salvar token no localStorage
        localStorage.setItem('sofia_token', result.data.token);
        localStorage.setItem('sofia_user', JSON.stringify(result.data.user));

        setAuth({
          isAuthenticated: true,
          user: result.data.user,
          token: result.data.token,
          loading: false,
          error: null
        });

        console.log('🔐 Login bem-sucedido:', result.data.user.username);
        return true;
      } else {
        setAuth(prev => ({
          ...prev,
          loading: false,
          error: result.error || 'Erro no login'
        }));
        return false;
      }
    } catch (error) {
      console.error('Erro no login:', error);
      setAuth(prev => ({
        ...prev,
        loading: false,
        error: 'Erro de conexão'
      }));
      return false;
    }
  }, []);

  // Função de logout
  const logout = useCallback(() => {
    localStorage.removeItem('sofia_token');
    localStorage.removeItem('sofia_user');
    
    setAuth({
      isAuthenticated: false,
      user: null,
      token: null,
      loading: false,
      error: null
    });

    console.log('🔓 Logout realizado');
  }, []);

  // Refresh do token
  const refreshToken = useCallback(async (): Promise<boolean> => {
    try {
      const currentToken = localStorage.getItem('sofia_token');
      if (!currentToken) return false;

      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${currentToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result: AuthResponse = await response.json();
        if (result.success && result.data?.token) {
          localStorage.setItem('sofia_token', result.data.token);
          
          setAuth(prev => ({
            ...prev,
            token: result.data!.token,
          }));

          console.log('🔄 Token renovado com sucesso');
          return true;
        }
      }

      // Se falhar, fazer logout
      logout();
      return false;
    } catch (error) {
      console.error('Erro ao renovar token:', error);
      logout();
      return false;
    }
  }, [logout]);

  // Verificar autenticação ao carregar
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('sofia_token');
      const userStr = localStorage.getItem('sofia_user');

      if (!token || !userStr) {
        setAuth(prev => ({ ...prev, loading: false }));
        return;
      }

      if (isTokenExpired()) {
        console.log('🕐 Token expirado, tentando renovar...');
        const refreshed = await refreshToken();
        if (!refreshed) {
          setAuth(prev => ({ ...prev, loading: false }));
          return;
        }
      }

      try {
        const user: User = JSON.parse(userStr);
        setAuth({
          isAuthenticated: true,
          user,
          token,
          loading: false,
          error: null
        });
        
        console.log('🔐 Autenticação restaurada:', user.username);
      } catch {
        logout();
      }
    };

    checkAuth();
  }, [isTokenExpired, refreshToken, logout]);

  // Auto-refresh do token (5 minutos antes de expirar)
  useEffect(() => {
    if (!auth.isAuthenticated || !auth.token) return;

    const checkTokenRefresh = () => {
      try {
        const payload = JSON.parse(atob(auth.token!.split('.')[1]));
        const currentTime = Date.now() / 1000;
        const timeUntilExpiry = payload.exp - currentTime;

        // Se faltar menos de 5 minutos para expirar, renovar
        if (timeUntilExpiry < 300) {
          refreshToken();
        }
      } catch (error) {
        console.error('Erro ao verificar expiração do token:', error);
      }
    };

    // Verificar a cada 1 minuto
    const interval = setInterval(checkTokenRefresh, 60000);
    
    return () => clearInterval(interval);
  }, [auth.isAuthenticated, auth.token, refreshToken]);

  return {
    auth,
    login,
    logout,
    refreshToken,
    isTokenExpired
  };
};

// Hook para requisições autenticadas
export const useAuthenticatedFetch = () => {
  const { auth, logout, refreshToken } = useAuth();

  const authenticatedFetch = useCallback(async (
    url: string, 
    options: RequestInit = {}
  ) => {
    if (!auth.token) {
      throw new Error('Token não disponível');
    }

    // Adicionar header de autorização
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${auth.token}`,
      ...options.headers,
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      // Se não autorizado, tentar renovar token
      if (response.status === 401) {
        console.log('🔄 Token inválido, tentando renovar...');
        const refreshed = await refreshToken();
        
        if (refreshed) {
          // Tentar novamente com o novo token
          const newToken = localStorage.getItem('sofia_token');
          return fetch(url, {
            ...options,
            headers: {
              ...headers,
              'Authorization': `Bearer ${newToken}`,
            },
          });
        } else {
          logout();
          throw new Error('Sessão expirada');
        }
      }

      return response;
    } catch (error) {
      console.error('Erro na requisição autenticada:', error);
      throw error;
    }
  }, [auth.token, logout, refreshToken]);

  return authenticatedFetch;
};

// Provider de contexto
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const authValue = useAuth();

  return (
    <AuthContext.Provider value={authValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook para usar o contexto
export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext deve ser usado dentro do AuthProvider');
  }
  return context;
};

// Componente de proteção de rotas
export const ProtectedRoute: React.FC<{ 
  children: React.ReactNode;
  requiredRole?: 'admin' | 'user';
  fallback?: React.ReactNode;
}> = ({ children, requiredRole, fallback }) => {
  const { auth } = useAuth();

  if (auth.loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!auth.isAuthenticated) {
    return fallback || (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-light mb-2">Acesso Restrito</h2>
          <p className="text-gray-600">Faça login para continuar</p>
        </div>
      </div>
    );
  }

  if (requiredRole && auth.user?.role !== requiredRole && auth.user?.role !== 'admin') {
    return fallback || (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-light mb-2">Permissão Insuficiente</h2>
          <p className="text-gray-600">Você não tem acesso a esta área</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default useAuth;