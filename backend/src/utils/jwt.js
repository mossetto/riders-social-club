const jwt = require('jsonwebtoken')

function signAccess(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  })
}

function signRefresh(payload) {
  return jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '30d',
  })
}

function verifyAccess(token) {
  return jwt.verify(token, process.env.JWT_SECRET)
}

function verifyRefresh(token) {
  return jwt.verify(token, process.env.REFRESH_TOKEN_SECRET)
}

module.exports = { signAccess, signRefresh, verifyAccess, verifyRefresh }
