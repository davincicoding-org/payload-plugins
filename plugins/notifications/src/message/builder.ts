import type { LiveMessage, LiveMessageToken } from '../types';

export interface TemplateBuilder {
  (strings: TemplateStringsArray, ...tokens: LiveMessageToken[]): LiveMessage;
  actor: LiveMessageToken;
  document: (field: string) => LiveMessageToken;
  meta: (field: string) => LiveMessageToken;
}

/**
 * Build a live message using a tagged template literal.
 *
 * Live messages are serializable JSON structures whose tokens are resolved
 * at read time, keeping notification messages up-to-date with the latest
 * actor display names and document field values.
 *
 * @example
 * ```ts
 * const message = createLiveMessage(
 *   (t) => t`${t.actor} commented on "${t.document('title')}"`,
 * );
 * ```
 */
export function createLiveMessage(
  fn: (t: TemplateBuilder) => LiveMessage,
): LiveMessage {
  const tag = ((
    strings: TemplateStringsArray,
    ...tokens: LiveMessageToken[]
  ): LiveMessage => {
    const parts: (string | LiveMessageToken)[] = [];

    for (let i = 0; i < strings.length; i++) {
      const str = strings[i];
      if (str) parts.push(str);

      const token = tokens[i];
      if (token) parts.push(token);
    }

    return {
      type: 'live' as const,
      parts,
    };
  }) as TemplateBuilder;

  tag.actor = { type: 'actor', field: 'displayName' };
  tag.document = (field: string) => ({ type: 'document', field });
  tag.meta = (field: string) => ({ type: 'meta', field });

  return fn(tag);
}
