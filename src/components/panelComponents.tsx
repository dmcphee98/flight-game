import { RIVET_CLASSES, GRAIN_OPACITY, GRAIN_BASE_FREQ, GRAIN_NUM_OCTAVES } from './panelTheme.ts'

export function Rivet() {
  return <div className={RIVET_CLASSES} />
}

export function GrainOverlay({ id }: { id: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ mixBlendMode: 'overlay', opacity: GRAIN_OPACITY }}
      aria-hidden
    >
      <filter id={id}>
        <feTurbulence type="fractalNoise" baseFrequency={GRAIN_BASE_FREQ} numOctaves={GRAIN_NUM_OCTAVES} stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter={`url(#${id})`} />
    </svg>
  )
}
