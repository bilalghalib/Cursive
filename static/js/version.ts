/**
 * Version management for cache busting
 */

// Version information to force cache refresh
export const VERSION = '1.0.17'; // Increment this when making updates

/**
 * Appends version query parameter to force cache refresh
 * @param path - The file path to version
 * @returns Versioned path with query parameter
 */
export function getVersionedPath(path: string): string {
  return `${path}?v=${VERSION}`;
}
