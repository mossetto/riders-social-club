import { Link, useNavigate } from 'react-router-dom'
import { joinClub } from '../api/clubs'
import { useAuth } from '../context/AuthContext'
import { getBandera } from './PaisSelector'

export default function ClubCard({ club, isMember, myRole, onJoin }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const bandera = getBandera(club.pais)
  const isFundador = myRole === 'fundador'

  async function handleJoin() {
    if (!user) return
    try {
      await joinClub(club.id)
      onJoin?.()
    } catch {}
  }

  return (
    <Link to={`/club/${club.id}`} className="club-card" style={{ textDecoration: 'none', color: 'inherit' }}>
      {club.portada_url && (
        <div className="club-card-portada">
          <img src={club.portada_url} alt="" />
        </div>
      )}
      <div className="club-card-body">
        <div className="club-card-top">
          <div className="club-escudo">
            {club.escudo_url
              ? <img src={club.escudo_url} alt={club.nombre} />
              : <span>{club.nombre.slice(0, 2).toUpperCase()}</span>}
          </div>
          <div className="club-card-info">
            <span className="club-nombre">{club.nombre}</span>
            <p className="club-meta-line">
              {club.miembros} miembros
              {club.provincia && ` · ${club.provincia}`}
              {bandera && ` · ${bandera} ${club.pais}`}
              {` · ${club.tipo}`}
            </p>
          </div>
          <div className="club-card-actions">
            {isFundador && <span className="role-badge">fundador</span>}
            {isFundador && (
              <button className="btn-secondary" style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem', whiteSpace: 'nowrap' }} onClick={(e) => { e.preventDefault(); navigate(`/club/${club.id}/configurar`) }}>
                Configurar club
              </button>
            )}
            {myRole && !isFundador && <span className="role-badge">{myRole}</span>}
            {!myRole && user && (
              <button className="btn-primary-sm" onClick={(e) => { e.preventDefault(); handleJoin() }}>
                {club.tipo === 'privado' ? 'Solicitar unirse' : 'Unirse'}
              </button>
            )}
          </div>
        </div>
        {club.slogan && <p className="club-card-desc">{club.slogan}</p>}
      </div>
    </Link>
  )
}
