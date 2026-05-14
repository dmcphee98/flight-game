import { useState, useEffect, useMemo } from 'react'
import DeckGL from '@deck.gl/react'
import { IconLayer, PathLayer, TextLayer } from '@deck.gl/layers'
import { Map as MapGL } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import { MAP_STYLES } from '../../constants/mapStyles.ts'
import { buildGameData } from '../utils/buildGameData.ts'
import { easeCubic } from '../utils/easings'
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
  const [viewMode, setViewMode] = useState<'outgoing' | 'incoming'>('outgoing')
  const { simTime, playing, speed, play, pause, setSpeed } = useSimulationClock()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'x') setViewMode(m => m === 'outgoing' ? 'incoming' : 'outgoing')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    Promise.all([loadAirportLookup(), buildGameData()]).then(
      ([lookup, { icaoCodes, routes }]) => {
        setAirports(icaoCodes.flatMap(icao => lookup.get(icao) ?? []))
        setAirportMeta(new Map(icaoCodes.map(icao => [icao, { iconRotation: airportRotation(icao) }])))
        setEmitters(buildEmitters(routes, lookup))
      },
    )
  }, [])

  const { activeFlights } = useMemo(
      () => getActiveFlights(emitters, simTime),
      [emitters, simTime],
  )

  /**
   * Sorted `"ICAO-ICAO"` key → great-circle path for that route.
   * Built once when emitters arrive for O(1) lookup.
   */
  const routePathByKey = useMemo(() => {
    const map = new Map<string, [number, number][]>()
    for (const e of emitters) {
      const key = e.origin < e.destination
          ? `${e.origin}-${e.destination}`
          : `${e.destination}-${e.origin}`
      if (!map.has(key)) map.set(key, e.path)
    }
    return map
  }, [emitters])

  /**
   * Great-circle paths between every pair of currently selected airports that
   * has a route between them. Rendered as solid lines on top of the map.
   */
  const routePaths = useMemo(() => {
    const selected = [...selectedAirportIds]
    const paths: [number, number][][] = []
    for (let i = 0; i < selected.length; i++) {
      for (let j = i + 1; j < selected.length; j++) {
        const a = selected[i], b = selected[j]
        const key = a < b ? `${a}-${b}` : `${b}-${a}`
        const path = routePathByKey.get(key)
        if (path) paths.push(path)
      }
    }
    return paths
  }, [selectedAirportIds, routePathByKey])

  const layers = [
    new PathLayer({
      id: 'flight-ghost-paths',
      data: emitters,
      getPath: e => e.path,
      getColor: e => {
        const match = viewMode === 'outgoing' ? e.origin : e.destination
        if (match !== hoveredAirportId) return [0, 0, 0, 0]
        return viewMode === 'outgoing' ? [145, 67, 232, 140] : [81, 201, 45, 160]
      },
      getWidth: 1,
      widthUnits: 'pixels',
      updateTriggers: { getColor: [hoveredAirportId, viewMode] },
    }),
    new IconLayer({
      id: 'aircraft',
      data: activeFlights,
      getPosition: f => f.position,
      getIcon: () => ({ url: '/plane.svg', width: 64, height: 64, mask: true }),
      getSize: 16,
      getAngle: f => -f.heading,
      getColor: f => {
        const match = viewMode === 'outgoing' ? f.origin : f.destination
        if (match !== hoveredAirportId) return [0, 0, 0, 0]
        return viewMode === 'outgoing' ? [145, 67, 232, 200] : [81, 201, 45, 255]
      },
      updateTriggers: { getColor: [hoveredAirportId, viewMode] },
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