const LIVE_SUBJECT_BRAND = Symbol.for('payload-notifications:live-subject');

export interface LiveSubjectToken {
  type: 'actor' | 'document' | 'meta';
  field: string;
}

export interface LiveSubject {
  readonly [LIVE_SUBJECT_BRAND]: true;
  readonly type: 'dynamic';
  readonly parts: ReadonlyArray<string | LiveSubjectToken>;
}

/** Type guard that checks whether a value is a `LiveSubject` produced by `createLiveSubject`. */
export function isLiveSubject(value: unknown): value is LiveSubject {
  return (
    typeof value === 'object' &&
    value !== null &&
    LIVE_SUBJECT_BRAND in value &&
    (value as LiveSubject)[LIVE_SUBJECT_BRAND] === true
  );
}

export interface TemplateBuilder {
  (strings: TemplateStringsArray, ...tokens: LiveSubjectToken[]): LiveSubject;
  actor: LiveSubjectToken;
  document: (field: string) => LiveSubjectToken;
  meta: (field: string) => LiveSubjectToken;
}

/**
 * Build a live subject using a tagged template literal.
 *
 * Live subjects are serializable JSON structures whose tokens are resolved
 * at read time, keeping notification subjects up-to-date with the latest
 * actor display names and document field values.
 *
 * @example
 * ```ts
 * const subject = createLiveSubject(
 *   (t) => t`${t.actor} commented on "${t.document('title')}"`,
 * );
 * ```
 */
export function createLiveSubject(
  fn: (t: TemplateBuilder) => LiveSubject,
): LiveSubject {
  const tag = ((
    strings: TemplateStringsArray,
    ...tokens: LiveSubjectToken[]
  ): LiveSubject => {
    const parts: (string | LiveSubjectToken)[] = [];

    for (let i = 0; i < strings.length; i++) {
      const str = strings[i];
      if (str) parts.push(str);

      const token = tokens[i];
      if (token) parts.push(token);
    }

    return {
      [LIVE_SUBJECT_BRAND]: true as const,
      type: 'dynamic' as const,
      parts,
    };
  }) as TemplateBuilder;

  tag.actor = { type: 'actor', field: 'displayName' };
  tag.document = (field: string) => ({ type: 'document', field });
  tag.meta = (field: string) => ({ type: 'meta', field });

  return fn(tag);
}
