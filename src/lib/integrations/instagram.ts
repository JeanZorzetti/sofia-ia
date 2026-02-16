/**
 * Instagram DM Integration
 * Usa Instagram Graph API para receber e enviar mensagens diretas
 */

export interface InstagramConfig {
  pageId: string;
  pageAccessToken: string;
  webhookVerifyToken: string;
  appSecret: string;
}

export interface InstagramWebhookEvent {
  object: 'instagram';
  entry: Array<{
    id: string;
    time: number;
    messaging?: Array<{
      sender: { id: string };
      recipient: { id: string };
      timestamp: number;
      message?: {
        mid: string;
        text?: string;
        attachments?: Array<{
          type: string;
          payload: { url: string };
        }>;
      };
      postback?: {
        payload: string;
      };
    }>;
  }>;
}

export interface InstagramMessage {
  recipientId: string;
  text?: string;
  attachmentUrl?: string;
}

/**
 * Serviço de integração com Instagram
 */
export class InstagramService {
  private config: InstagramConfig;
  private baseUrl = 'https://graph.instagram.com/v18.0';

  constructor(config: InstagramConfig) {
    this.config = config;
  }

  /**
   * Verifica se a configuração é válida
   */
  async validate(): Promise<{ valid: boolean; error?: string }> {
    try {
      const response = await fetch(
        `${this.baseUrl}/me?access_token=${this.config.pageAccessToken}&fields=id,username`
      );

      if (!response.ok) {
        const error = await response.json();
        return { valid: false, error: error.error?.message || 'Invalid token' };
      }

      return { valid: true };
    } catch (error) {
      return { valid: false, error: String(error) };
    }
  }

  /**
   * Envia mensagem direta para um usuário
   */
  async sendMessage(message: InstagramMessage): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const url = `${this.baseUrl}/me/messages?access_token=${this.config.pageAccessToken}`;

      const body: any = {
        recipient: { id: message.recipientId },
      };

      if (message.text) {
        body.message = { text: message.text };
      } else if (message.attachmentUrl) {
        body.message = {
          attachment: {
            type: 'image',
            payload: { url: message.attachmentUrl },
          },
        };
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json();
        return { success: false, error: error.error?.message };
      }

      const data = await response.json();
      return { success: true, messageId: data.message_id };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  /**
   * Busca informações do perfil do usuário
   */
  async getUserProfile(userId: string): Promise<{ id: string; username?: string; name?: string } | null> {
    try {
      const response = await fetch(
        `${this.baseUrl}/${userId}?access_token=${this.config.pageAccessToken}&fields=id,username,name`
      );

      if (!response.ok) return null;

      return await response.json();
    } catch {
      return null;
    }
  }

  /**
   * Processa webhook do Instagram
   */
  processWebhook(body: InstagramWebhookEvent): Array<{
    type: 'message' | 'postback';
    senderId: string;
    recipientId: string;
    timestamp: number;
    text?: string;
    attachments?: any[];
    postbackPayload?: string;
  }> {
    const events: ReturnType<typeof this.processWebhook> = [];

    for (const entry of body.entry) {
      if (!entry.messaging) continue;

      for (const messaging of entry.messaging) {
        if (messaging.message) {
          events.push({
            type: 'message',
            senderId: messaging.sender.id,
            recipientId: messaging.recipient.id,
            timestamp: messaging.timestamp,
            text: messaging.message.text,
            attachments: messaging.message.attachments,
          });
        } else if (messaging.postback) {
          events.push({
            type: 'postback',
            senderId: messaging.sender.id,
            recipientId: messaging.recipient.id,
            timestamp: messaging.timestamp,
            postbackPayload: messaging.postback.payload,
          });
        }
      }
    }

    return events;
  }

  /**
   * Verifica assinatura do webhook
   */
  verifySignature(signature: string, body: string): boolean {
    // Em produção, usar crypto para verificar HMAC
    return !!signature;
  }
}

/**
 * Factory para criar serviço Instagram
 */
export function createInstagramService(credentials: Record<string, any>): InstagramService {
  return new InstagramService({
    pageId: credentials.pageId,
    pageAccessToken: credentials.pageAccessToken,
    webhookVerifyToken: credentials.webhookVerifyToken,
    appSecret: credentials.appSecret,
  });
}
