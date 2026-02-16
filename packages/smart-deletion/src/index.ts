import { findFields } from '@repo/common';
import type { Field, Plugin, RelationshipField } from 'payload';
import { CUSTOM_KEY } from './const';
import {
  createHardDeleteHook,
  createRestoreHook,
  createSoftDeleteHook,
} from './hooks';

export interface SmartDeletionPluginOptions {
  /**
   * When true, auto-enables `trash: true` on target collections
   * if the source collection uses trash and has a cascade field pointing to them.
   * When false, throws a config error instead.
   * @default true
   */
  autoEnableTrash?: boolean;
}

/**
 * Scans all collections for relationship fields marked with
 * `custom.smartDeletion: 'cascade'` and attaches afterDelete / afterChange
 * hooks that cascade hard-deletes, soft-deletes, and restores.
 */
export const smartDeletionPlugin =
  ({ autoEnableTrash = true }: SmartDeletionPluginOptions = {}): Plugin =>
  (config) => {
    config.collections ??= [];

    for (const collection of config.collections) {
      const cascadeFields = findFields(
        collection.fields,
        isCascadeRelationship,
      );
      if (cascadeFields.length === 0) continue;

      collection.hooks ??= {};
      collection.hooks.afterDelete ??= [];
      collection.hooks.afterChange ??= [];

      for (const field of cascadeFields) {
        const relationTo = field.relationTo;

        // Ensure soft-delete cascade support
        if (collection.trash) {
          const targets = Array.isArray(relationTo) ? relationTo : [relationTo];
          for (const target of targets) {
            const targetCollection = config.collections.find(
              ({ slug }) => slug === target,
            );
            if (!targetCollection) continue;
            if (targetCollection.trash) continue;
            if (autoEnableTrash) {
              targetCollection.trash = true;
              continue;
            }
            console.warn(
              `[payload-smart-deletion] Collection "${target}" does not have \`trash: true\`, ` +
                `but "${collection.slug}" does. Cascaded deletes from "${collection.slug}" ` +
                `will hard-delete "${target}" documents instead of trashing them. ` +
                `Enable \`trash: true\` on "${target}" or set \`autoEnableTrash: true\`.`,
            );
          }
        }

        collection.hooks.afterDelete.push(createHardDeleteHook(field));

        if (collection.trash) {
          collection.hooks.afterChange.push(createSoftDeleteHook(field));
          collection.hooks.afterChange.push(createRestoreHook(field));
        }
      }
    }

    return config;
  };

function isCascadeRelationship(field: Field): field is RelationshipField {
  if (field.type !== 'relationship') return false;
  return field.custom?.[CUSTOM_KEY] === 'cascade';
}
