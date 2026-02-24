/** Any Zod-like schema with safeParse and inferred output. */
export interface ZodLike<TOutput = unknown> {
  safeParse(
    data: unknown,
  ): { success: true; data: TOutput } | { success: false; error: unknown };
}

export type Method = 'get' | 'post' | 'put' | 'patch' | 'delete';

export interface EndpointConfig<
  TInput extends ZodLike | undefined = ZodLike | undefined,
  TOutput extends ZodLike | undefined = ZodLike | undefined,
> {
  path: `/${string}`;
  method: Method;
  input?: TInput;
  output?: TOutput;
}

/** Infer the parsed input type from an EndpointConfig. Void if no input schema. */
export type InferInput<T extends EndpointConfig> =
  T extends EndpointConfig<infer I, any>
    ? I extends ZodLike<infer O>
      ? O
      : void
    : void;

/** Infer the parsed output type from an EndpointConfig. unknown if no output schema. */
export type InferOutput<T extends EndpointConfig> =
  T extends EndpointConfig<any, infer O>
    ? O extends ZodLike<infer R>
      ? R
      : unknown
    : unknown;
