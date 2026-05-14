import type { PlaybackSpeed } from '../hooks/useSimulationClock.ts'

const SPEEDS: PlaybackSpeed[] = [60, 300, 600, 1800, 3600]
const SPEED_LABELS: Record<PlaybackSpeed, string> = {
  60: '1m/s',
  300: '5m/s',
  600: '10m/s',
  1800: '30m/s',
  3600: '1h/s',
}

interface Props {
  simTime: number
  playing: boolean
  speed: PlaybackSpeed
  play: () => void
  pause: () => void
  setSpeed: (s: PlaybackSpeed) => void
}

export default function SimulationControls({ simTime, playing, speed, play, pause, setSpeed }: Props) {
  return (
    <div style={{
      position: 'absolute',
      bottom: 24,
      left: 24,
      zIndex: 1,
      background: 'rgba(255,255,255,0.9)',
      borderRadius: 8,
      padding: '10px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      fontFamily: 'monospace',
      fontSize: 13,
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      userSelect: 'none',
    }}>
      <button
        onClick={playing ? pause : play}
        style={{ fontSize: 18, cursor: 'pointer', background: 'none', border: 'none', padding: 0, lineHeight: 1, color: '#333' }}
      >
        {playing ? '⏸' : '▶'}
      </button>

      <span style={{ minWidth: 110, color: '#333' }}>{formatSimTime(simTime)}</span>

      <div style={{ display: 'flex', gap: 4 }}>
        {SPEEDS.map(s => (
          <button
            key={s}
            onClick={() => setSpeed(s)}
            style={{
              cursor: 'pointer',
              padding: '2px 6px',
              borderRadius: 4,
              border: '1px solid #ccc',
              background: speed === s ? '#333' : '#fff',
              color: speed === s ? '#fff' : '#333',
              fontSize: 11,
              fontFamily: 'monospace',
            }}
          >
            {SPEED_LABELS[s]}
          </button>
        ))}
      </div>
    </div>
  )
}

function formatSimTime(simTime: number): string {
    const totalSeconds = Math.floor(simTime)
    const days = Math.floor(totalSeconds / 86400)
    const hours = Math.floor((totalSeconds % 86400) / 3600).toString().padStart(2, '0')
    const minutes = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0')
    return `Day ${days + 1}  ${hours}:${minutes}`
}