import { useMemo } from 'react'
import type { RouteEmitter } from '../utils/scheduleFlights.ts'
import type {PendingRoute} from "../components/RouteConfirmCard.tsx";

/**
 * Derives the route sets needed by the map layers from raw emitter data.
 *
 * Emitters are bidirectional (one per direction), so the hook deduplicates them
 * internally using a sorted `"ICAO-ICAO"` key before building any derived data.
 *
 * @param emitters - All route emitters produced by {@link buildEmitters}.
 * @param purchasedRouteKeys - Set of sorted `"ORIG-DEST"` keys for purchased routes.
 * @param hoveredAirportId - ICAO of the airport under the cursor, or `null`.
 * @param hoveredRouteEmitter - Emitter directly hovered on the path layer, or `null`.
 * @param pendingRoute - Origin/destination of the clicked route awaiting confirmation, or `null`.
 *
 * @returns
 * - `allRoutes` — every unique route; stable reference until emitters change.
 * - `purchasedRoutes` — routes which have been purchased by the player.
 * - `hoveredRoutes` — routes which are currently hovered.
 * - `pendingRoutes` — routes which are pending purchase.
 * - `maxRouteFrequency` — highest flights-per-day across all routes, used to
 *   normalize width in the hover layer.
 */
export function useRoutes(
  emitters: RouteEmitter[],
  purchasedRouteKeys: Set<string>,
  hoveredAirportId: string | null,
  hoveredRouteEmitter: RouteEmitter | null,
  pendingRoute: PendingRoute | null,
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

  const purchasedRoutes = useMemo(
    () => allRoutes.filter(e => {
      const key = e.origin < e.destination ? `${e.origin}-${e.destination}` : `${e.destination}-${e.origin}`
      return purchasedRouteKeys.has(key)
    }),
    [allRoutes, purchasedRouteKeys],
  )

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

  const hoveredAirportRoutes = useMemo(
    () => (hoveredAirportId ? airportToEmitterMap.get(hoveredAirportId) ?? [] : []),
    [hoveredAirportId, airportToEmitterMap],
  )

  const hoveredRoutes = useMemo(() => {
    if (!hoveredRouteEmitter || hoveredAirportRoutes.includes(hoveredRouteEmitter)) return hoveredAirportRoutes
    return [...hoveredAirportRoutes, hoveredRouteEmitter]
  }, [hoveredAirportRoutes, hoveredRouteEmitter])

  const pendingRoutes = useMemo(() => {
    if (!pendingRoute) return []
    const { origin, destination } = pendingRoute
    const key = origin < destination ? `${origin}-${destination}` : `${destination}-${origin}`
    const emitter = routeToEmitterMap.get(key)
    return emitter ? [emitter] : []
  }, [routeToEmitterMap, pendingRoute])


  const maxRouteFrequency = useMemo(
    () => allRoutes.reduce((max, e) => Math.max(max, 86400 / e.interval), 1),
    [allRoutes],
  )

  return { allRoutes, hoveredRoutes, pendingRoutes, purchasedRoutes, maxRouteFrequency }
}
