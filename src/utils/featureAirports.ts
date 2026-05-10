/** An airport entry enriched with a deterministic plane-icon rotation angle. */
export interface FeaturedAirport {
  iata: string
  icao: string
  name: string
  lat: number
  lon: number
  type: AirportType
  /** Deterministic rotation in degrees derived from the IATA code, used to orient the airport's icon. */
  rotation: number
}

/** OurAirports size classification for an airport. */
export type AirportType = 'large_airport' | 'medium_airport' | 'small_airport'

/**
 * Relative weights for each airport size tier when sampling.
 * Values are proportional: `{ large: 60, medium: 30, small: 10 }` means 60 % large, etc.
 */
export interface SampleDistribution {
  large?: number
  medium?: number
  small?: number
}

/** Deterministic rotation using id characters so it never changes between renders */
function stringRotation(str: string): number {
  const hash = str
      .split('')
      .reduce((acc, c) => acc * 31 + c.charCodeAt(0), 0)
  return Math.abs(hash) % 360
}

/** Returns a new array with elements in random order. */
function shuffle<T>(arr: T[]): T[] {
  const out = [...arr]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/**
 * Returns the flat-Earth squared distance between two points in km².
 * Avoids a sqrt — accurate enough for the minimum-spacing check at game scales.
 */
function dist2Km(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const dlat = (a.lat - b.lat) * 111
  const dlon = (a.lon - b.lon) * 111 * Math.cos(a.lat * (Math.PI / 180))
  return dlat * dlat + dlon * dlon
}

/**
 * Picks up to `count` airports from `pool`, skipping any candidate within
 * `minDist2` km² of an already-selected or previously-picked airport.
 *
 * @param pool - Shuffled candidates to draw from.
 * @param count - Maximum number of airports to return.
 * @param selected - Airports already committed in prior passes (read-only constraint).
 * @param minDist2 - Minimum squared distance threshold in km²; 0 disables spacing.
 */
function greedyPick(
  pool: RawAirport[],
  count: number,
  selected: RawAirport[],
  minDist2: number,
): RawAirport[] {
  const result: RawAirport[] = []
  for (const candidate of pool) {
    if (result.length >= count) break
    const tooClose =
      minDist2 > 0 &&
      [...selected, ...result].some(a => dist2Km(candidate, a) < minDist2)
    if (!tooClose) result.push(candidate)
  }
  return result
}

/** Shape of the `airports.min.json` static asset produced by the ETL pipeline. */
interface AirportsJson {
  /** Ordered column names corresponding to each inner array's positions. */
  schema: string[]
  /** Ordered airport type names; each airport's type field is an index into this array. */
  types: string[]
  airports: unknown[][]
}

/** Airport record after decoding from the columnar JSON format but before enrichment. */
interface RawAirport {
  iata: string
  icao: string
  name: string
  lat: number
  lon: number
  type: AirportType
}


/**
 * Decodes the columnar JSON, allocates per-tier quotas from `distribution`,
 * runs a greedy spaced-pick for each tier, then merges and shuffles the result.
 *
 * @param data - Parsed `airports.min.json` payload.
 * @param count - Total number of airports to return.
 * @param distribution - Relative weights for large / medium / small tiers.
 * @param minDistanceKm - Minimum straight-line distance between any two selected airports.
 */
function parseAndSample(
  data: AirportsJson,
  count: number,
  distribution: SampleDistribution,
  minDistanceKm: number,
): FeaturedAirport[] {
  const s = data.schema
  const c = (name: string) => s.indexOf(name)
  const typeByInt = data.types as AirportType[]

  const all: RawAirport[] = data.airports.map(row => ({
    icao: row[c('icao')] as string,
    iata: row[c('iata')] as string,
    name: row[c('name')] as string,
    lat: row[c('lat')] as number,
    lon: row[c('lon')] as number,
    type: typeByInt[row[c('type')] as number] ?? 'small_airport',
  }))

  const { large = 0, medium = 0, small = 0 } = distribution
  const total = large + medium + small

  const targets: Record<AirportType, number> = {
    large_airport: total > 0 ? Math.round((large / total) * count) : 0,
    medium_airport: total > 0 ? Math.round((medium / total) * count) : 0,
    small_airport: total > 0 ? Math.round((small / total) * count) : 0,
  }

  const sum = targets.large_airport + targets.medium_airport + targets.small_airport
  if (sum !== count) {
    const largest = (Object.entries(targets) as [AirportType, number][])
      .sort((a, b) => b[1] - a[1])[0][0]
    targets[largest] += count - sum
  }

  const minDist2 = minDistanceKm * minDistanceKm

  // Pick types in descending priority so the larger pools constrain the smaller ones
  const largePicked = greedyPick(
    shuffle(all.filter(a => a.type === 'large_airport')),
    targets.large_airport,
    [],
    minDist2,
  )
  const mediumPicked = greedyPick(
    shuffle(all.filter(a => a.type === 'medium_airport')),
    targets.medium_airport,
    largePicked,
    minDist2,
  )
  const smallPicked = greedyPick(
    shuffle(all.filter(a => a.type === 'small_airport')),
    targets.small_airport,
    [...largePicked, ...mediumPicked],
    minDist2,
  )

  return shuffle([...largePicked, ...mediumPicked, ...smallPicked]).map(a => ({
    ...a,
    rotation: stringRotation(a.icao),
  }))
}

/**
 * Fetches the airport dataset from the static asset and returns a random
 * geographically spaced sample suitable for a game session.
 *
 * @param count - Number of airports to return (default 20).
 * @param distribution - Tier weights (default 60 % large, 30 % medium, 10 % small).
 * @param minDistanceKm - Minimum km between any two selected airports (default 300).
 */
export async function loadFeaturedAirports(
  count = 20,
  distribution: SampleDistribution = { large: 60, medium: 30, small: 10 },
  minDistanceKm = 300,
): Promise<FeaturedAirport[]> {
  const res = await fetch('/airports.min.json')
  const data: AirportsJson = await res.json()
  return parseAndSample(data, count, distribution, minDistanceKm)
}
