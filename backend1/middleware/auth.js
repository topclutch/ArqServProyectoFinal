import jwt from 'jsonwebtoken';

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ 
      success: false, 
      message: 'Token no proporcionado' 
    });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(403).json({ 
          success: false, 
          message: 'Token expirado',
          code: 'TOKEN_EXPIRED'
        });
      }
      
      if (err.name === 'JsonWebTokenError') {
        return res.status(403).json({ 
          success: false, 
          message: 'Token inválido',
          code: 'INVALID_TOKEN'
        });
      }
      
      return res.status(403).json({ 
        success: false, 
        message: 'Error de autenticación',
        code: 'AUTH_ERROR'
      });
    }
    
    if (!decoded || !decoded.userId) {
      return res.status(403).json({ 
        success: false, 
        message: 'Token no contiene información de usuario',
        code: 'INVALID_TOKEN_DATA'
      });
    }
    
    // Normalizar el rol: convertir a minúsculas y capitalizar
    const normalizedRole = decoded.role 
      ? decoded.role.toLowerCase().charAt(0).toUpperCase() + decoded.role.toLowerCase().slice(1)
      : 'user';
    
    // Asignar datos de usuario normalizados
    req.user = {
      userId: decoded.userId,
      role: normalizedRole
    };
    
    next();
  });
};

export const authorizeRole = (roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      success: false, 
      message: 'Usuario no autenticado' 
    });
  }
  
  // Normalizar roles permitidos
  const normalizedRoles = roles.map(role => 
    role.toLowerCase().charAt(0).toUpperCase() + role.toLowerCase().slice(1)
  );
  
  // Verificar si el rol del usuario está permitido
  if (!normalizedRoles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: `Acceso no autorizado. Rol requerido: ${roles.join(', ')}`,
      currentRole: req.user.role,
      requiredRoles: normalizedRoles
    });
  }
  
  next();
};
