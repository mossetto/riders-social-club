import { useState, useEffect, useRef } from 'react'
import introVideo from '../assets/introBikers.mp4'

const VIDEO_DURATION = 5
const DISPLAY_MS = 4000
const FADE_MS = 400

export default function IntroScreen({ onDone }) {
  const [fading, setFading] = useState(false)
  const videoRef = useRef(null)

  console.log('[INTRO] Component mounted, video import =', introVideo)

  useEffect(() => {
    console.log('[INTRO] useEffect running, DISPLAY_MS =', DISPLAY_MS)
    const fadeTimer = setTimeout(() => {
      console.log('[INTRO] Starting fade')
      setFading(true)
    }, DISPLAY_MS)
    const doneTimer = setTimeout(() => {
      console.log('[INTRO] Done, transitioning out')
      onDone()
    }, DISPLAY_MS + FADE_MS)
    return () => { clearTimeout(fadeTimer); clearTimeout(doneTimer) }
  }, [])

  function handleLoadedMetadata() {
    const video = videoRef.current
    if (!video) { console.log('[INTRO] video ref is null'); return }
    console.log('[INTRO] Video loaded — duration:', video.duration, 'readyState:', video.readyState)
    const maxStart = VIDEO_DURATION - DISPLAY_MS / 1000
    video.currentTime = Math.random() * Math.max(0, maxStart)
    video.play().then(() => console.log('[INTRO] Video playing')).catch(e => console.log('[INTRO] Video play error:', e))
  }

  function handleVideoError(e) {
    console.error('[INTRO] Video error:', e.target.error)
  }

  return (
    <div className={`intro-screen${fading ? ' intro-fading' : ''}`}>
      <video
        ref={videoRef}
        src={introVideo}
        autoPlay
        muted
        playsInline
        preload="auto"
        loop
        onLoadedMetadata={handleLoadedMetadata}
        onError={handleVideoError}
        className="intro-video"
      />
      <div className="intro-overlay" />
      <div className="intro-logo">
        <img
          src="/favicon.svg"
          alt="Riders Social Club"
          onLoad={() => console.log('[INTRO] Logo loaded OK')}
          onError={(e) => console.error('[INTRO] Logo FAILED to load, src:', e.target.src)}
        />
        <span className="intro-brand">Riders Social Club</span>
      </div>
    </div>
  )
}
