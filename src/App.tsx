import LandingScreen from './components/LandingScreen'
import FlightMap from './components/FlightMap'
import WaitingRoom from './components/WaitingRoom'
import CountdownOverlay from './components/CountdownOverlay'
import { useGameServer } from './hooks/useGameServer.ts'
import type { ConnectionStatus } from './hooks/useGameServer.ts'

type Screen = 'landing' | 'waiting' | 'game'

function getScreenFor(status: ConnectionStatus): Screen {
  switch (status) {
    case 'room_created':
    case 'room_joined':
      return 'waiting'

    case 'game_started':
      return 'game'

    default:
      return 'landing'
  }
}

export default function App() {
  const { gameState, status, sendMessage } = useGameServer()

  const screen = getScreenFor(status)

  if (screen === 'landing') return (
    <LandingScreen
      onCreateGame={(playerName) => sendMessage({ type: 'create_room', player_name: playerName })}
      onJoinGame={(playerName, roomCode) => sendMessage({ type: 'join_room', room_code: roomCode, player_name: playerName })}
      isConnecting={status === 'connecting'}
    />
  )

  if (screen === 'waiting') return (
    <WaitingRoom
      roomCode={gameState.roomCode!}
      players={gameState.players}
      isHost={gameState.myPlayerId === gameState.hostId}
      onStart={() => sendMessage({ type: 'start_game' })}
    />
  )

  return (
    <div className="relative w-full h-screen">
      <FlightMap startsAtMs={gameState.startsAtMs} />
      {gameState.startsAtMs !== null && (
        <CountdownOverlay startsAtMs={gameState.startsAtMs} />
      )}
    </div>
  )
}
