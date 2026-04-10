import type { ConfidenceLevel, GalleryAsset, ScoredResult } from "../types";
import { inferSource } from "./source-inference";

const LOW_RESOLUTION_MP = 1.25;
const EXTREME_RATIO_MIN = 0.45;
const EXTREME_RATIO_MAX = 2.2;
const TINY_FILE_BYTES = 130 * 1024;
const GENUINE_SHARED_MIN_BYTES = 420 * 1024;

function getImageShape(
  asset: GalleryAsset,
): { mp: number; ratio: number } | null {
  if (asset.width <= 0 || asset.height <= 0) return null;
  return {
    mp: (asset.width * asset.height) / 1_000_000,
    ratio: asset.width / asset.height,
  };
}

function looksLikeNormalPhotoGeometry(asset: GalleryAsset): boolean {
  const shape = getImageShape(asset);
  if (!shape) return false;
  return shape.mp >= 2.2 && shape.ratio >= 0.6 && shape.ratio <= 1.8;
}

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
 *     Low resolution ≤ 1.2 MP        +1
 *     Extreme aspect ratio           +1  (only for non-screenshot sources)
 *     Duplicate marker (N)           +1
 *
 *   Pass 2 — after file-size enrichment:
 *     File size ≤ 100 KB             +1
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

  if (source === "WhatsApp") {
    score += 2;
    reasons.push("WhatsApp-forwarded filename");
  }

  if (source === "Telegram") {
    score += 2;
    reasons.push("Telegram filename pattern");
  }

  if (source === "Instagram Screenshot") {
    score += 1;
    reasons.push("Instagram screenshot pattern");
  }

  // NOTE: Generic screenshots get NO source points.
  // They are the user's own screenshots and shouldn't be flagged as spam.
  // Instagram screenshots get +2 above but need quality signals to reach MEDIUM.

  // ── Quality signals ─────────────────────────────────────────────────────
  // These distinguish junk from legitimate images.

  const shape = getImageShape(asset);
  if (shape) {
    const { mp, ratio } = shape;

    // Low resolution is still useful, but keep threshold conservative.
    if (mp <= LOW_RESOLUTION_MP) {
      score += 1;
      reasons.push("Low resolution (≤1.25 MP)");
    }

    // Extreme aspect ratio — but NOT for screenshots.
    // Phone screenshots are 1080×2408 (ratio 0.4485) which LOOKS extreme
    // but is the natural phone screen ratio. We must not penalise that.
    // Only apply this check for messaging sources or unknown sources.
    const isScreenshot =
      source === "Screenshot" || source === "Instagram Screenshot";
    if (!isScreenshot) {
      if (ratio <= EXTREME_RATIO_MIN || ratio >= EXTREME_RATIO_MAX) {
        score += 1;
        reasons.push("Extreme aspect ratio");
      }
    }
  }

  // Shared messenger photos with natural dimensions are often normal group photos.
  if (
    (source === "WhatsApp" || source === "Telegram") &&
    looksLikeNormalPhotoGeometry(asset)
  ) {
    score = Math.max(0, score - 1);
    reasons.push("High-resolution photo geometry (reduced spam weight)");
  }

  // Duplicate filename marker — catches (1), (2), (3), etc.
  if (/\(\d+\)/.test(asset.filename)) {
    score += 1;
    reasons.push("Duplicate filename marker");
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
 * Pass 2: File-size signal. Runs on score-2+ candidates kept for refinement.
 */
export function refineWithFileSize(result: ScoredResult): void {
  const size = result.asset.fileSize;
  if (size <= 0) return;

  let changed = false;

  // Tiny forwards are still spam-like, but >100 KB often includes
  // legitimate shared photos. Keep this conservative.
  if (size <= TINY_FILE_BYTES) {
    result.score += 1;
    result.reasons.push("Tiny file size (≤130 KB)");
    changed = true;
  }

  // Reduce false positives: normal shared photos usually have larger size
  // and photo-like dimensions, even when filenames come from messaging apps.
  if (
    (result.source === "WhatsApp" || result.source === "Telegram") &&
    size >= GENUINE_SHARED_MIN_BYTES &&
    looksLikeNormalPhotoGeometry(result.asset)
  ) {
    result.score = Math.max(0, result.score - 1);
    result.reasons.push("Likely genuine shared photo quality");
    changed = true;
  }

  if (changed) {
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
 *   WhatsApp spam (very low res): +2 WA +1 low-res = 3 → LOW
 *   WhatsApp spam (+tiny file):   +2 +1 +1 = 4 → MEDIUM
 *   WhatsApp legit photo (1.2MP+): +2 WA = 2 → CLEAN
 *   IG screenshot (user's own):  +2 IG = 2 → CLEAN ✓ (not flagged)
 *   Generic screenshot:          0 → CLEAN ✓ (not flagged)
 *   Device camera photo:         0 → CLEAN ✓
 */
function mapConfidence(score: number): ConfidenceLevel {
  if (score >= 5) return "HIGH";
  if (score >= 4) return "MEDIUM";
  if (score >= 3) return "LOW";
  return "CLEAN";
}

/**
 * Score a slice of the asset array. Pushes score-2+ candidates so
 * tiny-file refinement can promote borderline messaging forwards.
 */
export function scoreSliceInto(
  assets: GalleryAsset[],
  startIdx: number,
  endIdx: number,
  out: ScoredResult[],
): void {
  for (let i = startIdx; i < endIdx; i++) {
    const result = spamScoreInitial(assets[i]);
    // Keep score-2 candidates in the pipeline so tiny-file refinement
    // can promote compressed forwards in pass 2.
    if (result.score >= 2) {
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
  out: ScoredResult[],
): void {
  for (let i = startIdx; i < endIdx; i++) {
    const asset = assets[i];
    const source = inferSource(asset.filename);

    if (source === "Unknown/Device" || source === "Screenshot") continue;

    let score = 0;
    const reasons: string[] = [];

    switch (source) {
      case "WhatsApp":
        score = 3;
        reasons.push("WhatsApp forwarded image");
        break;
      case "Telegram":
        score = 3;
        reasons.push("Telegram image");
        break;
      case "Instagram Screenshot":
        score = 3;
        reasons.push("Instagram screenshot");
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
