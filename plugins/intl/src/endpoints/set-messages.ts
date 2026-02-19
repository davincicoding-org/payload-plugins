import { uncaughtSwitchCase } from '@davincicoding/payload-plugin-kit';
import type { Endpoint, File, PayloadRequest } from 'payload';
import { ENDPOINTS, pluginContext } from '@/const';
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
    const ctx = pluginContext.get(req.payload.config);
    if (!ctx) {
      return Response.json({ error: 'Plugin not configured' }, { status: 500 });
    }
    const { collectionSlug, storage } = ctx;

    for (const locale of supportedLocales) {
      const messages = data[locale];
      if (!messages) continue;

      switch (storage) {
        case 'db': {
          const { docs } = await req.payload.update({
            collection: ctx.collectionSlug as 'messages',
            data: { data: messages },
            where: { locale: { equals: locale } },
          });
          if (docs.length === 0) {
            await req.payload.create({
              collection: ctx.collectionSlug as 'messages',
              data: { locale, data: messages },
            });
          }
          break;
        }
        case 'upload': {
          const rawFile = new File(
            [JSON.stringify(messages)],
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

          const { docs } = await req.payload.update({
            collection: collectionSlug as 'messages',
            data: {},
            file,
            where: { locale: { equals: locale } },
          });
          if (docs.length === 0) {
            await req.payload.create({
              collection: collectionSlug as 'messages',
              data: { locale, data: null },
              file,
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
