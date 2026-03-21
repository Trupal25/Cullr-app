import * as MediaLibrary from 'expo-media-library';
import { getInfoAsync } from 'expo-file-system/legacy';
import type { GalleryAsset, ScanRange } from '../types';

// Large page size = fewer native bridge round-trips.
// 500 is the practical ceiling before iOS/Android start OOM-ing the cursor.
const PAGE_SIZE = 500;

// How many files to stat concurrently in enrichWithFileSize.
// Promise.all is fine here: filesystem reads are I/O-bound, not CPU-bound.
const FILE_STAT_CONCURRENCY = 100;

/**
 * Fetches photo assets from the device gallery.
 * If `limit` is a number, returns the N most-recent photos.
 * If `limit` is 'all', reads the entire library.
 *
 * Performance contract:
 *   N assets  → ceil(N / 500) getAssetsAsync calls
 *   Bridge calls = O(N / 500), not O(N)
 */
export async function fetchAllAssets(
  onProgress?: (fetched: number, total: number) => void,
  limit: ScanRange = 'all'
): Promise<GalleryAsset[]> {
  // first:1 instead of first:0 — some platforms reject first:0 on the cursor API
  const firstPage = await MediaLibrary.getAssetsAsync({
    first: 1,
    mediaType: MediaLibrary.MediaType.photo,
  });
  const galleryTotal = firstPage.totalCount;

  if (galleryTotal === 0) {
    onProgress?.(0, 0);
    return [];
  }

  const targetCount = limit === 'all' ? galleryTotal : Math.min(limit, galleryTotal);

  const assets: GalleryAsset[] = [];
  assets.length = targetCount; // pre-allocate — avoids repeated array resizing
  let writeIndex = 0;

  let hasNextPage = true;
  let endCursor: string | undefined;

  while (hasNextPage && writeIndex < targetCount) {
    const remaining = targetCount - writeIndex;
    const pageSize = Math.min(PAGE_SIZE, remaining);

    const page = await MediaLibrary.getAssetsAsync({
      first: pageSize,
      after: endCursor,
      mediaType: MediaLibrary.MediaType.photo,
      sortBy: [MediaLibrary.SortBy.modificationTime],
    });

    const items = page.assets;
    for (let i = 0; i < items.length && writeIndex < targetCount; i++) {
      const item = items[i];
      assets[writeIndex++] = {
        id: item.id,
        filename: item.filename,
        uri: item.uri,
        width: item.width,
        height: item.height,
        fileSize: 0,         // populated lazily in enrichWithFileSize
        creationTime: item.creationTime,
        mediaSubtypes: item.mediaSubtypes,
      };
    }

    onProgress?.(writeIndex, targetCount);
    hasNextPage = page.hasNextPage;
    endCursor = page.endCursor;
  }

  // Trim any over-allocated slots (can happen if totalCount was stale)
  return assets.slice(0, writeIndex);
}

/**
 * Enrich a small subset of already-flagged assets with actual file sizes.
 *
 * This is intentionally called only on the filtered result set (~5% of
 * the library), never on the full asset list. A 10,000-photo library
 * typically yields ~200-500 flagged items — that's the real call count.
 *
 * FileInfo discriminated union:
 *   { exists: true;  size: number; ... }
 *   { exists: false; ... }            ← no size field
 * The options object has no "size" flag — size is always included when exists.
 */
export async function enrichWithFileSize(assets: GalleryAsset[]): Promise<void> {
  for (let i = 0; i < assets.length; i += FILE_STAT_CONCURRENCY) {
    const batch = assets.slice(i, i + FILE_STAT_CONCURRENCY);

    const infos = await Promise.all(
      batch.map((a) => getInfoAsync(a.uri).catch(() => null))
    );

    for (let j = 0; j < infos.length; j++) {
      const info = infos[j];
      if (info !== null && info.exists) {
        // info.exists narrows the discriminated union to the { size: number } branch
        assets[i + j].fileSize = info.size;
      }
    }
  }
}
