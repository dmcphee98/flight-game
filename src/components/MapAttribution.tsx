import { useState } from 'react'

const SOURCES = [
  { label: 'Stadia Maps',   href: 'https://stadiamaps.com/' },
  { label: 'Stamen Design', href: 'https://stamen.com/' },
  { label: 'OpenStreetMap', href: 'https://www.openstreetmap.org/about' },
]

export default function MapAttribution() {
  const [open, setOpen] = useState(false)

  return (
    <div className="absolute top-0 right-6 z-10 flex flex-col items-end">

      {/* Tab — flush to screen top, expands downward */}
      <button
        onClick={() => setOpen(o => !o)}
        className="border-x border-b border-dashed border-amber-900/40 bg-amber-50/95 backdrop-blur-[2px] px-2 py-0.5 font-courier text-xs text-amber-900/50 tracking-[0.35em] uppercase hover:text-amber-900/80 transition-colors cursor-pointer"
      >
        <span className={"pr-2"}>src</span><span>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="border-x border-b border-dashed border-amber-900/40 bg-amber-50/95 backdrop-blur-[2px] shadow-[0_4px_12px_rgba(0,0,0,0.15)]">
          {/* One strip per source */}
          {SOURCES.map(({ label, href }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noreferrer"
              className="block px-4 py-1.5 border-b border-dashed border-amber-900/20 last:border-0 font-courier text-xs text-amber-900/60 tracking-widest uppercase hover:text-amber-900 transition-colors"
            >
              © {label}
            </a>
          ))}
        </div>
      )}

    </div>
  )
}
