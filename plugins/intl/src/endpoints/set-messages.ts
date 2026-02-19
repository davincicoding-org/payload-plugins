import { uncaughtSwitchCase } from '@davincicoding/payload-plugin-kit';
import type { Endpoint, File, PayloadRequest } from 'payload';
import { ENDPOINTS, PLUGIN_CONTEXT } from '@/const';
import type { Messages, Translations } from '@/types';
import { getSupportedLocales } from '@/utils/config';

export const setMessagesEndpoint: Endpoint = ENDPOINTS.setMessages.endpoint(
  async (req: PayloadRequest) => {
    const { user } = await req.payload.auth({ headers: req.headers });
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = (await req.json?.()) as Translations<Messages> | undefined;
    if (!data) {
      return Response.json({ error: 'No data provided' }, { status: 400 });
    }

    const supportedLocales = getSupportedLocales(
      req.payload.config.localization,
    );
    const ctx = PLUGIN_CONTEXT.get(req.payload.config);
    if (!ctx) {
      return Response.json({ error: 'Plugin not configured' }, { status: 500 });
    }
    const { collectionSlug, storage } = ctx;

    for (const locale of supportedLocales) {
      const messages = data[locale];
      if (!messages) continue;

      switch (storage) {
        case 'db': {
          const { docs } = await req.payload.find({
            collection: ctx.collectionSlug as 'messages',
            where: { locale: { equals: locale } },
            limit: 1,
            req,
          });

          const existingDoc = docs[0];
          const existingData =
            (existingDoc?.data as Record<string, unknown>) ?? {};
          const mergedData = { ...existingData, ...messages };

          if (existingDoc) {
            await req.payload.update({
              collection: ctx.collectionSlug as 'messages',
              id: existingDoc.id,
              data: { data: mergedData },
              req,
            });
          } else {
            await req.payload.create({
              collection: ctx.collectionSlug as 'messages',
              data: { locale, data: mergedData },
              req,
            });
          }
          break;
        }
        case 'upload': {
          const { docs } = await req.payload.find({
            collection: collectionSlug as 'messages',
            where: { locale: { equals: locale } },
            limit: 1,
            req,
          });

          const existingDoc = docs[0];
          let existingData: Record<string, unknown> = {};

          if (existingDoc?.url) {
            try {
              const response = await fetch(existingDoc.url as string);
              if (response.ok) {
                existingData = (await response.json()) as Record<
                  string,
                  unknown
                >;
              }
            } catch {
              // If fetching existing data fails, proceed with empty object
            }
          }

          const mergedData = { ...existingData, ...messages };

          const rawFile = new File(
            [JSON.stringify(mergedData)],
            `${locale}-${Date.now()}.json`,
            {
              type: 'application/json',
            },
          );

          const file: File = {
            name: rawFile.name,
            data: Buffer.from(await rawFile.arrayBuffer()),
            mimetype: rawFile.type,
            size: rawFile.size,
          };

          if (existingDoc) {
            await req.payload.update({
              collection: collectionSlug as 'messages',
              id: existingDoc.id,
              data: {},
              file,
              req,
            });
          } else {
            await req.payload.create({
              collection: collectionSlug as 'messages',
              data: { locale, data: null },
              file,
              req,
            });
          }
          break;
        }
        default:
          return uncaughtSwitchCase(storage);
      }
    }

    return { success: true };
  },
);
