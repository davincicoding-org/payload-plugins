import type { Endpoint, File, PayloadRequest } from 'payload';
import { ENDPOINTS } from '@/const';
import type { Messages, Translations } from '@/types';
import { getPluginContext, getSupportedLocales } from '@/utils/config';

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
    const { collectionSlug, storage } = getPluginContext(req.payload.config);

    for (const locale of supportedLocales) {
      const messages = data[locale];
      if (!messages) continue;

      if (storage === 'db') {
        // Generated types reflect the upload collection shape and lack the
        // json `data` field added by the db strategy at runtime.
        const collection = collectionSlug as 'messages';
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const updateData = { data: messages } as any;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const createData = { locale, data: messages } as any;

        const { docs } = await req.payload.update({
          collection,
          data: updateData,
          where: { locale: { equals: locale } },
        });
        if (docs.length === 0) {
          await req.payload.create({
            collection,
            data: createData,
          });
        }
      } else {
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
            data: { locale },
            file,
          });
        }
      }
    }

    return { success: true };
  },
);
