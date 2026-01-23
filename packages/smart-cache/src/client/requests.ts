import z from 'zod';

import { ENDPOINT_CONFIG } from '../const';

export const publishChanges = async (
  apiUrl: string,
): Promise<{
  success: boolean;
  message: string;
}> => {
  try {
    const endpointUrl = apiUrl + ENDPOINT_CONFIG.publish.path;
    const response = await fetch(endpointUrl, {
      method: ENDPOINT_CONFIG.publish.method,
    });
    if (!response.ok) {
      const { success, data } = z
        .object({
          message: z.string(),
        })
        .safeParse(await response.json());

      throw new Error(success ? data.message : 'Failed to publish changes');
    }
    return {
      success: true,
      message: 'Changes published successfully!',
    };
  } catch (_error) {
    console.error(_error);
    const message =
      _error instanceof Error ? _error.message : 'Failed to publish changes';
    return {
      success: false,
      message: message,
    };
  }
};

export const checkChanges = async (
  apiUrl: string,
): Promise<
  | {
      success: true;
      hasChanges: boolean;
    }
  | {
      success: false;
      error: string;
    }
> => {
  try {
    const endpointUrl = apiUrl + ENDPOINT_CONFIG.check.path;
    const response = await fetch(endpointUrl, {
      method: ENDPOINT_CONFIG.check.method,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) {
      const { success, data } = z
        .object({
          message: z.string(),
        })
        .safeParse(await response.json());

      throw new Error(success ? data.message : 'Failed to check changes');
    }

    const { success, data } = z
      .object({
        hasChanges: z.boolean(),
      })
      .safeParse(await response.json());

    if (!success) {
      throw new Error('Failed to check changes');
    }

    return {
      success: true,
      hasChanges: data.hasChanges,
    };
  } catch (_error) {
    console.error(_error);
    return {
      success: false,
      error: _error instanceof Error ? _error.message : 'Unknown error',
    };
  }
};
