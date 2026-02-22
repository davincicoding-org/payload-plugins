import type { DocumentID } from '@davincicoding/payload-plugin-kit';
import type { CollectionSlug, GlobalSlug, TypeWithID } from 'payload';
import type { SmartCachePluginConfig } from '.';

export type ResolvedPluginOptions<
  Req extends keyof SmartCachePluginConfig = keyof SmartCachePluginConfig,
  Opt extends keyof SmartCachePluginConfig = never,
> = Pick<Required<SmartCachePluginConfig>, Req> &
  Pick<SmartCachePluginConfig, Opt>;

export type EntitySlug = CollectionSlug | GlobalSlug;

/** Discriminated union passed to the `onInvalidate` callback. */
export type DocumentInvalidation<
  C extends CollectionSlug = CollectionSlug,
  G extends GlobalSlug = GlobalSlug,
> =
  | { type: 'collection'; slug: C; docID: DocumentID }
  | { type: 'global'; slug: G };

/** Callback type for the `onInvalidate` option. */
export type DocumentInvalidationCallback<
  C extends CollectionSlug = CollectionSlug,
  G extends GlobalSlug = GlobalSlug,
> = (change: DocumentInvalidation<C, G>) => void | Promise<void>;

/** A document with an optional draft/publish status field. */
export type DocumentWithStatus = TypeWithID & {
  _status?: 'published' | 'draft';
};
