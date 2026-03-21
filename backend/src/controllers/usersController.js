const pool = require('../db/pool')

async function getProfile(req, res) {
  try {
    const { id } = req.params
    const result = await pool.query(
      `SELECT u.id, u.username, u.bio, u.avatar_url, u.whatsapp, u.telegram, u.created_at,
        json_agg(DISTINCT jsonb_build_object('id', m.id, 'apodo', m.apodo, 'modelo', m.modelo, 'foto_url', m.foto_url)) FILTER (WHERE m.id IS NOT NULL) as motos,
        json_agg(DISTINCT jsonb_build_object('id', c.id, 'nombre', c.nombre, 'escudo_url', c.escudo_url, 'rol', cm.rol)) FILTER (WHERE c.id IS NOT NULL) as clubes
       FROM users u
       LEFT JOIN motos m ON m.user_id = u.id
       LEFT JOIN club_members cm ON cm.user_id = u.id AND cm.estado = 'activo'
       LEFT JOIN clubs c ON c.id = cm.club_id
       WHERE u.id = $1
       GROUP BY u.id`,
      [id]
    )
    if (!result.rows.length) return res.status(404).json({ error: 'Usuario no encontrado' })
    res.json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error interno' })
  }
}

async function updateProfile(req, res) {
  const { username, bio, whatsapp, telegram } = req.body
  const avatar_url = req.file?.path || undefined

  try {
    const fields = []
    const values = []
    let i = 1

    if (username) { fields.push(`username = $${i++}`); values.push(username) }
    if (bio !== undefined) { fields.push(`bio = $${i++}`); values.push(bio) }
    if (whatsapp !== undefined) { fields.push(`whatsapp = $${i++}`); values.push(whatsapp) }
    if (telegram !== undefined) { fields.push(`telegram = $${i++}`); values.push(telegram) }
    if (avatar_url) { fields.push(`avatar_url = $${i++}`); values.push(avatar_url) }

    if (!fields.length) return res.status(400).json({ error: 'Nada para actualizar' })

    values.push(req.user.id)
    const result = await pool.query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${i} RETURNING id, username, bio, avatar_url, whatsapp, telegram`,
      values
    )
    res.json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error interno' })
  }
}

async function addMoto(req, res) {
  const { apodo, modelo } = req.body
  const foto_url = req.file?.path || null

  try {
    // Solo una moto por usuario — upsert
    const existing = await pool.query('SELECT id FROM motos WHERE user_id = $1', [req.user.id])
    let result
    if (existing.rows.length) {
      result = await pool.query(
        'UPDATE motos SET apodo = $1, modelo = $2, foto_url = COALESCE($3, foto_url) WHERE user_id = $4 RETURNING *',
        [apodo, modelo, foto_url, req.user.id]
      )
    } else {
      result = await pool.query(
        'INSERT INTO motos (user_id, apodo, modelo, foto_url) VALUES ($1, $2, $3, $4) RETURNING *',
        [req.user.id, apodo, modelo, foto_url]
      )
    }
    res.json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error interno' })
  }
}

async function getMe(req, res) {
  try {
    const result = await pool.query(
      `SELECT u.id, u.email, u.username, u.bio, u.avatar_url, u.whatsapp, u.telegram, u.created_at,
        row_to_json(m) as moto,
        json_agg(DISTINCT jsonb_build_object('id', c.id, 'nombre', c.nombre, 'escudo_url', c.escudo_url, 'rol', cm.rol)) FILTER (WHERE c.id IS NOT NULL) as clubes
       FROM users u
       LEFT JOIN motos m ON m.user_id = u.id
       LEFT JOIN club_members cm ON cm.user_id = u.id AND cm.estado = 'activo'
       LEFT JOIN clubs c ON c.id = cm.club_id
       WHERE u.id = $1
       GROUP BY u.id, m.id`,
      [req.user.id]
    )
    res.json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error interno' })
  }
}

module.exports = { getProfile, updateProfile, addMoto, getMe }
