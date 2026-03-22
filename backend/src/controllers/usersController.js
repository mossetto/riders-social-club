const pool = require('../db/pool')

async function getProfile(req, res) {
  try {
    const { id } = req.params
    const viewerId = req.user?.id || null

    const result = await pool.query(
      `SELECT u.id, u.username, u.bio, u.avatar_url, u.whatsapp, u.telegram,
        u.whatsapp_visibility, u.telegram_visibility, u.created_at,
        json_agg(DISTINCT jsonb_build_object('id', m.id, 'apodo', m.apodo, 'marca', m.marca, 'modelo', m.modelo, 'foto_url', m.foto_url)) FILTER (WHERE m.id IS NOT NULL) as motos,
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

    const profile = result.rows[0]
    const isOwner = viewerId === Number(id)

    // Aplicar visibilidad de whatsapp
    if (!isOwner) {
      const vis_wsp = profile.whatsapp_visibility || 'publico'
      if (vis_wsp === 'oculto') {
        profile.whatsapp = null
      } else if (vis_wsp === 'miembros' && viewerId) {
        const shared = await pool.query(
          `SELECT 1 FROM club_members a JOIN club_members b ON a.club_id = b.club_id
           WHERE a.user_id = $1 AND b.user_id = $2 AND a.estado = 'activo' AND b.estado = 'activo' LIMIT 1`,
          [viewerId, id])
        if (!shared.rows.length) profile.whatsapp = null
      } else if (vis_wsp === 'miembros' && !viewerId) {
        profile.whatsapp = null
      }

      const vis_tg = profile.telegram_visibility || 'publico'
      if (vis_tg === 'oculto') {
        profile.telegram = null
      } else if (vis_tg === 'miembros' && viewerId) {
        const shared = await pool.query(
          `SELECT 1 FROM club_members a JOIN club_members b ON a.club_id = b.club_id
           WHERE a.user_id = $1 AND b.user_id = $2 AND a.estado = 'activo' AND b.estado = 'activo' LIMIT 1`,
          [viewerId, id])
        if (!shared.rows.length) profile.telegram = null
      } else if (vis_tg === 'miembros' && !viewerId) {
        profile.telegram = null
      }
    }

    res.json(profile)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error interno' })
  }
}

async function updateProfile(req, res) {
  const { username, bio, whatsapp, telegram, whatsapp_visibility, telegram_visibility, avatar_clear } = req.body
  const avatar_url = req.file?.path || undefined

  try {
    const fields = []
    const values = []
    let i = 1

    if (username) { fields.push(`username = $${i++}`); values.push(username) }
    if (bio !== undefined) { fields.push(`bio = $${i++}`); values.push(bio) }
    if (whatsapp !== undefined) { fields.push(`whatsapp = $${i++}`); values.push(whatsapp) }
    if (telegram !== undefined) { fields.push(`telegram = $${i++}`); values.push(telegram) }
    if (whatsapp_visibility) { fields.push(`whatsapp_visibility = $${i++}`); values.push(whatsapp_visibility) }
    if (telegram_visibility) { fields.push(`telegram_visibility = $${i++}`); values.push(telegram_visibility) }
    if (avatar_url) { fields.push(`avatar_url = $${i++}`); values.push(avatar_url) }
    else if (avatar_clear === 'true') { fields.push(`avatar_url = $${i++}`); values.push(null) }

    if (!fields.length) return res.status(400).json({ error: 'Nada para actualizar' })

    values.push(req.user.id)
    const result = await pool.query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${i} RETURNING id, username, bio, avatar_url, whatsapp, telegram, whatsapp_visibility, telegram_visibility`,
      values
    )
    res.json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error interno' })
  }
}

async function addMoto(req, res) {
  const { apodo, marca, modelo, foto_clear } = req.body
  const foto_url = req.file?.path || null

  try {
    const existing = await pool.query('SELECT id FROM motos WHERE user_id = $1', [req.user.id])
    let result
    if (existing.rows.length) {
      const fotoExpr = foto_url ? `$4` : (foto_clear === 'true' ? `$4` : `foto_url`)
      const fotoVal = foto_url ? foto_url : (foto_clear === 'true' ? null : undefined)
      if (fotoVal !== undefined) {
        result = await pool.query(
          `UPDATE motos SET apodo = $1, marca = $2, modelo = $3, foto_url = ${fotoExpr} WHERE user_id = $5 RETURNING *`,
          [apodo, marca, modelo, fotoVal, req.user.id]
        )
      } else {
        result = await pool.query(
          'UPDATE motos SET apodo = $1, marca = $2, modelo = $3 WHERE user_id = $4 RETURNING *',
          [apodo, marca, modelo, req.user.id]
        )
      }
    } else {
      result = await pool.query(
        'INSERT INTO motos (user_id, apodo, marca, modelo, foto_url) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [req.user.id, apodo, marca, modelo, foto_url]
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
      `SELECT u.id, u.email, u.username, u.bio, u.avatar_url, u.whatsapp, u.telegram,
        u.whatsapp_visibility, u.telegram_visibility, u.created_at,
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

async function searchUsers(req, res) {
  const { q } = req.query
  if (!q || q.length < 2) return res.json([])
  try {
    const result = await pool.query(
      `SELECT u.id, u.username, u.avatar_url, u.pais,
        json_agg(DISTINCT jsonb_build_object('id', m.id, 'apodo', m.apodo, 'marca', m.marca, 'modelo', m.modelo, 'foto_url', m.foto_url)) FILTER (WHERE m.id IS NOT NULL) as motos
       FROM users u
       LEFT JOIN motos m ON m.user_id = u.id
       WHERE u.username ILIKE $1
       GROUP BY u.id ORDER BY u.username LIMIT 20`,
      [`%${q}%`]
    )
    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error interno' })
  }
}

async function searchByMoto(req, res) {
  const { q } = req.query
  if (!q || q.length < 2) return res.json([])
  try {
    const result = await pool.query(
      `SELECT u.id, u.username, u.avatar_url, u.pais,
        json_agg(DISTINCT jsonb_build_object('id', m.id, 'apodo', m.apodo, 'marca', m.marca, 'modelo', m.modelo, 'foto_url', m.foto_url)) FILTER (WHERE m.id IS NOT NULL) as motos
       FROM users u
       JOIN motos m ON m.user_id = u.id
       WHERE m.marca ILIKE $1 OR m.modelo ILIKE $1 OR m.apodo ILIKE $1
       GROUP BY u.id ORDER BY u.username LIMIT 20`,
      [`%${q}%`]
    )
    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error interno' })
  }
}

module.exports = { getProfile, updateProfile, addMoto, getMe, searchUsers, searchByMoto }
