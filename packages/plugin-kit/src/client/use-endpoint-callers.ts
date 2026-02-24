import { useConfig } from '@payloadcms/ui';
import { useMemo } from 'react';
import type { EndpointConfig, InferInput, InferOutput } from '../endpoint';
import { callEndpoint } from './call-endpoint';

export { callEndpoint } from './call-endpoint';

type EndpointCallers<T extends Record<string, EndpointConfig>> = {
  [K in keyof T]: InferInput<T[K]> extends void
    ? () => Promise<InferOutput<T[K]>>
    : (input: InferInput<T[K]>) => Promise<InferOutput<T[K]>>;
};

export function useEndpointCallers<T extends Record<string, EndpointConfig>>(
  endpoints: T,
): EndpointCallers<T> {
  const {
    config: {
      routes: { api: apiRoute },
    },
  } = useConfig();

  return useMemo(() => {
    const callers = {} as Record<string, Function>;
    for (const [key, config] of Object.entries(endpoints)) {
      callers[key] = (...args: unknown[]) =>
        // biome-ignore lint/complexity/noBannedTypes: internal dynamic dispatch
        (callEndpoint as Function)(config, apiRoute, ...args);
    }
    return callers as EndpointCallers<T>;
  }, [endpoints, apiRoute]);
}
