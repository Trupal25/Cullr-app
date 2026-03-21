export type SourceGuess =
  | 'WhatsApp'
  | 'Telegram'
  | 'Instagram Screenshot'
  | 'Screenshot'
  | 'Unknown/Device';

export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW' | 'CLEAN';

export type GalleryAsset = {
  id: string;
  filename: string;
  uri: string;
  width: number;
  height: number;
  fileSize: number;
  creationTime: number;
  mediaSubtypes?: string[];
};

export type ScoredResult = {
  asset: GalleryAsset;
  score: number;
  confidence: ConfidenceLevel;
  reasons: string[];
  source: SourceGuess;
};

export type ScanStats = {
  lastScanDate: string | null;
  totalScanned: number;
  totalFlagged: number;
  totalDeleted: number;
  totalMBFreed: number;
};

export type ScanStatus = 'idle' | 'scanning' | 'done';

/**
 * How many images to scan from the gallery.
 * 'all' fetches the entire library; numbers fetch the N most recent.
 */
export type ScanRange = 100 | 500 | 1000 | 'all';

/**
 * Scan mode — pick ONE. Each mode uses a different detection strategy.
 * Future: add 'ml' for on-device ML model classification.
 */
export type ScanType =
  | 'metadata'       // Heuristic spam detection (filename, resolution, file size)
  | 'source';        // Show ALL images from WhatsApp, Telegram, IG for bulk review
  // | 'ml';          // Future: on-device ML model classification

export type ScanConfig = {
  range: ScanRange;
  type: ScanType;
};
