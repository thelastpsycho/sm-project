// Shared handling for RMS's per-figure quality flags. Never render a number tagged
// 'unavailable'; visually mark 'estimated' figures since they're reconstructed, not
// real snapshots (see QualityValue.vue for the rendering side).

import type { RmsQuality } from '@/types/rms'

export function isRenderable(quality: RmsQuality): boolean {
  return quality !== 'unavailable'
}

/** Rolls up the qualities of the rows that actually contributed to an aggregate: 'estimated' if any were reconstructed, 'observed' if all were real snapshots, 'unavailable' if nothing contributed. */
export function rollupQuality(qualities: RmsQuality[]): RmsQuality {
  if (qualities.length === 0) return 'unavailable'
  return qualities.includes('estimated') ? 'estimated' : 'observed'
}
