'use client';

import { Button, Popup } from '@payloadcms/ui';
import { IconExternalLink, IconWorld } from '@tabler/icons-react';
import type { NormalizedScope } from '@/types';
import { toWords } from '@/utils/format';
import styles from './ScopesButton.module.css';

export interface ScopesButtonProps {
  readonly scopes: Map<string, NormalizedScope>;
}

export function ScopesButton({ scopes }: ScopesButtonProps): React.ReactNode {
  if (scopes.size === 0) return null;

  return (
    <Popup
      button={
        <Button buttonStyle="tab" type="button">
          <IconWorld size={18} strokeWidth={1.5} />
          Scopes
        </Button>
      }
      horizontalAlign="right"
      size="large"
    >
      <div className={styles.popup}>
        <div className={styles.scopesList}>
          {Array.from(scopes.entries()).map(([slug]) => (
            <a
              className={styles.scopeItem}
              href={`/admin/globals/${slug}`}
              key={slug}
            >
              <span>{toWords(slug)}</span>
              <IconExternalLink size={14} strokeWidth={1.5} />
            </a>
          ))}
        </div>
      </div>
    </Popup>
  );
}
