import { useState, useEffect } from 'react'
import PostCard from '../components/PostCard'
import CreatePost from '../components/CreatePost'
import { getFeed, getClubsFeed, deletePost } from '../api/posts'
import { useAuth } from '../context/AuthContext'

export default function Home() {
  const { user } = useAuth()
  const [tab, setTab] = useState('general')
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [tab])

  async function load() {
    setLoading(true)
    try {
      const { data } = tab === 'general' ? await getFeed() : await getClubsFeed()
      setPosts(data)
    } catch {}
    setLoading(false)
  }

  async function handleDelete(id) {
    await deletePost(id)
    setPosts(p => p.filter(x => x.id !== id))
  }

  return (
    <div className="page">
      <div className="tabs">
        <button className={tab === 'general' ? 'tab active' : 'tab'} onClick={() => setTab('general')}>General</button>
        {user && <button className={tab === 'clubes' ? 'tab active' : 'tab'} onClick={() => setTab('clubes')}>Mis clubes</button>}
      </div>

      {user && <CreatePost onCreated={load} />}

      {loading ? <div className="loading">Cargando...</div> : (
        posts.length === 0
          ? <p className="empty">No hay publicaciones aún</p>
          : posts.map(p => <PostCard key={p.id} post={p} onDelete={handleDelete} />)
      )}
    </div>
  )
}
