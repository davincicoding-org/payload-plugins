import { findFields } from '@davincicoding/payload-plugin-kit';
import { Graph } from 'graph-data-structure';
import { groupBy } from 'lodash-es';
import type {
  CollectionSlug,
  Config,
  Field,
  GlobalSlug,
  RelationshipField,
  UploadField,
} from 'payload';

const isRelationshipOrUpload = (
  field: Field,
): field is RelationshipField | UploadField =>
  field.type === 'relationship' || field.type === 'upload';

export function createDependencyGraph({
  collections = [],
  globals = [],
}: Pick<Config, 'collections' | 'globals'>) {
  const graph = new EntitiesGraph();

  for (const { slug, fields } of collections) {
    graph.addRelations(
      { type: 'collection', slug: slug as CollectionSlug },
      fields,
    );
  }

  for (const { slug, fields } of globals) {
    graph.addRelations({ type: 'global', slug: slug as GlobalSlug }, fields);
  }

  return graph;
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
    polymorphic: boolean;
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

  getDependants(collection: CollectionSlug) {
    const collectionRelations = this.edgeProperties.get(
      `collection|${collection}`,
    );
    return Array.from(collectionRelations?.entries() ?? []).map<{
      entity: EntityReference;
      fields: { field: string; hasMany: boolean; polymorphic: boolean }[];
    }>(([entity, fields]) => ({
      entity: EntitiesGraph.parseEntityReference(entity),
      fields,
    }));
  }

  addRelations(entity: EntityReference, fields: Field[]) {
    const relationFields = findFields(fields, isRelationshipOrUpload);

    const fieldRelations = relationFields.flatMap((field) => {
      const targets = Array.isArray(field.relationTo)
        ? field.relationTo
        : [field.relationTo];
      const polymorphic = Array.isArray(field.relationTo);

      return targets.map((collection) => ({
        collection: collection as CollectionSlug,
        field: field.path.join('.'),
        hasMany: field.hasMany ?? false,
        polymorphic,
      }));
    });

    const byCollection = Object.entries(groupBy(fieldRelations, 'collection'));

    for (const [collection, fields] of byCollection) {
      this.addEdge(
        `collection|${collection}` as StringifiedEntityReference,
        EntitiesGraph.stringifyEntityReference(entity),
        {
          props: fields.map(({ field, hasMany, polymorphic }) => ({
            field,
            hasMany,
            polymorphic,
          })),
        },
      );
    }
  }
}
