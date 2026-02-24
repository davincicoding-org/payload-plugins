import { describe, expect, test, vi } from 'vitest';
import { z } from 'zod';
import type { EndpointConfig } from '../endpoint';
import { createEndpointHandler } from './endpoint-handler';

describe('createEndpointHandler', () => {
  test('creates a Payload endpoint with path and method', () => {
    const config = {
      path: '/hello',
      method: 'get',
    } satisfies EndpointConfig;

    const endpoint = createEndpointHandler(config, async () => ({
      message: 'hi',
    }));
    expect(endpoint.path).toBe('/hello');
    expect(endpoint.method).toBe('get');
    expect(typeof endpoint.handler).toBe('function');
  });

  test('validates input with schema and returns 400 on invalid', async () => {
    const config = {
      path: '/greet',
      method: 'post',
      input: z.object({ name: z.string() }),
    } satisfies EndpointConfig;

    const handler = vi.fn();
    const endpoint = createEndpointHandler(config, handler);

    vi.doMock('payload', () => ({
      addDataAndFileToRequest: vi.fn(),
    }));

    const mockReq = {
      data: { notName: 123 },
      searchParams: new URLSearchParams(),
      routeParams: {},
      headers: new Headers(),
    } as any;

    const response = await endpoint.handler(mockReq);
    expect(response).toBeInstanceOf(Response);
    expect((response as Response).status).toBe(400);
    expect(handler).not.toHaveBeenCalled();
  });

  test('passes parsed input to handler for GET with route params', async () => {
    const config = {
      path: '/items/:id',
      method: 'get',
      input: z.object({ id: z.string() }),
    } satisfies EndpointConfig;

    const handler = vi.fn(async () => ({ found: true }));
    const endpoint = createEndpointHandler(config, handler);

    const mockReq = {
      searchParams: new URLSearchParams(),
      routeParams: { id: '42' },
      headers: new Headers(),
    } as any;

    const response = await endpoint.handler(mockReq);
    expect(handler).toHaveBeenCalledWith(mockReq, { id: '42' });
    expect(response).toBeInstanceOf(Response);
  });

  test('resolves route params from path pattern for GET', async () => {
    const config = {
      path: '/messages/:lang',
      method: 'get',
      input: z.object({ lang: z.string() }),
    } satisfies EndpointConfig;

    const handler = vi.fn(async () => ({ messages: [] }));
    const endpoint = createEndpointHandler(config, handler);

    const mockReq = {
      searchParams: new URLSearchParams(),
      routeParams: { lang: 'en' },
      headers: new Headers(),
    } as any;

    await endpoint.handler(mockReq);
    expect(handler).toHaveBeenCalledWith(mockReq, { lang: 'en' });
  });

  test('wraps plain object output in Response', async () => {
    const config = { path: '/test', method: 'get' } satisfies EndpointConfig;
    const endpoint = createEndpointHandler(config, async () => ({ ok: true }));

    const mockReq = { headers: new Headers() } as any;
    const response = await endpoint.handler(mockReq);
    expect(response).toBeInstanceOf(Response);

    const body = await (response as Response).json();
    expect(body).toEqual({ ok: true });
  });

  test('returns Response as-is when handler returns Response', async () => {
    const config = { path: '/test', method: 'get' } satisfies EndpointConfig;
    const customResponse = new Response('custom', { status: 201 });
    const endpoint = createEndpointHandler(config, async () => customResponse);

    const mockReq = { headers: new Headers() } as any;
    const response = await endpoint.handler(mockReq);
    expect(response).toBe(customResponse);
  });

  test('validates output with schema when provided', async () => {
    const config = {
      path: '/test',
      method: 'get',
      output: z.object({ count: z.number() }),
    } satisfies EndpointConfig;

    const endpoint = createEndpointHandler(config, async () => ({
      count: 'not-a-number',
    }));

    const mockReq = { headers: new Headers() } as any;
    const response = await endpoint.handler(mockReq);
    expect((response as Response).status).toBe(500);
  });
});
