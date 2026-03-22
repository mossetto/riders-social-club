const pool = require('../db/pool')

async function getClubs(req, res) {
  const { provincia, pais } = req.query
  try {
    let query = `
      SELECT c.*,
        COUNT(DISTINCT cm.id) FILTER (WHERE cm.estado = 'activo') as miembros,
        GREATEST(
          MAX(p.created_at),
          MAX(e.created_at),
          MAX(cm2.joined_at)
        ) as ultima_actividad
      FROM clubs c
      LEFT JOIN club_members cm ON cm.club_id = c.id
      LEFT JOIN posts p ON p.club_id = c.id
      LEFT JOIN events e ON e.club_id = c.id
      LEFT JOIN club_members cm2 ON cm2.club_id = c.id AND cm2.estado = 'activo'
      WHERE 1=1`
    const values = []
    let idx = 1
    if (provincia) { query += ` AND c.provincia = $${idx++}`; values.push(provincia) }
    if (pais) { query += ` AND c.pais = $${idx++}`; values.push(pais) }
    query += ` GROUP BY c.id ORDER BY ultima_actividad DESC NULLS LAST, COUNT(DISTINCT cm.id) FILTER (WHERE cm.estado = 'activo') DESC`
    const result = await pool.query(query, values)
    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error interno' })
  }
}

async function getClub(req, res) {
  try {
    const { id } = req.params
    const club = await pool.query(`
      SELECT c.*, COUNT(DISTINCT cm.id) FILTER (WHERE cm.estado = 'activo') as miembros
      FROM clubs c
      LEFT JOIN club_members cm ON cm.club_id = c.id
      WHERE c.id = $1 GROUP BY c.id`, [id])
    if (!club.rows.length) return res.status(404).json({ error: 'Club no encontrado' })

    const members = await pool.query(`
      SELECT u.id, u.username, u.avatar_url, cm.rol
      FROM club_members cm JOIN users u ON u.id = cm.user_id
      WHERE cm.club_id = $1 AND cm.estado = 'activo'
      ORDER BY CASE cm.rol WHEN 'fundador' THEN 1 WHEN 'organizador' THEN 2 WHEN 'colaborador' THEN 3 ELSE 4 END`, [id])

    res.json({ ...club.rows[0], members: members.rows })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error interno' })
  }
}

async function createClub(req, res) {
  const { nombre, slogan, provincia, pais, tipo } = req.body
  const escudo_url = req.files?.escudo?.[0]?.path || null
  const portada_url = req.files?.portada?.[0]?.path || null
  if (!nombre) return res.status(400).json({ error: 'El nombre es requerido' })
  try {
    const club = await pool.query(
      `INSERT INTO clubs (nombre, slogan, provincia, pais, tipo, escudo_url, portada_url) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [nombre, slogan, provincia, pais, tipo || 'publico', escudo_url, portada_url]
    )
    await pool.query(
      `INSERT INTO club_members (club_id, user_id, rol, estado) VALUES ($1,$2,'fundador','activo')`,
      [club.rows[0].id, req.user.id]
    )
    res.status(201).json(club.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error interno' })
  }
}

async function joinClub(req, res) {
  const { id } = req.params
  try {
    const club = await pool.query('SELECT tipo FROM clubs WHERE id = $1', [id])
    if (!club.rows.length) return res.status(404).json({ error: 'Club no encontrado' })

    const existing = await pool.query(
      'SELECT estado FROM club_members WHERE club_id = $1 AND user_id = $2', [id, req.user.id])
    if (existing.rows.length) return res.status(409).json({ error: 'Ya sos miembro o tenés solicitud pendiente' })

    const estado = club.rows[0].tipo === 'publico' ? 'activo' : 'pendiente'
    await pool.query(
      'INSERT INTO club_members (club_id, user_id, rol, estado) VALUES ($1,$2,$3,$4)',
      [id, req.user.id, 'miembro', estado]
    )
    res.json({ message: estado === 'activo' ? 'Te uniste al club' : 'Solicitud enviada' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error interno' })
  }
}

async function updateMember(req, res) {
  const { id, userId } = req.params
  const { rol, estado } = req.body
  try {
    const requester = await pool.query(
      'SELECT rol FROM club_members WHERE club_id = $1 AND user_id = $2 AND estado = $3',
      [id, req.user.id, 'activo'])
    if (!requester.rows.length || !['fundador','organizador'].includes(requester.rows[0].rol)) {
      return res.status(403).json({ error: 'Sin permisos' })
    }
    const fields = []
    const values = []
    if (rol) { fields.push(`rol = $${fields.length+1}`); values.push(rol) }
    if (estado) { fields.push(`estado = $${fields.length+1}`); values.push(estado) }
    values.push(id, userId)
    await pool.query(
      `UPDATE club_members SET ${fields.join(',')} WHERE club_id = $${values.length-1} AND user_id = $${values.length}`,
      values)
    res.json({ message: 'Actualizado' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error interno' })
  }
}

async function getMyClubes(req, res) {
  try {
    const result = await pool.query(
      `SELECT c.*, cm.rol,
        COUNT(DISTINCT p.id) FILTER (WHERE p.created_at > NOW() - INTERVAL '7 days') as posts_semana,
        COUNT(DISTINCT mem.id) FILTER (WHERE mem.estado = 'activo') as miembros
       FROM clubs c
       JOIN club_members cm ON cm.club_id = c.id AND cm.user_id = $1 AND cm.estado = 'activo'
       LEFT JOIN posts p ON p.club_id = c.id
       LEFT JOIN club_members mem ON mem.club_id = c.id
       GROUP BY c.id, cm.rol
       ORDER BY c.nombre`,
      [req.user.id]
    )
    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error interno' })
  }
}

module.exports = { getClubs, getClub, createClub, joinClub, updateMember, getMyClubes }
