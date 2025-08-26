const Joi = require('joi');

/**
 * Middleware de validação genérico usando Joi
 */
const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        success: false,
        error: 'Dados inválidos',
        details: errors
      });
    }

    req.body = value;
    next();
  };
};

/**
 * Validação para parâmetros de URL
 */
const validateParams = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.params);

    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Parâmetros inválidos',
        details: error.details[0].message
      });
    }

    req.params = value;
    next();
  };
};

/**
 * Validação para query parameters
 */
const validateQuery = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query);

    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Query parameters inválidos',
        details: error.details[0].message
      });
    }

    req.query = value;
    next();
  };
};

/**
 * Schemas de validação
 */
const schemas = {
  // Login
  login: Joi.object({
    username: Joi.string().min(3).max(50).required().messages({
      'string.min': 'Username deve ter pelo menos 3 caracteres',
      'any.required': 'Username é obrigatório'
    }),
    password: Joi.string().min(6).required().messages({
      'string.min': 'Password deve ter pelo menos 6 caracteres',
      'any.required': 'Password é obrigatório'
    })
  }),

  // Criação de instância
  createInstance: Joi.object({
    instanceName: Joi.string()
      .min(3)
      .max(30)
      .pattern(/^[a-zA-Z0-9_-]+$/)
      .required()
      .messages({
        'string.min': 'Nome da instância deve ter pelo menos 3 caracteres',
        'string.max': 'Nome da instância deve ter no máximo 30 caracteres',
        'string.pattern.base': 'Nome da instância deve conter apenas letras, números, _ e -',
        'any.required': 'Nome da instância é obrigatório'
      }),
    settings: Joi.object({
      evolution_api_url: Joi.string().uri().optional(),
      qrcode: Joi.boolean().default(true),
      webhookUrl: Joi.string().uri().optional(),
      webhookByEvents: Joi.boolean().default(true),
      webhookBase64: Joi.boolean().default(true),
      rejectCall: Joi.boolean().default(true),
      msgCall: Joi.string().max(200).optional(),
      groupsIgnore: Joi.boolean().default(true),
      alwaysOnline: Joi.boolean().default(true),
      readMessages: Joi.boolean().default(true),
      readStatus: Joi.boolean().default(false),
      syncFullHistory: Joi.boolean().default(false)
    }).optional().default({})
  }),

  // Envio de mensagem
  sendMessage: Joi.object({
    instanceName: Joi.string().required().messages({
      'any.required': 'Nome da instância é obrigatório'
    }),
    number: Joi.string()
      .pattern(/^\d{10,15}$/)
      .required()
      .messages({
        'string.pattern.base': 'Número deve conter apenas dígitos (10-15 caracteres)',
        'any.required': 'Número é obrigatório'
      }),
    text: Joi.string().min(1).max(4000).required().messages({
      'string.min': 'Texto não pode estar vazio',
      'string.max': 'Texto deve ter no máximo 4000 caracteres',
      'any.required': 'Texto é obrigatório'
    })
  }),

  // Parâmetros de instância
  instanceParams: Joi.object({
    instanceName: Joi.string()
      .min(3)
      .max(30)
      .pattern(/^[a-zA-Z0-9_-]+$/)
      .required()
      .messages({
        'string.pattern.base': 'Nome da instância inválido',
        'any.required': 'Nome da instância é obrigatório'
      })
  }),

  // Query para QR Code
  qrCodeQuery: Joi.object({
    refresh: Joi.boolean().optional().default(false)
  })
};

/**
 * Middleware de sanitização
 */
const sanitize = (req, res, next) => {
  // Remover propriedades perigosas
  const removeXSS = (obj) => {
    if (typeof obj === 'string') {
      return obj.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    }
    if (typeof obj === 'object' && obj !== null) {
      Object.keys(obj).forEach(key => {
        obj[key] = removeXSS(obj[key]);
      });
    }
    return obj;
  };

  if (req.body) req.body = removeXSS(req.body);
  if (req.query) req.query = removeXSS(req.query);
  if (req.params) req.params = removeXSS(req.params);

  next();
};

/**
 * Middleware de logging de validação
 */
const logValidation = (req, res, next) => {
  console.log(`[Validation] ${req.method} ${req.path}`, {
    body: req.body,
    query: req.query,
    params: req.params
  });
  next();
};

module.exports = {
  validate,
  validateParams,
  validateQuery,
  schemas,
  sanitize,
  logValidation
};