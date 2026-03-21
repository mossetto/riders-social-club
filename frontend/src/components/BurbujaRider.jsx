export default function BurbujaRider({ user, moto, size = 36 }) {
  const initials = user?.username?.slice(0, 2).toUpperCase() || '??'
  return (
    <div className="burbuja-rider" style={{ width: size, height: size }}>
      {user?.avatar_url
        ? <img src={user.avatar_url} alt={user.username} />
        : <span>{initials}</span>}
      {moto && (
        <div className="burbuja-moto">
          {moto.foto_url
            ? <img src={moto.foto_url} alt={moto.apodo} />
            : <span>🏍</span>}
        </div>
      )}
    </div>
  )
}
