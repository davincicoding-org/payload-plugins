import { Graph } from 'graph-data-structure';
import { groupBy } from 'lodash-es';
import type {
  BasePayload,
  CollectionSlug,
  FlattenedField,
  GlobalSlug,
} from 'payload';

export function createDependencyGraph({ collections, globals }: BasePayload) {
  const graph = new EntitiesGraph();

  for (const {
    config: { slug, flattenedFields },
  } of Object.values(collections)) {
    graph.addRelations({ type: 'collection', slug }, flattenedFields);
  }

  for (const { slug, flattenedFields } of Object.values(globals.config)) {
    graph.addRelations({ type: 'global', slug }, flattenedFields);
  }

  return graph;
}

interface FieldRelation {
  field: string;
  collection: CollectionSlug;
  hasMany: boolean;
}

type StringifiedEntityReference =
  | `collection|${CollectionSlug}`
  | `global|${GlobalSlug}`;

type EntityReference =
  | {
      type: 'collection';
      slug: CollectionSlug;
    }
  | {
      type: 'global';
      slug: GlobalSlug;
    };

export class EntitiesGraph extends Graph<
  StringifiedEntityReference,
  {
    field: string;
    hasMany: boolean;
  }[]
> {
  static parseEntityReference(
    entity: StringifiedEntityReference,
  ): EntityReference {
    const [type, slug] = entity.split('|') as
      | ['collection', CollectionSlug]
      | ['global', GlobalSlug];

    switch (type) {
      case 'collection':
        return {
          type: 'collection',
          slug,
        };
      case 'global':
        return {
          type: 'global',
          slug,
        };
      default:
        throw new Error(`Invalid entity reference: ${entity}`);
    }
  }

  static stringifyEntityReference(
    entity: EntityReference,
  ): StringifiedEntityReference {
    switch (entity.type) {
      case 'collection':
        return `collection|${entity.slug}`;
      case 'global':
        return `global|${entity.slug}`;
    }
  }

  static getFieldRelations(
    field: FlattenedField,
    prevPath: string[],
  ): FieldRelation[] {
    const fieldPath = [...prevPath, field.name];

    switch (field.type) {
      case 'upload':
      case 'relationship':
        if (Array.isArray(field.relationTo)) return [];
        return [
          {
            field: fieldPath.join('.'),
            collection: field.relationTo,
            hasMany: field.hasMany ?? false,
          },
        ];
      case 'array':
        return field.flattenedFields.flatMap((subField) =>
          EntitiesGraph.getFieldRelations(subField, fieldPath),
        );
      case 'group':
        return field.flattenedFields.flatMap((subField) =>
          EntitiesGraph.getFieldRelations(subField, fieldPath),
        );
      case 'blocks':
        return field.blocks.flatMap((block) =>
          block.flattenedFields.flatMap((subField) =>
            EntitiesGraph.getFieldRelations(subField, fieldPath),
          ),
        );
      default:
        return [];
    }
  }

  getDependants(collection: CollectionSlug) {
    const collectionRelations = this.edgeProperties.get(
      `collection|${collection}`,
    );
    return Array.from(collectionRelations?.entries() ?? []).map<{
      entity: EntityReference;
      fields: { field: string; hasMany: boolean }[];
    }>(([entity, fields]) => ({
      entity: EntitiesGraph.parseEntityReference(entity),
      fields,
    }));
  }

  addRelations(entity: EntityReference, flattenedFields: FlattenedField[]) {
    const fieldRelations = flattenedFields.flatMap((field) =>
      EntitiesGraph.getFieldRelations(field, []),
    );

    const fieldRelationsByCollection = Object.entries(
      groupBy(fieldRelations, 'collection'),
    ).map(([collection, fields]) => ({
      collection: collection as CollectionSlug,
      fields: fields.map(({ field, hasMany }) => ({ field, hasMany })),
    }));

    for (const { collection, fields } of fieldRelationsByCollection) {
      this.addEdge(
        `collection|${collection}`,
        EntitiesGraph.stringifyEntityReference(entity),
        {
          props: fields,
        },
      );
    }
  }
}
