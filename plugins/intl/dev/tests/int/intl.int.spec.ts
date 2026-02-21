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

describe('intl plugin', () => {
  test('messages global is created', () => {
    const messagesGlobal = payload.globals.config.find(
      (g) => g.slug === 'messages',
    );
    expect(messagesGlobal).toBeDefined();
  });

  test('messages global has a localized data field', () => {
    const messagesGlobal = payload.globals.config.find(
      (g) => g.slug === 'messages',
    );
    const dataField = messagesGlobal?.fields.find(
      (f) => 'name' in f && f.name === 'data',
    );
    expect(dataField).toBeDefined();
    expect(dataField).toHaveProperty('localized', true);
  });

  test('messages global can be read without error', async () => {
    const messages = await payload.findGlobal({ slug: 'messages' as any });
    expect(messages).toBeDefined();
  });

  test('messages global data field is virtual when uploadCollection is set', () => {
    const messagesGlobal = payload.globals.config.find(
      (g) => g.slug === 'messages',
    );
    const dataField = messagesGlobal?.fields.find(
      (f) => 'name' in f && f.name === 'data',
    );
    expect(dataField).toBeDefined();
    expect(dataField).toHaveProperty('virtual', true);
  });

  test('messages global has a file upload field', () => {
    const messagesGlobal = payload.globals.config.find(
      (g) => g.slug === 'messages',
    );
    const fileField = messagesGlobal?.fields.find(
      (f) => 'name' in f && f.name === 'file',
    );
    expect(fileField).toBeDefined();
    expect(fileField).toHaveProperty('type', 'upload');
  });

  test('navigation global has scoped messages tab injected', () => {
    const navGlobal = payload.globals.config.find(
      (g) => g.slug === 'navigation',
    );
    expect(navGlobal).toBeDefined();

    // The plugin wraps existing fields in a tabs field when scopes are configured
    const tabsField = navGlobal?.fields.find((f) => f.type === 'tabs');
    expect(tabsField).toBeDefined();
  });

  test('localization is configured with en and de', () => {
    const { localization } = payload.config;
    expect(localization).toBeTruthy();
    if (localization) {
      const localeCodes = localization.locales.map((l) =>
        typeof l === 'string' ? l : l.code,
      );
      expect(localeCodes).toContain('en');
      expect(localeCodes).toContain('de');
    }
  });
});
