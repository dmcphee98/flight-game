// ─── Brass panel theme ───────────────────────────────────────────────────────
// All colors for GameHud and LensToolbar live here.
// Edit this file to restyle both panels at once.

// Panel surface
export const PANEL_COLOR = '#967a3a'

const PANEL_BG_BASE = [
  'linear-gradient(140deg, rgba(220,180,75,0.18) 0%, transparent 45%, rgba(35,20,5,0.14) 100%)',
  'radial-gradient(ellipse at 50% 50%, transparent 30%, rgba(35,20,5,0.48) 100%)',
]
// verdigrisOrigin positions the patina pocket per panel (each puts it in a different corner)
export function panelBg(verdigrisOrigin: string): string {
  return [
    ...PANEL_BG_BASE,
    `radial-gradient(ellipse at ${verdigrisOrigin}, rgba(55,85,50,0.13) 0%, transparent 42%)`,
  ].join(', ')
}

// Structural panel classes (no padding — components add their own)
export const PANEL_CLASSES =
  'relative overflow-hidden rounded-lg border ' +
  'border-t-[#c49a40] border-b-[#4a3510] border-l-[#9a7c30] border-r-[#6b5520] ' +
  'shadow-[0_4px_20px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(220,175,60,0.22),inset_0_-2px_5px_rgba(0,0,0,0.35)]'

// ─── HUD readouts ─────────────────────────────────────────────────────────────

export const LABEL_TEXT    = 'text-amber-950/70'
export const LABEL_SHADOW  = '0 1px 2px rgba(0,0,0,0.55), 0 -0.5px 0 rgba(220,175,60,0.22)'
export const DIVIDER       = 'w-px bg-amber-950/30'

// Dark amber-glass display box (components add padding)
export const DISPLAY_BOX_CLASSES =
  'bg-[#1c1205] rounded shadow-[inset_0_3px_6px_rgba(0,0,0,0.9),inset_0_-2px_4px_rgba(160,120,20,0.08)]'

// Per-field readout colours
export const VALUE_DAY   = 'text-amber-300'
export const VALUE_TIME  = 'text-[#9abfaa]'   // verdigris — oxidised copper on aged brass
export const VALUE_FUNDS = 'text-[#d4aa30]'   // deep gold

// ─── Gauge faces (LensToolbar) ───────────────────────────────────────────────

export const GAUGE_RING_ACTIVE =
  'border-[#9a7424] shadow-[0_0_12px_rgba(251,191,36,0.5),0_0_4px_rgba(251,191,36,0.75),inset_0_2px_6px_rgba(0,0,0,0.75)]'
export const GAUGE_RING_INACTIVE =
  'border-[#6a4e18]/55 shadow-[inset_0_2px_6px_rgba(0,0,0,0.85),0_1px_0_rgba(200,155,40,0.1)] hover:border-[#6a4e18]/80'

export const GAUGE_FACE_ACTIVE   = 'bg-[#1e1508]'
export const GAUGE_FACE_INACTIVE = 'bg-[#1c1205]'

// SVG stroke values (not Tailwind — used on <line> elements directly)
export const TICK_ACTIVE   = '#9a7030'
export const TICK_INACTIVE = '#4a3612'

export const SYMBOL_ACTIVE   = 'text-amber-300 drop-shadow-[0_0_5px_rgba(251,191,36,0.9)]'
export const SYMBOL_INACTIVE = 'text-[#6a5028]/55 group-hover:text-[#8a6a38]/75'

// ─── Shared component styles ──────────────────────────────────────────────────

export const RIVET_CLASSES =
  'w-1.5 h-1.5 rounded-full bg-[#3a2508] shadow-[inset_0_1px_3px_rgba(0,0,0,0.9),0_0.5px_0_rgba(200,155,40,0.2)]'

export const GRAIN_OPACITY       = 0.13
export const GRAIN_BASE_FREQ     = 0.62
export const GRAIN_NUM_OCTAVES   = 3
