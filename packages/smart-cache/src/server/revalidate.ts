'use server';

import { revalidateTag } from 'next/cache';

import type { EntitySlug } from '../types';

export const revalidateCache = async (tag: EntitySlug) => {
  console.log('INVALIDATE CACHE', tag);
  revalidateTag(tag);
};
