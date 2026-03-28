const pool = require('../db/pool')

function canDo(config, myRole) {
  if (!myRole) return false
  if (config === 'cualquiera') return true
  if (config === 'fundador') return myRole === 'fundador'
  if (config === 'colaboradores') return ['fundador', 'organizador', 'colaborador'].includes(myRole)
  return false
}

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
      SELECT u.id, u.username, u.avatar_url, cm.rol, cm.estado, cm.joined_at
      FROM club_members cm JOIN users u ON u.id = cm.user_id
      WHERE cm.club_id = $1 AND cm.estado = 'activo'
      ORDER BY CASE cm.rol WHEN 'fundador' THEN 1 WHEN 'organizador' THEN 2 WHEN 'colaborador' THEN 3 ELSE 4 END`, [id])

    const result = { ...club.rows[0], members: members.rows }

    // Return pending members to users with ingreso permissions
    if (req.user) {
      const myMember = members.rows.find(m => m.id === req.user.id)
      if (myMember && canDo(club.rows[0].config_ingreso || 'fundador', myMember.rol)) {
        const pending = await pool.query(`
          SELECT u.id, u.username, u.avatar_url, cm.rol, cm.estado, cm.joined_at
          FROM club_members cm JOIN users u ON u.id = cm.user_id
          WHERE cm.club_id = $1 AND cm.estado = 'pendiente'
          ORDER BY cm.joined_at DESC`, [id])
        result.pending_members = pending.rows
      }
    }

    res.json(result)
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

async function updateClub(req, res) {
  const { id } = req.params
  const { nombre, slogan, provincia, pais, tipo, config_rutas, config_salidas, config_ingreso, config_roles } = req.body
  const escudo_url = req.files?.escudo?.[0]?.path || null
  const portada_url = req.files?.portada?.[0]?.path || null
  try {
    const member = await pool.query(
      `SELECT rol FROM club_members WHERE club_id = $1 AND user_id = $2 AND estado = 'activo'`,
      [id, req.user.id])
    if (!member.rows.length || member.rows[0].rol !== 'fundador') {
      return res.status(403).json({ error: 'Solo el fundador puede configurar el club' })
    }
    const fields = []
    const values = []
    let i = 1
    if (nombre) { fields.push(`nombre = $${i++}`); values.push(nombre) }
    if (slogan !== undefined) { fields.push(`slogan = $${i++}`); values.push(slogan) }
    if (provincia !== undefined) { fields.push(`provincia = $${i++}`); values.push(provincia) }
    if (pais !== undefined) { fields.push(`pais = $${i++}`); values.push(pais) }
    if (tipo) { fields.push(`tipo = $${i++}`); values.push(tipo) }
    if (config_rutas) { fields.push(`config_rutas = $${i++}`); values.push(config_rutas) }
    if (config_salidas) { fields.push(`config_salidas = $${i++}`); values.push(config_salidas) }
    if (config_ingreso) { fields.push(`config_ingreso = $${i++}`); values.push(config_ingreso) }
    if (config_roles) { fields.push(`config_roles = $${i++}`); values.push(config_roles) }
    if (escudo_url) { fields.push(`escudo_url = $${i++}`); values.push(escudo_url) }
    else if (req.body.escudo_clear === 'true') { fields.push(`escudo_url = $${i++}`); values.push(null) }
    if (portada_url) { fields.push(`portada_url = $${i++}`); values.push(portada_url) }
    else if (req.body.portada_clear === 'true') { fields.push(`portada_url = $${i++}`); values.push(null) }
    if (!fields.length) return res.status(400).json({ error: 'Nada para actualizar' })
    values.push(id)
    const result = await pool.query(
      `UPDATE clubs SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
      values)
    res.json(result.rows[0])
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
    const club = await pool.query('SELECT config_roles, config_ingreso FROM clubs WHERE id = $1', [id])
    if (!club.rows.length) return res.status(404).json({ error: 'Club no encontrado' })

    const requester = await pool.query(
      'SELECT rol FROM club_members WHERE club_id = $1 AND user_id = $2 AND estado = $3',
      [id, req.user.id, 'activo'])
    if (!requester.rows.length) return res.status(403).json({ error: 'Sin permisos' })

    const myRole = requester.rows[0].rol
    const { config_roles, config_ingreso } = club.rows[0]

    if (rol && !canDo(config_roles || 'fundador', myRole)) {
      return res.status(403).json({ error: 'Sin permisos para cambiar roles' })
    }
    if (estado && !canDo(config_ingreso || 'fundador', myRole)) {
      return res.status(403).json({ error: 'Sin permisos para gestionar ingresos' })
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

async function leaveClub(req, res) {
  const { id } = req.params
  try {
    const member = await pool.query(
      `SELECT rol FROM club_members WHERE club_id = $1 AND user_id = $2 AND estado = 'activo'`,
      [id, req.user.id])
    if (!member.rows.length) return res.status(404).json({ error: 'No sos miembro' })
    if (member.rows[0].rol === 'fundador') return res.status(403).json({ error: 'El fundador no puede salir del club' })
    await pool.query('DELETE FROM club_members WHERE club_id = $1 AND user_id = $2', [id, req.user.id])
    res.json({ message: 'Saliste del club' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error interno' })
  }
}

async function getNearbyMembers(req, res) {
  const { clubId } = req.params
  const { lat, lng, radius } = req.query
  if (!lat || !lng) return res.status(400).json({ error: 'lat y lng requeridos' })
  const radiusKm = Number(radius) || 50
  try {
    const result = await pool.query(`
      SELECT u.id, u.username, u.avatar_url, u.lat, u.lng, u.location_updated_at,
        m.marca, m.modelo, m.apodo,
        (6371 * acos(
          cos(radians($1)) * cos(radians(u.lat)) *
          cos(radians(u.lng) - radians($2)) +
          sin(radians($1)) * sin(radians(u.lat))
        )) AS distancia_km
      FROM users u
      JOIN club_members cm ON cm.user_id = u.id AND cm.club_id = $3 AND cm.estado = 'activo'
      LEFT JOIN motos m ON m.user_id = u.id
      WHERE u.lat IS NOT NULL AND u.lng IS NOT NULL
        AND u.id != $4
        AND u.location_updated_at > NOW() - INTERVAL '7 days'
      HAVING (6371 * acos(
          cos(radians($1)) * cos(radians(u.lat)) *
          cos(radians(u.lng) - radians($2)) +
          sin(radians($1)) * sin(radians(u.lat))
        )) < $5
      ORDER BY distancia_km
      LIMIT 20
    `, [lat, lng, clubId, req.user.id, radiusKm])
    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error interno' })
  }
}

module.exports = { getClubs, getClub, createClub, updateClub, joinClub, leaveClub, updateMember, getMyClubes, canDo, getNearbyMembers }
