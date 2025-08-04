/**
 * 🔗 SOFIA IA - Hook de API com WhatsApp Management (OTIMIZADO)
 * Conecta frontend aos dados reais (local OU produção) + WhatsApp endpoints
 * CORREÇÃO: Auto-refresh inteligente que não interfere em modais
 */

import { useState, useEffect, useRef } from 'react';

// 📍 Configuração de ambiente - SMARTLY DETECT!
const getApiBaseUrl = () => {
  // Se estamos em desenvolvimento (localhost), usa porta local
  if (typeof window !== 'undefined') {
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    
    if (isLocalhost) {
      // Ambiente LOCAL - tenta 8000 (versão atualizada com WhatsApp)
      return 'http://localhost:8000';
    }
  }
  
  // Ambiente PRODUÇÃO - usa domínio EasyPanel
  return 'https://sofiaia.roilabs.com.br';
};

const API_BASE_URL = getApiBaseUrl();

// Log para debug
console.log('🔗 Sofia IA API URL configurada:', API_BASE_URL);

// 🔄 Types para TypeScript
interface DashboardStats {
  conversations_today: number;
  conversion_rate: string;
  qualified_leads: number;
  growth_rate: string;
}

interface ActivityData {
  name: string;
  value: number;
}

interface LeadsByStatus {
  cold: number;
  warm: number;
  hot: number;
  immediate: number;
}

interface DashboardData {
  stats: DashboardStats;
  activity_chart: ActivityData[];
  leads_by_status: LeadsByStatus;
  last_updated: string;
}

interface ConversationMessage {
  id: number;
  user: string;
  message: string;
  time: string;
  type: 'sent' | 'received';
  lead_score?: number;
  automated?: boolean;
  urgency?: string;
}

// 📱 NOVO: Types para WhatsApp
interface WhatsAppInstance {
  id: string;
  name: string;
  phone: string;
  status: 'connected' | 'disconnected' | 'pending' | 'connecting';
  created_at: string;
  last_activity: string;
  messagesCount: number;
  qr_code?: string | null;
  webhook_url: string;
  profile_picture?: string | null;
  battery_level?: number | null;
  is_business: boolean;
  platform: 'android' | 'ios' | 'web';
}

interface WhatsAppStats {
  total_instances: number;
  connected: number;
  disconnected: number;
  pending: number;
  connecting: number;
  total_messages_today: number;
  avg_response_time: string;
  uptime_percentage: string;
}

interface QRCodeData {
  qr_code: string;
  status: string;
  expires_in: number;
  instructions: string[];
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  message?: string;
  stats?: WhatsAppStats;
  timestamp?: string;
}

// 🎯 Hook principal para dados do dashboard
export const useDashboardData = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${API_BASE_URL}/api/dashboard/overview`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result: ApiResponse<DashboardData> = await response.json();
      
      if (result.success) {
        setData(result.data);
      } else {
        throw new Error(result.error || 'Erro ao buscar dados');
      }
    } catch (err) {
      console.error('Erro ao buscar dados do dashboard:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    
    // 🔄 Atualizar dados a cada 30 segundos
    const interval = setInterval(fetchDashboardData, 30000);
    
    return () => clearInterval(interval);
  }, []);

  return {
    data,
    loading,
    error,
    refresh: fetchDashboardData
  };
};

// 💬 Hook para conversas recentes
export const useRecentConversations = () => {
  const [conversations, setConversations] = useState<ConversationMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${API_BASE_URL}/api/conversations/recent`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result: ApiResponse<ConversationMessage[]> = await response.json();
      
      if (result.success) {
        setConversations(result.data);
      } else {
        throw new Error(result.error || 'Erro ao buscar conversas');
      }
    } catch (err) {
      console.error('Erro ao buscar conversas:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
    
    // 🔄 Atualizar conversas a cada 15 segundos
    const interval = setInterval(fetchConversations, 15000);
    
    return () => clearInterval(interval);
  }, []);

  return {
    conversations,
    loading,
    error,
    refresh: fetchConversations
  };
};

// 📊 🛠️ CORREÇÃO: Hook para stats em tempo real com controle de re-render
export const useRealTimeStats = (pauseUpdates = false) => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchRealTimeStats = async () => {
    try {
      setError(null);
      
      const response = await fetch(`${API_BASE_URL}/api/realtime/stats`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result: ApiResponse<any> = await response.json();
      
      if (result.success) {
        setStats(result.data);
      } else {
        throw new Error(result.error || 'Erro ao buscar stats');
      }
    } catch (err) {
      console.error('Erro ao buscar stats em tempo real:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRealTimeStats();
    
    // 🛠️ CORREÇÃO: Só atualiza se não estiver pausado
    if (!pauseUpdates) {
      intervalRef.current = setInterval(fetchRealTimeStats, 30000); // Mudei para 30s em vez de 5s
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [pauseUpdates]);

  return {
    stats,
    loading,
    error,
    refresh: fetchRealTimeStats
  };
};

// 🎯 Hook para health check da API
export const useApiHealth = () => {
  const [isHealthy, setIsHealthy] = useState<boolean | null>(null);
  const [healthData, setHealthData] = useState<any>(null);

  const checkHealth = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      
      if (response.ok) {
        const data = await response.json();
        setIsHealthy(true);
        setHealthData(data);
      } else {
        setIsHealthy(false);
        setHealthData(null);
      }
    } catch (err) {
      console.error('API health check failed:', err);
      setIsHealthy(false);
      setHealthData(null);
    }
  };

  useEffect(() => {
    checkHealth();
    
    // 🔄 Verificar saúde da API a cada 1 minuto
    const interval = setInterval(checkHealth, 60000);
    
    return () => clearInterval(interval);
  }, []);

  return {
    isHealthy,
    healthData,
    checkHealth
  };
};

// 📱 🛠️ CORREÇÃO: Hook para WhatsApp instances otimizado
export const useWhatsAppInstances = () => {
  const [instances, setInstances] = useState<WhatsAppInstance[]>([]);
  const [stats, setStats] = useState<WhatsAppStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchInstances = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError(null);
      
      const response = await fetch(`${API_BASE_URL}/api/whatsapp/instances`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result: ApiResponse<WhatsAppInstance[]> = await response.json();
      
      if (result.success) {
        setInstances(result.data);
        if (result.stats) {
          setStats(result.stats);
        }
      } else {
        throw new Error(result.error || 'Erro ao buscar instâncias');
      }
    } catch (err) {
      console.error('Erro ao buscar instâncias WhatsApp:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const createInstance = async (name: string): Promise<WhatsAppInstance> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/whatsapp/instances`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result: ApiResponse<WhatsAppInstance> = await response.json();
      
      if (result.success) {
        // Atualizar lista local
        setInstances(prev => [...prev, result.data]);
        return result.data;
      } else {
        throw new Error(result.error || 'Erro ao criar instância');
      }
    } catch (err) {
      console.error('Erro ao criar instância:', err);
      throw err;
    }
  };

  const disconnectInstance = async (instanceId: string): Promise<void> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/whatsapp/instances/${instanceId}/disconnect`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result: ApiResponse<void> = await response.json();
      
      if (result.success) {
        // Atualizar status local
        setInstances(prev => 
          prev.map(instance => 
            instance.id === instanceId 
              ? { ...instance, status: 'disconnected' as const }
              : instance
          )
        );
      } else {
        throw new Error(result.error || 'Erro ao desconectar instância');
      }
    } catch (err) {
      console.error('Erro ao desconectar instância:', err);
      throw err;
    }
  };

  const connectInstance = async (instanceId: string): Promise<void> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/whatsapp/instances/${instanceId}/connect`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result: ApiResponse<void> = await response.json();
      
      if (result.success) {
        // Atualizar status local
        setInstances(prev => 
          prev.map(instance => 
            instance.id === instanceId 
              ? { ...instance, status: 'connected' as const }
              : instance
          )
        );
      } else {
        throw new Error(result.error || 'Erro ao conectar instância');
      }
    } catch (err) {
      console.error('Erro ao conectar instância:', err);
      throw err;
    }
  };

  const deleteInstance = async (instanceId: string): Promise<void> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/whatsapp/instances/${instanceId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result: ApiResponse<void> = await response.json();
      
      if (result.success) {
        // Remover da lista local
        setInstances(prev => prev.filter(instance => instance.id !== instanceId));
      } else {
        throw new Error(result.error || 'Erro ao deletar instância');
      }
    } catch (err) {
      console.error('Erro ao deletar instância:', err);
      throw err;
    }
  };

  const getQRCode = async (instanceId: string): Promise<QRCodeData> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/whatsapp/instances/${instanceId}/qr`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result: ApiResponse<QRCodeData> = await response.json();
      
      if (result.success) {
        return result.data;
      } else {
        throw new Error(result.error || 'Erro ao obter QR Code');
      }
    } catch (err) {
      console.error('Erro ao obter QR Code:', err);
      throw err;
    }
  };

  // 🛠️ CORREÇÃO: Pausar auto-refresh quando necessário
  const pauseAutoRefresh = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const resumeAutoRefresh = () => {
    if (!intervalRef.current) {
      intervalRef.current = setInterval(() => fetchInstances(true), 30000);
    }
  };

  useEffect(() => {
    fetchInstances();
    
    // 🔄 Atualizar instâncias a cada 30 segundos (modo silencioso)
    intervalRef.current = setInterval(() => fetchInstances(true), 30000);
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    instances,
    stats,
    loading,
    error,
    createInstance,
    disconnectInstance,
    connectInstance,
    deleteInstance,
    getQRCode,
    pauseAutoRefresh,
    resumeAutoRefresh,
    refresh: () => fetchInstances()
  };
};

// 📱 NOVO: Hook para estatísticas WhatsApp
export const useWhatsAppStats = () => {
  const [stats, setStats] = useState<WhatsAppStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setError(null);
      
      const response = await fetch(`${API_BASE_URL}/api/whatsapp/stats`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result: ApiResponse<WhatsAppStats> = await response.json();
      
      if (result.success) {
        setStats(result.data);
      } else {
        throw new Error(result.error || 'Erro ao buscar estatísticas');
      }
    } catch (err) {
      console.error('Erro ao buscar estatísticas WhatsApp:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    
    // 🔄 Atualizar stats a cada 30 segundos
    const interval = setInterval(fetchStats, 30000);
    
    return () => clearInterval(interval);
  }, []);

  return {
    stats,
    loading,
    error,
    refresh: fetchStats
  };
};

// 🔄 Hook para operações gerais da API
export const useApiOperations = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiCall = async (endpoint: string, options?: RequestInit) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        ...options,
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro na API';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    apiCall
  };
};

// 📊 Utils para formatação de dados
export const formatStatsForDisplay = (stats: DashboardStats) => {
  return [
    {
      title: 'Conversas Hoje',
      value: stats.conversations_today.toString(),
      change: stats.growth_rate,
      icon: 'MessageSquare',
      color: 'text-green-400',
    },
    {
      title: 'Taxa de Conversão',
      value: `${stats.conversion_rate}%`,
      change: '+5.1%',
      icon: 'Target',
      color: 'text-blue-400',
    },
    {
      title: 'Leads Qualificados',
      value: stats.qualified_leads.toString(),
      change: '+23%',
      icon: 'Users',
      color: 'text-purple-400',
    },
    {
      title: 'Crescimento',
      value: stats.growth_rate,
      change: '+8.3%',
      icon: 'TrendingUp',
      color: 'text-orange-400',
    },
  ];
};

// 🎯 Export do hook principal
export default {
  useDashboardData,
  useRecentConversations,
  useRealTimeStats,
  useApiHealth,
  useWhatsAppInstances,
  useWhatsAppStats,
  useApiOperations,
  formatStatsForDisplay
};