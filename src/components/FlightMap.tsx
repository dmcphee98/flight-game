import { useState, useEffect, useMemo } from 'react'
import DeckGL from '@deck.gl/react'
import { IconLayer, PathLayer, TextLayer } from '@deck.gl/layers'
import { Map as MapGL } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import { MAP_STYLES } from '../../constants/mapStyles.ts'
import { buildGameData } from '../utils/buildGameData.ts'
import { easeCubic } from '../utils/easings'
import { buildPath } from '../utils/greatCirclePath.ts'
import {type Airport, type AirportMeta, loadAirportLookup} from '../utils/airportLookup.ts'
import {buildEmitters, getActiveFlights, type RouteEmitter} from "../utils/scheduleFlights.ts";
import {useSimulationClock} from "../hooks/useSimulationClock.ts";
import SimulationControls from "./SimulationControls.tsx";

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
  const [airports, setAirports] = useState<Airport[]>([])
  const [airportMeta, setAirportMeta] = useState<Map<string, AirportMeta>>(new Map())
  const [hoveredAirportId, setHoveredAirportId] = useState<string | null>(null)
  const [selectedAirportIds, setSelectedAirportIds] = useState<Set<string>>(new Set())
  const [emitters, setEmitters] = useState<RouteEmitter[]>([])
  const { simTime, playing, speed, play, pause, setSpeed } = useSimulationClock()

  useEffect(() => {
    Promise.all([loadAirportLookup(), buildGameData()]).then(
      ([lookup, { icaoCodes, routes }]) => {
        setAirports(icaoCodes.flatMap(icao => lookup.get(icao) ?? []))
        setAirportMeta(new Map(icaoCodes.map(icao => [icao, { iconRotation: airportRotation(icao) }])))
        setEmitters(buildEmitters(routes, lookup))
      },
    )
  }, [])

  const { activeFlights, activeEmitters } = useMemo(
      () => getActiveFlights(emitters, simTime),
      [emitters, simTime],
  )

  const routePaths = useMemo(() => {
    const selected = airports.filter(a => selectedAirportIds.has(a.icao))
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
      id: 'flight-ghost-paths',
      data: activeEmitters,
      getPath: e => e.path,
      getColor: [255, 165, 0, 160],
      getWidth: 1,
      widthUnits: 'pixels',
      updateTriggers: { getColor: hoveredAirportId },
    }),
    new IconLayer({
      id: 'aircraft',
      data: activeFlights,
      getPosition: f => f.position,
      getIcon: () => ({ url: '/plane.svg', width: 64, height: 64, mask: true }),
      getSize: 16,
      getAngle: f => -f.heading,
      getColor: [255, 140, 0, 255],
      updateTriggers: { getColor: hoveredAirportId },
    }),
    new PathLayer({
      id: 'routes',
      data: routePaths,
      getPath: d => d,
      getColor: [39, 114, 29, 135],
      getWidth: 4,
      widthUnits: 'pixels',
    }),
    new IconLayer<Airport>({
      id: 'airports-icon',
      data: airports,
      getPosition: d => [d.lon, d.lat],
      getIcon: () => ({ url: '/dot.png', width: 128, height: 128, mask: true }),
      getSize: d => d.icao === hoveredAirportId ? 32 : 24,
      getAngle: d => airportMeta.get(d.icao)?.iconRotation ?? 0,
      getColor: d => selectedAirportIds.has(d.icao) ? AIRPORT_ICON_COLORS.GREEN : AIRPORT_ICON_COLORS.BLACK,
      pickable: true,
      onClick: (info) => {
        if (info.object) {
          setSelectedAirportIds(prev => {
            const next = new Set(prev)
            const id = info.object.icao
            if (next.has(id)) next.delete(id)
            else next.add(id)
            console.log(next)
            return next
          })
        }
      },
      onHover: (info) => {
        setHoveredAirportId(info.object ? info.object.icao : null);
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
    new TextLayer<Airport>({
      id: 'airports-label',
      data: airports,
      getPosition: d => [d.lon, d.lat],
      getText: d => d.iata,
      getSize: d => d.icao === hoveredAirportId ? 26 : 22,
      getColor: d => selectedAirportIds.has(d.icao) ? AIRPORT_LABEL_COLORS.GREEN : AIRPORT_LABEL_COLORS.BLACK,
      getPixelOffset: d => d.icao === hoveredAirportId ? [0, -30] : [0, -26],
      fontFamily: 'Caveat Brush',
      fontWeight: 'normal',
      onHover: (info) => {
        setHoveredAirportId(info.object ? info.object.icao : null);
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
      <SimulationControls
          simTime={simTime}
          playing={playing}
          speed={speed}
          play={play}
          pause={pause}
          setSpeed={setSpeed}
      />

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

/** Deterministic rotation using id characters so it never changes between renders */
function airportRotation(icao: string): number {
  const hash = icao
      .split('')
      .reduce((acc, c) => acc * 31 + c.charCodeAt(0), 0)
  return Math.abs(hash) % 360
}