const bcrypt = require('bcryptjs')
const pool = require('../db/pool')
const { signAccess, signRefresh, verifyRefresh } = require('../utils/jwt')

async function register(req, res) {
  const { email, password, username } = req.body

  if (!email || !password || !username) {
    return res.status(400).json({ error: 'Email, username y password son requeridos' })
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'El password debe tener al menos 6 caracteres' })
  }

  try {
    const exists = await pool.query(
      'SELECT id FROM users WHERE email = $1 OR username = $2',
      [email.toLowerCase(), username]
    )
    if (exists.rows.length > 0) {
      return res.status(409).json({ error: 'Email o username ya registrado' })
    }

    const password_hash = await bcrypt.hash(password, 12)
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, username)
       VALUES ($1, $2, $3)
       RETURNING id, email, username, created_at`,
      [email.toLowerCase(), password_hash, username]
    )
    const user = result.rows[0]

    const accessToken = signAccess({ id: user.id, email: user.email })
    const refreshToken = signRefresh({ id: user.id })

    // Guardar refresh token en DB
    await pool.query(
      'INSERT INTO refresh_tokens (user_id, token) VALUES ($1, $2)',
      [user.id, refreshToken]
    )

    return res.status(201).json({ user, accessToken, refreshToken })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Error interno del servidor' })
  }
}

async function login(req, res) {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ error: 'Email y password requeridos' })
  }

  try {
    const result = await pool.query(
      'SELECT id, email, username, password_hash, avatar_url FROM users WHERE email = $1',
      [email.toLowerCase()]
    )
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Credenciales incorrectas' })
    }
    const user = result.rows[0]

    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) {
      return res.status(401).json({ error: 'Credenciales incorrectas' })
    }

    const accessToken = signAccess({ id: user.id, email: user.email })
    const refreshToken = signRefresh({ id: user.id })

    await pool.query(
      'INSERT INTO refresh_tokens (user_id, token) VALUES ($1, $2)',
      [user.id, refreshToken]
    )

    const { password_hash, ...safeUser } = user
    return res.json({ user: safeUser, accessToken, refreshToken })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Error interno del servidor' })
  }
}

async function refresh(req, res) {
  const { refreshToken } = req.body
  if (!refreshToken) {
    return res.status(400).json({ error: 'Refresh token requerido' })
  }

  try {
    const payload = verifyRefresh(refreshToken)

    const result = await pool.query(
      'SELECT id FROM refresh_tokens WHERE token = $1 AND user_id = $2',
      [refreshToken, payload.id]
    )
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Refresh token inválido' })
    }

    const accessToken = signAccess({ id: payload.id })
    return res.json({ accessToken })
  } catch {
    return res.status(401).json({ error: 'Refresh token inválido o expirado' })
  }
}

async function logout(req, res) {
  const { refreshToken } = req.body
  if (refreshToken) {
    await pool.query('DELETE FROM refresh_tokens WHERE token = $1', [refreshToken])
  }
  return res.json({ message: 'Sesión cerrada' })
}

async function deleteAccount(req, res) {
  // Requerido por Apple App Store: la app debe permitir borrar la cuenta
  try {
    await pool.query('DELETE FROM refresh_tokens WHERE user_id = $1', [req.user.id])
    await pool.query('DELETE FROM users WHERE id = $1', [req.user.id])
    return res.json({ message: 'Cuenta eliminada' })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Error al eliminar la cuenta' })
  }
}

module.exports = { register, login, refresh, logout, deleteAccount }
