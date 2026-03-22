import { useState, useEffect } from 'react'
import introGif from '../assets/introBikers.gif'

const DISPLAY_MS = 2000
const FADE_MS = 400

export default function IntroScreen({ onDone }) {
  const [fading, setFading] = useState(false)

  useEffect(() => {
    const fadeTimer = setTimeout(() => setFading(true), DISPLAY_MS)
    const doneTimer = setTimeout(() => onDone(), DISPLAY_MS + FADE_MS)
    return () => { clearTimeout(fadeTimer); clearTimeout(doneTimer) }
  }, [])

  return (
    <div className={`intro-screen${fading ? ' intro-fading' : ''}`}>
      <img src={introGif} alt="" className="intro-video" />
      <div className="intro-overlay" />
      <div className="intro-logo">
        <img src="/favicon.svg" alt="Riders Social Club" />
        <span className="intro-brand">Riders Social Club</span>
      </div>
    </div>
  )
}
