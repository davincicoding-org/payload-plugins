'use client';

import {
  useDocumentInfo,
  useFormFields,
  useFormInitializing,
} from '@payloadcms/ui';
import { useEffect } from 'react';

export function HideAuthOnCreate() {
  const { id } = useDocumentInfo();
  const isInitializing = useFormInitializing();
  const dispatchFields = useFormFields((reducer) => reducer[1]);

  useEffect(() => {
    if (id) return;
    if (isInitializing) return;

    dispatchFields({
      type: 'UPDATE',
      path: 'password',
      value: 'placeholder-replaced-server-side',
      valid: true,
    });
    dispatchFields({
      type: 'UPDATE',
      path: 'confirm-password',
      value: 'placeholder-replaced-server-side',
      valid: true,
    });
  }, [id, dispatchFields, isInitializing]);

  // Disable autocomplete on hidden password fields to prevent browser password manager prompts
  useEffect(() => {
    if (id) return;

    const passwordInputs = document.querySelectorAll(
      '.auth-fields input[type="password"]',
    );
    for (const input of passwordInputs) {
      input.setAttribute('autocomplete', 'off');
    }
  }, [id]);

  // Only restyle auth fields on create (new document)
  if (id) return null;

  return (
    <style>{`
      /* Hide password fields and their empty wrappers, keep email visible */
      .auth-fields .field-type.password { display: none !important; }
      .auth-fields .field-type.confirm-password { display: none !important; }
      .auth-fields__changing-password { display: none !important; }
      .auth-fields__controls { display: none !important; }
      /* Remove auth group styling so email appears as a plain field */
      .auth-fields {
        background: none !important;
        border: none !important;
        padding: 0 !important;
        margin: 0 !important;
      }
    `}</style>
  );
}
