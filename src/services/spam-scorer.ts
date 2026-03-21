import { inferSource } from './source-inference';
import type { GalleryAsset, ScoredResult, ConfidenceLevel } from '../types';

/**
 * Spam scorer tuned on real gallery data.
 *
 * Key insight from analysing actual spam samples:
 *   Spam WhatsApp images are characterised by:
 *     - Max dimension ≤ 1600px (messaging compression cap)
 *     - File size ≤ 224 KB (all 13 samples were under this)
 *     - No EXIF metadata
 *     - Low resolution (median 1.3 MP)
 *
 *   Legitimate screenshots the user wants to KEEP:
 *     - Phone-native resolution (1080×2408)
 *     - Aspect ratio 0.4485 — this is NOT "extreme", it's the phone screen
 *     - Have EXIF (5 tags)
 *     - File sizes 84-1004 KB
 *
 *   Legitimate device photos:
 *     - 4080×2296 (9.4 MP), have EXIF, 1800-6700 KB
 *
 * Scoring rules:
 *   Pass 1 — metadata only:
 *     WhatsApp filename              +2
 *     Instagram screenshot           +2
 *     Telegram source                +2
 *     Non-camera source (EXIF proxy) +1  (WhatsApp/Telegram/IG only, NOT screenshots)
 *     Low resolution ≤ 1.5 MP        +1
 *     Extreme aspect ratio           +1  (only for non-screenshot sources)
 *     Duplicate marker (N)           +1
 *
 *   Pass 2 — after file-size enrichment:
 *     File size ≤ 150 KB             +1
 *
 * Screenshots are intentionally scored LOW by design:
 *   Generic screenshot: +1 (screenshot) = 1 → CLEAN
 *   Instagram screenshot: +2 = 2 → CLEAN (need quality signals to push higher)
 *
 * Confidence:
 *   ≥ 5 = HIGH, ≥ 4 = MEDIUM, ≥ 3 = LOW, < 3 = CLEAN
 */

export function spamScoreInitial(asset: GalleryAsset): ScoredResult {
  let score = 0;
  const reasons: string[] = [];
  const source = inferSource(asset.filename);

  // ── Source-based signals ────────────────────────────────────────────────

  if (source === 'WhatsApp') {
    score += 2;
    reasons.push('WhatsApp-forwarded filename');
  }

  if (source === 'Telegram') {
    score += 2;
    reasons.push('Telegram filename pattern');
  }

  if (source === 'Instagram Screenshot') {
    score += 2;
    reasons.push('Instagram screenshot pattern');
  }

  // "No EXIF" proxy — only for messaging sources.
  // We DON'T apply this to screenshots because screenshots on this device
  // DO have EXIF and are legitimate. The user wants to keep them.
  if (source === 'WhatsApp' || source === 'Telegram') {
    score += 1;
    reasons.push('Messaging source (likely stripped EXIF)');
  }

  // NOTE: Generic screenshots get NO source points.
  // They are the user's own screenshots and shouldn't be flagged as spam.
  // Instagram screenshots get +2 above but need quality signals to reach MEDIUM.

  // ── Quality signals ─────────────────────────────────────────────────────
  // These distinguish junk from legitimate images.

  if (asset.width > 0 && asset.height > 0) {
    const mp = (asset.width * asset.height) / 1_000_000;
    const ratio = asset.width / asset.height;

    // Low resolution — ≤ 1.5 MP
    // All spam samples were 0.1–2.4 MP (median 1.3 MP).
    // Device camera photos are 9.4 MP. The gap is enormous.
    // WhatsApp photos from friends tend to be 1.4-2.6 MP.
    // Using 1.5 MP catches the junkiest forwarded stuff.
    if (mp <= 1.5) {
      score += 1;
      reasons.push('Low resolution (≤1.5 MP)');
    }

    // Extreme aspect ratio — but NOT for screenshots.
    // Phone screenshots are 1080×2408 (ratio 0.4485) which LOOKS extreme
    // but is the natural phone screen ratio. We must not penalise that.
    // Only apply this check for messaging sources or unknown sources.
    const isScreenshot = source === 'Screenshot' || source === 'Instagram Screenshot';
    if (!isScreenshot) {
      if (ratio <= 0.50 || ratio >= 2.0) {
        score += 1;
        reasons.push('Extreme aspect ratio');
      }
    }
  }

  // Duplicate filename marker — catches (1), (2), (3), etc.
  if (/\(\d+\)/.test(asset.filename)) {
    score += 1;
    reasons.push('Duplicate filename marker');
  }

  return {
    asset,
    score,
    reasons,
    source,
    confidence: mapConfidence(score),
  };
}

/**
 * Pass 2: File-size signal. Only runs on already-flagged items.
 */
export function refineWithFileSize(result: ScoredResult): void {
  const size = result.asset.fileSize;
  if (size <= 0) return;

  // All 13 spam samples were ≤ 224 KB. Using 150 KB as threshold
  // to avoid catching legit shared photos which tend to be 200+ KB.
  if (size <= 150 * 1024) {
    result.score += 1;
    result.reasons.push('Low file size (≤150 KB)');
    result.confidence = mapConfidence(result.score);
  }
}

/**
 * Confidence bands:
 *   ≥5 = HIGH    (strong spam signal — multiple quality + source signals)
 *   ≥4 = MEDIUM  (likely spam — matches Python ≥4 threshold)
 *   ≥3 = LOW     (suspicious — worth reviewing)
 *   <3 = CLEAN   (not shown)
 *
 * Example scores with this tuning:
 *   WhatsApp spam (low res):     +2 WA +1 EXIF +1 low-res = 4 → MEDIUM
 *   WhatsApp spam (low res + sm file): +2 +1 +1 +1 = 5 → HIGH  
 *   WhatsApp legit photo (2MP):  +2 WA +1 EXIF = 3 → LOW
 *   IG screenshot (user's own):  +2 IG = 2 → CLEAN ✓ (not flagged)
 *   Generic screenshot:          0 → CLEAN ✓ (not flagged)
 *   Device camera photo:         0 → CLEAN ✓
 */
function mapConfidence(score: number): ConfidenceLevel {
  if (score >= 5) return 'HIGH';
  if (score >= 4) return 'MEDIUM';
  if (score >= 3) return 'LOW';
  return 'CLEAN';
}

/**
 * Score a slice of the asset array. Pushes flagged results (score ≥ 3)
 * into the output array.
 */
export function scoreSliceInto(
  assets: GalleryAsset[],
  startIdx: number,
  endIdx: number,
  out: ScoredResult[]
): void {
  for (let i = startIdx; i < endIdx; i++) {
    const result = spamScoreInitial(assets[i]);
    if (result.confidence !== 'CLEAN') {
      out.push(result);
    }
  }
}

/**
 * Source Detection scan type.
 * Flags ALL images from messaging / social media apps,
 * regardless of quality signals.
 */
export function scoreSourceInto(
  assets: GalleryAsset[],
  startIdx: number,
  endIdx: number,
  out: ScoredResult[]
): void {
  for (let i = startIdx; i < endIdx; i++) {
    const asset = assets[i];
    const source = inferSource(asset.filename);

    if (source === 'Unknown/Device' || source === 'Screenshot') continue;

    let score = 0;
    const reasons: string[] = [];

    switch (source) {
      case 'WhatsApp':
        score = 3;
        reasons.push('WhatsApp forwarded image');
        break;
      case 'Telegram':
        score = 3;
        reasons.push('Telegram image');
        break;
      case 'Instagram Screenshot':
        score = 3;
        reasons.push('Instagram screenshot');
        break;
    }

    if (score >= 3) {
      out.push({
        asset,
        score,
        reasons,
        source,
        confidence: mapConfidence(score),
      });
    }
  }
}
