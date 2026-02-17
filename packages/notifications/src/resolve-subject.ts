import type { LiveSubject, LiveSubjectToken } from './subject';
import { isLiveSubject } from './subject';
import type { SubjectContext, SubjectFn } from './types';

export interface StaticStoredSubject {
  type: 'static';
  value: string;
}

export interface DynamicStoredSubject {
  type: 'dynamic';
  parts: ReadonlyArray<string | LiveSubjectToken>;
}

export type StoredSubject = StaticStoredSubject | DynamicStoredSubject;

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
