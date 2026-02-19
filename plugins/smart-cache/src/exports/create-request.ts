import { unstable_cache } from 'next/cache';

import type { EntitySlug } from '../types';

// TODO attach tags to the returned function
export const createRequestHandler = <Data, Inputs extends unknown[]>(
  handler: (...inputs: Inputs) => Promise<Data>,
  tags?: EntitySlug[],
  revalidate: number | false = false,
): ((...inputs: Inputs) => Promise<Data>) =>
  unstable_cache(handler, undefined, {
    tags,
    revalidate,
  });
