/**
 * Rate Limiting Middleware para Sofia IA
 * Implementação simples em memória (para produção, usar Redis)
 */

class RateLimiter {
  constructor() {
    this.clients = new Map();
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000); // Limpar a cada minuto
  }

  // Limpar registros expirados
  cleanup() {
    const now = Date.now();
    for (const [key, data] of this.clients.entries()) {
      if (now - data.resetTime > data.windowMs) {
        this.clients.delete(key);
      }
    }
  }

  // Verificar se o cliente excedeu o limite
  checkLimit(clientId, maxRequests, windowMs) {
    const now = Date.now();
    const clientData = this.clients.get(clientId);

    if (!clientData || now - clientData.resetTime > windowMs) {
      // Primeiro request ou janela expirada
      this.clients.set(clientId, {
        count: 1,
        resetTime: now,
        windowMs
      });
      return {
        allowed: true,
        remaining: maxRequests - 1,
        resetTime: now + windowMs
      };
    }

    if (clientData.count >= maxRequests) {
      // Limite excedido
      return {
        allowed: false,
        remaining: 0,
        resetTime: clientData.resetTime + windowMs
      };
    }

    // Incrementar contador
    clientData.count++;
    this.clients.set(clientId, clientData);

    return {
      allowed: true,
      remaining: maxRequests - clientData.count,
      resetTime: clientData.resetTime + windowMs
    };
  }
}

const limiter = new RateLimiter();

/**
 * Middleware de rate limiting configurável
 */
const createRateLimit = (options = {}) => {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutos
    maxRequests = 100,
    message = 'Muitas requisições, tente novamente mais tarde',
    keyGenerator = (req) => req.ip || req.connection.remoteAddress,
    skipSuccessfulRequests = false,
    skipFailedRequests = false
  } = options;

  return (req, res, next) => {
    const key = keyGenerator(req);
    const result = limiter.checkLimit(key, maxRequests, windowMs);

    // Headers informativos
    res.set({
      'X-RateLimit-Limit': maxRequests,
      'X-RateLimit-Remaining': result.remaining,
      'X-RateLimit-Reset': Math.ceil(result.resetTime / 1000)
    });

    if (!result.allowed) {
      console.warn(`[RateLimit] Limite excedido para ${key}`);
      return res.status(429).json({
        success: false,
        error: message,
        retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000)
      });
    }

    // Middleware para contar apenas requests bem-sucedidos/falhados
    if (skipSuccessfulRequests || skipFailedRequests) {
      const originalSend = res.send;
      res.send = function(data) {
        const shouldSkip = (skipSuccessfulRequests && res.statusCode < 400) ||
                          (skipFailedRequests && res.statusCode >= 400);
        
        if (shouldSkip) {
          // Reverter o contador
          const clientData = limiter.clients.get(key);
          if (clientData) {
            clientData.count = Math.max(0, clientData.count - 1);
            limiter.clients.set(key, clientData);
          }
        }
        
        return originalSend.call(this, data);
      };
    }

    next();
  };
};

/**
 * Rate limits pré-configurados
 */
const rateLimits = {
  // Limite geral para APIs
  general: createRateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    maxRequests: 1000,
    message: 'Limite de requisições excedido. Tente novamente em 15 minutos.'
  }),

  // Limite estrito para autenticação
  auth: createRateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    maxRequests: 5,
    message: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
    keyGenerator: (req) => `auth_${req.ip}_${req.body?.username || 'unknown'}`
  }),

  // Limite para criação de instâncias
  instanceCreation: createRateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutos
    maxRequests: 10,
    message: 'Limite de criação de instâncias excedido. Aguarde 10 minutos.'
  }),

  // Limite para QR codes
  qrCode: createRateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutos
    maxRequests: 20,
    message: 'Limite de geração de QR codes excedido. Aguarde 5 minutos.'
  }),

  // Limite para mensagens
  messages: createRateLimit({
    windowMs: 60 * 1000, // 1 minuto
    maxRequests: 30,
    message: 'Limite de mensagens excedido. Aguarde 1 minuto.'
  })
};

/**
 * Middleware de rate limiting por IP
 */
const ipRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000,
  maxRequests: 1000,
  keyGenerator: (req) => req.ip || req.connection.remoteAddress
});

module.exports = {
  createRateLimit,
  rateLimits,
  ipRateLimit,
  limiter
};