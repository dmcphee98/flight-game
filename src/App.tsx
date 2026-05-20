import { useState } from 'react'
import LandingScreen from './components/LandingScreen'
import FlightMap from './components/FlightMap'

type Screen = 'landing' | 'game'

function App() {
  const [screen, setScreen] = useState<Screen>('landing')

  if (screen === 'landing') {
    return (
      <LandingScreen
        onCreateGame={() => setScreen('game')}
        onJoinGame={() => setScreen('game')}
      />
    )
  }

  return <FlightMap />
}

export default App
