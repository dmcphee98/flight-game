import { useState, useEffect, useMemo, useRef } from 'react'
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
import { MAP_COLORS, withAlpha, TRANSPARENT } from '../utils/mapColors.ts'

const LABEL_ZOOM_THRESHOLD = 4.5

const INITIAL_VIEW_STATE = {
  longitude: 5,
  latitude: 20,
  zoom: 2,
}


export default function FlightMap() {
  const [airports, setAirports] = useState<Airport[]>([])
  const [airportMeta, setAirportMeta] = useState<Map<string, AirportMeta>>(new Map())
  const [hoveredAirportId, setHoveredAirportId] = useState<string | null>(null)
  const [selectedAirportIds, setSelectedAirportIds] = useState<Set<string>>(new Set())
  const [emitters, setEmitters] = useState<RouteEmitter[]>([])
  const [viewMode, setViewMode] = useState<'outgoing' | 'incoming'>('outgoing')
  const [labelsVisible, setLabelsVisible] = useState(INITIAL_VIEW_STATE.zoom > LABEL_ZOOM_THRESHOLD)
  const [fontReady, setFontReady] = useState(false)
  const [prices, setPrices] = useState<Map<string, number>>(new Map())

  const { simTime, playing, speed, play, pause, setSpeed } = useSimulationClock()

  const zoomRef = useRef(INITIAL_VIEW_STATE.zoom)

  useEffect(() => {
    document.fonts.load('bold 18px "Courier Prime"').then(() => setFontReady(true))
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'x') setViewMode(m => m === 'outgoing' ? 'incoming' : 'outgoing')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    Promise.all([loadAirportLookup(), buildGameData()]).then(
      ([lookup, { icaoCodes, routes, prices }]) => {
        setAirports(icaoCodes.flatMap(icao => lookup.get(icao) ?? []))
        setAirportMeta(new Map(icaoCodes.map(icao => [icao, { iconRotation: airportRotation(icao) }])))
        setEmitters(buildEmitters(routes, lookup))
        setPrices(prices)
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
        if (match === hoveredAirportId) return withAlpha(MAP_COLORS.DEFAULT_PRIMARY, 0.4)
        return TRANSPARENT
      },
      getWidth: 1,
      widthUnits: 'pixels',
      updateTriggers: { getColor: [hoveredAirportId, viewMode] },
      transitions: {
        getColor: { duration: 50, easing: easeCubic },
      }
    }),
    new IconLayer({
      id: 'aircraft',
      data: activeFlights,
      getPosition: f => f.position,
      getIcon: () => ({ url: '/plane.svg', width: 64, height: 64, mask: true }),
      getSize: 16,
      getAngle: f => -f.heading,
      getColor: f => {
        const hoverMatch = viewMode === 'outgoing' ? f.origin : f.destination
        if (selectedAirportIds.has(f.origin) && selectedAirportIds.has(f.destination)) return withAlpha(MAP_COLORS.SELECTED_PRIMARY, 0.6)
        if (hoverMatch === hoveredAirportId) return withAlpha(MAP_COLORS.DEFAULT_PRIMARY, 0.6)
        return TRANSPARENT
      },
    }),
    new PathLayer({
      id: 'routes',
      data: routePaths,
      getPath: d => d,
      getColor: withAlpha(MAP_COLORS.SELECTED_PRIMARY, 0.4),
      getWidth: 3,
      widthUnits: 'pixels',
    }),
    new IconLayer<Airport>({
      id: 'airports-icon',
      data: airports,
      getPosition: d => [d.lon, d.lat],
      getIcon: () => ({ url: '/dot.png', width: 128, height: 128, mask: true }),
      getSize: d => d.icao === hoveredAirportId ? 120000 : 100000,
      sizeUnits: 'meters',
      sizeMinPixels: 8,
      sizeMaxPixels: 20,
      getAngle: d => airportMeta.get(d.icao)?.iconRotation ?? 0,
      getColor: d => selectedAirportIds.has(d.icao)
          ? withAlpha(MAP_COLORS.SELECTED_SECONDARY, 1)
          : withAlpha(MAP_COLORS.DEFAULT_SECONDARY, 1),
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
        getColor: selectedAirportIds.size,
      },
      transitions: {
        getSize: { duration: 150, easing: easeCubic },
      }
    }),
    new IconLayer<Airport>({
      id: 'airport-tag-background-icon',
      visible: labelsVisible,
      data: airports,
      getPosition: d => [d.lon, d.lat],
      getIcon: () => ({ url: '/airport-tag-background.png', width: 353, height: 80, mask: true }),
      getSize: 23,
      getColor: [255, 255, 255, 200],
      sizeUnits: 'pixels',
      getPixelOffset: [60, 0],
    }),
    new IconLayer<Airport>({
      id: 'airports-tag-icon',
      visible: labelsVisible,
      data: airports,
      getPosition: d => [d.lon, d.lat],
      getIcon: () => ({ url: '/airport-tag.png', width: 353, height: 80, mask: true }),
      getColor: d => selectedAirportIds.has(d.icao)
          ? withAlpha(MAP_COLORS.SELECTED_PRIMARY, 0.7)
          : withAlpha(MAP_COLORS.DEFAULT_PRIMARY, 0.7),
      getSize: 23,
      sizeUnits: 'pixels',
      getPixelOffset: [60, 0],
      updateTriggers: {
        getColor: selectedAirportIds.size,
      },
    }),
    new TextLayer<Airport>({
      id: 'airports-tag-iata',
      visible: labelsVisible,
      data: airports,
      getPosition: d => [d.lon, d.lat],
      getText: d => d.iata,
      getSize: 18,
      sizeUnits: 'pixels',
      getColor: d => selectedAirportIds.has(d.icao)
          ? withAlpha(MAP_COLORS.SELECTED_PRIMARY, 0.8)
          : withAlpha(MAP_COLORS.DEFAULT_PRIMARY, 0.8),
      getPixelOffset: [28, 1],
      getTextAnchor: 'start',
      fontFamily: fontReady ? 'Courier Prime' : 'monospace',
      fontWeight: 'bold',
      updateTriggers: {
        getColor: selectedAirportIds.size,
      },
    }),
    new TextLayer<Airport>({
      id: 'airports-tag-price',
      visible: labelsVisible,
      data: airports,
      getPosition: d => [d.lon, d.lat],
      getText: d => `c${(prices.get(d.icao) ?? 0).toString().padStart(2, '0')}`,
      getSize: 18,
      sizeUnits: 'pixels',
      getColor: [230, 230, 230, 255],
      getPixelOffset: [103, 1],
      getTextAnchor: 'end',
      fontFamily: fontReady ? 'Courier Prime' : 'monospace',
      fontWeight: 'bold',
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
          onViewStateChange={({ viewState }) => {
            // Toggles label visibility when the zoom level crosses LABEL_ZOOM_THRESHOLD
            const currentZoom = (viewState as { zoom: number }).zoom
            const previousZoom = zoomRef.current
            const crossed = (currentZoom > LABEL_ZOOM_THRESHOLD) !== (previousZoom > LABEL_ZOOM_THRESHOLD)
            zoomRef.current = currentZoom
            if (crossed) setLabelsVisible(currentZoom > LABEL_ZOOM_THRESHOLD)
          }}
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