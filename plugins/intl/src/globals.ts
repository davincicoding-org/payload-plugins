import type { Field, GlobalConfig, TabsField } from 'payload';
import type { MessagesSchema, NormalizedScope } from './types';

/**
 * Transforms a Payload global's field config to include a Messages tab or
 * sidebar with a virtual JSON field backed by the ScopedMessagesField
 * client component.
 */
export function injectScopeIntoGlobal(
  global: GlobalConfig,
  scopeKey: string,
  scopeConfig: NormalizedScope,
  schema: MessagesSchema,
): GlobalConfig {
  const subSchema = schema[scopeKey];
  if (!subSchema || typeof subSchema === 'string') return global;

  const virtualField: Field = {
    name: '_intlMessages',
    type: 'json',
    virtual: true,
    admin: {
      components: {
        Field: {
          exportName: 'ScopedMessagesField',
          path: 'payload-intl/client#ScopedMessagesField',
          clientProps: {
            scopeKey,
            schema: subSchema,
          },
        },
      },
    },
  };

  if (scopeConfig.position === 'sidebar') {
    const sidebarGroup: Field = {
      name: `_intlScope_${scopeKey}`,
      type: 'group',
      admin: {
        position: 'sidebar',
      },
      fields: [virtualField],
    };

    return {
      ...global,
      fields: [...(global.fields || []), sidebarGroup],
    };
  }

  // position === 'tab'
  const firstField = global.fields?.[0];
  const hasExistingTabs =
    firstField &&
    'type' in firstField &&
    firstField.type === 'tabs' &&
    'tabs' in firstField;

  const messagesTab = {
    fields: [virtualField],
    label: 'Messages',
  };

  if (hasExistingTabs) {
    const existingTabsField = firstField as TabsField;
    const updatedTabsField: TabsField = {
      ...existingTabsField,
      tabs: [...existingTabsField.tabs, messagesTab],
    };

    return {
      ...global,
      fields: [updatedTabsField, ...global.fields.slice(1)],
    };
  }

  const contentTabLabel =
    scopeConfig.existingFieldsTabLabel ?? global.label ?? 'Content';

  const tabsField: TabsField = {
    type: 'tabs',
    tabs: [
      {
        fields: [...(global.fields || [])],
        label: contentTabLabel,
      },
      messagesTab,
    ],
  };

  return {
    ...global,
    fields: [tabsField],
  };
}
