import { useState, useEffect, useRef } from 'react'
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom'
import { getClub, joinClub, getClubEvents, getRoutes, createEvent, addRoute, updateRoute, deleteRoute, joinEvent, leaveEvent, getEventParticipants, updateEvent, deleteEvent, updateMember, getClubPosts, getNearbyMembers, updateMyLocation } from '../api/clubs'
import { useAuth } from '../context/AuthContext'
import { getBandera } from '../components/PaisSelector'
import PostCard, { LikesComments } from '../components/PostCard'
import CreatePost from '../components/CreatePost'
import { deletePost } from '../api/posts'

function estadoEvento(fecha) {
  const ahora = new Date()
  const ev = new Date(fecha)
  const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate())
  const diaEv = new Date(ev.getFullYear(), ev.getMonth(), ev.getDate())
  const diff = Math.round((diaEv - hoy) / (1000 * 60 * 60 * 24))
  if (diff < 0) return { label: 'Concluido', color: 'var(--text2)' }
  if (diff === 0) return { label: '¡Es hoy!', color: '#4caf50' }
  if (diff === 1) return { label: 'Es mañana', color: '#4caf50' }
  return { label: `En ${diff} días`, color: '#4caf50' }
}

function canDo(config, myRole) {
  if (!myRole) return false
  if (config === 'cualquiera') return true
  if (config === 'fundador') return myRole === 'fundador'
  if (config === 'colaboradores') return ['fundador', 'organizador', 'colaborador'].includes(myRole)
  return false
}

export default function Club() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [club, setClub] = useState(null)
  const [posts, setPosts] = useState([])
  const [events, setEvents] = useState([])
  const [routes, setRoutes] = useState([])
  const [tab, setTab] = useState(searchParams.get('tab') || 'feed')
  const [joined, setJoined] = useState(false)
  const highlightId = searchParams.get('highlight')
  const didScrollRef = useRef(false)

  // Crear evento
  const [showEventForm, setShowEventForm] = useState(false)
  const [eventForm, setEventForm] = useState({ titulo: '', descripcion: '', fecha_salida: '', punto_encuentro: '', destino: '', ruta_id: '', es_publico: false })
  const [savingEvent, setSavingEvent] = useState(false)

  // Editar evento
  const [editingEvent, setEditingEvent] = useState(null)
  const [editEventForm, setEditEventForm] = useState({})
  const [editEventPublico, setEditEventPublico] = useState(false)

  // Participantes
  const [expandedParticipants, setExpandedParticipants] = useState(null)
  const [participantsList, setParticipantsList] = useState([])

  // Agregar ruta
  const [showRouteModal, setShowRouteModal] = useState(false)
  const [routeForm, setRouteForm] = useState({ nombre: '', descripcion: '', maps_url: '' })
  const [savingRoute, setSavingRoute] = useState(false)

  // Editar ruta
  const [editingRoute, setEditingRoute] = useState(null)
  const [editRouteForm, setEditRouteForm] = useState({})

  // Riders cerca
  const [nearbyRiders, setNearbyRiders] = useState([])
  const [nearbyLoading, setNearbyLoading] = useState(false)
  const [nearbyError, setNearbyError] = useState(null)
  const [nearbyLoaded, setNearbyLoaded] = useState(false)

  useEffect(() => { loadAll() }, [id])

  // Sincronizar tab con URL params (cuando se navega desde Ver Detalles)
  useEffect(() => {
    const tabParam = searchParams.get('tab')
    if (tabParam && tabParam !== tab) setTab(tabParam)
  }, [searchParams])

  // Reset scroll flag cuando cambia el highlight
  useEffect(() => { didScrollRef.current = false }, [highlightId])

  useEffect(() => {
    if (!highlightId) return
    const el = document.getElementById(`item-${highlightId}`)
    if (el && !didScrollRef.current) {
      didScrollRef.current = true
      setTimeout(() => {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
        setTimeout(() => {
          setSearchParams(prev => {
            const next = new URLSearchParams(prev)
            next.delete('highlight')
            return next
          }, { replace: true })
        }, 1500)
      }, 150)
    }
  }, [tab, events, routes, highlightId])

  async function loadAll() {
    try {
      const [clubRes, eventsRes, routesRes] = await Promise.all([
        getClub(id), getClubEvents(id), getRoutes(id)
      ])
      setClub(clubRes.data)
      setEvents(eventsRes.data)
      setRoutes(routesRes.data)
      const myMembership = clubRes.data.members?.find(m => Number(m.id) === Number(user?.id))
      setJoined(!!myMembership)
    } catch {}
  }

  async function loadPosts() {
    try {
      const { data } = await getClubPosts(id)
      setPosts(data)
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

  async function handleCreateEvent(e) {
    e.preventDefault()
    setSavingEvent(true)
    try {
      await createEvent(id, { ...eventForm, ruta_id: eventForm.ruta_id || undefined })
      setShowEventForm(false)
      setEventForm({ titulo: '', descripcion: '', fecha_salida: '', punto_encuentro: '', destino: '', ruta_id: '', es_publico: false })
      const res = await getClubEvents(id)
      setEvents(res.data)
    } catch {}
    setSavingEvent(false)
  }

  async function handleAddRoute(e) {
    e.preventDefault()
    setSavingRoute(true)
    try {
      await addRoute(id, routeForm)
      setShowRouteModal(false)
      setRouteForm({ nombre: '', descripcion: '', maps_url: '' })
      const res = await getRoutes(id)
      setRoutes(res.data)
    } catch {}
    setSavingRoute(false)
  }

  async function handleToggleParticipacion(ev) {
    try {
      if (ev.yo_participo) {
        await leaveEvent(id, ev.id)
      } else {
        await joinEvent(id, ev.id)
      }
      const res = await getClubEvents(id)
      setEvents(res.data)
    } catch {}
  }

  async function handleVerParticipantes(eventId) {
    if (expandedParticipants === eventId) {
      setExpandedParticipants(null)
      return
    }
    try {
      const { data } = await getEventParticipants(id, eventId)
      setParticipantsList(data)
      setExpandedParticipants(eventId)
    } catch {}
  }

  async function handleSaveEditEvent(e) {
    e.preventDefault()
    try {
      await updateEvent(id, editingEvent, { ...editEventForm, es_publico: editEventPublico })
      setEditingEvent(null)
      const res = await getClubEvents(id)
      setEvents(res.data)
    } catch {}
  }

  async function handleDeleteEvent(eventId) {
    if (!window.confirm('¿Eliminar esta salida?')) return
    try {
      await deleteEvent(id, eventId)
      setEvents(ev => ev.filter(e => e.id !== eventId))
    } catch {}
  }

  async function handleSaveEditRoute(e) {
    e.preventDefault()
    try {
      await updateRoute(id, editingRoute, editRouteForm)
      setEditingRoute(null)
      const res = await getRoutes(id)
      setRoutes(res.data)
    } catch {}
  }

  async function handleDeleteRoute(routeId) {
    if (!window.confirm('¿Eliminar esta ruta?')) return
    try {
      await deleteRoute(id, routeId)
      setRoutes(r => r.filter(rt => rt.id !== routeId))
    } catch {}
  }

  async function handleChangeRol(userId, rol) {
    try {
      await updateMember(id, userId, { rol })
      loadAll()
    } catch {}
  }

  async function handleAceptarMiembro(userId) {
    try {
      await updateMember(id, userId, { estado: 'activo' })
      loadAll()
    } catch {}
  }

  async function loadNearbyRiders() {
    if (!navigator.geolocation) {
      setNearbyError('Tu navegador no soporta geolocalización')
      return
    }
    setNearbyLoading(true)
    setNearbyError(null)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude: lat, longitude: lng } = pos.coords
          await updateMyLocation(lat, lng)
          const { data } = await getNearbyMembers(id, lat, lng, 50)
          setNearbyRiders(data)
          setNearbyLoaded(true)
        } catch {
          setNearbyError('Error al buscar riders cercanos')
        }
        setNearbyLoading(false)
      },
      (err) => {
        const msgs = {
          1: 'Permiso de ubicación denegado. Habilitalo en la config del navegador.',
          2: 'No se pudo obtener tu ubicación. Asegurate de tener el GPS activado.',
          3: 'Se agotó el tiempo buscando tu ubicación. Intentá de nuevo.'
        }
        setNearbyError(msgs[err.code] || 'Error de geolocalización')
        setNearbyLoading(false)
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 }
    )
  }

  if (!club) return <div className="loading">Cargando...</div>

  const myRole = club.members?.find(m => Number(m.id) === Number(user?.id))?.rol
  const canPost = !!myRole
  const canCreateEvent = canDo(club.config_salidas || 'cualquiera', myRole)
  const canAddRoute = canDo(club.config_rutas || 'cualquiera', myRole)
  const canManageRoles = canDo(club.config_roles || 'fundador', myRole)
  const canManageIngreso = canDo(club.config_ingreso || 'fundador', myRole)
  const isFundador = myRole === 'fundador'

  return (
    <div className="page">
      <div className="club-header-card">
        {club.portada_url && (
          <div className="club-portada-inner">
            <img src={club.portada_url} alt="portada" />
          </div>
        )}
        <div className="club-header-body">
          <div className="club-header-top">
            <div className="club-escudo-lg">
              {club.escudo_url ? <img src={club.escudo_url} alt={club.nombre} /> : <span>{club.nombre.slice(0,2).toUpperCase()}</span>}
            </div>
            <div className="club-header-info">
              <h1 className="club-header-nombre">{club.nombre}</h1>
              <p className="club-meta">
                {club.miembros} miembros
                {club.provincia && ` · ${club.provincia}`}
                {club.pais && ` · ${getBandera(club.pais)} ${club.pais}`}
                {` · ${club.tipo}`}
              </p>
            </div>
            <div className="club-header-actions">
              {myRole && <span className="role-badge">{myRole}</span>}
              {isFundador && (
                <button className="btn-secondary" style={{ fontSize: '0.75rem', padding: '0.25rem 0.55rem', whiteSpace: 'nowrap' }} onClick={() => navigate(`/club/${id}/configurar`)}>
                  Configurar club
                </button>
              )}
              {!myRole && user && (
                <button className="btn-primary-sm" onClick={handleJoin}>
                  {club.tipo === 'privado' ? 'Solicitar unirse' : 'Unirse'}
                </button>
              )}
            </div>
          </div>
          {club.slogan && <p className="club-header-desc">{club.slogan}</p>}
        </div>
      </div>

      <div className="tabs">
        <button className={tab === 'feed' ? 'tab active' : 'tab'} onClick={() => setTab('feed')}>Feed</button>
        <button className={tab === 'eventos' ? 'tab active' : 'tab'} onClick={() => setTab('eventos')}>
          Salidas {events.filter(e => estadoEvento(e.fecha_salida).label !== 'Concluido').length > 0 && <span className="tab-badge">{events.filter(e => estadoEvento(e.fecha_salida).label !== 'Concluido').length}</span>}
        </button>
        <button className={tab === 'rutas' ? 'tab active' : 'tab'} onClick={() => setTab('rutas')}>
          Rutas {routes.length > 0 && <span className="tab-badge">{routes.length}</span>}
        </button>
        <button className={tab === 'miembros' ? 'tab active' : 'tab'} onClick={() => setTab('miembros')}>
          Miembros {club.members?.length > 0 && <span className="tab-badge">{club.members.length}</span>}
        </button>
      </div>

      {tab === 'feed' && (
        <div>
          {!myRole && club.tipo === 'privado'
            ? <p className="empty">Este club es privado. Solicitá ingreso para ver las publicaciones.</p>
            : <>
                {canPost && <CreatePost onCreated={loadPosts} clubId={id} events={events} routes={routes} />}
                {posts.length === 0
                  ? <p className="empty">No hay publicaciones aún.</p>
                  : posts.map(p => <PostCard key={p.id} post={p} showRol hideClubIcon onDelete={async (pid) => { await deletePost(pid); loadPosts() }} />)}
              </>
          }
        </div>
      )}

      {tab === 'eventos' && (
        <div className={editingEvent ? 'edit-focus-container' : ''}>
          {canCreateEvent && !showEventForm && (
            <div style={{ marginBottom: '1rem' }}>
              <button className="btn-primary" onClick={() => setShowEventForm(true)}>+ Crear salida</button>
            </div>
          )}

          {showEventForm && (
            <form className="form-card" onSubmit={handleCreateEvent}>
              <h3 style={{ marginBottom: '0.5rem' }}>Nueva salida</h3>
              <input className="input" placeholder="Título *" value={eventForm.titulo} onChange={e => setEventForm(f => ({ ...f, titulo: e.target.value }))} required />
              <label className="input-label">Fecha y hora *</label>
              <input className="input" type="datetime-local" value={eventForm.fecha_salida} onChange={e => setEventForm(f => ({ ...f, fecha_salida: e.target.value }))} required />
              <textarea className="input" placeholder="Descripción (opcional)" rows={3} value={eventForm.descripcion} onChange={e => setEventForm(f => ({ ...f, descripcion: e.target.value }))} />
              <input className="input" placeholder="Punto de encuentro (opcional)" value={eventForm.punto_encuentro} onChange={e => setEventForm(f => ({ ...f, punto_encuentro: e.target.value }))} />
              <input className="input" placeholder="Destino (opcional)" value={eventForm.destino} onChange={e => setEventForm(f => ({ ...f, destino: e.target.value }))} />
              {routes.length > 0 && (
                <>
                  <label className="input-label">Ruta del club (opcional)</label>
                  <select className="input" value={eventForm.ruta_id} onChange={e => setEventForm(f => ({ ...f, ruta_id: e.target.value }))}>
                    <option value="">Sin ruta</option>
                    {routes.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                  </select>
                </>
              )}
              <label className="vis-option" style={{ marginTop: '0.25rem' }}>
                <input type="checkbox" checked={eventForm.es_publico} onChange={e => setEventForm(f => ({ ...f, es_publico: e.target.checked }))} />
                Evento público (visible en el explorador de eventos)
              </label>
              <div className="form-actions">
                <button type="submit" className="btn-primary" disabled={savingEvent}>{savingEvent ? 'Guardando...' : 'Crear salida'}</button>
                <button type="button" className="btn-secondary" onClick={() => setShowEventForm(false)}>Cancelar</button>
              </div>
            </form>
          )}

          {events.length === 0 ? <p className="empty">No hay salidas programadas</p> : events.map(ev => {
            const est = estadoEvento(ev.fecha_salida)
            const estClass = est.label === 'Concluido' ? 'es-pasado' : est.label === '¡Es hoy!' ? 'es-hoy' : est.label === 'Es mañana' ? 'es-pronto' : 'es-futuro'
            const cardClass = est.label === 'Concluido' ? ' ev-concluido' : est.label === '¡Es hoy!' ? ' ev-hoy' : ''
            return (
            <div key={ev.id} id={`item-${ev.id}`} className={`event-card${cardClass}${highlightId === String(ev.id) ? ' highlight-item' : ''}${editingEvent === ev.id ? ' editing-active' : ''}`}>
              {editingEvent === ev.id ? (
                <form onSubmit={handleSaveEditEvent} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <input className="input" value={editEventForm.titulo} onChange={e => setEditEventForm(f => ({ ...f, titulo: e.target.value }))} required />
                  <input className="input" type="datetime-local" value={editEventForm.fecha_salida} onChange={e => setEditEventForm(f => ({ ...f, fecha_salida: e.target.value }))} required />
                  <textarea className="input" rows={2} value={editEventForm.descripcion || ''} onChange={e => setEditEventForm(f => ({ ...f, descripcion: e.target.value }))} />
                  <input className="input" placeholder="Punto de encuentro" value={editEventForm.punto_encuentro || ''} onChange={e => setEditEventForm(f => ({ ...f, punto_encuentro: e.target.value }))} />
                  <input className="input" placeholder="Destino" value={editEventForm.destino || ''} onChange={e => setEditEventForm(f => ({ ...f, destino: e.target.value }))} />
                  <label className="vis-option">
                    <input type="checkbox" checked={editEventPublico} onChange={e => setEditEventPublico(e.target.checked)} />
                    Evento público (visible en el explorador)
                  </label>
                  <div className="form-actions">
                    <button type="submit" className="btn-primary">Guardar</button>
                    <button type="button" className="btn-secondary" onClick={() => setEditingEvent(null)}>Cancelar</button>
                    <button type="button" className="btn-danger" onClick={() => handleDeleteEvent(ev.id)}>Eliminar</button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="event-card-top">
                    <div>
                      <div className="event-titulo-row">
                        <h3>{ev.titulo}</h3>
                      </div>
                      <p className="event-date">
                        {new Date(ev.fecha_salida).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <span className={`event-estado ${estClass}`}>{est.label}</span>
                    {canCreateEvent && (
                      <button className="btn-icon" onClick={() => {
                        setEditingEvent(ev.id)
                        const d = new Date(ev.fecha_salida)
                        const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
                        setEditEventForm({ titulo: ev.titulo, descripcion: ev.descripcion || '', fecha_salida: local, punto_encuentro: ev.punto_encuentro || '', destino: ev.destino || '' })
                        setEditEventPublico(!!ev.es_publico)
                        setTimeout(() => {
                          const el = document.getElementById(`item-${ev.id}`)
                          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
                        }, 50)
                      }}>✏️</button>
                    )}
                  </div>
                  {ev.punto_encuentro && <p className="event-location">📍 {ev.punto_encuentro}{ev.destino ? ` → ${ev.destino}` : ''}</p>}
                  {ev.descripcion && <p className="event-desc">{ev.descripcion}</p>}

                  <div className="event-actions">
                    {user && (
                      <button
                        className={ev.yo_participo ? 'btn-secondary' : 'btn-primary-sm'}
                        onClick={() => handleToggleParticipacion(ev)}
                      >
                        {ev.yo_participo ? 'No participar' : 'Anotarse'}
                      </button>
                    )}
                    <button className="btn-link" style={{ fontSize: '0.78rem' }} onClick={() => handleVerParticipantes(ev.id)}>
                      Ver participantes ({ev.participantes_count || 0})
                    </button>
                    {ev.ruta && <a href={ev.ruta.maps_url} target="_blank" rel="noopener noreferrer" className="map-link">🗺️ Ver ruta: {ev.ruta.nombre}</a>}
                    {!ev.ruta && ev.ruta_url && <a href={ev.ruta_url} target="_blank" rel="noopener noreferrer" className="map-link">🗺️ Ver ruta en Google Maps</a>}
                  </div>

                  <div className="event-footer">
                    <div className="event-footer-left">
                      <LikesComments postId={ev.post_id} likes={ev.likes} comentarios={ev.comentarios} />
                    </div>
                    {ev.creador && (
                      <div className="route-autor">
                        <span className="route-autor-name">Compartida por:</span>
                        <div className="avatar-sm" style={{ width: 22, height: 22, fontSize: '8px' }}>
                          {ev.creador.avatar_url ? <img src={ev.creador.avatar_url} alt="" /> : <span>{ev.creador.username?.slice(0,2).toUpperCase()}</span>}
                        </div>
                        <span className="route-autor-name">{ev.creador.username}</span>
                      </div>
                    )}
                  </div>

                  {expandedParticipants === ev.id && (
                    <div className="event-participants">
                      {participantsList.length === 0
                        ? <p style={{ fontSize: '0.82rem', color: 'var(--text3)' }}>Nadie anotado aún</p>
                        : participantsList.map(p => (
                          <Link key={p.id} to={`/perfil/${p.id}`} className="participant-row">
                            <div className="avatar-sm">
                              {p.avatar_url ? <img src={p.avatar_url} alt="" /> : <span>{p.username?.slice(0,2).toUpperCase()}</span>}
                            </div>
                            <span style={{ fontSize: '0.85rem' }}>{p.username}</span>
                            {p.moto?.modelo && <span style={{ fontSize: '0.78rem', color: 'var(--text3)' }}>{[p.moto.marca, p.moto.modelo].filter(Boolean).join(' ')}</span>}
                          </Link>
                        ))
                      }
                    </div>
                  )}
                </>
              )}
            </div>
          )})}
        </div>
      )}

      {tab === 'rutas' && (
        <div className={editingRoute ? 'edit-focus-container' : ''}>
          {canAddRoute && (
            <div style={{ marginBottom: '1rem' }}>
              <button className="btn-primary" onClick={() => setShowRouteModal(true)}>+ Agregar ruta</button>
            </div>
          )}

          {showRouteModal && (
            <div className="modal-overlay" onClick={() => setShowRouteModal(false)}>
              <div className="modal-card" onClick={e => e.stopPropagation()}>
                <h3 style={{ marginBottom: '1rem' }}>Agregar ruta</h3>
                <form onSubmit={handleAddRoute}>
                  <input className="input" placeholder="Nombre de la ruta *" value={routeForm.nombre} onChange={e => setRouteForm(f => ({ ...f, nombre: e.target.value }))} required />
                  <textarea className="input" style={{ marginTop: '0.5rem' }} placeholder="Descripción (opcional)" rows={2} value={routeForm.descripcion} onChange={e => setRouteForm(f => ({ ...f, descripcion: e.target.value }))} />
                  <textarea className="input" style={{ marginTop: '0.5rem' }} placeholder="Pegá acá el link de una ruta de Google Maps *" rows={3} value={routeForm.maps_url} onChange={e => setRouteForm(f => ({ ...f, maps_url: e.target.value }))} required />
                  <div className="form-actions" style={{ marginTop: '0.5rem' }}>
                    <button type="submit" className="btn-primary" disabled={savingRoute}>{savingRoute ? 'Guardando...' : 'Agregar'}</button>
                    <button type="button" className="btn-secondary" onClick={() => setShowRouteModal(false)}>Cancelar</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {routes.length === 0 ? <p className="empty">No hay rutas guardadas</p> : routes.map(r => (
            <div key={r.id} id={`item-${r.id}`} className={`route-card${highlightId === String(r.id) ? ' highlight-item' : ''}${editingRoute === r.id ? ' editing-active' : ''}`}>
              {editingRoute === r.id ? (
                <form onSubmit={handleSaveEditRoute} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <input className="input" value={editRouteForm.nombre} onChange={e => setEditRouteForm(f => ({ ...f, nombre: e.target.value }))} required />
                  <textarea className="input" rows={2} placeholder="Descripción" value={editRouteForm.descripcion || ''} onChange={e => setEditRouteForm(f => ({ ...f, descripcion: e.target.value }))} />
                  <textarea className="input" rows={2} placeholder="URL de Google Maps" value={editRouteForm.maps_url || ''} onChange={e => setEditRouteForm(f => ({ ...f, maps_url: e.target.value }))} />
                  <div className="form-actions">
                    <button type="submit" className="btn-primary">Guardar</button>
                    <button type="button" className="btn-secondary" onClick={() => setEditingRoute(null)}>Cancelar</button>
                    <button type="button" className="btn-danger" onClick={() => handleDeleteRoute(r.id)}>Eliminar</button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="route-header">
                    <h3>{r.nombre}</h3>
                    {(canAddRoute || r.agregada_por?.id === user?.id) && (
                      <button className="btn-icon" onClick={() => {
                        setEditingRoute(r.id)
                        setEditRouteForm({ nombre: r.nombre, descripcion: r.descripcion || '', maps_url: r.maps_url || '' })
                        setTimeout(() => {
                          const el = document.getElementById(`item-${r.id}`)
                          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
                        }, 50)
                      }}>✏️</button>
                    )}
                  </div>
                  {r.descripcion && <p className="route-desc">{r.descripcion}</p>}
                  {r.maps_url && <a href={r.maps_url} target="_blank" rel="noopener noreferrer" className="map-link">🗺️ Ver en Google Maps</a>}
                  <div className="route-footer">
                    <div className="route-footer-left">
                      <LikesComments postId={r.post_id} likes={r.likes} comentarios={r.comentarios} />
                    </div>
                    {r.agregada_por && (
                      <div className="route-autor">
                        <span className="route-autor-name">Compartida por:</span>
                        <div className="avatar-sm" style={{ width: 22, height: 22, fontSize: '8px' }}>
                          {r.agregada_por.avatar_url ? <img src={r.agregada_por.avatar_url} alt="" /> : <span>{r.agregada_por.username?.slice(0,2).toUpperCase()}</span>}
                        </div>
                        <span className="route-autor-name">{r.agregada_por.username}</span>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'miembros' && (() => {
        const pendientes = club.pending_members || []
        const ahora = new Date()
        const hace14 = new Date(ahora.getTime() - 14 * 24 * 60 * 60 * 1000)
        const nuevos = club.members?.filter(m => m.joined_at && new Date(m.joined_at) >= hace14) || []
        const nuevosIds = new Set(nuevos.map(m => m.id))
        const regulares = club.members?.filter(m => !nuevosIds.has(m.id)) || []

        const renderMember = (m) => (
          <div key={m.id} className="member-row">
            <Link to={`/perfil/${m.id}`}>
              <div className="avatar-sm">
                {m.avatar_url ? <img src={m.avatar_url} alt="" /> : <span>{m.username?.slice(0,2).toUpperCase()}</span>}
              </div>
            </Link>
            <span className="member-name">{m.username}</span>
            {canManageRoles && m.id !== user?.id ? (
              <select
                className="role-select"
                value={m.rol}
                onChange={e => handleChangeRol(m.id, e.target.value)}
              >
                <option value="miembro">miembro</option>
                <option value="colaborador">colaborador</option>
                <option value="organizador">organizador</option>
                {isFundador && <option value="fundador">fundador</option>}
              </select>
            ) : (
              <span className="role-badge">{m.rol}</span>
            )}
          </div>
        )

        return (
          <div>
            {myRole && (
              <div style={{ marginBottom: '1rem', padding: '0.85rem', background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: nearbyLoaded ? '0.75rem' : 0 }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>📍 Riders de tu club cerca</span>
                  <button
                    className="btn-primary-sm"
                    onClick={loadNearbyRiders}
                    disabled={nearbyLoading}
                  >
                    {nearbyLoading ? 'Buscando...' : nearbyLoaded ? 'Actualizar' : 'Buscar'}
                  </button>
                </div>
                {nearbyError && <p style={{ fontSize: '0.82rem', color: 'var(--danger)', marginTop: '0.5rem' }}>{nearbyError}</p>}
                {nearbyLoaded && nearbyRiders.length === 0 && (
                  <p style={{ fontSize: '0.82rem', color: 'var(--text3)', marginTop: '0.5rem' }}>No hay riders de tu club a menos de 50 km</p>
                )}
                {nearbyRiders.map(r => (
                  <Link key={r.id} to={`/perfil/${r.id}`} className="member-row" style={{ borderBottom: 'none', padding: '0.4rem 0' }}>
                    <div className="avatar-sm">
                      {r.avatar_url ? <img src={r.avatar_url} alt="" /> : <span>{r.username?.slice(0,2).toUpperCase()}</span>}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>{r.username}</span>
                      {(r.marca || r.modelo) && (
                        <span style={{ fontSize: '0.78rem', color: 'var(--text3)', display: 'block' }}>
                          {[r.marca, r.modelo].filter(Boolean).join(' ')}
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: '0.78rem', color: 'var(--purple-mid)', flexShrink: 0 }}>
                      {Math.round(r.distancia_km)} km
                    </span>
                  </Link>
                ))}
              </div>
            )}

            {canManageIngreso && pendientes.length > 0 && (
              <>
                <p className="members-section-label">Solicitudes pendientes</p>
                {pendientes.map(m => (
                  <div key={m.id} className="member-row">
                    <Link to={`/perfil/${m.id}`}>
                      <div className="avatar-sm">
                        {m.avatar_url ? <img src={m.avatar_url} alt="" /> : <span>{m.username?.slice(0,2).toUpperCase()}</span>}
                      </div>
                    </Link>
                    <span className="member-name">{m.username}</span>
                    <button className="btn-primary-sm" onClick={() => handleAceptarMiembro(m.id)}>Aceptar</button>
                  </div>
                ))}
              </>
            )}

            {nuevos.length > 0 && (
              <>
                <p className="members-section-label">Nuevos miembros</p>
                {nuevos.map(renderMember)}
              </>
            )}

            <p className="members-section-label">Miembros</p>
            {regulares.map(renderMember)}
          </div>
        )
      })()}
    </div>
  )
}
