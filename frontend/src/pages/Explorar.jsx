import { useState, useEffect } from 'react'
import ClubCard from '../components/ClubCard'
import { getClubs } from '../api/clubs'
import { useAuth } from '../context/AuthContext'
import api from '../api/axiosInstance'

const PROVINCIAS = ['Buenos Aires','CABA','Córdoba','Santa Fe','Mendoza','Tucumán','Salta','Neuquén','Río Negro','Chubut','Santa Cruz','Tierra del Fuego','Entre Ríos','Corrientes','Misiones','Chaco','Formosa','Santiago del Estero','La Rioja','Catamarca','San Juan','San Luis','La Pampa','Jujuy']

export default function Explorar() {
  const { user } = useAuth()
  const [clubs, setClubs] = useState([])
  const [misClubIds, setMisClubIds] = useState([])
  const [provincia, setProvincia] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [provincia])

  async function load() {
    setLoading(true)
    try {
      const promises = [getClubs(provincia)]
      if (user) promises.push(api.get('/clubs/mine'))
      const results = await Promise.all(promises)
      setClubs(results[0].data)
      if (user) setMisClubIds(results[1].data.map(c => c.id))
    } catch {}
    setLoading(false)
  }

  return (
    <div className="page">
      <h2 className="page-title">Explorar clubes</h2>
      <div className="filter-row">
        <button className={!provincia ? 'filter-pill on' : 'filter-pill'} onClick={() => setProvincia('')}>Todos</button>
        {PROVINCIAS.map(p => (
          <button key={p} className={provincia === p ? 'filter-pill on' : 'filter-pill'} onClick={() => setProvincia(p)}>{p}</button>
        ))}
      </div>
      {loading ? <div className="loading">Cargando...</div> : (
        clubs.length === 0
          ? <p className="empty">No hay clubes todavía</p>
          : clubs.map(c => (
              <ClubCard
                key={c.id}
                club={c}
                isMember={misClubIds.includes(c.id)}
                onJoin={load}
              />
            ))
      )}
    </div>
  )
}
