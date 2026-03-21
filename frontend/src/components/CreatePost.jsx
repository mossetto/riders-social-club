import { useState } from 'react'
import { createPost } from '../api/posts'
import { useAuth } from '../context/AuthContext'

export default function CreatePost({ onCreated, clubId }) {
  const { user } = useAuth()
  const [text, setText] = useState('')
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)

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
      await createPost(fd)
      setText('')
      setFile(null)
      onCreated?.()
    } catch {}
    setLoading(false)
  }

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
        <button type="submit" disabled={loading} className="btn-primary-sm">
          {loading ? '...' : 'Publicar'}
        </button>
      </div>
    </form>
  )
}
