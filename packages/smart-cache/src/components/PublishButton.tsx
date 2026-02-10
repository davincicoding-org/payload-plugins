'use client';

import { Button, toast, useConfig, useDocumentEvents } from '@payloadcms/ui';
import { useEffect, useState } from 'react';

import { ENDPOINTS } from '@/const';

export function PublishButton() {
  const { config } = useConfig();
  const { mostRecentUpdate } = useDocumentEvents();

  const apiUrl = config.serverURL + config.routes.api;

  const [hasChanges, setHasChanges] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  useEffect(() => {
    ENDPOINTS.checkChanges
      .call(apiUrl)
      .then(({ hasChanges }) => setHasChanges(hasChanges))
      .catch(() => setHasChanges(true));
  }, [apiUrl]);

  useEffect(() => {
    if (!mostRecentUpdate) return;
    setHasChanges(true);
  }, [mostRecentUpdate]);

  const handlePublish = async () => {
    setIsPublishing(true);
    const toastId = toast.loading('Publishing changes...');
    try {
      await ENDPOINTS.publishChanges.call(apiUrl);
      toast.success('Changes published successfully!', {
        id: toastId,
      });
      setHasChanges(false);
    } catch (_error) {
      const message =
        _error instanceof Error ? _error.message : 'Failed to publish changes';
      toast.error(message, {
        id: toastId,
      });
    } finally {
      setIsPublishing(false);
    }
  };

  if (!hasChanges) return null;

  return (
    <Button disabled={isPublishing} onClick={handlePublish}>
      Publish Changes
    </Button>
  );
}
