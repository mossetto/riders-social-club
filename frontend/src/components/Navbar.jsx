import { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/axiosInstance'

export default function Navbar() {
  const { user } = useAuth()
  const [clubLink, setClubLink] = useState('/mis-clubes')

  useEffect(() => {
    if (!user) { setClubLink('/mis-clubes'); return }
    api.get('/clubs/mine').then(({ data }) => {
      if (data.length === 1) setClubLink(`/club/${data[0].id}`)
      else setClubLink('/mis-clubes')
    }).catch(() => {})
  }, [user?.id])

  return (
    <nav className="navbar">
      <div className="nav-brand">Riders SC</div>
      <div className="nav-links">
        <NavLink to="/" end>General</NavLink>
        {user && <NavLink to={clubLink}>Mis clubes</NavLink>}
        <NavLink to="/explorar">Explorar</NavLink>
      </div>
      <div className="nav-right">
        {user
          ? <NavLink to={`/perfil/${user.id}`} className="nav-avatar">
              {user.avatar_url
                ? <img src={user.avatar_url} alt="" />
                : <span>{user.username?.slice(0,2).toUpperCase()}</span>}
            </NavLink>
          : <NavLink to="/login" className="btn-primary-sm">Entrar</NavLink>}
      </div>
    </nav>
  )
}
