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
import {useRoutes} from "../hooks/useRoutes.ts";
import GameHud from "./GameHud.tsx";
import MapAttribution from "./MapAttribution.tsx";
import { MAP_COLORS, withAlpha, TRANSPARENT } from '../utils/mapColors.ts'
import {asset} from "../utils/asset.ts";
import type { Layer } from '@deck.gl/core'

const LABEL_ZOOM_THRESHOLD = 4.5


const INITIAL_VIEW_STATE = {
  longitude: 5,
  latitude: 20,
  zoom: 2,
}

interface Props {
  startsAtMs: number | null
}

export default function FlightMap({ startsAtMs }: Props) {
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
  const [hoveredRouteEmitter, setHoveredRouteEmitter] = useState<RouteEmitter | null>(null)

  const { simTime, play } = useSimulationClock()

  useEffect(() => {
    if (startsAtMs === null) return
    const delay = startsAtMs - Date.now()
    if (delay <= 0) { play(); return }
    const id = setTimeout(play, delay)
    return () => clearTimeout(id)
  }, [startsAtMs, play])

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

  const { allRoutes, hoveredRoutes, purchasedRoutes} = useRoutes(
      emitters,
      purchasedAirportIds,
      hoveredAirportId,
      hoveredRouteEmitter,
  )

  const layers = [
    new PathLayer<RouteEmitter>({
      id: 'routes-default',
      data: allRoutes,
      wrapLongitude: true,
      getPath: e => e.path,
      getColor: withAlpha(MAP_COLORS.DEFAULT_PRIMARY, 0.3),
      getWidth: labelsVisible ? 4 : 1,
      widthUnits: 'pixels',
      pickable: true,
      onHover: (info) => setHoveredRouteEmitter(info.object ?? null),
      updateTriggers: {
        getWidth: labelsVisible,
      },
    }),
    new PathLayer<RouteEmitter>({
      id: 'routes-hovered',
      data: hoveredRoutes,
      wrapLongitude: true,
      getPath: e => e.path,
      getColor: withAlpha(MAP_COLORS.DEFAULT_PRIMARY, 0.75),
      getWidth: labelsVisible ? 4 : 2,
      widthUnits: 'pixels',
      widthMinPixels: 1,
    }),
    new PathLayer({
      id: 'routes-purchased',
      data: purchasedRoutes,
      wrapLongitude: true,
      getPath: d => d.path,
      getColor: withAlpha(MAP_COLORS.SELECTED_PRIMARY, 0.6),
      getWidth: 4,
      widthUnits: 'pixels',
    }),
    new IconLayer({
      id: 'aircraft',
      data: activeFlights,
      getPosition: f => f.position,
      getIcon: () => ({
        url: asset('plane.svg'), width: 64, height: 64, mask: true
      }),
      getSize: 18,
      getAngle: f => -f.heading,
      getColor: f => {
        const hoverMatch = viewMode === 'outgoing' ? f.origin : f.destination
        if (purchasedAirportIds.has(f.origin) && purchasedAirportIds.has(f.destination)) return withAlpha(MAP_COLORS.SELECTED_PRIMARY, 0.8)
        if (hoverMatch === hoveredAirportId) return withAlpha(MAP_COLORS.DEFAULT_PRIMARY, 1)
        if (hoveredRouteEmitter && flightOnRoute(f, hoveredRouteEmitter)) return withAlpha(MAP_COLORS.DEFAULT_PRIMARY, 1)
        return TRANSPARENT
      },
    }),
    new IconLayer<Airport>({
      id: 'airports-icon',
      data: airports,
      getPosition: d => [d.lon, d.lat],
      getIcon: () => ({
        url: asset('dot.png'), width: 128, height: 128, mask: true
      }),
      getSize: 100000,
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
  ]

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: '100%',
      backgroundColor: '#68bdd4',
    }}>
      <GameHud simTime={simTime} money={money} />

      <MapGL
          maxZoom={5}
          minZoom={1.7}
          initialViewState={INITIAL_VIEW_STATE}
          mapStyle={MAP_STYLES.STADIA_STAMEN_WATERCOLOR}
          attributionControl={false}
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
      <MapAttribution />
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
      () => new MapboxOverlay({
        layers,
        interleaved: true,
        pickingRadius: 10,
        getCursor: ({ isHovering }) => isHovering ? 'pointer' : 'grab' })
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

function flightOnRoute(f: { origin: string; destination: string }, e: RouteEmitter): boolean {
  return (f.origin === e.origin && f.destination === e.destination)
      || (f.origin === e.destination && f.destination === e.origin)
}