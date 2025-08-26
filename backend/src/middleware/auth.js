const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const config = require('../config');

// JWT Config from environment
const JWT_SECRET = config.security.jwtSecret;
const JWT_EXPIRES_IN = config.security.jwtExpiresIn;

// Usuários temporários (em produção, usar database)
const TEMP_USERS = [
  {
    id: 1,
    username: 'admin',
    password: '$2a$10$UvPLzB2DCbunfuqezXMoWOm55CHcvGb90mQIQoQ7.S85..2aCKbme', // '123456'
    role: 'admin'
  },
  {
    id: 2,
    username: 'sofia',
    password: '$2a$10$UvPLzB2DCbunfuqezXMoWOm55CHcvGb90mQIQoQ7.S85..2aCKbme', // '123456'
    role: 'user'
  }
];

/**
 * Middleware de autenticação JWT
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Token de acesso requerido'
    });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      console.error('[Auth] Token inválido:', err.message);
      return res.status(403).json({
        success: false,
        error: 'Token inválido ou expirado'
      });
    }

    req.user = user;
    next();
  });
};

/**
 * Middleware de autorização por role
 */
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Usuário não autenticado'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Permissões insuficientes'
      });
    }

    next();
  };
};

/**
 * Função para login
 */
const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Username e password são obrigatórios'
      });
    }

    // Encontrar usuário
    const user = TEMP_USERS.find(u => u.username === username);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Credenciais inválidas'
      });
    }

    // Verificar password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({
        success: false,
        error: 'Credenciais inválidas'
      });
    }

    // Gerar JWT
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          role: user.role
        },
        expires_in: JWT_EXPIRES_IN
      }
    });

    console.log(`[Auth] Login bem-sucedido: ${username}`);
  } catch (error) {
    console.error('[Auth] Erro no login:', error.message);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
};

/**
 * Função para refresh do token
 */
const refreshToken = (req, res) => {
  const user = req.user;
  
  // Gerar novo token
  const newToken = jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  res.json({
    success: true,
    data: {
      token: newToken,
      expires_in: JWT_EXPIRES_IN
    }
  });
};

/**
 * Middleware opcional - não bloqueia se não houver token
 */
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    req.user = null;
    return next();
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    req.user = err ? null : user;
    next();
  });
};

module.exports = {
  authenticateToken,
  requireRole,
  login,
  refreshToken,
  optionalAuth,
  JWT_SECRET
};