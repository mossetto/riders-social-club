const pool = require('../db/pool')
const { canDo } = require('./clubsController')

async function getClubEvents(req, res) {
  const userId = req.user?.id || null
  try {
    const result = await pool.query(
      `SELECT e.*,
        json_build_object('id', u.id, 'username', u.username, 'avatar_url', u.avatar_url) as creador,
        CASE WHEN e.ruta_id IS NOT NULL
          THEN json_build_object('id', r.id, 'nombre', r.nombre, 'maps_url', r.maps_url)
          ELSE NULL
        END as ruta,
        COUNT(DISTINCT ep.id) as participantes_count,
        BOOL_OR(ep.user_id = $2) as yo_participo,
        (SELECT COUNT(*) FROM likes WHERE post_id = e.post_id) as likes,
        (SELECT COUNT(*) FROM comments WHERE post_id = e.post_id) as comentarios
       FROM events e
       LEFT JOIN users u ON u.id = e.user_id
       LEFT JOIN routes r ON r.id = e.ruta_id
       LEFT JOIN event_participants ep ON ep.event_id = e.id
       WHERE e.club_id = $1
       GROUP BY e.id, u.id, r.id
       ORDER BY
         CASE WHEN e.fecha_salida >= NOW() THEN 0 ELSE 1 END ASC,
         CASE WHEN e.fecha_salida >= NOW() THEN e.fecha_salida END ASC,
         CASE WHEN e.fecha_salida < NOW() THEN e.fecha_salida END DESC`,
      [req.params.clubId, userId])
    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error interno' })
  }
}

async function createEvent(req, res) {
  const { clubId } = req.params
  const { titulo, descripcion, fecha_salida, punto_encuentro, destino, paradas, ruta_url, ruta_id, es_publico } = req.body
  if (!titulo || !fecha_salida) return res.status(400).json({ error: 'Título y fecha requeridos' })
  try {
    const club = await pool.query('SELECT config_salidas FROM clubs WHERE id = $1', [clubId])
    if (!club.rows.length) return res.status(404).json({ error: 'Club no encontrado' })

    const member = await pool.query(
      `SELECT rol FROM club_members WHERE club_id = $1 AND user_id = $2 AND estado = 'activo'`,
      [clubId, req.user.id])
    if (!member.rows.length || !canDo(club.rows[0].config_salidas || 'cualquiera', member.rows[0].rol)) {
      return res.status(403).json({ error: 'Sin permisos para crear eventos' })
    }
    let finalRutaUrl = ruta_url || null
    if (ruta_id) {
      const ruta = await pool.query('SELECT maps_url FROM routes WHERE id = $1 AND club_id = $2', [ruta_id, clubId])
      if (ruta.rows.length) finalRutaUrl = ruta.rows[0].maps_url
    }
    const result = await pool.query(
      `INSERT INTO events (club_id, user_id, titulo, descripcion, fecha_salida, punto_encuentro, destino, paradas, ruta_url, ruta_id, es_publico)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [clubId, req.user.id, titulo, descripcion, fecha_salida, punto_encuentro, destino, paradas, finalRutaUrl, ruta_id || null, es_publico === 'true' || es_publico === true])
    const fechaFmt = new Date(fecha_salida).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
    const post = await pool.query(
      `INSERT INTO posts (user_id, club_id, tipo, contenido) VALUES ($1, $2, 'club', $3) RETURNING id`,
      [req.user.id, clubId, `📅 Nueva salida: **${titulo}** — ${fechaFmt}${punto_encuentro ? ` · Salida desde ${punto_encuentro}` : ''}${destino ? ` → ${destino}` : ''}`]
    )
    await pool.query('UPDATE events SET post_id = $1 WHERE id = $2', [post.rows[0].id, result.rows[0].id])
    res.status(201).json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error interno' })
  }
}

async function updateEvent(req, res) {
  const { clubId, eventId } = req.params
  const { titulo, descripcion, fecha_salida, punto_encuentro, destino, es_publico } = req.body
  try {
    const member = await pool.query(
      `SELECT rol FROM club_members WHERE club_id = $1 AND user_id = $2 AND estado = 'activo'`,
      [clubId, req.user.id])
    if (!member.rows.length || !['fundador','organizador','colaborador'].includes(member.rows[0].rol)) {
      return res.status(403).json({ error: 'Sin permisos' })
    }
    await pool.query(
      `UPDATE events SET titulo=$1, descripcion=$2, fecha_salida=$3, punto_encuentro=$4, destino=$5, es_publico=$6 WHERE id=$7 AND club_id=$8`,
      [titulo, descripcion, fecha_salida, punto_encuentro, destino, es_publico === 'true' || es_publico === true, eventId, clubId])
    res.json({ message: 'Evento actualizado' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error interno' })
  }
}

async function deleteEvent(req, res) {
  const { clubId, eventId } = req.params
  try {
    const member = await pool.query(
      `SELECT rol FROM club_members WHERE club_id = $1 AND user_id = $2 AND estado = 'activo'`,
      [clubId, req.user.id])
    if (!member.rows.length || !['fundador','organizador','colaborador'].includes(member.rows[0].rol)) {
      return res.status(403).json({ error: 'Sin permisos' })
    }
    await pool.query('DELETE FROM events WHERE id = $1 AND club_id = $2', [eventId, clubId])
    res.json({ message: 'Evento eliminado' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error interno' })
  }
}

async function joinEvent(req, res) {
  const { eventId } = req.params
  try {
    await pool.query(
      'INSERT INTO event_participants (event_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [eventId, req.user.id])
    res.json({ message: 'Anotado' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error interno' })
  }
}

async function leaveEvent(req, res) {
  const { eventId } = req.params
  try {
    await pool.query('DELETE FROM event_participants WHERE event_id = $1 AND user_id = $2', [eventId, req.user.id])
    res.json({ message: 'Ya no participás' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error interno' })
  }
}

async function getEventParticipants(req, res) {
  const { eventId } = req.params
  try {
    const result = await pool.query(
      `SELECT u.id, u.username, u.avatar_url,
        json_build_object('id', m.id, 'apodo', m.apodo, 'foto_url', m.foto_url, 'marca', m.marca, 'modelo', m.modelo) as moto
       FROM event_participants ep
       JOIN users u ON u.id = ep.user_id
       LEFT JOIN motos m ON m.user_id = u.id
       WHERE ep.event_id = $1
       ORDER BY ep.created_at ASC`,
      [eventId])
    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error interno' })
  }
}

async function getMyClubsEvents(req, res) {
  const userId = req.user.id
  try {
    const result = await pool.query(
      `SELECT e.*,
        json_build_object('id', u.id, 'username', u.username, 'avatar_url', u.avatar_url) as creador,
        json_build_object('id', c.id, 'nombre', c.nombre, 'escudo_url', c.escudo_url) as club,
        COUNT(ep.id) as participantes_count,
        BOOL_OR(ep.user_id = $1) as yo_participo
       FROM events e
       JOIN clubs c ON c.id = e.club_id
       JOIN club_members cm ON cm.club_id = e.club_id AND cm.user_id = $1 AND cm.estado = 'activo'
       LEFT JOIN users u ON u.id = e.user_id
       LEFT JOIN event_participants ep ON ep.event_id = e.id
       GROUP BY e.id, u.id, c.id
       ORDER BY
         CASE WHEN e.fecha_salida >= NOW() THEN 0 ELSE 1 END ASC,
         CASE WHEN e.fecha_salida >= NOW() THEN e.fecha_salida END ASC,
         CASE WHEN e.fecha_salida < NOW() THEN e.fecha_salida END DESC`,
      [userId])
    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error interno' })
  }
}

async function getPublicEvents(req, res) {
  const userId = req.user?.id || null
  try {
    const result = await pool.query(
      `SELECT e.*,
        json_build_object('id', u.id, 'username', u.username, 'avatar_url', u.avatar_url) as creador,
        json_build_object('id', c.id, 'nombre', c.nombre, 'escudo_url', c.escudo_url) as club,
        COUNT(ep.id) as participantes_count,
        COALESCE(BOOL_OR(ep.user_id IS NOT NULL AND ep.user_id = $1), false) as yo_participo
       FROM events e
       JOIN clubs c ON c.id = e.club_id
       LEFT JOIN users u ON u.id = e.user_id
       LEFT JOIN event_participants ep ON ep.event_id = e.id
       WHERE e.es_publico = true
       GROUP BY e.id, u.id, c.id
       ORDER BY e.fecha_salida DESC LIMIT 50`,
      [userId])
    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error interno' })
  }
}

async function getRoutes(req, res) {
  try {
    const result = await pool.query(
      `SELECT r.*,
        json_build_object('id', u.id, 'username', u.username, 'avatar_url', u.avatar_url) as agregada_por,
        (SELECT COUNT(*) FROM likes WHERE post_id = r.post_id) as likes,
        (SELECT COUNT(*) FROM comments WHERE post_id = r.post_id) as comentarios
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
    const club = await pool.query('SELECT config_rutas FROM clubs WHERE id = $1', [clubId])
    if (!club.rows.length) return res.status(404).json({ error: 'Club no encontrado' })

    const member = await pool.query(
      `SELECT rol FROM club_members WHERE club_id = $1 AND user_id = $2 AND estado = 'activo'`,
      [clubId, req.user.id])
    if (!member.rows.length || !canDo(club.rows[0].config_rutas || 'cualquiera', member.rows[0].rol)) {
      return res.status(403).json({ error: 'Sin permisos para agregar rutas' })
    }
    const result = await pool.query(
      'INSERT INTO routes (club_id, user_id, nombre, descripcion, maps_url) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [clubId, req.user.id, nombre, descripcion, maps_url])
    const post = await pool.query(
      `INSERT INTO posts (user_id, club_id, tipo, contenido) VALUES ($1, $2, 'club', $3) RETURNING id`,
      [req.user.id, clubId, `🗺️ Nueva ruta guardada: **${nombre}**${descripcion ? ` — ${descripcion}` : ''}`]
    )
    await pool.query('UPDATE routes SET post_id = $1 WHERE id = $2', [post.rows[0].id, result.rows[0].id])
    res.status(201).json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error interno' })
  }
}

async function updateRoute(req, res) {
  const { clubId, routeId } = req.params
  const { nombre, descripcion, maps_url } = req.body
  try {
    const club = await pool.query('SELECT config_rutas FROM clubs WHERE id = $1', [clubId])
    if (!club.rows.length) return res.status(404).json({ error: 'Club no encontrado' })
    const member = await pool.query(
      `SELECT rol FROM club_members WHERE club_id = $1 AND user_id = $2 AND estado = 'activo'`,
      [clubId, req.user.id])
    const route = await pool.query('SELECT user_id FROM routes WHERE id = $1 AND club_id = $2', [routeId, clubId])
    if (!route.rows.length) return res.status(404).json({ error: 'Ruta no encontrada' })
    const isCreator = route.rows[0].user_id === req.user.id
    const canEdit = isCreator || (member.rows.length && canDo(club.rows[0].config_rutas || 'cualquiera', member.rows[0].rol))
    if (!canEdit) return res.status(403).json({ error: 'Sin permisos' })
    await pool.query(
      'UPDATE routes SET nombre=$1, descripcion=$2, maps_url=$3 WHERE id=$4 AND club_id=$5',
      [nombre, descripcion, maps_url, routeId, clubId])
    res.json({ message: 'Ruta actualizada' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error interno' })
  }
}

async function deleteRoute(req, res) {
  const { clubId, routeId } = req.params
  try {
    const club = await pool.query('SELECT config_rutas FROM clubs WHERE id = $1', [clubId])
    if (!club.rows.length) return res.status(404).json({ error: 'Club no encontrado' })
    const member = await pool.query(
      `SELECT rol FROM club_members WHERE club_id = $1 AND user_id = $2 AND estado = 'activo'`,
      [clubId, req.user.id])
    const route = await pool.query('SELECT user_id FROM routes WHERE id = $1 AND club_id = $2', [routeId, clubId])
    if (!route.rows.length) return res.status(404).json({ error: 'Ruta no encontrada' })
    const isCreator = route.rows[0].user_id === req.user.id
    const canEdit = isCreator || (member.rows.length && canDo(club.rows[0].config_rutas || 'cualquiera', member.rows[0].rol))
    if (!canEdit) return res.status(403).json({ error: 'Sin permisos' })
    await pool.query('DELETE FROM routes WHERE id = $1 AND club_id = $2', [routeId, clubId])
    res.json({ message: 'Ruta eliminada' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error interno' })
  }
}

module.exports = { getClubEvents, createEvent, updateEvent, deleteEvent, getRoutes, addRoute, updateRoute, deleteRoute, joinEvent, leaveEvent, getEventParticipants, getPublicEvents, getMyClubsEvents }
