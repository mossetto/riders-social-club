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
        <h3 style={{ fontSize: '0.9rem', color: 'var(--text2)', marginBottom: '0.25rem' }}>Información general</h3>
        <label className="input-label">Nombre del club *</label>
        <input name="nombre" defaultValue={club?.nombre} placeholder="Nombre del club" required />
        <label className="input-label">Slogan</label>
        <input name="slogan" defaultValue={club?.slogan} placeholder="Slogan (Opcional)" />
        <label className="input-label">País</label>
        <PaisSelector value={pais} onChange={setPais} placeholder="País (Opcional)" />
        <label className="input-label">Provincia / Estado / Ciudad</label>
        <input name="provincia" defaultValue={club?.provincia} placeholder="Provincia / Estado / Ciudad (Opcional)" />
        <label className="input-label">Tipo de club</label>
        <select name="tipo" defaultValue={club?.tipo || 'publico'}>
          <option value="publico">Público</option>
          <option value="privado">Privado</option>
        </select>
        <label className="file-label">Escudo / estandarte <input type="file" name="escudo" accept="image/*" /></label>
        <label className="file-label">Foto de portada <input type="file" name="portada" accept="image/*" /></label>

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
