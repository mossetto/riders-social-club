import { useState } from 'react'
import { Link } from 'react-router-dom'
import BurbujaRider from './BurbujaRider'
import { toggleLike } from '../api/posts'
import { useAuth } from '../context/AuthContext'
import { timeAgo } from '../utils/timeAgo'

export default function PostCard({ post, onDelete }) {
  const { user } = useAuth()
  const [likes, setLikes] = useState(Number(post.likes))
  const [liked, setLiked] = useState(false)
  const [showComments, setShowComments] = useState(false)

  async function handleLike() {
    if (!user) return
    try {
      const { data } = await toggleLike(post.id)
      setLiked(data.liked)
      setLikes(l => data.liked ? l + 1 : l - 1)
    } catch {}
  }

  return (
    <div className="post-card">
      <div className="post-header">
        <Link to={`/perfil/${post.user.id}`}>
          <BurbujaRider user={post.user} moto={post.moto} size={40} />
        </Link>
        <div className="post-meta">
          <Link to={`/perfil/${post.user.id}`} className="post-username">{post.user.username}</Link>
          {post.club && (
            <Link to={`/club/${post.club.id}`} className="club-tag">
              {post.club.nombre} · {post.club.rol}
            </Link>
          )}
        </div>
        <span className="post-time">{timeAgo(post.created_at)}</span>
        {post.club && (
          <Link to={`/club/${post.club.id}`} className="post-club-escudo">
            {post.club.escudo_url
              ? <img src={post.club.escudo_url} alt={post.club.nombre} />
              : <span>{post.club.nombre?.slice(0,2).toUpperCase()}</span>}
          </Link>
        )}
        {user?.id === post.user.id && (
          <button className="btn-delete" onClick={() => {
            if (window.confirm('¿Eliminar esta publicación?')) onDelete?.(post.id)
          }}>×</button>
        )}
      </div>

      {post.contenido && <p className="post-content">{post.contenido}</p>}
      {post.imagen_url && <img src={post.imagen_url} className="post-img" alt="" />}

      <div className="post-actions">
        <button className={`action-btn ${liked ? 'liked' : ''}`} onClick={handleLike}>
          ♥ {likes}
        </button>
        <button className="action-btn" onClick={() => setShowComments(!showComments)}>
          💬 {post.comentarios}
        </button>
      </div>

      {showComments && <CommentsSection postId={post.id} />}
    </div>
  )
}

export function LikesComments({ postId, likes: initLikes, comentarios: initComentarios }) {
  const { user } = useAuth()
  const [likes, setLikes] = useState(Number(initLikes || 0))
  const [liked, setLiked] = useState(false)
  const [showComments, setShowComments] = useState(false)

  async function handleLike() {
    if (!user || !postId) return
    try {
      const { toggleLike } = await import('../api/posts')
      const { data } = await toggleLike(postId)
      setLiked(data.liked)
      setLikes(l => data.liked ? l + 1 : l - 1)
    } catch {}
  }

  return (
    <>
      <div className="post-actions" style={{ marginTop: '0.75rem', borderTop: '0.5px solid var(--border)', paddingTop: '0.6rem' }}>
        <button className={`action-btn ${liked ? 'liked' : ''}`} onClick={handleLike}>♥ {likes}</button>
        <button className="action-btn" onClick={() => postId && setShowComments(!showComments)}>💬 {initComentarios || 0}</button>
      </div>
      {showComments && postId && <CommentsSection postId={postId} />}
    </>
  )
}

function CommentsSection({ postId }) {
  const { user } = useAuth()
  const [comments, setComments] = useState([])
  const [text, setText] = useState('')
  const [loaded, setLoaded] = useState(false)

  async function load() {
    if (loaded) return
    const { getComments } = await import('../api/posts')
    const { data } = await getComments(postId)
    setComments(data)
    setLoaded(true)
  }

  useState(() => { load() }, [])

  async function submit(e) {
    e.preventDefault()
    if (!text.trim()) return
    const { addComment } = await import('../api/posts')
    const { data } = await addComment(postId, text)
    setComments(c => [...c, { ...data, user }])
    setText('')
  }

  return (
    <div className="comments">
      {comments.map(c => (
        <div key={c.id} className="comment">
          <span className="comment-user">{c.user?.username}</span>
          <span className="comment-text">{c.contenido}</span>
        </div>
      ))}
      {user && (
        <form onSubmit={submit} className="comment-form">
          <input value={text} onChange={e => setText(e.target.value)} placeholder="Comentar..." />
          <button type="submit">→</button>
        </form>
      )}
    </div>
  )
}
