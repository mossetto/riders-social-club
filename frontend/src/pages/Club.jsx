import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getClub, joinClub, getClubEvents, getRoutes } from '../api/clubs'
import { useAuth } from '../context/AuthContext'
import PostCard from '../components/PostCard'
import CreatePost from '../components/CreatePost'
import { getFeed, deletePost } from '../api/posts'

export default function Club() {
  const { id } = useParams()
  const { user } = useAuth()
  const [club, setClub] = useState(null)
  const [posts, setPosts] = useState([])
  const [events, setEvents] = useState([])
  const [routes, setRoutes] = useState([])
  const [tab, setTab] = useState('feed')
  const [joined, setJoined] = useState(false)

  useEffect(() => { loadAll() }, [id])

  async function loadAll() {
    try {
      const [clubRes, eventsRes, routesRes] = await Promise.all([
        getClub(id), getClubEvents(id), getRoutes(id)
      ])
      setClub(clubRes.data)
      setEvents(eventsRes.data)
      setRoutes(routesRes.data)

      const myMembership = clubRes.data.members?.find(m => m.id === user?.id)
      setJoined(!!myMembership)
    } catch {}
  }

  async function loadPosts() {
    try {
      const { data } = await getFeed()
      setPosts(data.filter(p => p.club?.id === Number(id)))
    } catch {}
  }

  useEffect(() => { if (tab === 'feed') loadPosts() }, [tab])

  async function handleJoin() {
    try {
      await joinClub(id)
      setJoined(true)
      loadAll()
    } catch {}
  }

  if (!club) return <div className="loading">Cargando...</div>

  const myRole = club.members?.find(m => m.id === user?.id)?.rol
  const canPost = ['fundador','organizador','colaborador','miembro'].includes(myRole)

  return (
    <div className="page">
      <div className="club-header">
        <div className="club-escudo-lg">
          {club.escudo_url ? <img src={club.escudo_url} alt={club.nombre} /> : <span>{club.nombre.slice(0,2).toUpperCase()}</span>}
        </div>
        <div>
          <h1>{club.nombre}</h1>
          {club.slogan && <p className="club-slogan">{club.slogan}</p>}
          <p className="club-meta">{club.miembros} miembros · {club.provincia} · {club.tipo}</p>
          {myRole && <span className="role-badge">{myRole}</span>}
          {!joined && user && <button className="btn-primary" onClick={handleJoin}>Solicitar ingreso</button>}
        </div>
      </div>

      <div className="tabs">
        <button className={tab === 'feed' ? 'tab active' : 'tab'} onClick={() => setTab('feed')}>Feed</button>
        <button className={tab === 'eventos' ? 'tab active' : 'tab'} onClick={() => setTab('eventos')}>Salidas</button>
        <button className={tab === 'rutas' ? 'tab active' : 'tab'} onClick={() => setTab('rutas')}>Rutas</button>
        <button className={tab === 'miembros' ? 'tab active' : 'tab'} onClick={() => setTab('miembros')}>Miembros</button>
      </div>

      {tab === 'feed' && (
        <div>
          {canPost && <CreatePost onCreated={loadPosts} clubId={id} />}
          {posts.map(p => <PostCard key={p.id} post={p} onDelete={async (pid) => { await deletePost(pid); loadPosts() }} />)}
        </div>
      )}

      {tab === 'eventos' && (
        <div>
          {events.length === 0 ? <p className="empty">No hay salidas programadas</p> : events.map(e => (
            <div key={e.id} className="event-card">
              <h3>{e.titulo}</h3>
              <p className="event-date">{new Date(e.fecha_salida).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</p>
              {e.punto_encuentro && <p>📍 {e.punto_encuentro} → {e.destino}</p>}
              {e.descripcion && <p>{e.descripcion}</p>}
              {e.ruta_url && (
                <div className="map-embed">
                  <iframe src={`https://maps.google.com/maps?q=${encodeURIComponent(e.ruta_url)}&output=embed`} title="ruta" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'rutas' && (
        <div>
          {routes.length === 0 ? <p className="empty">No hay rutas guardadas</p> : routes.map(r => (
            <div key={r.id} className="route-card">
              <h3>{r.nombre}</h3>
              {r.descripcion && <p>{r.descripcion}</p>}
              <div className="map-embed">
                <iframe src={`${r.maps_url}&output=embed`} title={r.nombre} />
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'miembros' && (
        <div>
          {club.members?.map(m => (
            <div key={m.id} className="member-row">
              <Link to={`/perfil/${m.id}`}>
                <div className="avatar-sm">
                  {m.avatar_url ? <img src={m.avatar_url} alt="" /> : <span>{m.username?.slice(0,2).toUpperCase()}</span>}
                </div>
              </Link>
              <span className="member-name">{m.username}</span>
              <span className="role-badge">{m.rol}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
