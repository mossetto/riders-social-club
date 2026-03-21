import { useState, useEffect } from 'react'
import PostCard from '../components/PostCard'
import CreatePost from '../components/CreatePost'
import { getFeed, deletePost } from '../api/posts'
import { useAuth } from '../context/AuthContext'

export default function Home() {
  const { user } = useAuth()
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const { data } = await getFeed()
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
      {user && <CreatePost onCreated={load} />}
      {loading ? <div className="loading">Cargando...</div> : (
        posts.length === 0
          ? <p className="empty">No hay publicaciones aún. ¡Sé el primero!</p>
          : posts.map(p => <PostCard key={p.id} post={p} onDelete={handleDelete} />)
      )}
    </div>
  )
}
