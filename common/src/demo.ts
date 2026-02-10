import { requests } from '@payloadcms/ui/shared';
import type { Endpoint, PayloadHandler } from 'payload';

export const createProcedureFactory = ({
  path,
  apiUrl,
  method,
}: {
  apiUrl: string;
  path: string;
  method: keyof typeof requests;
}) => {
  return {
    request: (options?: RequestInit) => {
      const url = `${apiUrl.replace(/\/$/, '')}/${path}`;
      return requests[method](url, options);
    },

    createEndpoint: (handler: PayloadHandler): Endpoint => ({
      path,
      method,
      handler,
    }),
  };
};
