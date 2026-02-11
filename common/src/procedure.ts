import type { Endpoint, PayloadRequest } from 'payload';

type Method = 'get' | 'post' | 'put' | 'patch' | 'delete';

/** Any Zod-like schema with safeParse and inferred output */
interface ZodLike<TOutput = unknown> {
  safeParse(
    data: unknown,
  ): { success: true; data: TOutput } | { success: false; error: unknown };
}

type InferOutput<T> = T extends ZodLike<infer O> ? O : never;

interface ProcedureConfig<TSchema extends ZodLike | undefined = undefined> {
  path: `/${string}`;
  method: Method;
  input?: TSchema;
}

export interface Procedure<TInput, TOutput> {
  path: `/${string}`;
  method: Method;
  endpoint(
    handler: (
      req: PayloadRequest,
      ...args: TInput extends void ? [] : [input: TInput]
    ) => Promise<unknown | Response>,
  ): Endpoint;
  call(
    apiUrl: string,
    ...args: TInput extends void ? [] : [input: TInput]
  ): Promise<TOutput>;
}

export interface ProcedureBuilder<TInput> {
  path: string;
  method: Method;
  returns<TOutput>(): Procedure<TInput, TOutput>;
  endpoint(
    handler: (
      req: PayloadRequest,
      ...args: TInput extends void ? [] : [input: TInput]
    ) => Promise<unknown | Response>,
  ): Endpoint;
  call(
    apiUrl: string,
    ...args: TInput extends void ? [] : [input: TInput]
  ): Promise<unknown>;
}

function wrapOutput(output: unknown): Response {
  if (output instanceof Response) return output;
  return Response.json(output);
}

function createProcedure<TInput, TOutput>(
  config: ProcedureConfig<ZodLike | undefined>,
  inputSchema: ZodLike | undefined,
): Procedure<TInput, TOutput> {
  return {
    path: config.path,
    method: config.method,
    endpoint(handler) {
      return {
        path: config.path,
        method: config.method,
        handler: async (req) => {
          if (inputSchema) {
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
              // biome-ignore lint/complexity/noBannedTypes: ugly type cast
              const output = await (handler as Function)(req, result.data);
              return wrapOutput(output);
            }

            const { addDataAndFileToRequest } = await import(
              /* webpackIgnore: true */ 'payload'
            );
            await addDataAndFileToRequest(req);
            const result = inputSchema.safeParse(req.data);
            if (!result.success) {
              return Response.json({ error: result.error }, { status: 400 });
            }
            // biome-ignore lint/complexity/noBannedTypes: ugly type cast
            const output = await (handler as Function)(req, result.data);
            return wrapOutput(output);
          }
          // biome-ignore lint/complexity/noBannedTypes: ugly type cast
          const output = await (handler as Function)(req);
          return wrapOutput(output);
        },
      };
    },
    call(apiUrl, ...args) {
      const input = args[0] as Record<string, unknown> | undefined;

      if (config.method === 'get') {
        let resolvedPath = config.path;
        const queryParams: Record<string, string> = {};

        if (input) {
          for (const [key, value] of Object.entries(input)) {
            if (resolvedPath.includes(`:${key}`)) {
              resolvedPath = resolvedPath.replace(
                `:${key}`,
                encodeURIComponent(String(value)),
              ) as `/${string}`;
            } else {
              queryParams[key] = String(value);
            }
          }
        }

        const queryString = new URLSearchParams(queryParams).toString();
        const url = `${apiUrl}${resolvedPath}${queryString ? `?${queryString}` : ''}`;

        return fetch(url, {
          method: 'GET',
          credentials: 'include',
        }).then(async (response) => {
          if (!response.ok) {
            throw new Error(
              `Request failed: ${response.status} ${response.statusText}`,
            );
          }
          return response.json();
        }) as Promise<TOutput>;
      }

      const url = `${apiUrl}${config.path}`;
      return fetch(url, {
        method: config.method.toUpperCase(),
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: input ? JSON.stringify(input) : undefined,
      }).then(async (response) => {
        if (!response.ok) {
          throw new Error(
            `Request failed: ${response.status} ${response.statusText}`,
          );
        }
        return response.json();
      }) as Promise<TOutput>;
    },
  };
}

export function defineProcedure<
  TSchema extends ZodLike | undefined = undefined,
>(
  config: ProcedureConfig<TSchema>,
): ProcedureBuilder<TSchema extends ZodLike ? InferOutput<TSchema> : void> {
  type TInput = TSchema extends ZodLike ? InferOutput<TSchema> : undefined;
  const proc = createProcedure<TInput, unknown>(config, config.input);

  return {
    path: config.path,
    method: config.method,
    returns<TOutput>(): Procedure<TInput, TOutput> {
      return createProcedure<TInput, TOutput>(config, config.input);
    },
    endpoint: proc.endpoint as unknown as ProcedureBuilder<TInput>['endpoint'],
    call: proc.call as ProcedureBuilder<TInput>['call'],
  };
}
