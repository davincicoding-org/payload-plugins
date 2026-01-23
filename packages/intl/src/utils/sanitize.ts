import type { DeepPartial, Messages } from '@/types';

/**
 * Sanitize messages data to match the schema.
 * Stored messages might contain keys that are not in the config.
 * This happens when messages in the config were (re)moved.
 *
 * Keep exactly the keys from `shape`, fill values from `source` when present.
 * - Leaf present as string -> included
 * - Leaf missing/non-string -> omitted
 * - Empty nested groups -> omitted
 */

/**

 */
export function sanitizeMessages(
  config: Messages,
  data: unknown,
): DeepPartial<Messages> {
  const out: Record<string, unknown> = {};
  const src = isObj(data) ? data : {};

  for (const key of Object.keys(config)) {
    const shapeVal = (config as Record<string, unknown>)[key];
    const srcVal = src[key];

    if (isObj(shapeVal)) {
      const child = sanitizeMessages(shapeVal as Messages, srcVal);
      if (isObj(child) && Object.keys(child).length > 0) {
        out[key] = child;
      }
      // else: omit empty group
    } else {
      // Leaf: only keep if the source has a string
      if (typeof srcVal === 'string') {
        out[key] = srcVal;
      }
      // else: omit leaf
    }
  }

  return out as DeepPartial<Messages>;
}

function isObj(x: unknown): x is Record<string, unknown> {
  return !!x && typeof x === 'object' && !Array.isArray(x);
}
