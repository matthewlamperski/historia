import {
  getDownloadURL,
  ref,
  uploadBytes,
} from 'firebase/storage';
import { storage } from '../config/firebase';

/**
 * Upload a coin image for a level. Per spec §6.4:
 * - Versioned path so caches don't keep showing the old image.
 * - Long max-age cache header.
 * Returns { url, path } so the caller can store both on the level doc.
 */
export async function uploadLevelCoin(
  levelId: string,
  file: File
): Promise<{ url: string; path: string }> {
  const versionSuffix = Date.now();
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'png';
  const path = `levels/${levelId}-v${versionSuffix}.${ext}`;
  const r = ref(storage, path);
  await uploadBytes(r, file, {
    cacheControl: 'public, max-age=31536000, immutable',
    contentType: file.type || 'image/png',
  });
  const url = await getDownloadURL(r);
  return { url, path };
}

/** Upload a hero image for a blog post. */
export async function uploadBlogHero(
  postSlug: string,
  file: File
): Promise<{ url: string; path: string }> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
  const path = `blog/${postSlug}-${Date.now()}.${ext}`;
  const r = ref(storage, path);
  await uploadBytes(r, file, {
    cacheControl: 'public, max-age=86400',
    contentType: file.type || 'image/jpeg',
  });
  const url = await getDownloadURL(r);
  return { url, path };
}
