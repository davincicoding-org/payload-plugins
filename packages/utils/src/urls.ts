import type { PayloadRequest } from 'payload';
import { formatAdminURL } from 'payload/shared';

export function getServerURL(req: PayloadRequest): string {
  if (!req.url)
    throw new Error(
      'Could not get serverURL, since request URL is not available',
    );

  const { config } = req.payload;

  if (config.serverURL) return config.serverURL;

  return `${new URL(req.url).protocol}//${req.headers.get('host')}`;
}

export function getAdminURL({
  req,
  path,
}: {
  req: PayloadRequest;
  path?: '' | `/${string}` | null;
}): string {
  return formatAdminURL({
    adminRoute: req.payload.config.routes.admin,
    serverURL: getServerURL(req),
    path,
  });
}

export function getApiURL({
  req,
  path,
}: {
  req: PayloadRequest;
  path?: '' | `/${string}` | null;
}): string {
  return formatAdminURL({
    apiRoute: req.payload.config.routes.api,
    serverURL: getServerURL(req),
    path,
  });
}
