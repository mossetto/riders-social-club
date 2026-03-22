const pool = require('../db/pool')

const POST_SELECT = `
  SELECT p.id, p.tipo, p.contenido, p.imagen_url, p.video_url, p.created_at,
    json_build_object('id', u.id, 'username', u.username, 'avatar_url', u.avatar_url) as user,
    CASE WHEN p.club_id IS NOT NULL THEN
      json_build_object('id', c.id, 'nombre', c.nombre, 'escudo_url', c.escudo_url,
        'rol', cm.rol)
    ELSE NULL END as club,
    (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as likes,
    (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comentarios,
    row_to_json(m) as moto
  FROM posts p
  JOIN users u ON u.id = p.user_id
  LEFT JOIN motos m ON m.user_id = u.id
  LEFT JOIN clubs c ON c.id = p.club_id
  LEFT JOIN club_members cm ON cm.club_id = p.club_id AND cm.user_id = p.user_id AND cm.estado = 'activo'`

async function getClubPosts(req, res) {
  try {
    const result = await pool.query(
      `${POST_SELECT} WHERE p.club_id = $1 ORDER BY p.created_at DESC LIMIT 50`,
      [req.params.clubId])
    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error interno' })
  }
}

async function getFeed(req, res) {
  const { page = 1 } = req.query
  const limit = 20
  const offset = (page - 1) * limit
  try {
    const result = await pool.query(
      `${POST_SELECT} WHERE p.tipo = 'general' ORDER BY p.created_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset])
    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error interno' })
  }
}

async function getClubsFeed(req, res) {
  try {
    const clubs = await pool.query(
      'SELECT club_id FROM club_members WHERE user_id = $1 AND estado = $2',
      [req.user.id, 'activo'])
    const clubIds = clubs.rows.map(r => r.club_id)
    if (!clubIds.length) return res.json([])

    const result = await pool.query(
      `${POST_SELECT} WHERE p.club_id = ANY($1) ORDER BY p.created_at DESC LIMIT 50`,
      [clubIds])
    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error interno' })
  }
}

async function createPost(req, res) {
  const { tipo, contenido, club_id } = req.body
  const imagen_url = req.file?.path || null
  if (!contenido && !imagen_url) return res.status(400).json({ error: 'Contenido o imagen requerido' })
  try {
    if (tipo === 'club' && club_id) {
      const member = await pool.query(
        'SELECT id FROM club_members WHERE club_id = $1 AND user_id = $2 AND estado = $3',
        [club_id, req.user.id, 'activo'])
      if (!member.rows.length) return res.status(403).json({ error: 'No sos miembro del club' })
    }
    const result = await pool.query(
      'INSERT INTO posts (user_id, club_id, tipo, contenido, imagen_url) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [req.user.id, club_id || null, tipo || 'general', contenido, imagen_url])
    res.status(201).json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error interno' })
  }
}

async function deletePost(req, res) {
  try {
    const result = await pool.query(
      'DELETE FROM posts WHERE id = $1 AND user_id = $2 RETURNING id', [req.params.id, req.user.id])
    if (!result.rows.length) return res.status(404).json({ error: 'Post no encontrado o sin permiso' })
    res.json({ message: 'Eliminado' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error interno' })
  }
}

async function toggleLike(req, res) {
  const { id } = req.params
  try {
    const existing = await pool.query(
      'SELECT id FROM likes WHERE post_id = $1 AND user_id = $2', [id, req.user.id])
    if (existing.rows.length) {
      await pool.query('DELETE FROM likes WHERE post_id = $1 AND user_id = $2', [id, req.user.id])
      res.json({ liked: false })
    } else {
      await pool.query('INSERT INTO likes (post_id, user_id) VALUES ($1,$2)', [id, req.user.id])
      res.json({ liked: true })
    }
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error interno' })
  }
}

async function getComments(req, res) {
  try {
    const result = await pool.query(
      `SELECT co.*, json_build_object('id', u.id, 'username', u.username, 'avatar_url', u.avatar_url) as user
       FROM comments co JOIN users u ON u.id = co.user_id
       WHERE co.post_id = $1 ORDER BY co.created_at ASC`, [req.params.id])
    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error interno' })
  }
}

async function addComment(req, res) {
  const { contenido } = req.body
  if (!contenido) return res.status(400).json({ error: 'Contenido requerido' })
  try {
    const result = await pool.query(
      'INSERT INTO comments (post_id, user_id, contenido) VALUES ($1,$2,$3) RETURNING *',
      [req.params.id, req.user.id, contenido])
    res.status(201).json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error interno' })
  }
}

module.exports = { getFeed, getClubsFeed, getClubPosts, createPost, deletePost, toggleLike, getComments, addComment }
