const config = require('../config');
const evolutionService = require('./evolution.service'); // Using the new unified service

/**
 * @class QRCodeService
 * @description Manages the lifecycle of WhatsApp QR codes for the application.
 * It handles caching, expiration, and refreshing of QR codes by using the EvolutionAPIService.
 */
class QRCodeService {
  constructor() {
    this.qrCodeCache = new Map();
    this.cacheCheckInterval = setInterval(
      () => this.cleanExpiredQRCodes(),
      config.qrCode.cacheCheckInterval
    );
    console.log('🚀 QR Code Service Initialized');
  }

  /**
   * Generates or retrieves a QR code for a given instance.
   * It prioritizes a valid cached QR code.
   * If not available, it requests a new one via the EvolutionAPIService.
   */
  async getQRCode(instanceName, forceRefresh = false) {
    const startTime = Date.now();

    if (!forceRefresh) {
      const cachedQR = this.getCachedQRCode(instanceName);
      if (cachedQR) {
        console.log(`[QRCode] Cache hit for ${instanceName}.`);
        return {
          success: true,
          source: 'cache',
          data: this.formatQRData(instanceName, cachedQR, true),
          performance: { response_time: Date.now() - startTime },
        };
      }
    }

    console.log(
      `[QRCode] No valid cache for ${instanceName}, creating new instance connection.`
    );
    try {
      // The call to create the instance will trigger a webhook with the QR code.
      // The EvolutionAPIService will catch this and emit an event.
      await evolutionService.createInstance(instanceName);

      // Wait for the QR code to arrive via webhook event
      const qrData = await this.waitForQRCode(instanceName);

      console.log(
        `[QRCode] New QR code obtained for ${instanceName} via webhook.`
      );
      return {
        success: true,
        source: 'evolution_api',
        data: this.formatQRData(instanceName, qrData, false),
        performance: { response_time: Date.now() - startTime },
      };
    } catch (error) {
      console.error(
        `[QRCode] Error getting QR Code for ${instanceName}:`,
        error.message
      );
      return { success: false, error: error.message };
    }
  }

  /**
   * Waits for a QR code to be emitted from the EvolutionAPIService.
   */
  waitForQRCode(instanceName) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(
          new Error(`Timeout waiting for QR code for instance ${instanceName}`)
        );
      }, 20000); // 20-second timeout

      evolutionService.once('qrcode_updated', (eventData) => {
        if (eventData.instance === instanceName) {
          clearTimeout(timeout);
          const qrData = evolutionService.getCachedQRCode(instanceName);
          resolve(qrData);
        }
      });
    });
  }

  /**
   * Retrieves a QR code from the local cache if it is valid.
   */
  getCachedQRCode(instanceName) {
    const cacheEntry = evolutionService.getCachedQRCode(instanceName);
    if (!cacheEntry) return null;

    // Check if the QR code is expired
    if (Date.now() > cacheEntry.expires_at) {
      this.qrCodeCache.delete(instanceName);
      return null;
    }
    return cacheEntry;
  }

  /**
   * Formats the QR code data for a consistent API response.
   */
  formatQRData(instanceName, qrData, fromCache) {
    const timeRemaining = Math.max(0, qrData.expires_at - Date.now());
    return {
      instanceName,
      qr_code: qrData.qrcode,
      qr_data_url: qrData.qrcode.startsWith('data:')
        ? qrData.qrcode
        : `data:image/png;base64,${qrData.qrcode}`,
      expires_in: Math.floor(timeRemaining / 1000),
      expires_at: qrData.expires_at,
      generated_at: qrData.timestamp,
      source: fromCache ? 'cache' : 'webhook',
    };
  }

  /**
   * Cleans up expired QR codes from the cache.
   */
  cleanExpiredQRCodes() {
    let cleaned = 0;
    const now = Date.now();
    for (const [instanceName, qrData] of this.qrCodeCache.entries()) {
      if (now > qrData.expires_at) {
        this.qrCodeCache.delete(instanceName);
        cleaned++;
      }
    }
    if (cleaned > 0) {
      console.log(`[QRCode] Cleaned ${cleaned} expired QR codes from cache.`);
    }
  }

  /**
   * Cleans up resources on shutdown.
   */
  cleanup() {
    clearInterval(this.cacheCheckInterval);
  }
}

module.exports = new QRCodeService();
