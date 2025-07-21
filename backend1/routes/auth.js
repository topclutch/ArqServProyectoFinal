
import express from 'express'
import { login, register } from '../controllers/authController.js'
import { validateUser, validateLogin } from '../validators/userValidator.js'
// Agrega esta importación al principio del archivo
import { authenticateToken } from '../middleware/auth.js';
import { getCurrentUser } from '../controllers/authController.js';
const router = express.Router()

router.post('/login', validateLogin, login)
router.post('/register', validateUser, register)
router.get('/me', authenticateToken, getCurrentUser); // Nuevo endpoint

export default router
