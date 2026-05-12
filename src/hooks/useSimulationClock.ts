import { useEffect, useRef, useState } from 'react'

/** Simulation seconds advanced per real second. */
export type PlaybackSpeed = 60 | 300 | 600 | 1800 | 3600

/**
 * Drives a simulation clock that advances faster than wall time.
 *
 * `simTime` is an elapsed-seconds counter starting at 0. At speed 300 (the
 * default), one real second advances the simulation by five minutes. The clock
 * is paused on mount and only runs while `playing` is true.
 *
 * @returns `simTime` – elapsed simulation seconds
 * @returns `playing` – whether the clock is running
 * @returns `speed` – current {@link PlaybackSpeed}
 * @returns `play` / `pause` – start or stop the clock
 * @returns `setSpeed` – change the playback speed without stopping the clock
 */
export function useSimulationClock() {
  const [simTime, setSimTime] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState<PlaybackSpeed>(300)

  const lastWallTime = useRef<number>(0)
  const simTimeRef = useRef<number>(0)
  // Stores the animation frame ID so the cleanup function can cancel it
  const rafRef = useRef<number>(0)

  // The tick function calls itself, so ticking occurs continuously while playing is true.
  // requestAnimationFrame is used instead of setInterval because it syncs with the display
  // refresh rate and automatically pauses when the tab is in the background.
  useEffect(() => {
    if (!playing) return

    lastWallTime.current = performance.now()

    const tick = (now: number) => {
      const delta = now - lastWallTime.current
      lastWallTime.current = now
      simTimeRef.current += (delta / 1000) * speed
      setSimTime(simTimeRef.current)
      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)

    // Ensure that tick loop stops when playing becomes false
    return () => cancelAnimationFrame(rafRef.current)
  }, [playing, speed])

  return {
    simTime,
    playing,
    speed,
    play: () => setPlaying(true),
    pause: () => setPlaying(false),
    setSpeed,
  }
}
