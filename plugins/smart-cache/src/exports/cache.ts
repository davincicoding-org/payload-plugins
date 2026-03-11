// cacheTag is available in Next.js 16+ (stable) or 15.x with experimental.dynamicIO.
// Since the project supports next >= 15.5.9, this import may not resolve in all versions.
// This module should only be used by consumers on Next.js 16+ with cacheComponents enabled.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error — cacheTag is not exported in Next.js 15 types
import { cacheTag } from 'next/cache';

/**
 * Applies tenant-scoped cache tags for use with Next.js 16+ `"use cache"` directive.
 * For each slug, registers both the base tag and a tenant-scoped tag (`slug:tenantId`).
 *
 * @param slugs - Collection/global slug(s) to tag.
 * @param tenantId - The tenant ID to scope the cache tags to.
 */
export function tenantCacheTag(
  slugs: string | string[],
  tenantId: string,
): void {
  const slugArray = Array.isArray(slugs) ? slugs : [slugs];
  const tags = slugArray.flatMap((slug) => [slug, `${slug}:${tenantId}`]);
  cacheTag(...tags);
}
