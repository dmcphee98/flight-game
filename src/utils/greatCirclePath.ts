import * as turf from '@turf/turf'
import type { Feature, LineString, MultiLineString } from 'geojson'

export interface PathData {
  line: Feature<LineString>
  totalLength: number
}

export function buildPath(
  origLon: number,
  origLat: number,
  destLon: number,
  destLat: number,
): PathData | null {
  const orig = turf.point([origLon, origLat])
  const dest = turf.point([destLon, destLat])
  if (turf.distance(orig, dest, { units: 'kilometers' }) < 1) return null

  const gc = turf.greatCircle(orig, dest, { npoints: 32 })
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
