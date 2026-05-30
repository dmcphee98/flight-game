import { PANEL_COLOR, panelBg, PANEL_CLASSES, LABEL_TEXT, LABEL_SHADOW, DIVIDER, DISPLAY_BOX_CLASSES, VALUE_DAY, VALUE_TIME, VALUE_FUNDS, RIVET_CLASSES } from './panelTheme.ts'
import { GrainOverlay } from './panelComponents.tsx'

interface Props {
  simTime: number
  money: number
}

const BOLT_HOLES = [
  'top-1.5 left-1.5',
  'top-1.5 right-1.5',
  'bottom-1.5 left-1.5',
  'bottom-1.5 right-1.5',
]

export default function GameHud({ simTime, money }: Props) {
  const { day, clock } = formatSimTime(simTime)

  return (
    <div className="absolute bottom-6 left-6 z-10 pointer-events-none">
      <div
        className={`${PANEL_CLASSES} px-3 pt-0.5 pb-1`}
        style={{ backgroundColor: PANEL_COLOR, backgroundImage: panelBg('4% 96%') }}
      >
        <GrainOverlay id="brass-grain-hud" />

        {BOLT_HOLES.map(pos => (
          <div key={pos} className={`absolute ${pos} ${RIVET_CLASSES}`} />
        ))}

        <div className="flex items-center gap-3 px-3 pb-1">

          <div className="flex flex-col items-center">
            <span className={`font-courier text-[0.55rem] ${LABEL_TEXT} tracking-[0.25em] uppercase leading-4`} style={{ textShadow: LABEL_SHADOW }}>day</span>
            <div className={`${DISPLAY_BOX_CLASSES} px-2 pb-0.5`}>
              <span className={`font-courier font-bold text-base ${VALUE_DAY} tabular-nums leading-none`}>{day}</span>
            </div>
          </div>

          <div className={`h-9 ${DIVIDER}`} />

          <div className="flex flex-col items-center">
            <span className={`font-courier text-[0.55rem] ${LABEL_TEXT} tracking-[0.25em] uppercase leading-4`} style={{ textShadow: LABEL_SHADOW }}>time</span>
            <div className={`${DISPLAY_BOX_CLASSES} px-2 pb-0.5`}>
              <span className={`font-courier font-bold text-base ${VALUE_TIME} tabular-nums leading-none tracking-widest`}>{clock}</span>
            </div>
          </div>

          <div className={`h-9 ${DIVIDER}`} />

          <div className="flex flex-col items-center">
            <span className={`font-courier text-[0.55rem] ${LABEL_TEXT} tracking-[0.25em] uppercase leading-4`} style={{ textShadow: LABEL_SHADOW }}>funds</span>
            <div className={`${DISPLAY_BOX_CLASSES} px-2 pb-0.5`}>
              <span className={`font-courier font-bold text-base ${VALUE_FUNDS} tabular-nums leading-none`}>${money.toLocaleString()}</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

function formatSimTime(simTime: number): { day: number; clock: string } {
  const totalSeconds = Math.floor(simTime)
  const day = Math.floor(totalSeconds / 86400) + 1
  const hours = Math.floor((totalSeconds % 86400) / 3600).toString().padStart(2, '0')
  const minutes = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0')
  return { day, clock: `${hours}:${minutes}` }
}
