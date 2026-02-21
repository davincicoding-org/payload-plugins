import type { Payload } from 'payload';
import { getPayload } from 'payload';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

let payload: Payload;

beforeAll(async () => {
  const { default: config } = await import('@payload-config');
  payload = await getPayload({ config });
});

afterAll(async () => {
  await payload.destroy();
});

describe('clienthub plugin', () => {
  test('clients collection exists', () => {
    expect(payload.collections.clients).toBeDefined();
  });

  test('services collection exists', () => {
    expect(payload.collections.services).toBeDefined();
  });

  test('invoices collection exists', () => {
    expect(payload.collections.invoices).toBeDefined();
  });

  test('invoice-pdfs collection exists', () => {
    expect(payload.collections['invoice-pdfs']).toBeDefined();
  });

  test('clienthub-settings global exists', () => {
    const settingsGlobal = payload.globals.config.find(
      (g) => g.slug === 'clienthub-settings',
    );
    expect(settingsGlobal).toBeDefined();
  });
});
