import { describe, expect, test, vi } from 'vitest';

// Mock the payload/shared module
vi.mock('payload/shared', () => ({
  formatAdminURL: ({
    adminRoute,
    apiRoute,
    serverURL,
    path,
  }: {
    adminRoute?: string;
    apiRoute?: string;
    serverURL: string;
    path?: string | null;
  }) => {
    const route = adminRoute ?? apiRoute ?? '';
    return `${serverURL}${route}${path ?? ''}`;
  },
}));

import { getAdminURL, getApiURL, getServerURL } from './urls';

function createMockReq({
  url,
  serverURL,
  host = 'localhost:3000',
  adminRoute = '/admin',
  apiRoute = '/api',
}: {
  url?: string;
  serverURL?: string;
  host?: string;
  adminRoute?: string;
  apiRoute?: string;
}) {
  return {
    url,
    headers: new Headers({ host }),
    payload: {
      config: {
        serverURL,
        routes: { admin: adminRoute, api: apiRoute },
      },
    },
  } as any;
}

describe('getServerURL', () => {
  test('throws when no req.url', () => {
    const req = createMockReq({ url: undefined });
    expect(() => getServerURL(req)).toThrow(
      'Could not get serverURL, since request URL is not available',
    );
  });

  test('returns serverURL from config when available', () => {
    const req = createMockReq({
      url: 'http://localhost:3000/api/test',
      serverURL: 'https://example.com',
    });
    expect(getServerURL(req)).toBe('https://example.com');
  });

  test('falls back to protocol + host from request URL', () => {
    const req = createMockReq({
      url: 'http://localhost:3000/api/test',
      serverURL: undefined,
    });
    expect(getServerURL(req)).toBe('http://localhost:3000');
  });
});

describe('getAdminURL', () => {
  test('builds admin URL with path', () => {
    const req = createMockReq({
      url: 'http://localhost:3000/test',
      serverURL: 'http://localhost:3000',
    });
    const result = getAdminURL({ req, path: '/collections/posts' });
    expect(result).toBe('http://localhost:3000/admin/collections/posts');
  });

  test('builds admin URL without path', () => {
    const req = createMockReq({
      url: 'http://localhost:3000/test',
      serverURL: 'http://localhost:3000',
    });
    const result = getAdminURL({ req });
    expect(result).toBe('http://localhost:3000/admin');
  });
});

describe('getApiURL', () => {
  test('builds API URL with path', () => {
    const req = createMockReq({
      url: 'http://localhost:3000/test',
      serverURL: 'http://localhost:3000',
    });
    const result = getApiURL({ req, path: '/users' });
    expect(result).toBe('http://localhost:3000/api/users');
  });

  test('builds API URL without path', () => {
    const req = createMockReq({
      url: 'http://localhost:3000/test',
      serverURL: 'http://localhost:3000',
    });
    const result = getApiURL({ req });
    expect(result).toBe('http://localhost:3000/api');
  });
});
