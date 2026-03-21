const pool = require('../db/pool')

async function getEvents(req, res) {
  try {
    const result = await pool.query(
      `SELECT e.*, json_build_object('id', u.id, 'username', u.username) as creador
       FROM events e JOIN club_members cm ON cm.club_id = e.club_id AND cm.user_id = $1 AND cm.estado = 'activo'
       JOIN users u ON u.id = cm.user_id
       WHERE e.club_id = $2 ORDER BY e.fecha_salida ASC`,
      [req.user?.id || 0, req.params.clubId])
    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error interno' })
  }
}

async function getClubEvents(req, res) {
  try {
    const result = await pool.query(
      `SELECT * FROM events WHERE club_id = $1 ORDER BY fecha_salida ASC`,
      [req.params.clubId])
    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error interno' })
  }
}

async function createEvent(req, res) {
  const { clubId } = req.params
  const { titulo, descripcion, fecha_salida, punto_encuentro, destino, paradas, ruta_url } = req.body
  if (!titulo || !fecha_salida) return res.status(400).json({ error: 'Título y fecha requeridos' })
  try {
    const member = await pool.query(
      `SELECT rol FROM club_members WHERE club_id = $1 AND user_id = $2 AND estado = 'activo'`,
      [clubId, req.user.id])
    if (!member.rows.length || !['fundador','organizador','colaborador'].includes(member.rows[0].rol)) {
      return res.status(403).json({ error: 'Sin permisos para crear eventos' })
    }
    const result = await pool.query(
      `INSERT INTO events (club_id, titulo, descripcion, fecha_salida, punto_encuentro, destino, paradas, ruta_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [clubId, titulo, descripcion, fecha_salida, punto_encuentro, destino, paradas, ruta_url])
    res.status(201).json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error interno' })
  }
}

async function getRoutes(req, res) {
  try {
    const result = await pool.query(
      'SELECT * FROM routes WHERE club_id = $1 ORDER BY created_at DESC', [req.params.clubId])
    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error interno' })
  }
}

async function addRoute(req, res) {
  const { clubId } = req.params
  const { nombre, descripcion, maps_url } = req.body
  if (!maps_url) return res.status(400).json({ error: 'URL de ruta requerida' })
  try {
    const member = await pool.query(
      `SELECT rol FROM club_members WHERE club_id = $1 AND user_id = $2 AND estado = 'activo'`,
      [clubId, req.user.id])
    if (!member.rows.length || !['fundador','organizador','colaborador'].includes(member.rows[0].rol)) {
      return res.status(403).json({ error: 'Sin permisos' })
    }
    const result = await pool.query(
      'INSERT INTO routes (club_id, nombre, descripcion, maps_url) VALUES ($1,$2,$3,$4) RETURNING *',
      [clubId, nombre, descripcion, maps_url])
    res.status(201).json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error interno' })
  }
}

module.exports = { getClubEvents, createEvent, getRoutes, addRoute }
