import { useMemo } from 'react'
import type { RouteEmitter } from '../utils/scheduleFlights.ts'

/**
 * Derives the three route sets needed by the map layers from raw emitter data.
 *
 * Emitters are bidirectional (one per direction), so the hook deduplicates them
 * internally using a sorted `"ICAO-ICAO"` key before building any derived data.
 *
 * @param emitters - All route emitters produced by {@link buildEmitters}.
 * @param purchasedAirportIds - Set of ICAO codes the player currently owns.
 * @param hoveredAirportId - ICAO of the airport under the cursor, or `null`.
 *
 * @returns
 * - `allRoutes` — every unique route; stable reference until emitters change.
 * - `purchasedRoutes` — routes where the player owns both endpoints.
 * - `hoveredRoutes` — routes touching the hovered airport; empty array when none.
 * - `maxRouteFrequency` — highest flights-per-day across all routes, used to
 *   normalize width in the hover layer.
 */
export function useRoutes(
  emitters: RouteEmitter[],
  purchasedAirportIds: Set<string>,
  hoveredAirportId: string | null,
) {
  const routeToEmitterMap = useMemo(() => {
    const map = new Map<string, RouteEmitter>()
    for (const e of emitters) {
      const key = e.origin < e.destination
        ? `${e.origin}-${e.destination}`
        : `${e.destination}-${e.origin}`
      if (!map.has(key)) map.set(key, e)
    }
    return map
  }, [emitters])

  const allRoutes = useMemo(() => [...routeToEmitterMap.values()], [routeToEmitterMap])

  const purchasedRoutes = useMemo(() => {
    const selected = [...purchasedAirportIds]
    const routes: RouteEmitter[] = []
    for (let i = 0; i < selected.length; i++) {
      for (let j = i + 1; j < selected.length; j++) {
        const a = selected[i], b = selected[j]
        const key = a < b ? `${a}-${b}` : `${b}-${a}`
        const route = routeToEmitterMap.get(key)
        if (route) routes.push(route)
      }
    }
    return routes
  }, [purchasedAirportIds, routeToEmitterMap])

  const airportToEmitterMap = useMemo(() => {
    const map = new Map<string, RouteEmitter[]>()
    for (const e of allRoutes) {
      for (const id of [e.origin, e.destination]) {
        if (!map.has(id)) map.set(id, [])
        map.get(id)!.push(e)
      }
    }
    return map
  }, [allRoutes])

  const hoveredRoutes = useMemo(
    () => (hoveredAirportId ? airportToEmitterMap.get(hoveredAirportId) ?? [] : []),
    [hoveredAirportId, airportToEmitterMap],
  )

  const maxRouteFrequency = useMemo(
    () => allRoutes.reduce((max, e) => Math.max(max, 86400 / e.interval), 1),
    [allRoutes],
  )

  return { allRoutes, purchasedRoutes, hoveredRoutes, maxRouteFrequency }
}
