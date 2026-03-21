import { Link } from 'react-router-dom'
import { joinClub } from '../api/clubs'
import { useAuth } from '../context/AuthContext'

export default function ClubCard({ club, isMember, onJoin }) {
  const { user } = useAuth()
  const actividad = Number(club.posts_semana || 0) + Number(club.eventos_semana || 0)
  const actMax = 20

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
          {club.tipo === 'privado' && <span>· Privado</span>}
        </div>
        <div className="activity-bar">
          <div className="activity-fill" style={{ width: `${Math.min(actividad / actMax * 100, 100)}%` }} />
        </div>
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
