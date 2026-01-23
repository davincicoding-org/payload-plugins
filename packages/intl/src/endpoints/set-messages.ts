import type { Endpoint, File, PayloadRequest } from 'payload';
import type { Messages, Translations } from '@/types';

import { getPluginContext, getSupportedLocales } from '@/utils/config';

export const setMessagesEndpoint: Endpoint = {
  handler: async (req: PayloadRequest) => {
    const { user } = await req.payload.auth({ headers: req.headers });
    if (!user) {
      throw new Error('Unauthorized');
    }

    const data = (await req.json?.()) as Translations<Messages> | undefined;
    if (!data) {
      throw new Error('No data provided');
    }

    const supportedLocales = getSupportedLocales(
      req.payload.config.localization,
    );
    const { collectionSlug } = getPluginContext(req.payload.config);

    for (const locale of supportedLocales) {
      const messages = data[locale];
      if (!messages) continue;

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
        collection: collectionSlug,
        data: {},
        file,
        where: { locale: { equals: locale } },
      });
      if (docs.length === 0) {
        await req.payload.create({
          collection: collectionSlug,
          data: { locale },
          file,
        });
      }
    }

    return Response.json({ success: true });
  },
  method: 'put',
  path: '/intl-plugin',
};
