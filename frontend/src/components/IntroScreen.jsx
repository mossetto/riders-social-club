import { useState, useEffect } from 'react'
import introGif from '../assets/introBikers.gif'

const DISPLAY_MS = 2000
const FADE_MS = 400
const MAX_PREPLAY_MS = 2000  // cuánto tiempo "pre-corre" oculto antes de mostrarse

export default function IntroScreen({ onDone }) {
  const [fading, setFading] = useState(false)
  const [gifVisible, setGifVisible] = useState(false)

  useEffect(() => {
    const randomDelay = Math.random() * MAX_PREPLAY_MS
    const gifTimer  = setTimeout(() => setGifVisible(true), randomDelay)
    const fadeTimer = setTimeout(() => setFading(true), randomDelay + DISPLAY_MS)
    const doneTimer = setTimeout(() => onDone(), randomDelay + DISPLAY_MS + FADE_MS)
    return () => { clearTimeout(gifTimer); clearTimeout(fadeTimer); clearTimeout(doneTimer) }
  }, [])

  return (
    <div className={`intro-screen${fading ? ' intro-fading' : ''}`}>
      {/* GIF corre oculto desde t=0 para avanzar a un frame aleatorio */}
      <img src={introGif} alt="" style={{ position: 'absolute', opacity: 0, width: 1, height: 1, pointerEvents: 'none' }} />
      {/* GIF visible aparece después del delay aleatorio */}
      <img
        src={introGif}
        alt=""
        className="intro-video"
        style={{ opacity: gifVisible ? 1 : 0, transition: 'opacity 0.3s' }}
      />
      <div className="intro-overlay" />
      <div className="intro-logo">
        <img src="/favicon.svg" alt="Riders Social Club" />
        <span className="intro-brand">Riders Social Club</span>
      </div>
    </div>
  )
}
