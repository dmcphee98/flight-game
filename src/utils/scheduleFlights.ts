import { buildPath } from './greatCirclePath.ts'
import type { Airport } from './airportLookup.ts'
import type { Route } from './buildGameData.ts'

/**
 * Precomputed, route-level data used to derive active flights at any sim time.
 *
 * A route emits one flight every `interval` seconds. The first departure on
 * the route is offset by `phase` seconds (deterministically derived from the
 * route key) so that all routes don't depart simultaneously at t=0.
 */
export interface RouteEmitter {
  /** Waypoints along the great-circle path, as [lon, lat] pairs. */
  path: [number, number][]
  /** Seconds between consecutive departures on this route. */
  interval: number
  /** Total airborne time in seconds. */
  duration: number
  /** Departure-time offset in seconds, in [0, interval). */
  phase: number
  /** ICAO code of the departure airport. */
  origin: string
  /** ICAO code of the arrival airport. */
  destination: string
}

/** A single airborne flight at a specific simulation instant. */
export interface ActiveFlight {
  /** Current [lon, lat] interpolated along the great-circle path. */
  position: [number, number]
  /** True bearing in degrees (0 = north, clockwise). */
  heading: number
  /** ICAO code of the departure airport. */
  origin: string
  /** ICAO code of the arrival airport. */
  destination: string
}

/**
 * Convert raw route definitions into {@link RouteEmitter} objects.
 *
 * Should be called once at startup. The returned array is stable and can be
 * passed directly to {@link getActiveFlights} on every animation frame.
 *
 * Routes whose origin or destination is missing from `airports`, or whose
 * great-circle path cannot be computed, are silently skipped.
 */
export function buildEmitters(
  routes: Route[],
  airports: Map<string, Airport>,
): RouteEmitter[] {
  const emitters: RouteEmitter[] = []

  for (const route of routes) {
    const orig = airports.get(route.origin)
    const dest = airports.get(route.destination)
    if (!orig || !dest) continue

    const result = buildPath(orig.lon, orig.lat, dest.lon, dest.lat)
    if (!result) continue

    const path = result.line.geometry.coordinates as [number, number][]
    const interval = 86400 / route.frequency
    const duration = (route.duration ?? route.distance / 800 * 60) * 60
    const phase = hashPhase(`${route.origin}:${route.destination}`, interval)

    emitters.push({ path, interval, duration, phase, origin: route.origin, destination: route.destination })
  }

  return emitters
}

/**
 * Compute which flights are airborne at `simTime` and where they are.
 *
 * For each emitter the function solves for every flight index `n` whose
 * departure time falls within `[simTime - duration, simTime]`, then
 * interpolates its position along the waypoint path.
 *
 * Designed to be called on every animation frame.
 *
 * @param emitters - Precomputed route emitters from {@link buildEmitters}.
 * @param simTime - Elapsed simulation time in seconds.
 * @returns `activeFlights` – one entry per airborne flight with position and heading.
 * @returns `activeEmitters` – the subset of emitters that have at least one active flight.
 */
export function getActiveFlights(
  emitters: RouteEmitter[],
  simTime: number,
): { activeFlights: ActiveFlight[]; activeEmitters: RouteEmitter[] } {
  const activeFlights: ActiveFlight[] = []
  const activeEmitters: RouteEmitter[] = []

  for (const e of emitters) {
    // Isolate flights on the current route which are still airborne:
    // flight n departs at (phase + n*interval) and lands (duration) later i.e.,
    // simTime - duration <= phase + n*interval <= simTime
    // solve for n
    const nMin = Math.ceil((simTime - e.phase - e.duration) / e.interval)
    const nMax = Math.floor((simTime - e.phase) / e.interval)
    let emitterActive = false

    for (let flightIndex = Math.max(0, nMin); flightIndex <= nMax; flightIndex++) {
      const departure_time = e.phase + flightIndex * e.interval
      const progress = (simTime - departure_time) / e.duration // 0 = departed, 1 = arrived
      if (progress >= 0 && progress <= 1) {
        // Interpolate position along the waypoint path
        const last = e.path.length - 1
        const raw = progress * last
        const idx = Math.min(Math.floor(raw), last - 1)
        const frac = raw - idx
        const p0 = e.path[idx]
        const p1 = e.path[idx + 1]
        const position: [number, number] = [
          p0[0] + (p1[0] - p0[0]) * frac,
          p0[1] + (p1[1] - p0[1]) * frac,
        ]
        activeFlights.push({ position, heading: bearingDeg(p0, p1), origin: e.origin, destination: e.destination })
        emitterActive = true
      }
    }

    if (emitterActive) activeEmitters.push(e)
  }

  return { activeFlights, activeEmitters }
}

function bearingDeg(from: [number, number], to: [number, number]): number {
  const toRad = Math.PI / 180
  const lon1 = from[0] * toRad, lat1 = from[1] * toRad
  const lon2 = to[0] * toRad,   lat2 = to[1] * toRad
  const dLon = lon2 - lon1
  const y = Math.sin(dLon) * Math.cos(lat2)
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon)
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360
}

function hashPhase(key: string, interval: number): number {
  let h = 0
  for (let i = 0; i < key.length; i++) {
    h = (Math.imul(31, h) + key.charCodeAt(i)) | 0
  }
  return (Math.abs(h) % Math.max(1, Math.floor(interval)))
}