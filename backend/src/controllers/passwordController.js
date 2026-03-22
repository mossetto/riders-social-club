const crypto = require('crypto')
const bcrypt = require('bcryptjs')
const { Resend } = require('resend')
const pool = require('../db/pool')

const resend = new Resend(process.env.RESEND_API_KEY)
const FRONTEND_URL = (process.env.FRONTEND_URL || '').replace(/\/$/, '')

async function forgotPassword(req, res) {
  const { email } = req.body
  if (!email) return res.status(400).json({ error: 'Email requerido' })

  try {
    const result = await pool.query('SELECT id, username FROM users WHERE email = $1', [email.toLowerCase()])
    // Siempre responder igual para no revelar si el email existe
    if (!result.rows.length) return res.json({ message: 'Si el email existe, te enviamos un link' })

    const user = result.rows[0]
    const token = crypto.randomBytes(32).toString('hex')
    const expires = new Date(Date.now() + 60 * 60 * 1000) // 1 hora

    // Borrar tokens viejos del usuario
    await pool.query('DELETE FROM password_reset_tokens WHERE user_id = $1', [user.id])
    await pool.query(
      'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, token, expires]
    )

    const resetUrl = `${FRONTEND_URL}/reset-password?token=${token}`

    await resend.emails.send({
      from: 'Riders Social Club <onboarding@resend.dev>',
      to: email.toLowerCase(),
      subject: 'Recuperá tu contraseña — Riders Social Club',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:2rem;background:#111;color:#f0f0f0;border-radius:12px">
          <h2 style="color:#534AB7">Riders Social Club</h2>
          <p>Hola <strong>${user.username}</strong>,</p>
          <p>Recibimos una solicitud para restablecer tu contraseña.</p>
          <a href="${resetUrl}" style="display:inline-block;margin:1.5rem 0;padding:0.75rem 1.5rem;background:#534AB7;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
            Restablecer contraseña
          </a>
          <p style="color:#aaa;font-size:0.85rem">Este link expira en 1 hora. Si no solicitaste esto, ignorá este email.</p>
        </div>
      `
    })

    res.json({ message: 'Si el email existe, te enviamos un link' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error interno' })
  }
}

async function resetPassword(req, res) {
  const { token, password } = req.body
  if (!token || !password) return res.status(400).json({ error: 'Token y contraseña requeridos' })
  if (password.length < 6) return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' })

  try {
    const result = await pool.query(
      'SELECT * FROM password_reset_tokens WHERE token = $1 AND expires_at > NOW()',
      [token]
    )
    if (!result.rows.length) return res.status(400).json({ error: 'Link inválido o expirado' })

    const { user_id } = result.rows[0]
    const hash = await bcrypt.hash(password, 12)

    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, user_id])
    await pool.query('DELETE FROM password_reset_tokens WHERE user_id = $1', [user_id])
    // Invalidar todos los refresh tokens
    await pool.query('DELETE FROM refresh_tokens WHERE user_id = $1', [user_id])

    res.json({ message: 'Contraseña actualizada correctamente' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error interno' })
  }
}

module.exports = { forgotPassword, resetPassword }
