import { useState } from 'react'

interface Props {
  onCreateGame: (playerName: string) => void
  onJoinGame: (playerName: string, roomCode: string) => void
  isConnecting: boolean
}

export default function LandingScreen({ onCreateGame, onJoinGame, isConnecting }: Props) {
  const [playerName, setPlayerName] = useState('')
  const [roomCode, setRoomCode] = useState('')
  const [roomError, setRoomError] = useState<string | null>(null)

  const trimmedName = playerName.trim()
  const trimmedCode = roomCode.trim()
  const nameValid = trimmedName.length > 0

  const handleCreate = () => {
    if (!nameValid || isConnecting) return
    onCreateGame(trimmedName)
  }

  const handleJoin = () => {
    if (!nameValid || !trimmedCode || isConnecting) return
    if (trimmedCode.length < 4) {
      setRoomError('Room not found')
      return
    }
    setRoomError(null)
    onJoinGame(trimmedName, trimmedCode)
  }

  const handleRoomCodeChange = (v: string) => {
    setRoomCode(v.toUpperCase())
    if (roomError) setRoomError(null)
  }

  return (
    <div className="w-full h-screen flex items-center justify-center bg-stone-100 font-mono">
      <div className="bg-white rounded-xl px-12 py-10 w-full max-w-2xl shadow-lg border border-stone-300">

        {/* Title */}
        <div className="text-center mb-8">
          <div className="font-caveat text-5xl leading-none text-amber-900">
            ✈ flight game
          </div>
          <div className="text-sm text-stone-500 mt-1.5 tracking-wider font-courier">
            subheading goes here
          </div>
        </div>

        {/* Shared name field */}
        <div className="flex flex-col gap-1.5 mb-7">
          <label className="text-xs text-stone-500 tracking-wider font-courier">
            your name
          </label>
          <input
            className="font-courier text-base px-3 py-2.5 rounded-md border-2 border-stone-300 text-stone-800 bg-stone-50 outline-none w-full"
            type="text"
            placeholder="e.g. Dean"
            value={playerName}
            onChange={e => setPlayerName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleCreate() }}
            maxLength={24}
            autoFocus
          />
        </div>

        {/* Two-path panels */}
        <div className="flex gap-8 items-start">

          {/* Create */}
          <div className="flex-1 flex flex-col">
            <div className="font-caveat text-2xl text-amber-900 mb-2">
              create game
            </div>
            <div className="text-sm text-stone-500 leading-relaxed mb-4 font-courier">
              Start a new room and share the code with friends.
            </div>
            <button
              className={`font-courier font-bold text-sm px-5 py-2.5 rounded-md w-full tracking-wide bg-amber-900 text-white border-none transition-opacity ${!nameValid || isConnecting ? 'opacity-35 cursor-not-allowed' : 'cursor-pointer'}`}
              onClick={handleCreate}
              disabled={!nameValid || isConnecting}
            >
              Create game
            </button>
          </div>

          {/* Divider */}
          <div className="w-px self-stretch bg-stone-300 shrink-0 mt-1" />

          {/* Join */}
          <div className="flex-1 flex flex-col">
            <div className="font-caveat text-2xl text-amber-900 mb-2">
              join game
            </div>
            <div className="text-sm text-stone-500 leading-relaxed mb-4 font-courier">
              Enter a room code to join an existing game.
            </div>
            <div className="flex flex-col gap-1.5 mb-3">
              <label className="text-xs text-stone-500 tracking-wider font-courier">
                room code
              </label>
              <input
                className={`font-courier text-base px-3 py-2.5 rounded-md border-2 text-stone-800 bg-stone-50 outline-none w-full uppercase tracking-widest ${roomError ? 'border-red-600' : 'border-stone-300'}`}
                type="text"
                placeholder="e.g. XKCD42"
                value={roomCode}
                onChange={e => handleRoomCodeChange(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleJoin() }}
                maxLength={8}
              />
              {roomError && (
                <span className="text-xs text-red-600 font-courier">
                  {roomError}
                </span>
              )}
            </div>
            <button
              className={`font-courier font-bold text-sm px-5 py-2.5 rounded-md w-full tracking-wide bg-transparent text-amber-900 border-2 border-amber-900 transition-opacity ${!nameValid || !trimmedCode || isConnecting ? 'opacity-35 cursor-not-allowed' : 'cursor-pointer'}`}
              onClick={handleJoin}
              disabled={!nameValid || !trimmedCode || isConnecting}
            >
              Join game
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}
