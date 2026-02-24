import type { Endpoint, PayloadRequest } from 'payload';
import type { EndpointConfig, InferInput, ZodLike } from '../endpoint';

function validateAndWrap(
  output: unknown,
  schema: ZodLike | undefined,
): Response {
  if (output instanceof Response) return output;
  if (schema) {
    const result = schema.safeParse(output);
    if (!result.success) {
      return Response.json(
        { error: 'Internal server error: output validation failed' },
        { status: 500 },
      );
    }
  }
  return Response.json(output);
}

export function createEndpointHandler<T extends EndpointConfig>(
  config: T,
  handler: (
    req: PayloadRequest,
    ...args: InferInput<T> extends void ? [] : [input: InferInput<T>]
  ) => Promise<unknown | Response>,
): Endpoint {
  const inputSchema = config.input as ZodLike | undefined;
  const outputSchema = config.output as ZodLike | undefined;

  return {
    path: config.path,
    method: config.method,
    handler: async (req) => {
      if (!inputSchema) {
        // biome-ignore lint/complexity/noBannedTypes: generic handler cast
        const output = await (handler as Function)(req);
        return validateAndWrap(output, outputSchema);
      }

      if (config.method === 'get') {
        const routeParams = req.routeParams ?? {};
        const searchParams = req.searchParams
          ? Object.fromEntries(req.searchParams.entries())
          : {};
        const merged = { ...searchParams, ...routeParams };
        const result = inputSchema.safeParse(merged);
        if (!result.success) {
          return Response.json({ error: result.error }, { status: 400 });
        }
        // biome-ignore lint/complexity/noBannedTypes: generic handler cast
        const output = await (handler as Function)(req, result.data);
        return validateAndWrap(output, outputSchema);
      }

      const { addDataAndFileToRequest } = await import('payload');
      await addDataAndFileToRequest(req);
      const result = inputSchema.safeParse(req.data);
      if (!result.success) {
        return Response.json({ error: result.error }, { status: 400 });
      }
      // biome-ignore lint/complexity/noBannedTypes: generic handler cast
      const output = await (handler as Function)(req, result.data);
      return validateAndWrap(output, outputSchema);
    },
  };
}
