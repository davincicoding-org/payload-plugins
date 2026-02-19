import type {
  DocumentID,
  DocumentReference,
} from '@davincicoding/payload-plugin-kit';
import type { BasePayload } from 'payload';
import type { ResolvedUser, StoredDocumentReference } from './types';

/**
 * Resolve a user ID into a display-name pair using the user collection's
 * `admin.useAsTitle` config. Falls back to `email` when the configured
 * field is missing or not a string.
 */
export async function resolveUser(
  payload: BasePayload,
  userId: DocumentID,
): Promise<ResolvedUser> {
  const userSlug = payload.config.admin?.user as 'users' | undefined;
  if (!userSlug) throw new Error('User collection not configured');

  const user = await payload.findByID({
    collection: userSlug,
    id: userId,
    depth: 0,
  });

  const displayName = (() => {
    const { useAsTitle = 'email' } =
      payload.collections[userSlug].config.admin ?? {};

    const title = user[useAsTitle as keyof typeof user];

    if (typeof title === 'string') {
      return title;
    }
    return user.email;
  })();

  return { ...user, displayName };
}

/** Convert a `DocumentReference` to the flat shape stored in the group field. */
export function toStoredReference(
  ref: DocumentReference,
): StoredDocumentReference {
  return {
    entity: ref.entity,
    slug: ref.slug,
    documentId: ref.entity === 'collection' ? String(ref.id) : undefined,
  };
}

/** Convert the flat stored shape back to a `DocumentReference` discriminated union. */
export function toDocumentReference(
  ref: StoredDocumentReference,
): DocumentReference {
  if (ref.entity === 'collection') {
    if (!ref.documentId) {
      throw new Error(
        `Collection reference "${ref.slug}" is missing a documentId`,
      );
    }
    return { entity: ref.entity, slug: ref.slug, id: ref.documentId };
  }
  return { entity: ref.entity, slug: ref.slug };
}
