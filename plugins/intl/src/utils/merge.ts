import type { Messages } from '@/types';

function isGroup(value: unknown): value is Messages {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Deep-merge two message trees. `target` (the requested locale) wins on every
 * string leaf; `source` (the fallback locale) fills leaves and groups that are
 * absent from `target`. Neither input is mutated.
 */
export function mergeMessages(target: Messages, source: Messages): Messages {
  const result: Messages = { ...target };

  for (const key of Object.keys(source)) {
    const sourceValue = source[key];
    const targetValue = result[key];

    if (isGroup(sourceValue) && isGroup(targetValue)) {
      result[key] = mergeMessages(targetValue, sourceValue);
      continue;
    }

    if (key in target) continue; // target wins whenever it provides a value

    if (isGroup(sourceValue)) {
      result[key] = mergeMessages({}, sourceValue);
      continue;
    }

    if (typeof sourceValue === 'string') {
      result[key] = sourceValue;
    }
  }

  return result;
}
