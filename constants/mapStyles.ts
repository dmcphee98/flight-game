/**
 * A curated collection of remotely hosted basemap style definitions for
 * MapLibre / react-map-gl.
 *
 * A basemap style is a JSON configuration document that defines:
 *
 * - Which geographic data sources to use
 * - Where vector tiles are hosted
 * - How map features should be rendered
 * - Colors, fonts, labels, terrain, and layer styling
 *
 * Example source definition inside a style JSON:
 *
 * ```json
 * {
 *   "openmaptiles": {
 *     "type": "vector",
 *     "url": "https://tiles.openfreemap.org/planet"
 *   }
 * }
 * ```
 *
 * The style JSON itself is relatively small and static, but it references
 * external infrastructure such as:
 *
 * - Vector tile servers
 * - Glyph/font endpoints
 * - Sprite/icon assets
 * - Terrain data
 *
 * As users pan and zoom around the map, the renderer continuously requests
 * map tiles from these servers. Because tile hosting involves storage,
 * bandwidth, CDN distribution, and caching infrastructure, many providers
 * charge based on usage.
 *
 * Some providers offer generous free tiers suitable for hobby and portfolio
 * projects.
 *
 * Usage:
 *
 * ```tsx
 * import { MAP_STYLES } from "./mapStyles";
 *
 * <Map mapStyle={MAP_STYLES.OFM_DARK} />
 * ```
 */
export const MAP_STYLES = {

    /**
     * ------------------------------------------------------------------------
     * OpenFreeMap
     * ------------------------------------------------------------------------
     *
     * Fully free and open basemap provider.
     * Documentation:
     * https://openfreemap.org/quick_start/
     */

    OFM_POSITRON: "https://tiles.openfreemap.org/styles/positron",
    OFM_BRIGHT: "https://tiles.openfreemap.org/styles/bright",
    OFM_LIBERTY: "https://tiles.openfreemap.org/styles/liberty",
    OFM_DARK: "https://tiles.openfreemap.org/styles/dark",
    OFM_FIORD: "https://tiles.openfreemap.org/styles/fiord",

    /**
     * ------------------------------------------------------------------------
     * Stadia Maps
     * ------------------------------------------------------------------------
     *
     * High-quality hosted basemaps, including Stamen styles.
     *
     * Documentation:
     * https://docs.stadiamaps.com/
     *
     * Custom styles:
     * https://docs.stadiamaps.com/custom-styles/
     */

    STADIA_STAMEN_WATERCOLOR: "https://tiles.stadiamaps.com/styles/stamen_watercolor.json",
    STADIA_STAMEN_TONER: "https://tiles.stadiamaps.com/styles/stamen_toner.json",
    STADIA_STAMEN_TONER_LITE: "https://tiles.stadiamaps.com/styles/stamen_toner_lite.json",
    STADIA_STAMEN_TONER_DARK: "https://tiles.stadiamaps.com/styles/stamen_toner_dark.json",
    STADIA_STAMEN_TONER_BLACKLITE: "https://tiles.stadiamaps.com/styles/stamen_toner_blacklite.json",
    STADIA_ALIDADE_SMOOTH: "https://tiles.stadiamaps.com/styles/alidade_smooth.json",
    STADIA_ALIDADE_SMOOTH_DARK: "https://tiles.stadiamaps.com/styles/alidade_smooth_dark.json",

} as const;

export type MapStyleKey = keyof typeof MAP_STYLES;

/**
 * Other notable basemap providers:
 *
 * - ArcGIS:
 *   https://www.arcgis.com/home/group.html?id=702026e41f6641fb85da88efe79dc166
 *
 * - CARTO:
 *   https://www.carto.com/basemaps/
 *
 * - Mapbox:
 *   https://www.mapbox.com/maps
 */