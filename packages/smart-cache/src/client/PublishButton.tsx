'use client';

import { Button, toast, useConfig, useDocumentEvents } from '@payloadcms/ui';
import { useEffect, useState } from 'react';

import { checkChanges, publishChanges } from './requests';

export function PublishButton() {
  const { config } = useConfig();
  const { mostRecentUpdate } = useDocumentEvents();

  const apiUrl = config.serverURL + config.routes.api;

  const [hasChanges, setHasChanges] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  useEffect(() => {
    checkChanges(apiUrl)
      .then((result) => {
        if (!result.success) return setHasChanges(true);
        setHasChanges(result.hasChanges);
      })
      .catch(() => setHasChanges(true));
  }, [apiUrl]);

  useEffect(() => {
    if (!mostRecentUpdate) return;
    setHasChanges(true);
  }, [mostRecentUpdate]);

  const handlePublish = async () => {
    setIsPublishing(true);
    const toastId = toast.loading('Publishing changes...');
    const { success, message } = await publishChanges(apiUrl);

    if (!success) {
      toast.error(message, {
        id: toastId,
      });
      setIsPublishing(false);
      return;
    }
    toast.success(message, {
      id: toastId,
    });
    setHasChanges(false);
    setIsPublishing(false);
  };

  if (!hasChanges) return null;

  return (
    <Button disabled={isPublishing} onClick={handlePublish}>
      Publish Changes
    </Button>
  );
}
