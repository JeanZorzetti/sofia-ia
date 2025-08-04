/**
 * 🔗 SOFIA IA - SHARED TYPES
 * TypeScript definitions compartilhadas entre backend e frontend
 */

// ===== LEAD TYPES =====
export interface Lead {
  id: number;
  name: string;
  phone: string;
  email: string;
  source: 'Instagram' | 'Facebook' | 'Site' | 'WhatsApp' | 'Indicação';
  score: number;
  temperature: 'cold' | 'warm' | 'hot' | 'immediate';
  status: 'qualified' | 'pending' | 'closed' | 'rejected';
  created_at: string;
  last_interaction: string;
  budget: number;
  preferences: LeadPreferences;
}

export interface LeadPreferences {
  property_type: 'apartamento' | 'casa' | 'comercial' | 'terreno';
  bedrooms: number;
  location: string;
  urgency?: 'low' | 'medium' | 'high' | 'immediate';
  max_budget?: number;
  min_budget?: number;
}

// ===== CONVERSATION TYPES =====
export interface Conversation {
  id: number;
  lead_id: number;
  whatsapp_instance: string;
  status: 'active' | 'closed' | 'waiting';
  created_at: string;
  updated_at: string;
  messages: Message[];
}

export interface Message {
  id: number;
  conversation_id: number;
  user: string;
  message: string;
  time: string;
  type: 'sent' | 'received';
  automated?: boolean;
  lead_score?: number;
  urgency?: 'low' | 'medium' | 'high';
  media_type?: 'text' | 'audio' | 'image' | 'document' | 'location';
  media_url?: string;
}

// ===== WHATSAPP TYPES =====
export interface WhatsAppInstance {
  id: string;
  name: string;
  status: 'open' | 'close' | 'connecting' | 'qrcode';
  phone?: string;
  profileName?: string;
  messagesCount: number;
  contactsCount: number;
  chatsCount: number;
  qrcode?: string;
  qrcode_expires_at?: string;
  created_at: string;
  updated_at: string;
}

export interface QRCodeData {
  instanceName: string;
  qrcode: string;
  status: 'generated' | 'expired' | 'connected';
  generated_at: string;
  expires_at: string;
  cache_hit: boolean;
  simulated?: boolean;
}

// ===== DASHBOARD TYPES =====
export interface DashboardStats {
  conversations_today: number;
  conversion_rate: string;
  qualified_leads: number;
  growth_rate: string;
}

export interface ActivityData {
  name: string;
  value: number;
}

export interface LeadsByStatus {
  cold: number;
  warm: number;
  hot: number;
  immediate: number;
}

export interface DashboardData {
  stats: DashboardStats;
  activity_chart: ActivityData[];
  leads_by_status: LeadsByStatus;
  last_updated: string;
}

// ===== API RESPONSE TYPES =====
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    current_page: number;
    total_pages: number;
    total_items: number;
    items_per_page: number;
  };
}

// ===== ANALYTICS TYPES =====
export interface AnalyticsEvent {
  id: string;
  event_type: string;
  event_data: Record<string, any>;
  user_id?: string;
  session_id?: string;
  timestamp: string;
}

export interface PerformanceMetrics {
  avg_response_time: string;
  satisfaction_score: number;
  automation_rate: string;
  human_handoff_rate: string;
}

export interface RealTimeStats {
  active_conversations: number;
  queue_size: number;
  avg_response_time: string;
  online_agents: number;
  last_message_time: string;
  system_load: string;
}

// ===== WEBHOOK TYPES =====
export interface WebhookEvent {
  instance: string;
  data: {
    key: {
      remoteJid: string;
      fromMe: boolean;
      id: string;
    };
    message: {
      conversation?: string;
      audioMessage?: any;
      imageMessage?: any;
      documentMessage?: any;
    };
    messageTimestamp: number;
    status: string;
  };
  destination: string;
  date_time: string;
}

// ===== CLAUDE AI TYPES =====
export interface ClaudeAnalysis {
  lead_score: number;
  temperature: 'cold' | 'warm' | 'hot' | 'immediate';
  preferences: Partial<LeadPreferences>;
  intent: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  suggested_response: string;
  next_actions: string[];
}

// ===== SYSTEM TYPES =====
export interface HealthCheck {
  status: 'ok' | 'error';
  timestamp: string;
  service: string;
  version: string;
  uptime: number;
  qrcode_system?: {
    status: 'active' | 'inactive';
    stats: QRCodeStats;
  };
}

export interface QRCodeStats {
  cache_size: number;
  cached_instances: string[];
  total_generated: number;
  expiry_time: number;
  next_cleanup: string;
}

// ===== MULTI-INSTANCE TYPES =====
export interface MultiInstanceStats {
  total_instances: number;
  connected_instances: number;
  disconnected_instances: number;
  healthy_instances: number;
  error_instances: number;
  overall_health: 'excellent' | 'good' | 'warning' | 'critical';
  last_updated: string;
}

// ===== UTILITY TYPES =====
export type DateString = string; // ISO 8601 format
export type PhoneNumber = string; // Brazilian format: 11999999999
export type Email = string;
export type Currency = number; // Brazilian Real in cents

// ===== CONFIGURATION TYPES =====
export interface EvolutionAPIConfig {
  baseUrl: string;
  apiKey: string;
  webhookUrl?: string;
  events?: string[];
}

export interface ClaudeConfig {
  apiKey: string;
  model: string;
  maxTokens: number;
  temperature: number;
}

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
}

// ===== ERROR TYPES =====
export interface ApiError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
}

export interface ValidationError extends ApiError {
  field: string;
  value: any;
  rule: string;
}

// ===== EXPORT COLLECTIONS =====
export type SofiaIATypes = {
  // Entities
  Lead,
  Conversation,
  Message,
  WhatsAppInstance,
  
  // API
  ApiResponse,
  PaginatedResponse,
  
  // Dashboard
  DashboardData,
  DashboardStats,
  ActivityData,
  LeadsByStatus,
  
  // System
  HealthCheck,
  QRCodeData,
  QRCodeStats,
  
  // Analytics
  RealTimeStats,
  PerformanceMetrics,
  
  // Config
  EvolutionAPIConfig,
  ClaudeConfig,
  DatabaseConfig
};