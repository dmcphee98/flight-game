import { useEffect, useState } from 'react'

interface Props {
  startsAtMs: number | null
}

export default function CountdownOverlay({ startsAtMs }: Props) {
  const [secondsLeft, setSecondsLeft] = useState(() =>
    startsAtMs === null ? 0 : Math.max(0, Math.ceil((startsAtMs - Date.now()) / 1000))
  )

  useEffect(() => {
    if (startsAtMs === null || secondsLeft <= 0) return

    const id = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((startsAtMs - Date.now()) / 1000))
      setSecondsLeft(remaining)
      if (remaining <= 0) clearInterval(id)
    }, 100)

    return () => clearInterval(id)
  }, [startsAtMs, secondsLeft])

  if (secondsLeft <= 0) return null

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
      {/* Soft vignette so the card reads against the busy watercolor map */}
      <div className="absolute inset-0 bg-stone-900/20" />

      {/* Dispatch notice card — parchment paper / aviation chart aesthetic */}
      <div className="relative bg-amber-50/95 backdrop-blur-[2px] border-2 border-dashed border-amber-900/40 rounded-sm px-20 py-12 text-center shadow-[0_8px_40px_rgba(0,0,0,0.3)]">

        {/* Corner tick marks */}
        {[
          { pos: 'top-2 left-2',     borderWidth: '2px 0 0 2px' },
          { pos: 'top-2 right-2',    borderWidth: '2px 2px 0 0' },
          { pos: 'bottom-2 left-2',  borderWidth: '0 0 2px 2px' },
          { pos: 'bottom-2 right-2', borderWidth: '0 2px 2px 0' },
        ].map(({ pos, borderWidth }) => (
            <div key={pos} className={`absolute ${pos} w-3 h-3 border-amber-900/40`}
                 style={{ borderWidth, borderStyle: 'solid' }} />
        ))}

        <div className="font-courier text-xs text-amber-900/50 tracking-[0.3em] uppercase mb-6">
          cleared for takeoff in
        </div>

        <div className="font-caveat text-[9rem] leading-none text-amber-900 tabular-nums">
          {secondsLeft}
        </div>

        <div className="font-courier text-xs text-amber-900/50 tracking-[0.2em] uppercase mt-6">
          all players stand by
        </div>

      </div>
    </div>
  )
}
