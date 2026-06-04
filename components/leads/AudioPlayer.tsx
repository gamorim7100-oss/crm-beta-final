'use client'

import { useEffect, useRef, useState } from 'react'

interface AudioPlayerProps {
  src: string
}

export function AudioPlayer({ src }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [current, setCurrent] = useState(0)
  const [duration, setDuration] = useState(0)
  const [ready, setReady] = useState(false)
  const progressRef = useRef<HTMLDivElement>(null)

  const updateDuration = () => {
    const audio = audioRef.current
    if (!audio) return
    const d = audio.duration
    if (isFinite(d) && d > 0) {
      setDuration(d)
      setReady(true)
    }
  }

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const onMeta = () => updateDuration()
    const onDuration = () => updateDuration()
    const onLoad = () => updateDuration()
    const onTime = () => {
      setCurrent(audio.currentTime)
      updateDuration()
    }
    const onEnd = () => setPlaying(false)
    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    const onError = () => {
      setTimeout(updateDuration, 300)
    }

    audio.addEventListener('loadedmetadata', onMeta)
    audio.addEventListener('durationchange', onDuration)
    audio.addEventListener('loadeddata', onLoad)
    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('ended', onEnd)
    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('error', onError)

    const fallbackTimer = setInterval(() => {
      if (!audio.paused) updateDuration()
    }, 500)

    return () => {
      audio.removeEventListener('loadedmetadata', onMeta)
      audio.removeEventListener('durationchange', onDuration)
      audio.removeEventListener('loadeddata', onLoad)
      audio.removeEventListener('timeupdate', onTime)
      audio.removeEventListener('ended', onEnd)
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
      audio.removeEventListener('error', onError)
      clearInterval(fallbackTimer)
    }
  }, [])

  const toggle = () => {
    const audio = audioRef.current
    if (!audio) return
    if (playing) {
      audio.pause()
    } else {
      audio.play().catch(() => {})
    }
  }

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = progressRef.current?.getBoundingClientRect()
    if (!rect || !audioRef.current || !isFinite(duration) || duration <= 0) return
    const x = (e.clientX - rect.left) / rect.width
    const time = Math.max(0, Math.min(x * duration, duration))
    audioRef.current.currentTime = time
    setCurrent(time)
  }

  const fmt = (s: number) => {
    if (!isFinite(s) || s < 0) return '--:--'
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  const pct = isFinite(duration) && duration > 0 ? (current / duration) * 100 : 0

  return (
    <>
      <audio ref={audioRef} preload="auto" src={src} />
      <div className="flex items-center gap-2 mb-1 bg-black/20 rounded-lg px-2 py-1.5 min-w-[200px]">
        <button
          onClick={toggle}
          className="text-emerald-400 hover:text-emerald-300 shrink-0 transition-colors"
        >
          {playing ? (
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>
        <div
          ref={progressRef}
          onClick={seek}
          className="flex-1 h-1.5 bg-white/10 rounded-full cursor-pointer relative group"
        >
          <div
            className="absolute inset-y-0 left-0 bg-emerald-400 rounded-full transition-[width] duration-75"
            style={{ width: `${pct}%` }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-emerald-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
            style={{ left: `calc(${pct}% - 6px)` }}
          />
        </div>
        <span className="text-[11px] text-gray-400 font-mono tabular-nums shrink-0 w-16 text-right">
          {ready ? `${fmt(current)} / ${fmt(duration)}` : fmt(current)}
        </span>
      </div>
    </>
  )
}

