import { fetchAllAssets, enrichWithFileSize } from './gallery-reader';
import { scoreSliceInto, refineWithFileSize, scoreSourceInto } from './spam-scorer';
import type { ScoredResult, ScanConfig, ScanType } from '../types';

export type ScanProgressCallback = (phase: string, progress: number) => void;

// Score this many assets per JS tick before yielding back to the event loop.
const SCORE_CHUNK = 1_000;

/** Human-readable label for each scan mode */
const SCAN_MODE_LABELS: Record<ScanType, string> = {
  metadata: 'Spam Detection',
  source: 'Source Filter',
};

/**
 * Full scan pipeline. Accepts a ScanConfig to control:
 *   - range: how many recent images to read
 *   - type:  which single scan mode to use
 *
 * PHASE 1 — Gallery read (0 → 50%)
 * PHASE 2 — Scoring with the selected mode (50 → 75%)
 * PHASE 3 — File-size enrichment on flagged items (75 → 95%)
 * PHASE 4 — Final re-score + sort (95 → 100%)
 */
export async function runScan(
  onProgress?: ScanProgressCallback,
  config?: ScanConfig
): Promise<{ results: ScoredResult[]; totalScanned: number }> {
  const range = config?.range ?? 'all';
  const scanType = config?.type ?? 'metadata';
  const modeLabel = SCAN_MODE_LABELS[scanType];

  // ── Phase 1: Read gallery ──────────────────────────────────────────────────
  const rangeLabel = range === 'all' ? 'all' : `last ${range}`;
  onProgress?.(`Reading ${rangeLabel} photos...`, 0);

  const assets = await fetchAllAssets((fetched, total) => {
    const pct = total > 0 ? Math.round((fetched / total) * 50) : 0;
    onProgress?.(`Reading ${fetched} of ${total} photos...`, pct);
  }, range);

  if (assets.length === 0) {
    onProgress?.('No photos found', 100);
    return { results: [], totalScanned: 0 };
  }

  // ── Phase 2: Score with selected mode ──────────────────────────────────────
  onProgress?.(`Running ${modeLabel}...`, 51);

  const flagged: ScoredResult[] = [];
  const total = assets.length;

  for (let i = 0; i < total; i += SCORE_CHUNK) {
    const end = Math.min(i + SCORE_CHUNK, total);

    switch (scanType) {
      case 'metadata':
        scoreSliceInto(assets, i, end, flagged);
        break;
      case 'source':
        scoreSourceInto(assets, i, end, flagged);
        break;
    }

    const pct = 51 + Math.round((end / total) * 24);
    onProgress?.(
      `${modeLabel}: ${end} of ${total} — ${flagged.length} flagged`,
      pct
    );

    // Yield to keep UI responsive
    await new Promise<void>((r) => setTimeout(r, 0));
  }

  if (flagged.length === 0) {
    const emptyMsg = scanType === 'source'
      ? 'No messaging app images found'
      : 'No spam detected';
    onProgress?.(emptyMsg, 100);
    return { results: [], totalScanned: assets.length };
  }

  // ── Phase 3: Enrich flagged items with file sizes ──────────────────────────
  onProgress?.(`Checking ${flagged.length} flagged items...`, 76);

  const flaggedAssets = flagged.map((r) => r.asset);
  await enrichWithFileSize(flaggedAssets);

  // ── Phase 4: Re-score + final sort ────────────────────────────────────────
  onProgress?.('Finalising...', 96);

  for (let i = 0; i < flagged.length; i++) {
    refineWithFileSize(flagged[i]);
  }

  // Sort: highest score first
  const results = flagged
    .filter((r) => r.confidence !== 'CLEAN')
    .sort((a, b) => b.score - a.score);

  const resultLabel = scanType === 'source'
    ? `Found ${results.length} messaging app images`
    : `Found ${results.length} suspicious images`;
  onProgress?.(resultLabel, 100);
  return { results, totalScanned: assets.length };
}

/** Total file size in bytes across a result set. */
export function computeTotalBytes(results: ScoredResult[]): number {
  let total = 0;
  for (let i = 0; i < results.length; i++) {
    total += results[i].asset.fileSize;
  }
  return total;
}

/** Human-readable file size string. */
export function formatMB(bytes: number): string {
  if (bytes === 0) return '0 KB';
  const mb = bytes / (1024 * 1024);
  if (mb < 1) return `${Math.round(bytes / 1024)} KB`;
  if (mb < 100) return `${mb.toFixed(1)} MB`;
  return `${Math.round(mb)} MB`;
}
