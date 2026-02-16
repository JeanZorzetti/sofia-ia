/**
 * Telegram Bot Integration
 * Usa Telegram Bot API para receber e enviar mensagens
 */

export interface TelegramConfig {
  botToken: string;
  webhookUrl?: string;
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  edited_message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
}

export interface TelegramMessage {
  message_id: number;
  from?: TelegramUser;
  chat: TelegramChat;
  date: number;
  text?: string;
  photo?: TelegramPhotoSize[];
  document?: TelegramDocument;
  voice?: TelegramVoice;
}

export interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export interface TelegramChat {
  id: number;
  type: 'private' | 'group' | 'supergroup' | 'channel';
  title?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
}

export interface TelegramPhotoSize {
  file_id: string;
  file_unique_id: string;
  width: number;
  height: number;
  file_size?: number;
}

export interface TelegramDocument {
  file_id: string;
  file_unique_id: string;
  file_name?: string;
  mime_type?: string;
  file_size?: number;
}

export interface TelegramVoice {
  file_id: string;
  file_unique_id: string;
  duration: number;
  mime_type?: string;
  file_size?: number;
}

export interface TelegramCallbackQuery {
  id: string;
  from: TelegramUser;
  message?: TelegramMessage;
  data?: string;
}

export interface TelegramSendMessageOptions {
  chatId: number | string;
  text: string;
  parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
  replyToMessageId?: number;
  replyMarkup?: TelegramInlineKeyboardMarkup | TelegramReplyKeyboardMarkup;
}

export interface TelegramInlineKeyboardMarkup {
  inline_keyboard: TelegramInlineKeyboardButton[][];
}

export interface TelegramInlineKeyboardButton {
  text: string;
  callback_data?: string;
  url?: string;
}

export interface TelegramReplyKeyboardMarkup {
  keyboard: TelegramKeyboardButton[][];
  resize_keyboard?: boolean;
  one_time_keyboard?: boolean;
}

export interface TelegramKeyboardButton {
  text: string;
}

/**
 * Serviço de integração com Telegram
 */
export class TelegramService {
  private config: TelegramConfig;
  private baseUrl: string;

  constructor(config: TelegramConfig) {
    this.config = config;
    this.baseUrl = `https://api.telegram.org/bot${config.botToken}`;
  }

  /**
   * Verifica se o bot token é válido
   */
  async validate(): Promise<{ valid: boolean; botInfo?: { id: number; username: string; name: string }; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/getMe`);
      const data = await response.json();

      if (!data.ok) {
        return { valid: false, error: data.description };
      }

      return {
        valid: true,
        botInfo: {
          id: data.result.id,
          username: data.result.username,
          name: data.result.first_name,
        },
      };
    } catch (error) {
      return { valid: false, error: String(error) };
    }
  }

  /**
   * Envia mensagem de texto
   */
  async sendMessage(options: TelegramSendMessageOptions): Promise<{ success: boolean; messageId?: number; error?: string }> {
    try {
      const body: any = {
        chat_id: options.chatId,
        text: options.text,
      };

      if (options.parseMode) {
        body.parse_mode = options.parseMode;
      }

      if (options.replyToMessageId) {
        body.reply_to_message_id = options.replyToMessageId;
      }

      if (options.replyMarkup) {
        body.reply_markup = options.replyMarkup;
      }

      const response = await fetch(`${this.baseUrl}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!data.ok) {
        return { success: false, error: data.description };
      }

      return { success: true, messageId: data.result.message_id };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  /**
   * Envia mensagem com teclado inline
   */
  async sendMessageWithButtons(
    chatId: number | string,
    text: string,
    buttons: Array<{ text: string; callback_data: string }>,
    columns: number = 2
  ): Promise<{ success: boolean; messageId?: number; error?: string }> {
    // Organiza botões em linhas
    const keyboard: TelegramInlineKeyboardButton[][] = [];
    for (let i = 0; i < buttons.length; i += columns) {
      keyboard.push(
        buttons.slice(i, i + columns).map((btn) => ({
          text: btn.text,
          callback_data: btn.callback_data,
        }))
      );
    }

    return this.sendMessage({
      chatId,
      text,
      replyMarkup: { inline_keyboard: keyboard },
    });
  }

  /**
   * Configura webhook
   */
  async setWebhook(url: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/setWebhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();

      if (!data.ok) {
        return { success: false, error: data.description };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  /**
   * Remove webhook
   */
  async deleteWebhook(): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/deleteWebhook`);
      const data = await response.json();

      if (!data.ok) {
        return { success: false, error: data.description };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  /**
   * Busca informações do arquivo
   */
  async getFile(fileId: string): Promise<{ filePath?: string; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/getFile?file_id=${fileId}`);
      const data = await response.json();

      if (!data.ok) {
        return { error: data.description };
      }

      return { filePath: data.result.file_path };
    } catch (error) {
      return { error: String(error) };
    }
  }

  /**
   * Download URL do arquivo
   */
  getFileUrl(filePath: string): string {
    return `https://api.telegram.org/file/bot${this.config.botToken}/${filePath}`;
  }

  /**
   * Processa update do webhook
   */
  processUpdate(update: TelegramUpdate): {
    type: 'message' | 'callback_query';
    id: number | string;
    user: TelegramUser;
    chat: TelegramChat;
    text?: string;
    data?: string;
    messageId?: number;
    photo?: TelegramPhotoSize[];
    document?: TelegramDocument;
    voice?: TelegramVoice;
  } | null {
    if (update.message) {
      const msg = update.message;
      return {
        type: 'message',
        id: update.update_id,
        user: msg.from!,
        chat: msg.chat,
        text: msg.text,
        messageId: msg.message_id,
        photo: msg.photo,
        document: msg.document,
        voice: msg.voice,
      };
    }

    if (update.callback_query) {
      const cb = update.callback_query;
      return {
        type: 'callback_query',
        id: cb.id,
        user: cb.from,
        chat: cb.message!.chat,
        data: cb.data,
        messageId: cb.message?.message_id,
      };
    }

    return null;
  }

  /**
   * Responde a callback query
   */
  async answerCallbackQuery(
    callbackQueryId: string,
    text?: string,
    showAlert: boolean = false
  ): Promise<boolean> {
    try {
      const body: any = {
        callback_query_id: callbackQueryId,
        show_alert: showAlert,
      };

      if (text) {
        body.text = text;
      }

      const response = await fetch(`${this.baseUrl}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      return data.ok;
    } catch {
      return false;
    }
  }
}

/**
 * Factory para criar serviço Telegram
 */
export function createTelegramService(credentials: Record<string, any>): TelegramService {
  return new TelegramService({
    botToken: credentials.botToken,
    webhookUrl: credentials.webhookUrl,
  });
}
