import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createClub } from '../api/clubs'
import PaisSelector from '../components/PaisSelector'

export default function CrearClub() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [pais, setPais] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const fd = new FormData(e.target)
      fd.set('pais', pais)
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
        <input name="slogan" placeholder="Slogan (Opcional)" />
        <PaisSelector value={pais} onChange={setPais} placeholder="País (Opcional)" />
        <input name="provincia" placeholder="Provincia / Estado / Ciudad (Opcional)" />
        <select name="tipo">
          <option value="publico">Público</option>
          <option value="privado">Privado</option>
        </select>
        <label className="file-label">Escudo / estandarte (Opcional) <input type="file" name="escudo" accept="image/*" /></label>
        <label className="file-label">Foto de portada (Opcional) <input type="file" name="portada" accept="image/*" /></label>
        {error && <p className="error">{error}</p>}
        <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Creando...' : 'Crear club'}</button>
      </form>
    </div>
  )
}
