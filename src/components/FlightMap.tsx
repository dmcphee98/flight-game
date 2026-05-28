import { useState, useEffect, useMemo, useRef } from 'react'
import { MapboxOverlay } from '@deck.gl/mapbox'
import { IconLayer, PathLayer, TextLayer } from '@deck.gl/layers'
import { Map as MapGL, useControl } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import { MAP_STYLES } from '../../constants/mapStyles.ts'
import { buildGameData } from '../utils/buildGameData.ts'
import { easeCubic } from '../utils/easings'
import {type Airport, type AirportMeta, loadAirportLookup} from '../utils/airportLookup.ts'
import {buildEmitters, getActiveFlights, getCompletedFlights, type RouteEmitter} from "../utils/scheduleFlights.ts";
import {useSimulationClock} from "../hooks/useSimulationClock.ts";
import SimulationControls from "./SimulationControls.tsx";
import { MAP_COLORS, withAlpha, TRANSPARENT } from '../utils/mapColors.ts'
import {asset} from "../utils/asset.ts";
import type { Layer } from '@deck.gl/core'

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
  const [purchasedAirportIds, setPurchasedAirportIds] = useState<Set<string>>(new Set())
  const [emitters, setEmitters] = useState<RouteEmitter[]>([])
  const [viewMode, setViewMode] = useState<'outgoing' | 'incoming'>('outgoing')
  const [labelsVisible, setLabelsVisible] = useState(INITIAL_VIEW_STATE.zoom > LABEL_ZOOM_THRESHOLD)
  const [fontReady, setFontReady] = useState(false)
  const [prices, setPrices] = useState<Map<string, number>>(new Map())
  const [money, setMoney] = useState(10)

  const { simTime, playing, speed, play, pause, setSpeed } = useSimulationClock()

  const zoomRef = useRef(INITIAL_VIEW_STATE.zoom)
  const prevSimTimeRef = useRef<number | null>(null)

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
    const prev = prevSimTimeRef.current
    prevSimTimeRef.current = simTime
    if (prev === null) return
    const earned = getCompletedFlights(emitters, prev, simTime).filter(
      f => purchasedAirportIds.has(f.origin) && purchasedAirportIds.has(f.destination)
    ).length
    if (earned > 0) setMoney(m => m + earned)
  }, [simTime, emitters, purchasedAirportIds])

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
    const selected = [...purchasedAirportIds]
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
  }, [purchasedAirportIds, routePathByKey])

  const layers = [
    new PathLayer({
      id: 'flight-ghost-paths',
      data: emitters,
      wrapLongitude: true,
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
      getIcon: () => ({
        url: asset('plane.svg'), width: 64, height: 64, mask: true
      }),
      getSize: 16,
      getAngle: f => -f.heading,
      getColor: f => {
        const hoverMatch = viewMode === 'outgoing' ? f.origin : f.destination
        if (purchasedAirportIds.has(f.origin) && purchasedAirportIds.has(f.destination)) return withAlpha(MAP_COLORS.SELECTED_PRIMARY, 0.6)
        if (hoverMatch === hoveredAirportId) return withAlpha(MAP_COLORS.DEFAULT_PRIMARY, 0.6)
        return TRANSPARENT
      },
    }),
    new PathLayer({
      id: 'routes',
      data: routePaths,
      wrapLongitude: true,
      getPath: d => d,
      getColor: withAlpha(MAP_COLORS.SELECTED_PRIMARY, 0.4),
      getWidth: 3,
      widthUnits: 'pixels',
    }),
    new IconLayer<Airport>({
      id: 'airports-icon',
      data: airports,
      getPosition: d => [d.lon, d.lat],
      getIcon: () => ({
        url: asset('dot.png'), width: 128, height: 128, mask: true
      }),
      getSize: d => d.icao === hoveredAirportId ? 120000 : 100000,
      sizeUnits: 'meters',
      sizeMinPixels: 8,
      sizeMaxPixels: 20,
      getAngle: d => airportMeta.get(d.icao)?.iconRotation ?? 0,
      getColor: d => purchasedAirportIds.has(d.icao)
          ? withAlpha(MAP_COLORS.SELECTED_SECONDARY, 1)
          : withAlpha(MAP_COLORS.DEFAULT_SECONDARY, 1),
      pickable: true,
      onClick: (info) => {
        if (!info.object) return
        const id = info.object.icao
        if (purchasedAirportIds.has(id)) return
        const price = prices.get(id) ?? 0
        if (money < price) return
        setPurchasedAirportIds(prev => new Set(prev).add(id))
        setMoney(m => m - price)
      },
      onHover: (info) => {
        setHoveredAirportId(info.object ? info.object.icao : null);
      },
      updateTriggers: {
        getSize: hoveredAirportId,
        getColor: purchasedAirportIds.size,
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
      getIcon: () => ({
        url: asset('airport-tag-background.png'), width: 353, height: 80, mask: true
      }),
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
      getIcon: () => ({
        url: asset('airport-tag.png'), width: 353, height: 80, mask: true
      }),
      getColor: d => purchasedAirportIds.has(d.icao)
          ? withAlpha(MAP_COLORS.SELECTED_PRIMARY, 0.7)
          : withAlpha(MAP_COLORS.DEFAULT_PRIMARY, 0.7),
      getSize: 23,
      sizeUnits: 'pixels',
      getPixelOffset: [60, 0],
      updateTriggers: {
        getColor: purchasedAirportIds.size,
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
      getColor: d => purchasedAirportIds.has(d.icao)
          ? withAlpha(MAP_COLORS.SELECTED_PRIMARY, 0.8)
          : withAlpha(MAP_COLORS.DEFAULT_PRIMARY, 0.8),
      getPixelOffset: [28, 1],
      getTextAnchor: 'start',
      fontFamily: fontReady ? 'Courier Prime' : 'monospace',
      fontWeight: 'bold',
      updateTriggers: {
        getColor: purchasedAirportIds.size,
      },
    }),
    new TextLayer<Airport>({
      id: 'airports-tag-price',
      visible: labelsVisible,
      data: airports,
      getPosition: d => [d.lon, d.lat],
      getText: d => `\u00A2${(prices.get(d.icao) ?? 0).toString().padStart(2, '0')}`,
      getSize: 18,
      sizeUnits: 'pixels',
      getColor: [240, 240, 240, 255],
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
          money={money}
      />

      <MapGL
          maxZoom={5}
          minZoom={1.7}
          initialViewState={INITIAL_VIEW_STATE}
          mapStyle={MAP_STYLES.STADIA_STAMEN_WATERCOLOR}
          onMove={({ viewState }) => {
            // Toggles label visibility when the zoom level crosses LABEL_ZOOM_THRESHOLD
            const currentZoom = (viewState as { zoom: number }).zoom
            const previousZoom = zoomRef.current
            const crossed = (currentZoom > LABEL_ZOOM_THRESHOLD) !== (previousZoom > LABEL_ZOOM_THRESHOLD)
            zoomRef.current = currentZoom
            if (crossed) setLabelsVisible(currentZoom > LABEL_ZOOM_THRESHOLD)
          }}
      >

        <DeckGLOverlay layers={layers} />
      </MapGL>
    </div>
  )
}

/**
 * Renders deck.gl layers inside a MapLibre map via MapboxOverlay.
 *
 * Using MapboxOverlay rather than the standalone DeckGL component means
 * deck.gl renders within MapLibre's GL context, inheriting world-copy
 * rendering so layers appear on all map copies and across the antimeridian.
 */
function DeckGLOverlay({ layers }: { layers: Layer[] }) {
  const overlay = useControl(
      () => new MapboxOverlay({ layers, interleaved: true })
  )
  overlay.setProps({ layers })
  return null
}

/** Deterministic rotation using id characters so it never changes between renders */
function airportRotation(icao: string): number {
  const hash = icao
      .split('')
      .reduce((acc, c) => acc * 31 + c.charCodeAt(0), 0)
  return Math.abs(hash) % 360
}