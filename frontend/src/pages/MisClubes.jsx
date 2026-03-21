import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getClubsFeed, deletePost } from '../api/posts'
import PostCard from '../components/PostCard'
import api from '../api/axiosInstance'

export default function MisClubes() {
  const [clubes, setClubes] = useState([])
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const [clubsRes, postsRes] = await Promise.all([
        api.get('/clubs/mine'),
        getClubsFeed()
      ])
      setClubes(clubsRes.data)
      setPosts(postsRes.data)
    } catch {}
    setLoading(false)
  }

  async function handleDelete(id) {
    await deletePost(id)
    setPosts(p => p.filter(x => x.id !== id))
  }

  if (loading) return <div className="loading">Cargando...</div>

  if (clubes.length === 0) {
    return (
      <div className="page">
        <div className="empty-clubes">
          <p>No estás en ningún club todavía.</p>
          <div className="empty-clubes-actions">
            <Link to="/explorar" className="btn-primary">Explorar clubes</Link>
            <Link to="/crear-club" className="btn-secondary">Crear un club</Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="mis-clubes-cards">
        {clubes.map(c => (
          <Link key={c.id} to={`/club/${c.id}`} className="mi-club-card">
            <div className="mi-club-escudo">
              {c.escudo_url ? <img src={c.escudo_url} alt={c.nombre} /> : <span>{c.nombre?.slice(0,2).toUpperCase()}</span>}
            </div>
            <div className="mi-club-info">
              <span className="mi-club-nombre">{c.nombre}</span>
              <span className="mi-club-rol">{c.rol}</span>
              <span className="mi-club-stats">{c.miembros} miembros · {c.posts_semana} posts esta semana</span>
            </div>
          </Link>
        ))}
      </div>

      <h3 className="feed-section-title">Feed de mis clubes</h3>

      {posts.length === 0
        ? <p className="empty">No hay publicaciones en tus clubes aún.</p>
        : posts.map(p => <PostCard key={p.id} post={p} onDelete={handleDelete} />)
      }
    </div>
  )
}
