import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getClub, updateClub } from '../api/clubs'
import PaisSelector from '../components/PaisSelector'

const CONFIG_OPTIONS = [
  { value: 'cualquiera', label: 'Cualquier miembro' },
  { value: 'colaboradores', label: 'Colaboradores y superiores' },
  { value: 'fundador', label: 'Solo el fundador' },
]

function ConfigRadio({ label, name, value, onChange }) {
  return (
    <div className="config-section">
      <p className="input-label" style={{ marginBottom: '0.4rem' }}>{label}</p>
      <div className="vis-group">
        {CONFIG_OPTIONS.map(o => (
          <label key={o.value} className="vis-option">
            <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} />
            {o.label}
          </label>
        ))}
      </div>
    </div>
  )
}

function ImageField({ label, fieldName, currentUrl }) {
  const [mode, setMode] = useState('idle') // 'idle' | 'replace'
  const [clear, setClear] = useState(false)

  const hasImage = currentUrl && !clear

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
      <span className="input-label">{label}</span>
      {hasImage && mode !== 'replace' ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <img src={currentUrl} alt="" style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover', border: '0.5px solid var(--border)' }} />
          <button type="button" className="btn-secondary" style={{ fontSize: '0.78rem' }} onClick={() => setMode('replace')}>
            Reemplazar imagen
          </button>
          <button type="button" className="btn-danger" style={{ fontSize: '0.78rem' }} onClick={() => { setClear(true); setMode('idle') }}>
            Eliminar imagen
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'var(--bg3)', border: '0.5px solid var(--border)', borderRadius: 7, padding: '0.4rem 0.75rem', fontSize: '0.82rem', cursor: 'pointer' }}>
            📎 Elegir archivo
            <input type="file" name={fieldName} accept="image/*" hidden />
          </label>
          {hasImage === false && mode === 'replace' && (
            <button type="button" className="btn-secondary" style={{ fontSize: '0.78rem' }} onClick={() => setMode('idle')}>
              Cancelar
            </button>
          )}
        </div>
      )}
      {clear && <input type="hidden" name={`${fieldName}_clear`} value="true" />}
    </div>
  )
}

export default function ConfigurarClub() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [club, setClub] = useState(null)
  const [pais, setPais] = useState('')
  const [showControles, setShowControles] = useState(false)
  const [config, setConfig] = useState({
    config_rutas: 'cualquiera',
    config_salidas: 'cualquiera',
    config_ingreso: 'fundador',
    config_roles: 'fundador',
  })

  useEffect(() => {
    getClub(id).then(({ data }) => {
      setClub(data)
      setPais(data.pais || '')
      setConfig({
        config_rutas: data.config_rutas || 'cualquiera',
        config_salidas: data.config_salidas || 'cualquiera',
        config_ingreso: data.config_ingreso || 'fundador',
        config_roles: data.config_roles || 'fundador',
      })
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [id])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const fd = new FormData(e.target)
      fd.set('pais', pais)
      fd.set('config_rutas', config.config_rutas)
      fd.set('config_salidas', config.config_salidas)
      fd.set('config_ingreso', config.config_ingreso)
      fd.set('config_roles', config.config_roles)
      await updateClub(id, fd)
      navigate(`/club/${id}`)
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar')
    }
    setSaving(false)
  }

  if (loading) return <div className="loading">Cargando...</div>

  return (
    <div className="page">
      <h2 className="page-title">Configurar club</h2>
      <form className="edit-form" onSubmit={handleSubmit} encType="multipart/form-data">
        <h3 style={{ fontSize: '0.9rem', color: 'var(--text2)', marginBottom: '0.25rem', textAlign: 'left' }}>Información general</h3>

        <label className="input-label" style={{ textAlign: 'left' }}>Nombre del club *</label>
        <input name="nombre" defaultValue={club?.nombre} placeholder="Nombre del club" required />

        <label className="input-label" style={{ textAlign: 'left' }}>Slogan</label>
        <input name="slogan" defaultValue={club?.slogan} placeholder="Slogan (Opcional)" />

        <label className="input-label" style={{ textAlign: 'left' }}>País</label>
        <PaisSelector value={pais} onChange={setPais} placeholder="País (Opcional)" />

        <label className="input-label" style={{ textAlign: 'left' }}>Provincia / Estado / Ciudad</label>
        <input name="provincia" defaultValue={club?.provincia} placeholder="Provincia / Estado / Ciudad (Opcional)" />

        <label className="input-label" style={{ textAlign: 'left' }}>Tipo de club</label>
        <select name="tipo" defaultValue={club?.tipo || 'publico'}>
          <option value="publico">Público</option>
          <option value="privado">Privado</option>
        </select>

        <ImageField label="Escudo / estandarte" fieldName="escudo" currentUrl={club?.escudo_url} />
        <ImageField label="Foto de portada" fieldName="portada" currentUrl={club?.portada_url} />

        <button
          type="button"
          className="config-toggle"
          onClick={() => setShowControles(v => !v)}
        >
          <span>Control de miembros</span>
          <span>{showControles ? '▲' : '▼'}</span>
        </button>

        {showControles && (
          <div className="config-panel">
            <ConfigRadio
              label="¿Quién puede agregar rutas?"
              name="config_rutas"
              value={config.config_rutas}
              onChange={v => setConfig(c => ({ ...c, config_rutas: v }))}
            />
            <ConfigRadio
              label="¿Quién puede crear salidas?"
              name="config_salidas"
              value={config.config_salidas}
              onChange={v => setConfig(c => ({ ...c, config_salidas: v }))}
            />
            <ConfigRadio
              label="¿Quién puede aprobar ingresos de miembros?"
              name="config_ingreso"
              value={config.config_ingreso}
              onChange={v => setConfig(c => ({ ...c, config_ingreso: v }))}
            />
            <ConfigRadio
              label="¿Quién puede asignar roles a los miembros?"
              name="config_roles"
              value={config.config_roles}
              onChange={v => setConfig(c => ({ ...c, config_roles: v }))}
            />
          </div>
        )}

        {error && <p className="error">{error}</p>}
        <div className="form-actions">
          <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Guardando...' : 'Guardar cambios'}</button>
          <button type="button" className="btn-secondary" onClick={() => navigate(`/club/${id}`)}>Cancelar</button>
        </div>
      </form>
    </div>
  )
}
