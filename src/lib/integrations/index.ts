/**
 * Integrations Index
 * Exporta todas as integrações disponíveis
 */

export * from './instagram';
export * from './telegram';
export * from './elevenlabs';

import { createInstagramService, InstagramService } from './instagram';
import { createTelegramService, TelegramService } from './telegram';
import { createElevenLabsService, ElevenLabsService } from './elevenlabs';

export type IntegrationType = 'instagram' | 'telegram' | 'whatsapp' | 'webhook' | 'email' | 'elevenlabs';

export interface IntegrationServiceMap {
  instagram: InstagramService;
  telegram: TelegramService;
  elevenlabs: ElevenLabsService;
}

/**
 * Factory para criar serviço de integração baseado no tipo
 */
export function createIntegrationService(
  type: IntegrationType,
  credentials: Record<string, any>
): InstagramService | TelegramService | ElevenLabsService | null {
  switch (type) {
    case 'instagram':
      return createInstagramService(credentials);
    case 'telegram':
      return createTelegramService(credentials);
    case 'elevenlabs':
      return createElevenLabsService(credentials);
    default:
      return null;
  }
}

/**
 * Templates de configuração para cada integração
 */
export const integrationTemplates = {
  instagram: {
    name: 'Instagram DM',
    description: 'Integração com Instagram Direct Messages',
    icon: 'instagram',
    requiredCredentials: ['pageId', 'pageAccessToken', 'webhookVerifyToken', 'appSecret'],
    configFields: [
      { name: 'autoReply', label: 'Resposta Automática', type: 'boolean', default: true },
      { name: 'welcomeMessage', label: 'Mensagem de Boas-vindas', type: 'text', default: 'Olá! Como posso ajudar?' },
    ],
  },
  telegram: {
    name: 'Telegram Bot',
    description: 'Integração com Telegram Bot API',
    icon: 'telegram',
    requiredCredentials: ['botToken'],
    configFields: [
      { name: 'autoReply', label: 'Resposta Automática', type: 'boolean', default: true },
      { name: 'parseMode', label: 'Formato de Mensagem', type: 'select', options: ['HTML', 'Markdown'], default: 'HTML' },
      { name: 'showButtons', label: 'Mostrar Botões', type: 'boolean', default: true },
    ],
  },
  whatsapp: {
    name: 'WhatsApp Business',
    description: 'Integração com WhatsApp Business API',
    icon: 'whatsapp',
    requiredCredentials: ['phoneNumberId', 'accessToken', 'webhookVerifyToken'],
    configFields: [
      { name: 'autoReply', label: 'Resposta Automática', type: 'boolean', default: true },
    ],
  },
  webhook: {
    name: 'Webhook Genérico',
    description: 'Webhook para integrações personalizadas',
    icon: 'webhook',
    requiredCredentials: ['secret'],
    configFields: [
      { name: 'url', label: 'URL do Webhook', type: 'url', required: true },
      { name: 'events', label: 'Eventos', type: 'multiselect', options: ['message.received', 'message.sent', 'lead.created'] },
    ],
  },
  email: {
    name: 'Email SMTP',
    description: 'Integração com servidor SMTP',
    icon: 'email',
    requiredCredentials: ['host', 'port', 'username', 'password'],
    configFields: [
      { name: 'fromName', label: 'Nome do Remetente', type: 'text', default: 'Sofia IA' },
      { name: 'fromEmail', label: 'Email do Remetente', type: 'email', required: true },
    ],
  },
  elevenlabs: {
    name: 'ElevenLabs TTS',
    description: 'Texto-para-voz realista com IA da ElevenLabs',
    icon: 'volume2',
    requiredCredentials: ['apiKey'],
    configFields: [
      { name: 'voiceId', label: 'ID da Voz', type: 'text', default: '21m00Tcm4TlvDq8ikWAM' },
      { name: 'modelId', label: 'Modelo', type: 'select', options: ['eleven_multilingual_v2', 'eleven_turbo_v2_5'], default: 'eleven_multilingual_v2' },
      { name: 'stability', label: 'Estabilidade (%)', type: 'number', default: '50' },
      { name: 'similarityBoost', label: 'Clareza (%)', type: 'number', default: '75' },
    ],
  },
};

/**
 * Valida credenciais de uma integração
 */
export async function validateIntegrationCredentials(
  type: IntegrationType,
  credentials: Record<string, any>
): Promise<{ valid: boolean; error?: string; info?: any }> {
  const service = createIntegrationService(type, credentials);
  
  if (!service) {
    return { valid: false, error: 'Tipo de integração não suportado' };
  }

  if ('validate' in service && typeof service.validate === 'function') {
    const result = await service.validate();
    return result;
  }

  return { valid: true };
}
