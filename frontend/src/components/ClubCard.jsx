import { Link } from 'react-router-dom'
import { joinClub } from '../api/clubs'
import { useAuth } from '../context/AuthContext'
import { getBandera } from './PaisSelector'

function tiempoRelativo(fecha) {
  if (!fecha) return null
  const diff = Date.now() - new Date(fecha).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'hace un momento'
  if (min < 60) return `hace ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `hace ${h}h`
  const d = Math.floor(h / 24)
  if (d < 7) return `hace ${d}d`
  return new Date(fecha).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
}

export default function ClubCard({ club, isMember, onJoin }) {
  const { user } = useAuth()
  const bandera = getBandera(club.pais)

  async function handleJoin() {
    if (!user) return
    try {
      await joinClub(club.id)
      onJoin?.()
    } catch {}
  }

  return (
    <div className="club-card">
      <div className="club-escudo">
        {club.escudo_url
          ? <img src={club.escudo_url} alt={club.nombre} />
          : <span>{club.nombre.slice(0, 2).toUpperCase()}</span>}
      </div>
      <div className="club-info">
        <Link to={`/club/${club.id}`} className="club-nombre">{club.nombre}</Link>
        {club.slogan && <p className="club-slogan">{club.slogan}</p>}
        <div className="club-stats">
          <span>{club.miembros} miembros</span>
          {club.provincia && <span>· {club.provincia}</span>}
          {bandera && <span>· {bandera} {club.pais}</span>}
          {club.tipo === 'privado' && <span>· Privado</span>}
        </div>
        {club.ultima_actividad && (
          <p className="club-ultima-act">Última actividad {tiempoRelativo(club.ultima_actividad)}</p>
        )}
        {user && !isMember && (
          <button className="btn-join" onClick={handleJoin}>
            {club.tipo === 'privado' ? 'Solicitar ingreso' : 'Unirse'}
          </button>
        )}
        {isMember && <span className="ya-miembro">Ya sos miembro</span>}
      </div>
    </div>
  )
}
