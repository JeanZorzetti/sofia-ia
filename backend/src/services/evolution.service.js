const axios = require('axios');
const EventEmitter = require('events');
const config = require('../config');

/**
 * @class EvolutionAPIService
 * @description Unified service for all interactions with the Evolution API.
 * Handles instance management, messaging, and webhook processing.
 * Emits events for 'qrcode_updated', 'connection_update', and 'message_received'.
 */
class EvolutionAPIService extends EventEmitter {
  constructor() {
    super();
    this.apiUrl = config.evolution.apiUrl;
    this.apiKey = config.evolution.apiKey;
    this.webhookUrl = config.evolution.webhookUrl;

    if (!this.apiKey) {
      console.error(
        'FATAL ERROR: EVOLUTION_API_KEY is not defined in environment variables.'
      );
      process.exit(1); // Exit if the API key is not configured
    }

    this.qrCodeCache = new Map();
    this.instanceStatusCache = new Map();

    this.defaultHeaders = {
      apikey: this.apiKey,
      'Content-Type': 'application/json',
    };

    console.log('🚀 Unified Evolution API Service Initialized');
    console.log(`API URL: ${this.apiUrl}`);
    console.log(`Webhook URL configured: ${this.webhookUrl}`);
  }

  // --- Instance Management ---

  async createInstance(instanceName, settings = {}) {
    try {
      console.log(`[EvolutionAPI] Creating instance: ${instanceName}`);
      const instanceData = {
        instanceName,
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS',
        webhookUrl: this.webhookUrl,
        webhookByEvents: true,
        webhookBase64: true,
        webhookEvents: [
          'QRCODE_UPDATED',
          'CONNECTION_UPDATE',
          'MESSAGES_UPSERT',
          'MESSAGE_STATUS_UPDATE',
        ],
        rejectCall: true,
        msgCall: 'Sofia IA does not accept calls. Please use text messages.',
        groupsIgnore: true,
        alwaysOnline: true,
        readMessages: true,
        readStatus: false,
        syncFullHistory: false,
        ...settings,
      };

      const response = await axios.post(
        `${this.apiUrl}/instance/create`,
        instanceData,
        {
          headers: this.defaultHeaders,
          timeout: 30000,
        }
      );

      const result = {
        success: true,
        data: response.data,
        message: 'Instance created. QR code will be sent via webhook.',
      };
      this.updateInstanceStatus(instanceName, 'created');
      console.log(
        `[EvolutionAPI] Instance ${instanceName} created successfully.`
      );
      return result;
    } catch (error) {
      console.error(
        `[EvolutionAPI] Error creating instance ${instanceName}:`,
        error.message
      );
      if (error.response?.status === 409) {
        return {
          success: false,
          error: 'Instance already exists',
          existing: true,
        };
      }
      return {
        success: false,
        error: error.message,
        details: error.response?.data,
      };
    }
  }

  async fetchInstances() {
    try {
      console.log('[EvolutionAPI] Fetching instances from:', `${this.apiUrl}/instance/fetchInstances`);
      console.log('[EvolutionAPI] Headers:', { ...this.defaultHeaders, apikey: '***hidden***' });
      
      const response = await axios.get(
        `${this.apiUrl}/instance/fetchInstances`,
        {
          headers: this.defaultHeaders,
          timeout: 15000,
        }
      );
      
      console.log('[EvolutionAPI] Response status:', response.status);
      console.log('[EvolutionAPI] Response data length:', response.data?.length || 0);
      
      const instances = response.data.map((inst) => {
        this.updateInstanceStatus(
          inst.instance.instanceName,
          inst.instance.status
        );
        return inst;
      });
      return { success: true, data: instances };
    } catch (error) {
      console.error('[EvolutionAPI] Error fetching instances:');
      console.error('- URL:', `${this.apiUrl}/instance/fetchInstances`);
      console.error('- Status:', error.response?.status);
      console.error('- Status Text:', error.response?.statusText);
      console.error('- Response Data:', error.response?.data);
      console.error('- Message:', error.message);
      
      return { 
        success: false, 
        error: error.message,
        statusCode: error.response?.status,
        responseData: error.response?.data,
        data: [] 
      };
    }
  }

  async logoutInstance(instanceName) {
    try {
      await axios.delete(`${this.apiUrl}/instance/logout/${instanceName}`, {
        headers: this.defaultHeaders,
        timeout: 10000,
      });
      this.qrCodeCache.delete(instanceName);
      this.updateInstanceStatus(instanceName, 'disconnected');
      console.log(`[EvolutionAPI] Instance ${instanceName} logged out.`);
      return {
        success: true,
        message: `Instance ${instanceName} disconnected.`,
      };
    } catch (error) {
      console.error(
        `[EvolutionAPI] Error logging out instance ${instanceName}:`,
        error.message
      );
      return { success: false, error: error.message };
    }
  }

  async deleteInstance(instanceName) {
    try {
      await axios.delete(`${this.apiUrl}/instance/delete/${instanceName}`, {
        headers: this.defaultHeaders,
        timeout: 10000,
      });
      this.qrCodeCache.delete(instanceName);
      this.instanceStatusCache.delete(instanceName);
      console.log(`[EvolutionAPI] Instance ${instanceName} deleted.`);
      return { success: true, message: `Instance ${instanceName} deleted.` };
    } catch (error) {
      console.error(
        `[EvolutionAPI] Error deleting instance ${instanceName}:`,
        error.message
      );
      return { success: false, error: error.message };
    }
  }

  // --- Messaging ---

  async sendMessage(instanceName, number, text) {
    try {
      const payload = {
        number,
        options: { delay: 1200, presence: 'composing' },
        textMessage: { text },
      };
      const response = await axios.post(
        `${this.apiUrl}/message/sendText/${instanceName}`,
        payload,
        {
          headers: this.defaultHeaders,
        }
      );
      console.log(
        `[EvolutionAPI] Message sent to ${number} via ${instanceName}.`
      );
      return { success: true, data: response.data };
    } catch (error) {
      console.error(
        `[EvolutionAPI] Error sending message to ${number}:`,
        error.message
      );
      return {
        success: false,
        error: error.message,
        details: error.response?.data,
      };
    }
  }

  // --- Webhook Processing ---

  async processWebhook(webhookData) {
    const { event, instance, data } = webhookData;
    console.log(
      `[Webhook] Received event '${event}' for instance '${instance}'`
    );

    try {
      switch (event) {
        case 'QRCODE_UPDATED':
          this.handleQrCodeUpdate(instance, data);
          break;
        case 'CONNECTION_UPDATE':
          this.handleConnectionUpdate(instance, data);
          break;
        case 'MESSAGES_UPSERT':
          await this.handleMessageUpsert(instance, data);
          break;
        default:
          console.log(`[Webhook] Unhandled event type: ${event}`);
          return { success: true, processed: false, event };
      }
      return { success: true, processed: true, event, instance };
    } catch (error) {
      console.error(
        `[Webhook] Error processing event '${event}' for '${instance}':`,
        error.message
      );
      return { success: false, error: error.message };
    }
  }

  handleQrCodeUpdate(instance, data) {
    if (data.qrcode) {
      const qrData = {
        qrcode: data.qrcode,
        timestamp: Date.now(),
        expires_at: Date.now() + config.qrCode.expiryTime,
      };
      this.qrCodeCache.set(instance, qrData);
      this.updateInstanceStatus(instance, 'qr_ready');
      this.emit('qrcode_updated', { instance, qrcode: data.qrcode });
      console.log(
        `[Webhook] QR code for ${instance} cached. Expires in ${config.qrCode.expiryTime / 1000}s.`
      );
    }
  }

  handleConnectionUpdate(instance, data) {
    const status = data.state === 'open' ? 'connected' : 'disconnected';
    this.updateInstanceStatus(instance, status);
    if (status === 'connected') {
      this.qrCodeCache.delete(instance);
      console.log(
        `[Webhook] Instance ${instance} connected. QR cache cleared.`
      );
    }
    this.emit('connection_update', { instance, status });
  }

  async handleMessageUpsert(instance, data) {
    // This logic is imported from the old webhook.service.js
    // In a real scenario, this would call an external AI/NLP service.
    for (const message of data.messages) {
      if (message.key.fromMe) {
        continue; // Ignore messages sent by the bot
      }
      const contact = message.key.remoteJid;
      const text =
        message.message?.conversation ||
        message.message?.extendedTextMessage?.text ||
        '';

      console.log(
        `[Webhook] Processing message from ${contact} on ${instance}: "${text}"`
      );

      // Placeholder for AI processing
      const aiResponse = this.getAutomatedResponse(text);

      if (aiResponse) {
        await this.sendMessage(instance, contact, aiResponse);
      }
    }
  }

  getAutomatedResponse(text) {
    const lowerText = text.toLowerCase();
    if (lowerText.includes('olá') || lowerText.includes('oi')) {
      return 'Olá! Sou a Sofia, assistente virtual da imobiliária. Como posso te ajudar?';
    }
    if (lowerText.includes('preço') || lowerText.includes('valor')) {
      return 'Para te informar os valores, preciso saber mais sobre o tipo de imóvel e a região que você procura. Pode me dar mais detalhes?';
    }
    // Add more rules as needed
    return null;
  }

  // --- Cache & Status ---

  getCachedQRCode(instance) {
    const cached = this.qrCodeCache.get(instance);
    if (!cached || Date.now() > cached.expires_at) {
      if (cached) this.qrCodeCache.delete(instance);
      return null;
    }
    return cached;
  }

  updateInstanceStatus(instance, status) {
    const current = this.instanceStatusCache.get(instance) || {};
    this.instanceStatusCache.set(instance, {
      ...current,
      status,
      last_update: new Date().toISOString(),
    });
    console.log(`[Status] Instance ${instance} status updated to: ${status}`);
  }

  getInstanceStatus(instance) {
    return this.instanceStatusCache.get(instance) || { status: 'unknown' };
  }

  getCacheStats() {
    return {
      qr_codes: this.qrCodeCache.size,
      instances: this.instanceStatusCache.size,
    };
  }

  cleanExpiredCache() {
    let cleaned = 0;
    const now = Date.now();
    for (const [instance, data] of this.qrCodeCache.entries()) {
      if (now > data.expires_at) {
        this.qrCodeCache.delete(instance);
        cleaned++;
      }
    }
    if (cleaned > 0) {
      console.log(`[Cache] Cleaned ${cleaned} expired QR codes.`);
    }
    return cleaned;
  }

  // --- Health & Cleanup ---

  async healthCheck() {
    try {
      await axios.get(`${this.apiUrl}/instance/fetchInstances`, {
        headers: this.defaultHeaders,
        timeout: 10000,
      });
      return { success: true, status: 'healthy' };
    } catch (error) {
      return { success: false, status: 'unhealthy', error: error.message };
    }
  }

  cleanup() {
    console.log('[System] Cleaning up Evolution Service resources...');
    this.qrCodeCache.clear();
    this.instanceStatusCache.clear();
  }
}

// Export a singleton instance
module.exports = new EvolutionAPIService();
