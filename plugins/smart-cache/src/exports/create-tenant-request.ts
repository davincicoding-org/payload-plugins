import { unstable_cache } from 'next/cache';

export interface TenantRequestHandlerOptions {
  /** Time-based revalidation in seconds, or `false` to rely solely on tag-based revalidation. */
  revalidate?: number | false;
}

/**
 * Wraps a data-fetching function with tenant-scoped Next.js `unstable_cache`.
 * The first argument to the handler is always the tenant ID, used to:
 * - Generate tenant-scoped cache tags via `tagsFn`
 * - Create a separate `unstable_cache` wrapper per tenant (memoized)
 *
 * @param handler - The async function to cache. First arg must be the tenant ID.
 * @param tagsFn - Function that receives the tenant ID and returns cache tags.
 * @param options - Additional cache options.
 */
export const createTenantRequestHandler = <
  Data,
  Inputs extends [string, ...unknown[]],
>(
  handler: (...inputs: Inputs) => Promise<Data>,
  tagsFn: (tenantId: string) => string[],
  options?: TenantRequestHandlerOptions,
): ((...inputs: Inputs) => Promise<Data>) => {
  const cache = new Map<string, (...inputs: Inputs) => Promise<Data>>();

  return (...inputs: Inputs): Promise<Data> => {
    const tenantId = inputs[0];

    let cached = cache.get(tenantId);
    if (!cached) {
      cached = unstable_cache(handler, [tenantId], {
        tags: tagsFn(tenantId),
        revalidate: options?.revalidate ?? false,
      });
      cache.set(tenantId, cached);
    }

    return cached(...inputs);
  };
};
