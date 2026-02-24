import type {
  EndpointConfig,
  InferInput,
  InferOutput,
  ZodLike,
} from '../endpoint';

function parseOutput(data: unknown, schema: ZodLike | undefined): unknown {
  if (!schema) return data;
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new Error('Response validation failed');
  }
  return result.data;
}

/** Call a single endpoint. Exported for testing. */
export async function callEndpoint<T extends EndpointConfig>(
  config: T,
  apiUrl: string,
  ...args: InferInput<T> extends void ? [] : [input: InferInput<T>]
): Promise<InferOutput<T>> {
  const input = args[0] as Record<string, unknown> | undefined;
  const outputSchema = config.output as ZodLike | undefined;

  if (config.method === 'get') {
    let resolvedPath: string = config.path;
    const queryParams: Record<string, string> = {};

    if (input) {
      for (const [key, value] of Object.entries(input)) {
        if (value == null) continue;
        if (resolvedPath.includes(`:${key}`)) {
          resolvedPath = resolvedPath.replace(
            `:${key}`,
            encodeURIComponent(String(value)),
          );
        } else {
          queryParams[key] = String(value);
        }
      }
    }

    const queryString = new URLSearchParams(queryParams).toString();
    const url = `${apiUrl}${resolvedPath}${queryString ? `?${queryString}` : ''}`;

    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(
        `Request failed: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();
    return parseOutput(data, outputSchema) as InferOutput<T>;
  }

  const url = `${apiUrl}${config.path}`;
  const response = await fetch(url, {
    method: config.method.toUpperCase(),
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: input ? JSON.stringify(input) : undefined,
  });

  if (!response.ok) {
    throw new Error(
      `Request failed: ${response.status} ${response.statusText}`,
    );
  }

  const data = await response.json();
  return parseOutput(data, outputSchema) as InferOutput<T>;
}
