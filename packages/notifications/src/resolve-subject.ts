import { z } from 'zod';
import type { LiveSubject } from './subject';
import { isLiveSubject } from './subject';
import type { SubjectContext, SubjectFn } from './types';

const liveSubjectTokenSchema = z.object({
  type: z.enum(['actor', 'document', 'meta']),
  field: z.string(),
});

const staticStoredSubjectSchema = z.object({
  type: z.literal('static'),
  value: z.string(),
});

const dynamicStoredSubjectSchema = z.object({
  type: z.literal('dynamic'),
  parts: z.array(z.union([z.string(), liveSubjectTokenSchema])),
});

export const storedSubjectSchema = z.discriminatedUnion('type', [
  staticStoredSubjectSchema,
  dynamicStoredSubjectSchema,
]);

export type StoredSubject = z.infer<typeof storedSubjectSchema>;

/**
 * Convert a subject input into the shape stored in the database.
 * - Plain strings and SubjectFn results become `{ type: 'static', value }`.
 * - LiveSubject objects become `{ type: 'dynamic', parts }`.
 */
export function toStoredSubject(
  subject: string | SubjectFn | LiveSubject,
  context: Partial<SubjectContext>,
): StoredSubject {
  if (isLiveSubject(subject)) {
    return { type: 'dynamic', parts: subject.parts };
  }

  if (typeof subject === 'function') {
    const value = subject(context as SubjectContext);
    return { type: 'static', value };
  }

  return { type: 'static', value: subject };
}

/**
 * Resolve a stored subject into a display string.
 * Static subjects return their value directly.
 * Dynamic subjects resolve each token against the provided context.
 */
export function resolveSubjectAtReadTime(
  stored: StoredSubject,
  context: Partial<SubjectContext>,
): string {
  if (stored.type === 'static') return stored.value;

  return stored.parts
    .map((part) => {
      if (typeof part === 'string') return part;
      return resolveToken(part, context);
    })
    .join('');
}

type LiveSubjectToken = z.infer<typeof liveSubjectTokenSchema>;

function resolveToken(
  token: LiveSubjectToken,
  context: Partial<SubjectContext>,
): string {
  switch (token.type) {
    case 'actor': {
      const actor = context.actor;
      if (!actor) return '';
      const value = actor[token.field as keyof typeof actor];
      return typeof value === 'string' ? value : String(value ?? '');
    }
    case 'document': {
      const doc = context.document;
      if (!doc) return '';
      const value = doc[token.field];
      return typeof value === 'string' ? value : String(value ?? '');
    }
    case 'meta': {
      const meta = context.meta;
      if (!meta) return '';
      const value = meta[token.field];
      return typeof value === 'string' ? value : String(value ?? '');
    }
  }
}
