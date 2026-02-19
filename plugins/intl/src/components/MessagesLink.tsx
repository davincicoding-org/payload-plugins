import { Button } from '@payloadcms/ui';
import { getAdminURL } from '@repo/common';
import { IconWorld } from '@tabler/icons-react';
import type { PayloadRequest } from 'payload';
import type { MessagesGuard } from '@/types';

export interface MessagesLinkProps {
  access?: MessagesGuard;
  req: PayloadRequest;
}

export async function MessagesLink({
  access = () => true,
  req,
}: MessagesLinkProps) {
  const hasAccess = await access(req);
  if (!hasAccess) return null;

  return (
    <Button
      buttonStyle="tab"
      el="link"
      to={getAdminURL({ req, path: '/intl' })}
    >
      <IconWorld size={20} strokeWidth={1.5} />
    </Button>
  );
}
