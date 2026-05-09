import { useState, useEffect, useMemo } from 'react'
import DeckGL from '@deck.gl/react'
import { IconLayer, PathLayer, TextLayer } from '@deck.gl/layers'
import { Map as MapGL } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import { MAP_STYLES } from '../../constants/mapStyles.ts'
import { loadFeaturedAirports, type FeaturedAirport } from '../utils/featureAirports.ts'
import { easeCubic } from '../utils/easings'
import { buildPath } from '../utils/greatCirclePath.ts'

const INITIAL_VIEW_STATE = {
  longitude: 5,
  latitude: 20,
  zoom: 2,
}

const AIRPORT_ICON_COLORS = {
  BLACK: [0, 0, 0, 215],
  GREEN: [39, 114, 29, 235],
} as const;

const AIRPORT_LABEL_COLORS = {
  BLACK: [0, 0, 0, 215],
  GREEN: [39, 114, 29, 235],
} as const;

export default function FlightMap() {
  const [airports, setAirports] = useState<FeaturedAirport[]>([])
  const [hoveredAirportId, setHoveredAirportId] = useState<string | null>(null)
  const [selectedAirportIds, setSelectedAirportIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadFeaturedAirports().then(setAirports)
  }, [])

  const routePaths = useMemo(() => {
    const selected = airports.filter(a => selectedAirportIds.has(a.iata))
    const paths: [number, number][][] = []
    for (let i = 0; i < selected.length; i++) {
      for (let j = i + 1; j < selected.length; j++) {
        const result = buildPath(selected[i].lon, selected[i].lat, selected[j].lon, selected[j].lat)
        if (result) paths.push(result.line.geometry.coordinates as [number, number][])
      }
    }
    return paths
  }, [airports, selectedAirportIds])

  const layers = [
    new PathLayer({
      id: 'routes',
      data: routePaths,
      getPath: d => d,
      getColor: [39, 114, 29, 135],
      getWidth: 4,
      widthUnits: 'pixels',
    }),
    new IconLayer<FeaturedAirport>({
      id: 'airports-icon',
      data: airports,
      getPosition: d => [d.lon, d.lat],
      getIcon: () => ({ url: '/dot.png', width: 128, height: 128, mask: true }),
      getSize: d => d.iata === hoveredAirportId ? 32 : 24,
      getAngle: d => d.rotation,
      getColor: d => selectedAirportIds.has(d.iata) ? AIRPORT_ICON_COLORS.GREEN : AIRPORT_ICON_COLORS.BLACK,
      pickable: true,
      onClick: (info) => {
        if (info.object) {
          setSelectedAirportIds(prev => {
            const next = new Set(prev)
            const id = info.object.iata
            if (next.has(id)) next.delete(id)
            else next.add(id)
            console.log(next)
            return next
          })
        }
      },
      onHover: (info) => {
        setHoveredAirportId(info.object ? info.object.iata : null);
      },
      updateTriggers: {
        getSize: hoveredAirportId,
        getColor: [...selectedAirportIds].sort().join(','),
      },
      transitions: {
        getSize: { duration: 150, easing: easeCubic },
        getColor: { duration: 200, easing: easeCubic },
      }
    }),
    new TextLayer<FeaturedAirport>({
      id: 'airports-label',
      data: airports,
      getPosition: d => [d.lon, d.lat],
      getText: d => d.iata,
      getSize: d => d.iata === hoveredAirportId ? 26 : 22,
      getColor: d => selectedAirportIds.has(d.iata) ? AIRPORT_LABEL_COLORS.GREEN : AIRPORT_LABEL_COLORS.BLACK,
      getPixelOffset: d => d.iata === hoveredAirportId ? [0, -30] : [0, -26],
      fontFamily: 'Caveat Brush',
      fontWeight: 'normal',
      onHover: (info) => {
        setHoveredAirportId(info.object ? info.object.iata : null);
      },
      updateTriggers: {
        getSize: hoveredAirportId,
        getPixelOffset: hoveredAirportId,
        getColor: [...selectedAirportIds].sort().join(','),
      },
      transitions: {
        getSize: { duration: 150, easing: easeCubic },
        getPixelOffset: { duration: 150, easing: easeCubic },
        getColor: { duration: 200, easing: easeCubic },
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
