import { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/axiosInstance'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.post('/auth/forgot-password', { email })
      setSent(true)
    } catch (err) {
      setError(err.response?.data?.error || 'Error al enviar el email')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <span className="logo-icon">🏍️</span>
          <h1>Riders Social Club</h1>
          <p>recuperar contraseña</p>
        </div>
        {sent ? (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <p style={{ color: '#a0f0a0', marginBottom: '1rem' }}>
              Si el email está registrado, te enviamos un link para restablecer tu contraseña. Revisá tu bandeja de entrada.
            </p>
            <Link to="/login" className="btn-link">Volver al login</Link>
          </div>
        ) : (
          <>
            <p style={{ color: '#aaa', fontSize: '0.9rem', marginBottom: '1.2rem' }}>
              Ingresá tu email y te mandamos un link para restablecer tu contraseña.
            </p>
            <form onSubmit={handleSubmit}>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
              {error && <p className="error">{error}</p>}
              <button type="submit" disabled={loading}>
                {loading ? 'Enviando...' : 'Enviar link'}
              </button>
            </form>
            <p className="auth-switch">
              <Link to="/login">Volver al login</Link>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
