import DeckGL from '@deck.gl/react'
import { Map as MapGL } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import { MAP_STYLES } from '../../constants/mapStyles.ts'

const INITIAL_VIEW_STATE = {
  longitude: 0,
  latitude: 0,
  zoom: 3,
}

export default function FlightMap() {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>

      <DeckGL initialViewState={INITIAL_VIEW_STATE} controller={true}>
        <MapGL mapStyle={MAP_STYLES.STADIA_STAMEN_WATERCOLOR}/>
      </DeckGL>
    </div>
  )
}
