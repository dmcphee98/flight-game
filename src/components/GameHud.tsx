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
      {/* #748e6f board-game olive, nudged slightly warmer to synergise with the orange and sky drums */}
      <div className="relative bg-[#7a8e6d]/95 backdrop-blur-sm border border-[#566850]/50 rounded-lg px-5 pt-1 pb-2 shadow-[0_3px_16px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.18),inset_0_-2px_4px_rgba(0,0,0,0.25)]">

        {/* Bolt holes */}
        {BOLT_HOLES.map(pos => (
          <div
            key={pos}
            className={`absolute ${pos} w-1.5 h-1.5 rounded-full bg-stone-900/5 shadow-[inset_0_1px_3px_rgba(0,0,0,0.7),inset_0_-0.5px_0.5px_rgba(255,255,255,0.08)]`}
          />
        ))}

        <div className="flex items-center gap-4 px-2">

          {/* Day */}
          <div className="flex flex-col items-center">
            <span className="font-courier text-[0.7rem] text-stone-900/60 tracking-[0.25em] uppercase leading-5">day</span>
            <div className="bg-stone-900 rounded px-3 py-[0.3rem] shadow-[inset_0_4px_8px_rgba(0,0,0,0.9),inset_0_-2px_4px_rgba(255,255,255,0.08)]">
              <span className="font-courier font-bold text-xl text-orange-400 tabular-nums leading-none">{day}</span>
            </div>
          </div>

          <div className="w-px h-14 bg-stone-900/25" />

          {/* Time */}
          <div className="flex flex-col items-center">
            <span className="font-courier text-[0.7rem] text-stone-900/60 tracking-[0.25em] uppercase leading-5">time</span>
            <div className="bg-stone-900 rounded px-3 py-[0.3rem] shadow-[inset_0_4px_8px_rgba(0,0,0,0.9),inset_0_-2px_4px_rgba(255,255,255,0.08)]">
              <span className="font-courier font-bold text-xl text-sky-300 tabular-nums leading-none tracking-widest">{clock}</span>
            </div>
          </div>

          <div className="w-px h-14 bg-stone-900/25" />

          {/* Funds */}
          <div className="flex flex-col items-center">
            <span className="font-courier text-[0.7rem] text-stone-900/60 tracking-[0.25em] uppercase leading-5">funds</span>
            <div className="bg-stone-900 rounded px-3 py-[0.3rem] shadow-[inset_0_4px_8px_rgba(0,0,0,0.9),inset_0_-2px_4px_rgba(255,255,255,0.08)]">
              <span className="font-courier font-bold text-xl text-amber-300 tabular-nums leading-none">${money.toLocaleString()}</span>
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
