import { describe, expect, test } from 'vitest';
import { z } from 'zod';
import type { EndpointConfig, InferInput } from './endpoint';

describe('EndpointConfig', () => {
  test('accepts minimal config (path + method only)', () => {
    const config = {
      path: '/test',
      method: 'get',
    } satisfies EndpointConfig;

    expect(config.path).toBe('/test');
    expect(config.method).toBe('get');
  });

  test('accepts config with input and output schemas', () => {
    const config = {
      path: '/greet',
      method: 'post',
      input: z.object({ name: z.string() }),
      output: z.object({ message: z.string() }),
    } satisfies EndpointConfig;

    expect(config.input).toBeDefined();
    expect(config.output).toBeDefined();
  });
});

describe('InferInput / InferOutput', () => {
  test('infers input type from schema', () => {
    const config = {
      path: '/test' as const,
      method: 'post' as const,
      input: z.object({ name: z.string() }),
    };

    type Input = InferInput<typeof config>;
    const input: Input = { name: 'hello' };
    expect(input.name).toBe('hello');
  });

  test('infers void when no input schema', () => {
    const config = {
      path: '/test' as const,
      method: 'get' as const,
    };

    type Input = InferInput<typeof config>;
    const input: Input = undefined as Input;
    expect(input).toBeUndefined();
  });
});
