/**
 * Builds the canonical public URL for a landmark. Used both for native share
 * sheet links and as the deep-link path that iOS Universal Links / Android App
 * Links intercept.
 */
export function buildLandmarkUrl(landmarkId: string): string {
  return `https://historia.app/landmark/${landmarkId}`;
}
