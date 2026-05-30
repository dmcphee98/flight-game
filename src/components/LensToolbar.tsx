import { PANEL_COLOR, panelBg, PANEL_CLASSES, GAUGE_RING_ACTIVE, GAUGE_RING_INACTIVE, GAUGE_FACE_ACTIVE, GAUGE_FACE_INACTIVE, TICK_ACTIVE, TICK_INACTIVE, SYMBOL_ACTIVE, SYMBOL_INACTIVE } from './panelTheme.ts'
import { Rivet, GrainOverlay } from './panelComponents.tsx'

export type ActiveLens = 'none' | 'price' | 'frequency'

const GAUGES: { id: ActiveLens; symbol: string; title: string }[] = [
  { id: 'none',      symbol: '⊕', title: 'Normal map view' },
  { id: 'price',     symbol: '¢', title: 'Price lens (P)' },
  { id: 'frequency', symbol: '∿', title: 'Frequency lens (F)' },
]

const GAUGE_TICKS = Array.from({ length: 12 }, (_, i) => {
  const angle = (i * 30 - 90) * (Math.PI / 180)
  const major = i % 3 === 0
  const r1 = major ? 18 : 17
  const r2 = major ? 14 : 16
  return {
    x1: 22 + r1 * Math.cos(angle),
    y1: 22 + r1 * Math.sin(angle),
    x2: 22 + r2 * Math.cos(angle),
    y2: 22 + r2 * Math.sin(angle),
    major,
  }
})

interface Props {
  activeLens: ActiveLens
  onSelect: (lens: ActiveLens) => void
}

export default function LensToolbar({ activeLens, onSelect }: Props) {
  return (
    <div className="absolute top-6 left-6 z-10">
      <div
        className={`${PANEL_CLASSES} px-2 py-1.5`}
        style={{ backgroundColor: PANEL_COLOR, backgroundImage: panelBg('96% 4%') }}
      >
        <GrainOverlay id="brass-grain-lens" />

        <div className="flex items-center gap-1.5">
          <div className="flex flex-col gap-1.5"><Rivet /><Rivet /></div>

          <div className="flex gap-2">
            {GAUGES.map(({ id, symbol, title }) => {
              const active = activeLens === id
              return (
                <button
                  key={id}
                  onClick={() => onSelect(id)}
                  title={title}
                  className="group"
                >
                  <div className={[
                    'w-9 h-9 rounded-full relative flex items-center justify-center border-2 transition-shadow duration-200',
                    active ? GAUGE_RING_ACTIVE : GAUGE_RING_INACTIVE,
                  ].join(' ')}>

                    <div className={[
                      'absolute inset-0 rounded-full transition-colors',
                      active ? GAUGE_FACE_ACTIVE : GAUGE_FACE_INACTIVE,
                    ].join(' ')} />

                    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 44 44" aria-hidden>
                      {GAUGE_TICKS.map((tick, i) => (
                        <line
                          key={i}
                          x1={tick.x1} y1={tick.y1}
                          x2={tick.x2} y2={tick.y2}
                          stroke={active ? TICK_ACTIVE : TICK_INACTIVE}
                          strokeWidth={tick.major ? 1.5 : 0.75}
                        />
                      ))}
                    </svg>

                    <span className={[
                      'relative z-10 font-courier font-bold text-base select-none transition-colors duration-150',
                      active ? SYMBOL_ACTIVE : SYMBOL_INACTIVE,
                    ].join(' ')}>
                      {symbol}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>

          <div className="flex flex-col gap-1.5"><Rivet /><Rivet /></div>
        </div>
      </div>
    </div>
  )
}
