import type { Messages } from '@/types';

/**
 * Sanitize messages data to match the schema.
 * Stored messages might contain keys that are not in the config.
 * This happens when messages in the config were (re)moved.
 *
 * Keep exactly the keys from `shape`, fill values from `source` when present.
 * When `useSchemaDefaults` is true, missing leaves fall back to the schema value.
 * - Leaf present as string -> included
 * - Leaf missing/non-string + useSchemaDefaults -> schema value used
 * - Leaf missing/non-string + !useSchemaDefaults -> omitted
 * - Empty nested groups -> omitted (unless filled by defaults)
 */
export function sanitizeMessages({
  config,
  data,
  useSchemaDefaults = false,
}: {
  config: Messages;
  data: unknown;
  useSchemaDefaults?: boolean;
}): Messages {
  const out: Record<string, unknown> = {};
  const src = isObj(data) ? data : {};

  for (const key of Object.keys(config)) {
    const shapeVal = (config as Record<string, unknown>)[key];
    const srcVal = src[key];

    if (isObj(shapeVal)) {
      const child = sanitizeMessages({
        config: shapeVal as Messages,
        data: srcVal,
        useSchemaDefaults,
      });
      if (isObj(child) && Object.keys(child).length > 0) {
        out[key] = child;
      }
      // else: omit empty group
    } else {
      // Leaf: keep source string, or fall back to schema value
      if (typeof srcVal === 'string') {
        out[key] = srcVal;
      } else if (useSchemaDefaults && typeof shapeVal === 'string') {
        out[key] = shapeVal;
      }
    }
  }

  return out as Messages;
}

function isObj(x: unknown): x is Record<string, unknown> {
  return !!x && typeof x === 'object' && !Array.isArray(x);
}
