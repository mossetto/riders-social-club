import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getProfile, updateProfile, addMoto } from '../api/users'
import { useAuth } from '../context/AuthContext'

export default function Perfil() {
  const { id } = useParams()
  const { user, logout } = useAuth()
  const [profile, setProfile] = useState(null)
  const [editing, setEditing] = useState(false)
  const [editingMoto, setEditingMoto] = useState(false)
  const isMe = user?.id === Number(id)

  useEffect(() => { load() }, [id])

  async function load() {
    try {
      const { data } = await getProfile(id)
      setProfile(data)
    } catch {}
  }

  async function handleSaveProfile(e) {
    e.preventDefault()
    const fd = new FormData(e.target)
    await updateProfile(fd)
    setEditing(false)
    load()
  }

  async function handleSaveMoto(e) {
    e.preventDefault()
    const fd = new FormData(e.target)
    await addMoto(fd)
    setEditingMoto(false)
    load()
  }

  if (!profile) return <div className="loading">Cargando...</div>

  return (
    <div className="page">
      <div className="perfil-card">
        <div className="perfil-avatar-wrap">
          <div className="perfil-avatar">
            {profile.avatar_url
              ? <img src={profile.avatar_url} alt={profile.username} />
              : <span>{profile.username?.slice(0,2).toUpperCase()}</span>}
            {profile.motos?.[0] && (
              <div className="perfil-moto-badge">
                {profile.motos[0].foto_url
                  ? <img src={profile.motos[0].foto_url} alt="" />
                  : <span>🏍</span>}
              </div>
            )}
          </div>
        </div>

        <div className="perfil-info">
          <h2>{profile.username}</h2>
          {profile.bio && <p className="perfil-bio">{profile.bio}</p>}
          {profile.motos?.[0] && (
            <p className="perfil-moto-txt">🏍 {profile.motos[0].apodo} · {profile.motos[0].modelo}</p>
          )}
          {profile.whatsapp && <p className="perfil-contacto">WhatsApp: {profile.whatsapp}</p>}
          {profile.telegram && <p className="perfil-contacto">Telegram: {profile.telegram}</p>}
        </div>

        {isMe && (
          <div className="perfil-actions">
            <button className="btn-secondary" onClick={() => setEditing(!editing)}>Editar perfil</button>
            <button className="btn-secondary" onClick={() => setEditingMoto(!editingMoto)}>
              {profile.motos?.[0] ? 'Editar moto' : 'Agregar moto'}
            </button>
            <button className="btn-danger" onClick={logout}>Cerrar sesión</button>
          </div>
        )}
      </div>

      {editing && isMe && (
        <form className="edit-form" onSubmit={handleSaveProfile} encType="multipart/form-data">
          <h3>Editar perfil</h3>
          <input name="username" defaultValue={profile.username} placeholder="Username" />
          <textarea name="bio" defaultValue={profile.bio} placeholder="Bio" rows={3} />
          <input name="whatsapp" defaultValue={profile.whatsapp} placeholder="WhatsApp" />
          <input name="telegram" defaultValue={profile.telegram} placeholder="Telegram" />
          <label className="file-label">Foto de perfil <input type="file" name="avatar" accept="image/*" /></label>
          <button type="submit" className="btn-primary">Guardar</button>
        </form>
      )}

      {editingMoto && isMe && (
        <form className="edit-form" onSubmit={handleSaveMoto} encType="multipart/form-data">
          <h3>{profile.motos?.[0] ? 'Editar moto' : 'Agregar moto'}</h3>
          <input name="apodo" defaultValue={profile.motos?.[0]?.apodo} placeholder="Apodo de la moto" />
          <input name="modelo" defaultValue={profile.motos?.[0]?.modelo} placeholder="Modelo" />
          <label className="file-label">Foto de moto <input type="file" name="foto" accept="image/*" /></label>
          <button type="submit" className="btn-primary">Guardar</button>
        </form>
      )}

      {profile.clubes?.length > 0 && (
        <div className="perfil-clubes">
          <h3>Clubes</h3>
          {profile.clubes.map(c => (
            <Link key={c.id} to={`/club/${c.id}`} className="club-chip">
              {c.nombre} · {c.rol}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
