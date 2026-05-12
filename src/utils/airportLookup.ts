const AIRPORT_TYPES = [
  'large_airport',
  'medium_airport',
  'small_airport',
  'heliport',
  'seaplane_base',
  'balloonport',
  'closed',
]

export type AirportType = typeof AIRPORT_TYPES[number]

/** Geographic coordinates, IATA code, and type for an airport. */
export interface Airport {
  icao: string
  iata: string
  lat: number
  lon: number
  type: AirportType
}

/** Game metadata for an airport active on the map (i.e., icon rotation). */
export interface AirportMeta {
  iconRotation: number
}

interface AirportsJson {
  schema: string[]
  airports: unknown[][]
}

/**
 * Fetches airports.json and returns a lookup map keyed by ICAO (and IATA where
 * present) so callers can resolve either identifier to coordinates and airport type.
 */
export async function loadAirportLookup(): Promise<Map<string, Airport>> {
  const data: AirportsJson = await fetch('/data/airports.json').then(r => r.json())
  const s = data.schema
  const iIcao = s.indexOf('icao')
  const iIata = s.indexOf('iata')
  const iLat  = s.indexOf('lat')
  const iLon  = s.indexOf('lon')
  const iType = s.indexOf('type')

  const lookup = new Map<string, Airport>()
  for (const row of data.airports) {
    const lat = row[iLat] as number
    const lon = row[iLon] as number
    if (lat == null || lon == null) continue
    const icao = row[iIcao] as string
    const iata = (row[iIata] as string) ?? ''
    const coord: Airport = { icao, iata, lat, lon, type: AIRPORT_TYPES[row[iType] as number] ?? 'small_airport' }
    if (icao) lookup.set(icao, coord)
    if (iata && iata !== icao) lookup.set(iata, coord)
  }
  return lookup
}
