import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Navbar from './components/Navbar'
import Login from './pages/Login'
import Register from './pages/Register'
import Home from './pages/Home'
import Explorar from './pages/Explorar'
import Perfil from './pages/Perfil'
import Club from './pages/Club'
import CrearClub from './pages/CrearClub'
import './App.css'

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  return user ? children : <Navigate to="/login" replace />
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  return user ? <Navigate to="/" replace /> : children
}

function Layout({ children }) {
  const { user } = useAuth()
  return (
    <>
      <Navbar />
      {children}
      {user && (
        <Link to="/crear-club" className="fab" title="Crear club">+</Link>
      )}
    </>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
          <Route path="/" element={<Layout><Home /></Layout>} />
          <Route path="/explorar" element={<Layout><Explorar /></Layout>} />
          <Route path="/perfil/:id" element={<Layout><Perfil /></Layout>} />
          <Route path="/club/:id" element={<Layout><Club /></Layout>} />
          <Route path="/crear-club" element={<PrivateRoute><Layout><CrearClub /></Layout></PrivateRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
