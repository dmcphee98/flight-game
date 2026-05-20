import LandingScreen from './components/LandingScreen'
import FlightMap from './components/FlightMap'
import { useGameServer } from './hooks/useGameServer.ts'
import type { ConnectionStatus } from './hooks/useGameServer.ts'

type Screen = 'landing' | 'waiting' | 'game' | 'disconnected'

function getScreenFor(status: ConnectionStatus): Screen {
  switch (status) {
    case 'room_created':
    case 'room_joined':
      return 'waiting'

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
      <div>This is the waiting room. Room code: {gameState.roomCode}</div>
  )

  return <FlightMap />
}
