import { unstable_cache } from 'next/cache';

import type { EntitySlug } from '../types';

export interface RequestHandlerCacheOptions {
  /** Additional cache tags beyond the collection/global slugs. */
  tags?: string[];
  /** Time-based revalidation in seconds, or `false` to rely solely on tag-based revalidation. */
  revalidate?: number | false;
}

/**
 * Wraps a data-fetching function with Next.js `unstable_cache`, tagging it with
 * collection/global slugs so it is automatically revalidated when those are published.
 *
 * @param handler - The async function to cache.
 * @param slugs - Collection or global slugs used as cache tags (e.g. `['posts', 'media']`).
 * @param options - Additional cache options passed to `unstable_cache`.
 */
export const createRequestHandler = <Data, Inputs extends unknown[]>(
  handler: (...inputs: Inputs) => Promise<Data>,
  slugs?: EntitySlug[],
  options?: RequestHandlerCacheOptions,
): ((...inputs: Inputs) => Promise<Data>) =>
  unstable_cache(handler, undefined, {
    tags: [...(slugs ?? []), ...(options?.tags ?? [])],
    revalidate: options?.revalidate ?? false,
  });
