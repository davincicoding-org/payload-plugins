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
      path: 'email',
      value: 'placeholder@replaced-server-side.com',
      valid: true,
    });

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

  // Only hide auth fields on create (new document)
  if (id) return null;

  return (
    <style>{`
      .auth-fields { display: none !important; }
    `}</style>
  );
}
