import { useState, useEffect } from 'react'
import DeckGL from '@deck.gl/react'
import { IconLayer, TextLayer } from '@deck.gl/layers'
import { Map as MapGL } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import { MAP_STYLES } from '../../constants/mapStyles.ts'
import { loadFeaturedAirports, type FeaturedAirport } from '../utils/featureAirports.ts'
import { easeCubic } from '../utils/easings'

const INITIAL_VIEW_STATE = {
  longitude: 5,
  latitude: 20,
  zoom: 2,
}

export default function FlightMap() {
  const [airports, setAirports] = useState<FeaturedAirport[]>([])
  const [hoveredAirportId, setHoveredAirportId] = useState<string | null>(null)

  useEffect(() => {
    loadFeaturedAirports().then(setAirports)
  }, [])

  const layers = [
    new IconLayer<FeaturedAirport>({
      id: 'airports-icon',
      data: airports,
      getPosition: d => [d.lon, d.lat],
      getIcon: () => ({ url: '/dot.png', width: 128, height: 128, mask: true }),
      getSize: d => d.iata === hoveredAirportId ? 32 : 24,
      getAngle: d => d.rotation,
      getColor: [0, 0, 0, 255],
      pickable: true,
      onClick: (info) => {
        if (info.object) console.log(info.object)
      },
      onHover: (info) => {
        setHoveredAirportId(info.object ? info.object.iata : null);
      },
      updateTriggers: {
        getSize: hoveredAirportId,
      },
      transitions: {
        getSize: { duration: 150, easing: easeCubic },
      }
    }),
    new TextLayer<FeaturedAirport>({
      id: 'airports-label',
      data: airports,
      getPosition: d => [d.lon, d.lat],
      getText: d => d.iata,
      getSize: d => d.iata === hoveredAirportId ? 26 : 22,
      getColor: [0, 0, 0, 200],
      getPixelOffset: d => d.iata === hoveredAirportId ? [0, -30] : [0, -26],
      fontFamily: 'Caveat Brush',
      fontWeight: 'normal',
      onHover: (info) => {
        setHoveredAirportId(info.object ? info.object.id : null);
      },
      updateTriggers: {
        getSize: hoveredAirportId,
        getPixelOffset: hoveredAirportId,
      },
      transitions: {
        getSize: { duration: 150, easing: easeCubic },
        getPixelOffset: { duration: 150, easing: easeCubic },
      }
    }),
  ]

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>

      <DeckGL
          initialViewState={INITIAL_VIEW_STATE}
          getCursor={({ isHovering }) => isHovering ? 'pointer' : 'grab'}
          controller={true}
          layers={layers}
      >
        <MapGL mapStyle={MAP_STYLES.STADIA_STAMEN_WATERCOLOR}/>
      </DeckGL>
    </div>
  )
}
