import type { Field, GlobalConfig, TabsField } from 'payload';
import { describe, expect, it, vi } from 'vitest';
import { createAfterReadHook, createBeforeChangeHook } from './global-hooks';
import { injectScopeIntoGlobal } from './globals';
import type { MessagesSchema, NormalizedScope } from './types';

vi.mock('./global-hooks', () => ({
  createAfterReadHook: vi.fn(() => vi.fn()),
  createBeforeChangeHook: vi.fn(() => vi.fn()),
}));

function makeGlobal(overrides: Partial<GlobalConfig> = {}): GlobalConfig {
  return {
    slug: 'header',
    fields: [
      { name: 'title', type: 'text' },
      { name: 'subtitle', type: 'text' },
    ],
    ...overrides,
  };
}

const schema: MessagesSchema = {
  header: {
    nav: {
      home: 'Home',
      about: 'About',
    },
  },
  general: {
    greeting: 'Hello',
  },
};

describe('injectScopeIntoGlobal', () => {
  it('should return global unchanged when scope key is not in schema', () => {
    const global = makeGlobal({ slug: 'missing' });
    const result = injectScopeIntoGlobal(
      global,
      'missing',
      { position: 'tab' },
      schema,
    );
    expect(result).toBe(global);
  });

  it('should return global unchanged when scope key maps to a string value', () => {
    const leafSchema: MessagesSchema = { header: 'just a string' };
    const global = makeGlobal();
    const result = injectScopeIntoGlobal(
      global,
      'header',
      { position: 'tab' },
      leafSchema,
    );
    expect(result).toBe(global);
  });

  describe('position: sidebar', () => {
    const scopeConfig: NormalizedScope = { position: 'sidebar' };

    it('should append a sidebar group with the virtual field', () => {
      const global = makeGlobal();
      const result = injectScopeIntoGlobal(
        global,
        'header',
        scopeConfig,
        schema,
      );

      expect(result.fields).toHaveLength(3);

      const sidebarGroup = result.fields[2] as Record<string, unknown>;
      expect(sidebarGroup.type).toBe('group');
      expect(sidebarGroup.name).toBe('_intlScope_header');
      expect((sidebarGroup.admin as Record<string, unknown>)?.position).toBe(
        'sidebar',
      );
      expect((sidebarGroup.fields as unknown[]).length).toBe(1);

      const virtualField = (
        sidebarGroup.fields as Record<string, unknown>[]
      )[0] as Record<string, unknown>;
      expect(virtualField.name).toBe('_intlMessages');
      expect(virtualField.type).toBe('json');
      expect(virtualField.virtual).toBe(true);
    });

    it('should pass scopeKey and subSchema as clientProps', () => {
      const global = makeGlobal();
      const result = injectScopeIntoGlobal(
        global,
        'header',
        scopeConfig,
        schema,
      );

      const sidebarGroup = result.fields[2] as Field & {
        type: 'group';
        fields: Field[];
      };
      const virtualField = sidebarGroup.fields[0] as Field;
      const fieldComponent = (virtualField as Record<string, unknown>)
        .admin as Record<string, unknown>;
      const components = fieldComponent.components as Record<string, unknown>;
      const fieldConfig = components.Field as Record<string, unknown>;

      expect(fieldConfig.clientProps).toEqual({
        scopeKey: 'header',
        schema: schema.header,
      });
    });
  });

  describe('position: tab', () => {
    const scopeConfig: NormalizedScope = { position: 'tab' };

    it('should wrap existing fields in a Content tab and add Messages tab', () => {
      const global = makeGlobal();
      const result = injectScopeIntoGlobal(
        global,
        'header',
        scopeConfig,
        schema,
      );

      expect(result.fields).toHaveLength(1);

      const tabsField = result.fields[0] as TabsField;
      expect(tabsField.type).toBe('tabs');
      expect(tabsField.tabs).toHaveLength(2);
      expect(tabsField.tabs[0]?.label).toBe('Content');
      expect(tabsField.tabs[0]?.fields).toHaveLength(2);
      expect(tabsField.tabs[1]?.label).toBe('Messages');
      expect(tabsField.tabs[1]?.fields).toHaveLength(1);
    });

    it('should use global.label as content tab label when available', () => {
      const global = makeGlobal({ label: 'Site Header' });
      const result = injectScopeIntoGlobal(
        global,
        'header',
        scopeConfig,
        schema,
      );

      const tabsField = result.fields[0] as TabsField;
      expect(tabsField.tabs[0]?.label).toBe('Site Header');
    });

    it('should use existingFieldsTabLabel when provided', () => {
      const config: NormalizedScope = {
        position: 'tab',
        existingFieldsTabLabel: 'Header Fields',
      };
      const global = makeGlobal({ label: 'Site Header' });
      const result = injectScopeIntoGlobal(global, 'header', config, schema);

      const tabsField = result.fields[0] as TabsField;
      expect(tabsField.tabs[0]?.label).toBe('Header Fields');
    });

    it('should append to existing tabs when first field is a tabs field', () => {
      const existingTabsField: TabsField = {
        type: 'tabs',
        tabs: [
          { label: 'General', fields: [{ name: 'title', type: 'text' }] },
          { label: 'Advanced', fields: [{ name: 'css', type: 'code' }] },
        ],
      };
      const global = makeGlobal({
        fields: [existingTabsField, { name: 'extra', type: 'text' }],
      });
      const result = injectScopeIntoGlobal(
        global,
        'header',
        scopeConfig,
        schema,
      );

      const tabsField = result.fields[0] as TabsField;
      expect(tabsField.type).toBe('tabs');
      expect(tabsField.tabs).toHaveLength(3);
      expect(tabsField.tabs[0]?.label).toBe('General');
      expect(tabsField.tabs[1]?.label).toBe('Advanced');
      expect(tabsField.tabs[2]?.label).toBe('Messages');

      // Extra fields after the tabs field should be preserved
      expect(result.fields).toHaveLength(2);
      expect((result.fields[1] as Field & { name: string }).name).toBe('extra');
    });

    it('should create virtual field with correct component path', () => {
      const global = makeGlobal();
      const result = injectScopeIntoGlobal(
        global,
        'header',
        scopeConfig,
        schema,
      );

      const tabsField = result.fields[0] as TabsField;
      const messagesTab = tabsField.tabs[1] as (typeof tabsField.tabs)[number];
      const virtualField = messagesTab.fields[0] as Record<string, unknown>;

      expect(virtualField.name).toBe('_intlMessages');
      expect(virtualField.type).toBe('json');
      expect(virtualField.virtual).toBe(true);

      const admin = virtualField.admin as Record<string, unknown>;
      const components = admin.components as Record<string, unknown>;
      const fieldConfig = components.Field as Record<string, unknown>;
      expect(fieldConfig.exportName).toBe('ScopedMessagesField');
      expect(fieldConfig.path).toBe('payload-intl/client#ScopedMessagesField');
    });
  });

  describe('hooks', () => {
    it('should attach afterRead and beforeChange hooks', () => {
      const global = makeGlobal();
      const result = injectScopeIntoGlobal(
        global,
        'header',
        { position: 'tab' },
        schema,
      );

      expect(createAfterReadHook).toHaveBeenCalledWith('header');
      expect(createBeforeChangeHook).toHaveBeenCalledWith('header');
      expect(result.hooks?.afterRead).toHaveLength(1);
      expect(result.hooks?.beforeChange).toHaveLength(1);
    });

    it('should preserve existing hooks when attaching new ones', () => {
      const existingAfterRead = vi.fn();
      const existingBeforeChange = vi.fn();
      const global = makeGlobal({
        hooks: {
          afterRead: [existingAfterRead],
          beforeChange: [existingBeforeChange],
        },
      });

      const result = injectScopeIntoGlobal(
        global,
        'header',
        { position: 'sidebar' },
        schema,
      );

      expect(result.hooks?.afterRead).toHaveLength(2);
      expect(result.hooks?.afterRead?.[0]).toBe(existingAfterRead);
      expect(result.hooks?.beforeChange).toHaveLength(2);
      expect(result.hooks?.beforeChange?.[0]).toBe(existingBeforeChange);
    });

    it('should not attach hooks when scope key is not in schema', () => {
      vi.mocked(createAfterReadHook).mockClear();
      vi.mocked(createBeforeChangeHook).mockClear();

      const global = makeGlobal({ slug: 'missing' });
      const result = injectScopeIntoGlobal(
        global,
        'missing',
        { position: 'tab' },
        schema,
      );

      expect(createAfterReadHook).not.toHaveBeenCalled();
      expect(createBeforeChangeHook).not.toHaveBeenCalled();
      expect(result.hooks).toBeUndefined();
    });
  });
});
