import { useState, useRef, useEffect } from 'react'
import { createPost } from '../api/posts'
import { useAuth } from '../context/AuthContext'

function MentionDropdown({ label, icon, items, nameKey, selected, onSelect, onClear }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  if (!items.length) return null

  return (
    <div className="mention-dropdown" ref={ref}>
      {selected ? (
        <span className="mention-chip">
          {icon} {selected[nameKey]}
          <button type="button" onClick={onClear} className="mention-chip-clear">×</button>
        </span>
      ) : (
        <button type="button" className="btn-icon mention-btn" onClick={() => setOpen(o => !o)}>
          {icon} {label}
        </button>
      )}
      {open && !selected && (
        <div className="mention-list">
          {items.map(item => (
            <button
              key={item.id}
              type="button"
              className="mention-list-item"
              onClick={() => { onSelect(item); setOpen(false) }}
            >
              {item[nameKey]}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function CreatePost({ onCreated, clubId, events = [], routes = [] }) {
  const { user } = useAuth()
  const [text, setText] = useState('')
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [mentionEvent, setMentionEvent] = useState(null)
  const [mentionRoute, setMentionRoute] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!text.trim() && !file) return
    setLoading(true)
    try {
      const fd = new FormData()
      fd.append('contenido', text)
      fd.append('tipo', clubId ? 'club' : 'general')
      if (clubId) fd.append('club_id', clubId)
      if (file) fd.append('imagen', file)
      if (mentionEvent) fd.append('mention_event_id', mentionEvent.id)
      if (mentionRoute) fd.append('mention_route_id', mentionRoute.id)
      await createPost(fd)
      setText('')
      setFile(null)
      setMentionEvent(null)
      setMentionRoute(null)
      onCreated?.()
    } catch {}
    setLoading(false)
  }

  const pendingEvents = events.filter(e => {
    const diff = Math.round((new Date(new Date(e.fecha_salida).setHours(0,0,0,0)) - new Date(new Date().setHours(0,0,0,0))) / 86400000)
    return diff >= 0
  })

  return (
    <form className="create-post" onSubmit={handleSubmit}>
      <div className="create-post-top">
        <div className="avatar-sm">
          {user?.avatar_url ? <img src={user.avatar_url} alt="" /> : <span>{user?.username?.slice(0,2).toUpperCase()}</span>}
        </div>
        <textarea
          placeholder="¿Qué está pasando en la ruta?"
          value={text}
          onChange={e => setText(e.target.value)}
          rows={2}
        />
      </div>
      <div className="create-post-bottom">
        <label className="btn-icon">
          📷
          <input type="file" accept="image/*" hidden onChange={e => setFile(e.target.files[0])} />
        </label>
        {file && <span className="file-name">{file.name}</span>}

        <MentionDropdown
          label="Salida"
          icon="📅"
          items={pendingEvents}
          nameKey="titulo"
          selected={mentionEvent}
          onSelect={setMentionEvent}
          onClear={() => setMentionEvent(null)}
        />
        <MentionDropdown
          label="Ruta"
          icon="🗺️"
          items={routes}
          nameKey="nombre"
          selected={mentionRoute}
          onSelect={setMentionRoute}
          onClear={() => setMentionRoute(null)}
        />

        <button type="submit" disabled={loading} className="btn-primary-sm">
          {loading ? '...' : 'Publicar'}
        </button>
      </div>
    </form>
  )
}
