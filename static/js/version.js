// Version information to force cache refresh
export const VERSION = '1.0.14'; // Increment this when making updates

// Force cache refresh by adding ?v=VERSION to import URLs
export function getVersionedPath(path) {
    return `${path}?v=${VERSION}`;
}