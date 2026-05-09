import * as turf from '@turf/turf'
import type { Feature, LineString, MultiLineString } from 'geojson'

export interface PathData {
  line: Feature<LineString>
  totalLength: number
}

export function buildPath(
  originLon: number,
  originLat: number,
  destLon: number,
  destLat: number,
): PathData | null {
  const origin = turf.point([originLon, originLat])
  const dest = turf.point([destLon, destLat])
  if (turf.distance(origin, dest, { units: 'kilometers' }) < 1) return null

  const gc = turf.greatCircle(origin, dest, { npoints: 100 })
  const line = normalizeToLineString(gc)
  return { line, totalLength: turf.length(line, { units: 'kilometers' }) }
}

function normalizeToLineString(gc: Feature<LineString | MultiLineString>): Feature<LineString> {
  if (gc.geometry.type === 'MultiLineString') {
    // Flatten antimeridian-split segments into one continuous LineString
    const coords = (gc.geometry.coordinates as number[][][]).flat(1)
    return turf.lineString(coords)
  }
  return gc as Feature<LineString>
}
