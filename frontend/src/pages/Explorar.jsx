import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import ClubCard from '../components/ClubCard'
import { getClubs, getPublicEvents, getMyClubsEvents, joinEvent, leaveEvent } from '../api/clubs'
import { searchUsers, searchByMoto } from '../api/users'
import { useAuth } from '../context/AuthContext'
import api from '../api/axiosInstance'
import { getBandera } from '../components/PaisSelector'

export default function Explorar() {
  const { user } = useAuth()
  const [tab, setTab] = useState('eventos')

  // Tab Clubes
  const [allClubs, setAllClubs] = useState([])
  const [misClubIds, setMisClubIds] = useState([])
  const [provincia, setProvincia] = useState('')
  const [loadingClubes, setLoadingClubes] = useState(true)

  // Tab Miembros
  const [queryMiembros, setQueryMiembros] = useState('')
  const [miembros, setMiembros] = useState([])
  const [loadingMiembros, setLoadingMiembros] = useState(false)

  // Tab Moto
  const [queryMoto, setQueryMoto] = useState('')
  const [motoResults, setMotoResults] = useState([])
  const [loadingMoto, setLoadingMoto] = useState(false)

  // Tab Eventos
  const [eventos, setEventos] = useState([])
  const [misEventos, setMisEventos] = useState([])
  const [loadingEventos, setLoadingEventos] = useState(false)
  const [errorEventos, setErrorEventos] = useState('')

  useEffect(() => {
    if (tab === 'clubes') loadClubes()
    if (tab === 'eventos') loadEventos()
  }, [tab, user?.id])

  async function loadClubes() {
    setLoadingClubes(true)
    try {
      const promises = [getClubs()]
      if (user) promises.push(api.get('/clubs/mine'))
      const results = await Promise.all(promises)
      setAllClubs(results[0].data)
      if (user) setMisClubIds(results[1].data.map(c => c.id))
    } catch {}
    setLoadingClubes(false)
  }

  async function loadEventos() {
    setLoadingEventos(true)
    setErrorEventos('')
    try {
      const [publicRes, mineRes] = await Promise.all([
        getPublicEvents(),
        user ? getMyClubsEvents().catch(() => ({ data: [] })) : Promise.resolve({ data: [] })
      ])
      setEventos(publicRes.data)
      setMisEventos(mineRes.data)
    } catch (err) {
      setErrorEventos(err?.response?.data?.error || 'Error al cargar eventos')
    }
    setLoadingEventos(false)
  }

  useEffect(() => {
    if (tab !== 'miembros') return
    if (queryMiembros.length < 2) { setMiembros([]); return }
    const t = setTimeout(async () => {
      setLoadingMiembros(true)
      try {
        const { data } = await searchUsers(queryMiembros)
        setMiembros(data)
      } catch {}
      setLoadingMiembros(false)
    }, 350)
    return () => clearTimeout(t)
  }, [queryMiembros, tab])

  useEffect(() => {
    if (tab !== 'moto') return
    if (queryMoto.length < 2) { setMotoResults([]); return }
    const t = setTimeout(async () => {
      setLoadingMoto(true)
      try {
        const { data } = await searchByMoto(queryMoto)
        setMotoResults(data)
      } catch {}
      setLoadingMoto(false)
    }, 350)
    return () => clearTimeout(t)
  }, [queryMoto, tab])

  return (
    <div className="page">
      <div className="tabs">
        <button className={tab === 'eventos' ? 'tab active' : 'tab'} onClick={() => setTab('eventos')}>Eventos</button>
        <button className={tab === 'clubes' ? 'tab active' : 'tab'} onClick={() => setTab('clubes')}>Clubes</button>
        <button className={tab === 'miembros' ? 'tab active' : 'tab'} onClick={() => setTab('miembros')}>Usuarios</button>
        <button className={tab === 'moto' ? 'tab active' : 'tab'} onClick={() => setTab('moto')}>Por moto</button>
      </div>

      {tab === 'clubes' && (() => {
        const provinciasConClubes = Object.entries(
          allClubs.reduce((acc, c) => {
            const key = c.provincia || ''
            if (key) acc[key] = (acc[key] || 0) + 1
            return acc
          }, {})
        ).sort((a, b) => b[1] - a[1])

        const clubsFiltrados = provincia
          ? allClubs.filter(c => c.provincia === provincia)
          : allClubs

        return (
          <>
            {provinciasConClubes.length > 0 && (
              <div className="filter-row">
                <button className={!provincia ? 'filter-pill on' : 'filter-pill'} onClick={() => setProvincia('')}>Todos ({allClubs.length})</button>
                {provinciasConClubes.map(([p, count]) => (
                  <button key={p} className={provincia === p ? 'filter-pill on' : 'filter-pill'} onClick={() => setProvincia(p)}>
                    {p} ({count})
                  </button>
                ))}
              </div>
            )}
            {loadingClubes ? <div className="loading">Cargando...</div> : (
              clubsFiltrados.length === 0
                ? <p className="empty">No hay clubes todavía</p>
                : clubsFiltrados.map(c => (
                    <ClubCard key={c.id} club={c} isMember={misClubIds.includes(c.id)} onJoin={loadClubes} />
                  ))
            )}
          </>
        )
      })()}

      {tab === 'miembros' && (
        <>
          <input
            className="input"
            style={{ marginBottom: '1rem' }}
            placeholder="Buscar por nombre de usuario..."
            value={queryMiembros}
            onChange={e => setQueryMiembros(e.target.value)}
            autoFocus
          />
          {loadingMiembros && <div className="loading">Buscando...</div>}
          {!loadingMiembros && queryMiembros.length >= 2 && miembros.length === 0 && (
            <p className="empty">No se encontraron usuarios</p>
          )}
          {miembros.map(u => <UserCard key={u.id} user={u} />)}
        </>
      )}

      {tab === 'moto' && (
        <>
          <input
            className="input"
            style={{ marginBottom: '1rem' }}
            placeholder="Buscar por marca, modelo o apodo de moto..."
            value={queryMoto}
            onChange={e => setQueryMoto(e.target.value)}
            autoFocus
          />
          {loadingMoto && <div className="loading">Buscando...</div>}
          {!loadingMoto && queryMoto.length >= 2 && motoResults.length === 0 && (
            <p className="empty">No se encontraron motos</p>
          )}
          {motoResults.map(u => <UserCard key={u.id} user={u} />)}
        </>
      )}

      {tab === 'eventos' && (
        <>
          {loadingEventos && <div className="loading">Cargando...</div>}
          {errorEventos && <p className="error" style={{ textAlign: 'center', padding: '1rem' }}>{errorEventos}</p>}
          {!loadingEventos && !errorEventos && (() => {
            const misIds = new Set(misEventos.map(e => e.id))
            const publicosSinRepetir = eventos.filter(e => !misIds.has(e.id))
            const hayAlgo = misEventos.length > 0 || publicosSinRepetir.length > 0
            if (!hayAlgo) return <p className="empty">No hay eventos</p>
            return (
              <>
                {user && misEventos.length > 0 && (
                  <>
                    <p style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text2)', margin: '0.5rem 0 0.4rem' }}>Eventos de tus clubes</p>
                    {misEventos.map(ev => <PublicEventCard key={ev.id} event={ev} onUpdate={loadEventos} />)}
                  </>
                )}
                {publicosSinRepetir.length > 0 && (
                  <>
                    <p style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text2)', margin: '0.8rem 0 0.4rem' }}>Eventos públicos</p>
                    {publicosSinRepetir.map(ev => <PublicEventCard key={ev.id} event={ev} onUpdate={loadEventos} />)}
                  </>
                )}
              </>
            )
          })()}
        </>
      )}
    </div>
  )
}

function UserCard({ user }) {
  const moto = user.motos?.[0]
  return (
    <Link to={`/perfil/${user.id}`} className="user-search-card">
      <div className="avatar-sm">
        {user.avatar_url ? <img src={user.avatar_url} alt="" /> : <span>{user.username?.slice(0,2).toUpperCase()}</span>}
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>{user.username}</p>
        {user.pais && <p style={{ fontSize: '0.78rem', color: 'var(--text3)' }}>{getBandera(user.pais)} {user.pais}</p>}
        {moto && <p style={{ fontSize: '0.78rem', color: 'var(--text2)' }}>🏍 {[moto.apodo, moto.marca, moto.modelo].filter(Boolean).join(' · ')}</p>}
      </div>
      {moto?.foto_url && (
        <div className="avatar-sm">
          <img src={moto.foto_url} alt="" />
        </div>
      )}
    </Link>
  )
}

function PublicEventCard({ event: ev, onUpdate }) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)

  async function handleToggle(e) {
    e.preventDefault()
    if (!user) return
    setLoading(true)
    try {
      if (ev.yo_participo) {
        await leaveEvent(ev.club_id, ev.id)
      } else {
        await joinEvent(ev.club_id, ev.id)
      }
      await onUpdate()
    } catch {}
    setLoading(false)
  }

  const diasRestantes = (() => {
    const hoy = new Date(); hoy.setHours(0,0,0,0)
    const fecha = new Date(ev.fecha_salida); fecha.setHours(0,0,0,0)
    return Math.ceil((fecha - hoy) / (1000 * 60 * 60 * 24))
  })()
  const etiquetaDias = diasRestantes === 0 ? '¡Es hoy!' : diasRestantes === 1 ? 'Es mañana' : `En ${diasRestantes} días`
  const estClass = diasRestantes === 0 ? 'es-hoy' : diasRestantes <= 3 ? 'es-pronto' : 'es-futuro'
  const cardClass = diasRestantes === 0 ? ' ev-hoy' : ''

  return (
    <div className={`event-card${cardClass}`}>
      <Link to={`/club/${ev.club?.id}`} style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>
        <div className="pub-event-header">
          <div className="pub-event-info">
            <h3>{ev.titulo}</h3>
            <p className="event-date">
              {new Date(ev.fecha_salida).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
              {' · '}<span className={`event-estado ${estClass}`}>{etiquetaDias}</span>
            </p>
          </div>
          {ev.club && (
            <div className="pub-event-club">
              <div className="club-escudo" style={{ width: 30, height: 30, fontSize: '9px' }}>
                {ev.club.escudo_url ? <img src={ev.club.escudo_url} alt="" /> : <span>{ev.club.nombre?.slice(0,2).toUpperCase()}</span>}
              </div>
              <span className="pub-event-club-name">{ev.club.nombre}</span>
            </div>
          )}
        </div>
        {ev.punto_encuentro && <p className="pub-event-meta">📍 {ev.punto_encuentro}{ev.destino ? ` → ${ev.destino}` : ''}</p>}
      </Link>
      <div className="pub-event-footer">
        <span className="pub-event-anotados">👥 {ev.participantes_count || 0} anotados</span>
        {user && (
          <button
            className={ev.yo_participo ? 'btn-secondary' : 'btn-primary-sm'}
            onClick={handleToggle}
            disabled={loading}
          >
            {ev.yo_participo ? 'No participar' : 'Anotarse'}
          </button>
        )}
      </div>
    </div>
  )
}
