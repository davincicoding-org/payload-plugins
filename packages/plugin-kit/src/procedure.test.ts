import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { z } from 'zod';

import { defineProcedure } from './procedure';

describe('defineProcedure', () => {
  test('returns builder with path and method', () => {
    const builder = defineProcedure({ path: '/test', method: 'get' });
    expect(builder.path).toBe('/test');
    expect(builder.method).toBe('get');
  });

  test('.returns() produces a typed procedure', () => {
    const procedure = defineProcedure({
      path: '/test',
      method: 'post',
    }).returns<{ ok: boolean }>();
    expect(procedure.path).toBe('/test');
    expect(procedure.method).toBe('post');
  });
});

describe('procedure.endpoint', () => {
  test('creates a Payload endpoint config', () => {
    const procedure = defineProcedure({ path: '/hello', method: 'get' });
    const endpoint = procedure.endpoint(async () => ({ message: 'hi' }));
    expect(endpoint.path).toBe('/hello');
    expect(endpoint.method).toBe('get');
    expect(typeof endpoint.handler).toBe('function');
  });

  test('validates input with schema and returns 400 on invalid input', async () => {
    const schema = z.object({ name: z.string() });
    const procedure = defineProcedure({
      path: '/greet',
      method: 'post',
      input: schema,
    });

    const handler = vi.fn();
    const endpoint = procedure.endpoint(handler);

    // Mock addDataAndFileToRequest
    vi.doMock('payload', () => ({
      addDataAndFileToRequest: vi.fn(async (_req: unknown) => {
        // data is already set in the mock req
      }),
    }));

    const mockReq = {
      data: { notName: 123 },
      searchParams: new URLSearchParams(),
      routeParams: {},
      headers: new Headers(),
      // biome-ignore lint/suspicious/noExplicitAny: test mock
    } as any;

    const response = await endpoint.handler(mockReq);
    expect(response).toBeInstanceOf(Response);
    expect((response as Response).status).toBe(400);
    expect(handler).not.toHaveBeenCalled();
  });

  test('passes parsed input to handler for GET requests', async () => {
    const schema = z.object({ id: z.string() });
    const procedure = defineProcedure({
      path: '/items/:id',
      method: 'get',
      input: schema,
    });

    const handler = vi.fn(async () => ({ found: true }));
    const endpoint = procedure.endpoint(handler);

    const mockReq = {
      searchParams: new URLSearchParams(),
      routeParams: { id: '42' },
      headers: new Headers(),
      // biome-ignore lint/suspicious/noExplicitAny: test mock
    } as any;

    const response = await endpoint.handler(mockReq);
    expect(handler).toHaveBeenCalledWith(mockReq, { id: '42' });
    expect(response).toBeInstanceOf(Response);
  });

  test('wraps output in Response', async () => {
    const procedure = defineProcedure({ path: '/test', method: 'get' });
    const endpoint = procedure.endpoint(async () => ({ ok: true }));

    // biome-ignore lint/suspicious/noExplicitAny: test mock
    const mockReq = { headers: new Headers() } as any;
    const response = await endpoint.handler(mockReq);
    expect(response).toBeInstanceOf(Response);

    const body = await (response as Response).json();
    expect(body).toEqual({ ok: true });
  });

  test('returns Response as-is when handler returns Response', async () => {
    const procedure = defineProcedure({ path: '/test', method: 'get' });
    const customResponse = new Response('custom', { status: 201 });
    const endpoint = procedure.endpoint(async () => customResponse);

    // biome-ignore lint/suspicious/noExplicitAny: test mock
    const mockReq = { headers: new Headers() } as any;
    const response = await endpoint.handler(mockReq);
    expect(response).toBe(customResponse);
  });
});

describe('procedure.call', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test('builds correct URL for GET with path params and query', async () => {
    const schema = z.object({ id: z.string(), format: z.string() });
    const procedure = defineProcedure({
      path: '/items/:id',
      method: 'get',
      input: schema,
    }).returns<{ ok: boolean }>();

    // biome-ignore lint/suspicious/noExplicitAny: test mock
    globalThis.fetch = vi.fn(async () => Response.json({ ok: true })) as any;

    await procedure.call('https://api.test', { id: '42', format: 'json' });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://api.test/items/42?format=json',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  test('sends JSON body for POST', async () => {
    const schema = z.object({ name: z.string() });
    const procedure = defineProcedure({
      path: '/items',
      method: 'post',
      input: schema,
    }).returns<{ id: string }>();

    // biome-ignore lint/suspicious/noExplicitAny: test mock
    globalThis.fetch = vi.fn(async () => Response.json({ id: '1' })) as any;

    await procedure.call('https://api.test', { name: 'Test' });

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
    const schema = z.object({
      since: z.string().optional(),
      other: z.string().optional(),
    });
    const procedure = defineProcedure({
      path: '/items',
      method: 'get',
      input: schema,
    }).returns<{ ok: boolean }>();

    // biome-ignore lint/suspicious/noExplicitAny: test mock
    globalThis.fetch = vi.fn(async () => Response.json({ ok: true })) as any;

    await procedure.call('https://api.test', {
      since: undefined,
      other: undefined,
    });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://api.test/items',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  test('throws on non-OK response', async () => {
    const procedure = defineProcedure({
      path: '/fail',
      method: 'get',
    }).returns<never>();

    globalThis.fetch = vi.fn(
      async () =>
        new Response('Not Found', { status: 404, statusText: 'Not Found' }),
      // biome-ignore lint/suspicious/noExplicitAny: test mock
    ) as any;

    await expect(procedure.call('https://api.test')).rejects.toThrow(
      'Request failed: 404 Not Found',
    );
  });
});
