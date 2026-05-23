/**
 * Resolves a public asset path relative to the Vite base URL.
 * Use instead of hardcoded absolute paths to ensure assets resolve
 * correctly regardless of the deployment base path (e.g., /flight-game/).
 *
 * @param path - Path relative to the public directory, e.g. "data/airports.json"
 * @returns Fully resolved URL string, e.g. "/flight-game/data/airports.json"
 */
export const asset = (path: string) => `${import.meta.env.BASE_URL}${path}`