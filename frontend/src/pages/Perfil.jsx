import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { getProfile, updateProfile, addMoto } from '../api/users'
import { leaveClub } from '../api/clubs'
import { useAuth } from '../context/AuthContext'

function ImageField({ label, fieldName, currentUrl }) {
  const [mode, setMode] = useState('idle') // 'idle' | 'replace'
  const [clear, setClear] = useState(false)
  const hasImage = currentUrl && !clear

  if (hasImage && mode !== 'replace') {
    return (
      <div className="image-field">
        <span className="image-field-label">{label}</span>
        <div className="image-field-preview">
          <img src={currentUrl} alt="" />
        </div>
        <div className="image-field-actions">
          <button type="button" className="btn-secondary" style={{ fontSize: '0.8rem' }} onClick={() => setMode('replace')}>Reemplazar imagen</button>
          <button type="button" className="btn-link" style={{ fontSize: '0.8rem', color: 'var(--danger)' }} onClick={() => setClear(true)}>Eliminar imagen</button>
        </div>
        {clear && <input type="hidden" name={`${fieldName}_clear`} value="true" />}
      </div>
    )
  }

  return (
    <div className="image-field">
      <span className="image-field-label">{label}</span>
      {clear && <input type="hidden" name={`${fieldName}_clear`} value="true" />}
      <input type="file" name={fieldName} accept="image/*" />
      {(hasImage || clear) && (
        <button type="button" className="btn-link" style={{ fontSize: '0.8rem' }} onClick={() => { setMode('idle'); setClear(false) }}>Cancelar</button>
      )}
    </div>
  )
}

const VIS_OPTIONS = [
  { value: 'publico', label: 'Público' },
  { value: 'miembros', label: 'Solo miembros de mis clubes' },
  { value: 'oculto', label: 'Oculto' },
]

export default function Perfil() {
  const { id } = useParams()
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [activeForm, setActiveForm] = useState(null) // 'perfil' | 'moto' | null
  const [wspVis, setWspVis] = useState('publico')
  const [tgVis, setTgVis] = useState('publico')
  const [confirmLeave, setConfirmLeave] = useState(null) // club id
  const isMe = user?.id === Number(id)

  useEffect(() => { load() }, [id])

  async function load() {
    try {
      const { data } = await getProfile(id)
      setProfile(data)
      setWspVis(data.whatsapp_visibility || 'publico')
      setTgVis(data.telegram_visibility || 'publico')
    } catch {}
  }

  function toggleForm(form) {
    setActiveForm(prev => prev === form ? null : form)
  }

  async function handleSaveProfile(e) {
    e.preventDefault()
    const fd = new FormData(e.target)
    fd.set('whatsapp_visibility', wspVis)
    fd.set('telegram_visibility', tgVis)
    await updateProfile(fd)
    setActiveForm(null)
    load()
  }

  async function handleSaveMoto(e) {
    e.preventDefault()
    const fd = new FormData(e.target)
    await addMoto(fd)
    setActiveForm(null)
    load()
  }

  async function handleLeaveClub(clubId) {
    try {
      await leaveClub(clubId)
      setConfirmLeave(null)
      load()
    } catch (err) {
      alert(err?.response?.data?.error || 'Error al salir del club')
    }
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
            <p className="perfil-moto-txt">🏍 {profile.motos[0].apodo} · {[profile.motos[0].marca, profile.motos[0].modelo].filter(Boolean).join(' ')}</p>
          )}
          {profile.whatsapp && <p className="perfil-contacto">WhatsApp: {profile.whatsapp}</p>}
          {profile.telegram && <p className="perfil-contacto">Telegram: {profile.telegram}</p>}
        </div>

        {isMe && (
          <div className="perfil-actions">
            <button className={`btn-secondary${activeForm === 'perfil' ? ' active' : ''}`} onClick={() => toggleForm('perfil')}>Editar perfil</button>
            <button className={`btn-secondary${activeForm === 'moto' ? ' active' : ''}`} onClick={() => toggleForm('moto')}>
              {profile.motos?.[0] ? 'Editar moto' : 'Agregar moto'}
            </button>
            <button className="btn-secondary" onClick={() => navigate('/crear-club')}>Crear club</button>
            <button className="btn-danger" onClick={logout}>Cerrar sesión</button>
          </div>
        )}
      </div>

      {activeForm === 'perfil' && isMe && (
        <form className="edit-form" onSubmit={handleSaveProfile} encType="multipart/form-data">
          <h3>Editar perfil</h3>
          <input name="username" defaultValue={profile.username} placeholder="Nombre visible" />
          <textarea name="bio" defaultValue={profile.bio} placeholder="Presentación o tu slogan (Opcional)" rows={3} />

          <input name="whatsapp" defaultValue={profile.whatsapp} placeholder="WhatsApp (Opcional)" />
          <div className="vis-group">
            {VIS_OPTIONS.map(o => (
              <label key={o.value} className="vis-option">
                <input type="radio" name="whatsapp_visibility" value={o.value} checked={wspVis === o.value} onChange={() => setWspVis(o.value)} />
                {o.label}
              </label>
            ))}
          </div>

          <input name="telegram" defaultValue={profile.telegram} placeholder="Telegram (Opcional)" />
          <div className="vis-group">
            {VIS_OPTIONS.map(o => (
              <label key={o.value} className="vis-option">
                <input type="radio" name="telegram_visibility" value={o.value} checked={tgVis === o.value} onChange={() => setTgVis(o.value)} />
                {o.label}
              </label>
            ))}
          </div>

          <ImageField label="Foto de perfil (Opcional)" fieldName="avatar" currentUrl={profile.avatar_url} />
          <button type="submit" className="btn-primary">Guardar</button>
        </form>
      )}

      {activeForm === 'moto' && isMe && (
        <form className="edit-form" onSubmit={handleSaveMoto} encType="multipart/form-data">
          <h3>{profile.motos?.[0] ? 'Editar moto' : 'Agregar moto'}</h3>
          <input name="apodo" defaultValue={profile.motos?.[0]?.apodo} placeholder="Apodo de la moto" />
          <input name="marca" defaultValue={profile.motos?.[0]?.marca} placeholder="Marca (ej: Honda)" />
          <input name="modelo" defaultValue={profile.motos?.[0]?.modelo} placeholder="Modelo (ej: CB 500F)" />
          <ImageField label="Foto de moto (Opcional)" fieldName="foto" currentUrl={profile.motos?.[0]?.foto_url} />
          <button type="submit" className="btn-primary">Guardar</button>
        </form>
      )}

      {profile.clubes?.length > 0 && (
        <div className="perfil-clubes">
          <h3>Clubes</h3>
          {profile.clubes.map(c => (
            <div key={c.id} className="perfil-club-row">
              <Link to={`/club/${c.id}`} className="club-chip">{c.nombre} · {c.rol}</Link>
              {isMe && c.rol !== 'fundador' && (
                confirmLeave === c.id ? (
                  <span className="leave-confirm">
                    ¿Confirmar?
                    <button className="btn-danger" style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }} onClick={() => handleLeaveClub(c.id)}>Sí, salir</button>
                    <button className="btn-secondary" style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }} onClick={() => setConfirmLeave(null)}>Cancelar</button>
                  </span>
                ) : (
                  <button className="btn-link" style={{ fontSize: '0.75rem', color: 'var(--danger)' }} onClick={() => setConfirmLeave(c.id)}>Salir del club</button>
                )
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
