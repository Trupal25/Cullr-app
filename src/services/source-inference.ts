import type { SourceGuess } from '../types';

/**
 * Port of analyze_images.py infer_source() (lines 24-34).
 * Infers the likely source app from the image filename.
 *
 * Extended with additional patterns observed in real galleries:
 *   - WhatsApp: IMG-YYYYMMDD-WA*, IMG_YYYYMMDD_WA*, WA*
 *   - Telegram: photo_*, telegram*
 *   - Instagram: screenshot*instagram*, instagram*
 *   - Generic screenshots: screenshot*, screen_capture*
 */
export function inferSource(filename: string): SourceGuess {
  const name = filename.toLowerCase();

  // WhatsApp — several naming conventions across Android/iOS versions
  if (/^img-\d{8}-wa\d+/.test(name)) {
    return 'WhatsApp';
  }
  if (/^img_\d{8}_wa\d+/.test(name)) {
    return 'WhatsApp';
  }
  if (/^wa\d{4,}/.test(name)) {
    return 'WhatsApp';
  }
  if (name.startsWith('whatsapp image')) {
    return 'WhatsApp';
  }

  // Telegram — photo_NNNN or explicit "telegram" in name
  if (name.includes('telegram') || name.startsWith('photo_')) {
    return 'Telegram';
  }

  // Instagram screenshots
  if (name.startsWith('screenshot') && name.includes('instagram')) {
    return 'Instagram Screenshot';
  }
  // Instagram direct saves (less common)
  if (name.includes('instagram') || name.includes('insta_')) {
    return 'Instagram Screenshot';
  }

  // Generic screenshots
  if (name.startsWith('screenshot') || name.startsWith('screen_capture')) {
    return 'Screenshot';
  }

  return 'Unknown/Device';
}
