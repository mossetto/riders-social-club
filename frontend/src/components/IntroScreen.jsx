import { useState, useEffect, useRef } from 'react'
import introVid from '../assets/introVid.mp4'

const VIDEO_DURATION = 5    // segundos totales del video
const DISPLAY_MS = 2000     // cuánto dura la intro visible
const FADE_MS = 400         // duración del fade-out

export default function IntroScreen({ onDone }) {
  const [fading, setFading] = useState(false)
  const videoRef = useRef(null)

  useEffect(() => {
    const fadeTimer = setTimeout(() => setFading(true), DISPLAY_MS)
    const doneTimer = setTimeout(() => onDone(), DISPLAY_MS + FADE_MS)
    return () => { clearTimeout(fadeTimer); clearTimeout(doneTimer) }
  }, [])

  function handleLoadedMetadata() {
    const video = videoRef.current
    if (!video) return
    const maxStart = VIDEO_DURATION - DISPLAY_MS / 1000
    video.currentTime = Math.random() * maxStart
    video.play().catch(() => {})
  }

  return (
    <div className={`intro-screen${fading ? ' intro-fading' : ''}`}>
      <video
        ref={videoRef}
        src={introVid}
        autoPlay
        muted
        playsInline
        preload="auto"
        onLoadedMetadata={handleLoadedMetadata}
        className="intro-video"
      />
      <div className="intro-overlay" />
      <div className="intro-logo">
        <img src="/favicon.svg" alt="Riders Social Club" />
        <span className="intro-brand">Riders Social Club</span>
      </div>
    </div>
  )
}
