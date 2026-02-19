import type {
  BasePayload,
  CollectionSlug,
  GlobalSlug,
  JsonObject,
  TypeWithID,
} from 'payload';
import z from 'zod';

// MARK: Types

export const documentIdSchema = z.union([z.number(), z.string()]);
export type DocumentID = TypeWithID['id'] & z.infer<typeof documentIdSchema>;

export const documentReferenceSchema = z.discriminatedUnion('entity', [
  z.object({
    entity: z.literal('collection'),
    slug: z.string(),
    id: documentIdSchema,
  }),
  z.object({
    entity: z.literal('global'),
    slug: z.string(),
  }),
]);

export type DocumentReference = z.infer<typeof documentReferenceSchema>;

// MARK: Type Guards

export const isPopulated = <T extends TypeWithID>(
  relationship: T | DocumentID,
): relationship is T => typeof relationship === 'object';

export function assertPopulated<T extends TypeWithID | null>(
  docsOrIds: (T | DocumentID)[],
  errorMessage?: (id: DocumentID) => string,
): T[];
export function assertPopulated<T extends TypeWithID | null>(
  docOrId: T | DocumentID,
  errorMessage?: (id: DocumentID) => string,
): T;
export function assertPopulated<T extends TypeWithID | null>(
  value: T | DocumentID | (T | DocumentID)[],
  errorMessage = (id: DocumentID) => `Doc is not populated: [${id}]`,
): T | T[] {
  if (value === null) return value;
  if (Array.isArray(value)) {
    return value.map((item) => assertPopulated(item, errorMessage));
  }
  if (isPopulated(value)) return value;
  throw new Error(errorMessage(value as DocumentID));
}

// MARK: Utilities

export type IdentifiableDocument = TypeWithID['id'] | TypeWithID;

export function isIdentifiableDocument(
  value: unknown,
): value is IdentifiableDocument {
  if (typeof value === 'string') return true;
  if (typeof value === 'number') return true;
  if (value === null) return false;
  if (typeof value !== 'object') return true;
  if (!('id' in value)) return false;
  return isIdentifiableDocument(value.id);
}

export const resolveDocumentID = (entity: IdentifiableDocument): DocumentID =>
  typeof entity === 'object' ? entity.id : entity;

export const uncaughtSwitchCase = (value: never) => {
  throw new Error(`Unhandled switch case: ${value}`);
};

export function fetchDocumentByReference(
  payload: BasePayload,
  ref: DocumentReference,
): Promise<JsonObject> {
  switch (ref.entity) {
    case 'collection':
      return payload.findByID({
        collection: ref.slug as CollectionSlug,
        id: ref.id,
        depth: 0,
      });
    case 'global':
      return payload.findGlobal({
        slug: ref.slug as GlobalSlug,
        depth: 0,
      });
    default:
      return uncaughtSwitchCase(ref);
  }
}

export async function updateDocumentByReference(
  payload: BasePayload,
  ref: DocumentReference,
  data: JsonObject,
) {
  switch (ref.entity) {
    case 'collection':
      return payload.update({
        collection: ref.slug as CollectionSlug,
        id: ref.id,
        data: data,
      });
    case 'global':
      return payload.updateGlobal({
        slug: ref.slug as GlobalSlug,
        // biome-ignore lint/suspicious/noExplicitAny: this is fine
        data: data as any,
      });
    default:
      return uncaughtSwitchCase(ref);
  }
}

export { getAdminURL, getApiURL, getServerURL } from './urls';
