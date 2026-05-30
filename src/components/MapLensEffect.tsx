import { useEffect } from 'react'
import { useMap } from 'react-map-gl/maplibre'
import type { ActiveLens } from './LensToolbar.tsx'

/** Raster tile adjustments applied per lens. MapLibre transitions these automatically. */
const LENS_MAP_EFFECT: Record<ActiveLens, { brightness: number; saturation: number }> = {
  none:      { brightness: 1,   saturation:  0   },
  price:     { brightness: 0.6, saturation: -0.5 },
  frequency: { brightness: 0.7, saturation: -0.6 },
}

/** Translucent color overlay applied on top of the dimmed tiles, giving each lens a warm or cool cast. */
const LENS_TINT: Record<ActiveLens, { color: string; opacity: number }> = {
  none:      { color: '#c86e14', opacity: 0    },
  price:     { color: '#c85314', opacity: 0.15 },
  frequency: { color: '#1450b4', opacity: 0.1  },
}

const WORLD_POLYGON = {
  type: 'Feature' as const,
  geometry: { type: 'Polygon' as const, coordinates: [[[-180,-85],[180,-85],[180,85],[-180,85],[-180,-85]]] },
  properties: {},
}

/**
 * Applies map-level visual effects for the active lens by manipulating MapLibre paint properties
 * directly on the underlying map instance.
 *
 * Two effects are combined:
 * - **Raster adjustment** — dims and desaturates the watercolor tile layer so data colors read
 *   clearly against the background. MapLibre transitions these properties automatically.
 * - **Tint overlay** — a world-covering fill layer with a warm (price) or cool (frequency) color
 *   at low opacity, giving each lens a distinct chromatic mood. The fill layer uses
 *   `fill-opacity-transition` and `fill-color-transition` so the tint fades in and out.
 *
 * Must be rendered as a child of `<Map>` so that `useMap()` resolves.
 */
export default function MapLensEffect({ activeLens }: { activeLens: ActiveLens }) {
  const { current: map } = useMap()

  useEffect(() => {
    if (!map) return
    const m = map.getMap()
    const add = () => {
      m.addSource('lens-tint-src', { type: 'geojson', data: WORLD_POLYGON })
      m.addLayer({
        id: 'lens-tint',
        type: 'fill',
        source: 'lens-tint-src',
        paint: {
          'fill-color': '#c86e14',
          'fill-opacity': 0,
          'fill-color-transition':   { duration: 400, delay: 0 },
          'fill-opacity-transition': { duration: 400, delay: 0 },
        },
      })
    }
    if (m.isStyleLoaded()) {
      add()
    } else {
      m.once('styledata', add)
    }
    return () => {
      if (m.getLayer('lens-tint'))      m.removeLayer('lens-tint')
      if (m.getSource('lens-tint-src')) m.removeSource('lens-tint-src')
    }
  }, [map])

  useEffect(() => {
    if (!map) return
    const m = map.getMap()
    const rasterLayers = m.getStyle()?.layers.filter(l => l.type === 'raster') ?? []
    const { brightness, saturation } = LENS_MAP_EFFECT[activeLens]
    for (const layer of rasterLayers) {
      m.setPaintProperty(layer.id, 'raster-brightness-max', brightness)
      m.setPaintProperty(layer.id, 'raster-saturation',     saturation)
      m.setPaintProperty(layer.id, 'raster-hue-rotate',     0)
    }
    if (!m.getLayer('lens-tint')) return
    const { color, opacity } = LENS_TINT[activeLens]
    m.setPaintProperty('lens-tint', 'fill-color',   color)
    m.setPaintProperty('lens-tint', 'fill-opacity', opacity)
  }, [map, activeLens])

  return null
}
