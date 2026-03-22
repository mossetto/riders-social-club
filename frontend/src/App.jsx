import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Navbar from './components/Navbar'
import Login from './pages/Login'
import Register from './pages/Register'
import Home from './pages/Home'
import MisClubes from './pages/MisClubes'
import Explorar from './pages/Explorar'
import Perfil from './pages/Perfil'
import Club from './pages/Club'
import CrearClub from './pages/CrearClub'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import ConfigurarClub from './pages/ConfigurarClub'
import IntroScreen from './components/IntroScreen'
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
  return (
    <>
      <Navbar />
      {children}
    </>
  )
}

export default function App() {
  const [showIntro, setShowIntro] = useState(
    () => !sessionStorage.getItem('introShown')
  )

  function handleIntroDone() {
    sessionStorage.setItem('introShown', '1')
    setShowIntro(false)
  }

  if (showIntro) return <IntroScreen onDone={handleIntroDone} />

  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
          <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
          <Route path="/reset-password" element={<PublicRoute><ResetPassword /></PublicRoute>} />
          <Route path="/" element={<Layout><Home /></Layout>} />
          <Route path="/mis-clubes" element={<PrivateRoute><Layout><MisClubes /></Layout></PrivateRoute>} />
          <Route path="/explorar" element={<Layout><Explorar /></Layout>} />
          <Route path="/perfil/:id" element={<Layout><Perfil /></Layout>} />
          <Route path="/club/:id" element={<Layout><Club /></Layout>} />
          <Route path="/crear-club" element={<PrivateRoute><Layout><CrearClub /></Layout></PrivateRoute>} />
          <Route path="/club/:id/configurar" element={<PrivateRoute><Layout><ConfigurarClub /></Layout></PrivateRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
