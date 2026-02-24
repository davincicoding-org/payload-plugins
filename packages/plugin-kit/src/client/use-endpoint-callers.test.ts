import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { z } from 'zod';
import type { EndpointConfig } from '../endpoint';
import { callEndpoint } from './call-endpoint';

// Test the internal callEndpoint function (non-hook logic)

describe('callEndpoint', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test('builds correct URL for GET with path params and query', async () => {
    const config = {
      path: '/items/:id',
      method: 'get',
      input: z.object({ id: z.string(), format: z.string() }),
    } satisfies EndpointConfig;

    globalThis.fetch = vi.fn(async () => Response.json({ ok: true })) as any;

    await callEndpoint(config, 'https://api.test', {
      id: '42',
      format: 'json',
    });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://api.test/items/42?format=json',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  test('sends JSON body for POST', async () => {
    const config = {
      path: '/items',
      method: 'post',
      input: z.object({ name: z.string() }),
    } satisfies EndpointConfig;

    globalThis.fetch = vi.fn(async () => Response.json({ id: '1' })) as any;

    await callEndpoint(config, 'https://api.test', { name: 'Test' });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://api.test/items',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test' }),
      }),
    );
  });

  test('omits undefined and null values from GET query params', async () => {
    const config = {
      path: '/items',
      method: 'get',
      input: z.object({ since: z.string().optional() }),
    } satisfies EndpointConfig;

    globalThis.fetch = vi.fn(async () => Response.json({ ok: true })) as any;

    await callEndpoint(config, 'https://api.test', { since: undefined });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://api.test/items',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  test('throws on non-OK response', async () => {
    const config = {
      path: '/fail',
      method: 'get',
      input: undefined,
    } satisfies EndpointConfig;

    globalThis.fetch = vi.fn(
      async () =>
        new Response('Not Found', { status: 404, statusText: 'Not Found' }),
    ) as any;

    await expect(callEndpoint(config, 'https://api.test')).rejects.toThrow(
      'Request failed: 404 Not Found',
    );
  });

  test('validates response with output schema when provided', async () => {
    const config = {
      path: '/test',
      method: 'get',
      input: undefined,
      output: z.object({ count: z.number() }),
    } satisfies EndpointConfig;

    globalThis.fetch = vi.fn(async () =>
      Response.json({ count: 'not-a-number' }),
    ) as any;

    await expect(callEndpoint(config, 'https://api.test')).rejects.toThrow();
  });

  test('returns parsed output when schema validates', async () => {
    const config = {
      path: '/test',
      method: 'get',
      input: undefined,
      output: z.object({ count: z.number() }),
    } satisfies EndpointConfig;

    globalThis.fetch = vi.fn(async () => Response.json({ count: 42 })) as any;

    const result = await callEndpoint(config, 'https://api.test');
    expect(result).toEqual({ count: 42 });
  });
});
