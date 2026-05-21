import { useState } from 'react'
import type { PlayerState } from '../hooks/useGameServer.ts'

interface Props {
  roomCode: string
  players: PlayerState[]
  isHost: boolean
  onStart: () => void
}

export default function WaitingRoom({ roomCode, players, isHost, onStart }: Props) {
  const [copied, setCopied] = useState(false)

  const copyCode = () => {
    navigator.clipboard.writeText(roomCode).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="w-full h-screen flex items-center justify-center bg-stone-100 font-mono">
      <div className="bg-white rounded-xl px-12 py-10 w-full max-w-2xl shadow-lg border border-stone-300">

        <div className="text-center mb-8">
          <div className="font-caveat text-5xl leading-none text-amber-900">
            ✈ flight game
          </div>
          <div className="text-sm text-stone-500 mt-1.5 tracking-wider font-courier">
            waiting for players
          </div>
        </div>

        {/* Room code */}
        <div className="flex flex-col items-center mb-8">
          <div className="text-xs text-stone-500 tracking-wider font-courier mb-2">room code</div>
          <div className="flex items-center gap-3">
            <span className="font-courier text-4xl font-bold tracking-widest text-amber-900">
              {roomCode}
            </span>
            <button
              onClick={copyCode}
              className="font-courier text-xs px-3 py-1.5 rounded-md border border-stone-300 text-stone-500 hover:border-stone-400 hover:text-stone-700 transition-colors cursor-pointer"
            >
              {copied ? 'copied!' : 'copy'}
            </button>
          </div>
          <p className="text-xs text-stone-400 font-courier mt-2">
            share this code with friends to invite them
          </p>
        </div>

        {/* Player list */}
        <div className="mb-8">
          <div className="text-xs text-stone-500 tracking-wider font-courier mb-3">
            players ({players.length})
          </div>
          <div className="flex flex-col gap-2">
            {players.map(p => (
              <div
                key={p.id}
                className="flex items-center justify-between px-4 py-2.5 rounded-md bg-stone-50 border border-stone-200"
              >
                <span className="font-courier text-sm text-stone-800">{p.name}</span>
                <span className="font-courier text-xs text-stone-400 tracking-wider">ready</span>
              </div>
            ))}
          </div>
        </div>

        {/* Start / waiting */}
        {isHost ? (
          <button
            onClick={onStart}
            disabled={players.length < 1}
            className={`font-courier font-bold text-sm px-5 py-2.5 rounded-md w-full tracking-wide bg-amber-900 text-white border-none transition-opacity ${players.length < 1 ? 'opacity-35 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            Start game
          </button>
        ) : (
          <div className="text-center text-sm text-stone-400 font-courier tracking-wide">
            waiting for host to start...
          </div>
        )}

      </div>
    </div>
  )
}
