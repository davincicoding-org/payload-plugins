import type { BasePayload } from 'payload';

import { getPluginContext } from '@/utils/config';
import { getErrorMessage } from '@/utils/error-handling';

import type { Messages } from '../types';

export async function fetchMessages(
  payload: BasePayload,
  locale: string,
): Promise<Messages> {
  if (!payload.config.serverURL) {
    throw new Error(
      'serverURL is required in your payload.config.ts file for payload-intl to work.',
    );
  }

  const {
    docs: [doc],
  } = await payload.find({
    collection: getPluginContext(payload.config).collectionSlug,
    where: { locale: { equals: locale } },
  });

  if (!doc) {
    console.warn(`No messages found for locale ${locale}`);
    return {};
  }

  const { url } = doc as unknown as { url: string };

  const response = await fetch(url);

  if (!response.ok) {
    const error = await getErrorMessage(response);
    throw new Error(
      `Could not fetch messages for locale "${locale}": ${error}`,
    );
  }

  if (response.headers.get('content-type') !== 'application/json') {
    throw new Error(
      `Could not fetch messages for locale "${locale}": The page did not return a JSON file.`,
    );
  }

  return await response.json();
}

/*
try {
      const response = await fetch(endpointUrl, {
        method: "PUT",
         headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(changes),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(
          "message" in error ? error.message : "Unknown error"
        );
      }

      form.reset(currentValues);
      toast.success("Saved", { id: toastId });
    } catch (error) {
      toast.error(
        `Failed to save: ${error instanceof Error ? error.message : "Unknown error"}`,
        { id: toastId },
      );
    }
  };

*/
