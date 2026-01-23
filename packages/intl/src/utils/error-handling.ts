import { z } from 'zod/v4-mini';

export async function getErrorMessage(response: Response) {
  try {
    const json = await response.json();
    const schema = z.object({ message: z.string() });
    const result = schema.safeParse(json);

    return result.success ? result.data.message : `${response.status} Error`;
  } catch {
    return 'Unknown error';
  }
}
