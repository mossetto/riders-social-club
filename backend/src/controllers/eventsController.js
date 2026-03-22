const pool = require('../db/pool')

async function getClubEvents(req, res) {
  try {
    const result = await pool.query(
      `SELECT e.*,
        json_build_object('id', u.id, 'username', u.username, 'avatar_url', u.avatar_url) as creador,
        CASE WHEN e.ruta_id IS NOT NULL
          THEN json_build_object('id', r.id, 'nombre', r.nombre, 'maps_url', r.maps_url)
          ELSE NULL
        END as ruta
       FROM events e
       LEFT JOIN users u ON u.id = e.user_id
       LEFT JOIN routes r ON r.id = e.ruta_id
       WHERE e.club_id = $1 ORDER BY e.fecha_salida ASC`,
      [req.params.clubId])
    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error interno' })
  }
}

async function createEvent(req, res) {
  const { clubId } = req.params
  const { titulo, descripcion, fecha_salida, punto_encuentro, destino, paradas, ruta_url, ruta_id } = req.body
  if (!titulo || !fecha_salida) return res.status(400).json({ error: 'Título y fecha requeridos' })
  try {
    const member = await pool.query(
      `SELECT rol FROM club_members WHERE club_id = $1 AND user_id = $2 AND estado = 'activo'`,
      [clubId, req.user.id])
    if (!member.rows.length || !['fundador','organizador','colaborador'].includes(member.rows[0].rol)) {
      return res.status(403).json({ error: 'Sin permisos para crear eventos' })
    }
    // Si hay ruta_id, usar su maps_url como ruta_url del evento
    let finalRutaUrl = ruta_url || null
    if (ruta_id) {
      const ruta = await pool.query('SELECT maps_url FROM routes WHERE id = $1 AND club_id = $2', [ruta_id, clubId])
      if (ruta.rows.length) finalRutaUrl = ruta.rows[0].maps_url
    }
    const result = await pool.query(
      `INSERT INTO events (club_id, user_id, titulo, descripcion, fecha_salida, punto_encuentro, destino, paradas, ruta_url, ruta_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [clubId, req.user.id, titulo, descripcion, fecha_salida, punto_encuentro, destino, paradas, finalRutaUrl, ruta_id || null])
    // Post automático en el feed del club
    const fechaFmt = new Date(fecha_salida).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
    await pool.query(
      `INSERT INTO posts (user_id, club_id, tipo, contenido) VALUES ($1, $2, 'club', $3)`,
      [req.user.id, clubId, `📅 Nueva salida: **${titulo}** — ${fechaFmt}${punto_encuentro ? ` · Salida desde ${punto_encuentro}` : ''}${destino ? ` → ${destino}` : ''}`]
    )
    res.status(201).json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error interno' })
  }
}

async function getRoutes(req, res) {
  try {
    const result = await pool.query(
      `SELECT r.*, json_build_object('id', u.id, 'username', u.username, 'avatar_url', u.avatar_url) as agregada_por
       FROM routes r
       LEFT JOIN users u ON u.id = r.user_id
       WHERE r.club_id = $1 ORDER BY r.created_at DESC`,
      [req.params.clubId])
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
  if (!nombre) return res.status(400).json({ error: 'Nombre requerido' })
  try {
    const member = await pool.query(
      `SELECT rol FROM club_members WHERE club_id = $1 AND user_id = $2 AND estado = 'activo'`,
      [clubId, req.user.id])
    if (!member.rows.length) {
      return res.status(403).json({ error: 'Tenés que ser miembro del club para agregar rutas' })
    }
    const result = await pool.query(
      'INSERT INTO routes (club_id, user_id, nombre, descripcion, maps_url) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [clubId, req.user.id, nombre, descripcion, maps_url])
    // Post automático en el feed del club
    await pool.query(
      `INSERT INTO posts (user_id, club_id, tipo, contenido) VALUES ($1, $2, 'club', $3)`,
      [req.user.id, clubId, `🗺️ Nueva ruta guardada: **${nombre}**${descripcion ? ` — ${descripcion}` : ''}`]
    )
    res.status(201).json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error interno' })
  }
}

module.exports = { getClubEvents, createEvent, getRoutes, addRoute }
