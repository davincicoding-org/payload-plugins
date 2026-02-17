import type { BasePayload, CollectionSlug, TypeWithID } from 'payload';

export interface ResolvedActor {
  id: TypeWithID['id'];
  displayName: string;
}

/**
 * Resolve a user ID into a display-name pair using the user collection's
 * `admin.useAsTitle` config. Falls back to `email` when the configured
 * field is missing or not a string.
 */
export async function resolveActor(
  payload: BasePayload,
  actorId: TypeWithID['id'],
): Promise<ResolvedActor> {
  const userSlug = payload.config.admin?.user as CollectionSlug | undefined;
  if (!userSlug) {
    return { id: actorId, displayName: String(actorId) };
  }

  const user = await payload.findByID({
    collection: userSlug,
    id: actorId,
    depth: 0,
  });

  const { useAsTitle = 'email' } =
    payload.collections[userSlug].config.admin ?? {};

  const titleValue = user[useAsTitle as keyof typeof user];
  const displayName =
    typeof titleValue === 'string' ? titleValue : (user.email as string);

  return { id: actorId, displayName };
}
