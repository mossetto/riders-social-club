const router = require('express').Router()
const rateLimit = require('express-rate-limit')
const { register, login, refresh, logout, deleteAccount } = require('../controllers/authController')
const { forgotPassword, resetPassword } = require('../controllers/passwordController')
const { requireAuth } = require('../middleware/auth')

// Rate limit para registro: máximo 3 intentos por IP por hora
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 3,
  message: { error: 'Demasiados registros desde esta IP. Intentá en una hora.' },
  standardHeaders: true,
  legacyHeaders: false,
})

// Rate limit para login: máximo 10 intentos por IP cada 15 minutos
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10,
  message: { error: 'Demasiados intentos de login. Esperá 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
})

router.post('/register', registerLimiter, register)
router.post('/login', loginLimiter, login)
router.post('/refresh', refresh)
router.post('/logout', logout)
router.delete('/me', requireAuth, deleteAccount)
router.post('/forgot-password', forgotPassword)
router.post('/reset-password', resetPassword)

module.exports = router
