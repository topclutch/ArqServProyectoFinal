import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email, active: true });
    
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Credenciales inválidas' 
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ 
        success: false, 
        message: 'Credenciales inválidas' 
      });
    }

    // Normalizar el rol antes de incluirlo en el token
    const normalizedRole = user.role 
      ? user.role.toLowerCase().charAt(0).toUpperCase() + user.role.toLowerCase().slice(1)
      : 'Vendedor';

    const token = jwt.sign(
      {
        userId: user._id,
        email: user.email,
        role: normalizedRole, // Rol normalizado
        name: user.name
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    res.json({
      success: true,
      message: 'Inicio de sesión exitoso',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: normalizedRole
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error en el servidor', 
      error: error.message 
    });
  }
};

export const register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body
    const existingUser = await User.findOne({ email })
    if (existingUser) return res.status(400).json({ success: false, message: 'El usuario ya existe' })

    const newUser = new User({ name, email, password, role: role || 'Vendedor' })
    await newUser.save()

    res.status(201).json({
      success: true,
      message: 'Usuario creado exitosamente',
      user: newUser.toJSON()
    })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error en el servidor', error: error.message })
  }
}

export const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
      .select('-password -__v -createdAt -updatedAt');
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'Usuario no encontrado' 
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error en el servidor', 
      error: error.message 
    });
  }
};
