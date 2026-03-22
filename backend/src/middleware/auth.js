const { verifyAccess } = require('../utils/jwt')

function requireAuth(req, res, next) {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token requerido' })
  }
  try {
    const payload = verifyAccess(header.split(' ')[1])
    req.user = payload
    next()
  } catch {
    return res.status(401).json({ error: 'Token inválido o expirado' })
  }
}

function optionalAuth(req, res, next) {
  const header = req.headers.authorization
  if (header && header.startsWith('Bearer ')) {
    try {
      const payload = verifyAccess(header.split(' ')[1])
      req.user = payload
    } catch {}
  }
  next()
}

module.exports = { requireAuth, optionalAuth }
