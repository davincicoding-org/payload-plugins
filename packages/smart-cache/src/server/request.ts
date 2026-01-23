import { unstable_cache } from 'next/cache';

import type { EntitySlug } from '../types';

export const createRequestHandler = <Data, Inputs extends unknown[]>(
  handler: (...inputs: Inputs) => Promise<Data>,
  tags?: EntitySlug[],
): ((...inputs: Inputs) => Promise<Data>) =>
  unstable_cache(handler, undefined, {
    tags,
    revalidate: false,
  });
