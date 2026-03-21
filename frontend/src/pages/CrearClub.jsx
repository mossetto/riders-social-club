import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createClub } from '../api/clubs'

const PROVINCIAS = ['Buenos Aires','CABA','Córdoba','Santa Fe','Mendoza','Tucumán','Salta','Neuquén','Río Negro','Chubut','Santa Cruz','Tierra del Fuego','Entre Ríos','Corrientes','Misiones','Chaco','Formosa','Santiago del Estero','La Rioja','Catamarca','San Juan','San Luis','La Pampa','Jujuy']

export default function CrearClub() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const fd = new FormData(e.target)
      const { data } = await createClub(fd)
      navigate(`/club/${data.id}`)
    } catch (err) {
      setError(err.response?.data?.error || 'Error al crear el club')
    }
    setLoading(false)
  }

  return (
    <div className="page">
      <h2 className="page-title">Crear club</h2>
      <form className="edit-form" onSubmit={handleSubmit} encType="multipart/form-data">
        <input name="nombre" placeholder="Nombre del club" required />
        <input name="slogan" placeholder="Slogan (opcional)" />
        <select name="provincia">
          <option value="">Provincia</option>
          {PROVINCIAS.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select name="tipo">
          <option value="publico">Público</option>
          <option value="privado">Privado</option>
        </select>
        <label className="file-label">Escudo / bandera <input type="file" name="escudo" accept="image/*" /></label>
        {error && <p className="error">{error}</p>}
        <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Creando...' : 'Crear club'}</button>
      </form>
    </div>
  )
}
