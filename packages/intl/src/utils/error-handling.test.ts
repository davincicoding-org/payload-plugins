import { describe, expect, test } from 'vitest';

import { getErrorMessage } from './error-handling';

describe('getErrorMessage', () => {
  test('extracts message from JSON response', async () => {
    const response = new Response(
      JSON.stringify({ message: 'Something went wrong' }),
      { status: 400 },
    );
    const result = await getErrorMessage(response);
    expect(result).toBe('Something went wrong');
  });

  test('returns status code when message is missing', async () => {
    const response = new Response(JSON.stringify({ error: 'bad' }), {
      status: 422,
    });
    const result = await getErrorMessage(response);
    expect(result).toBe('422 Error');
  });

  test('returns Unknown error on parse failure', async () => {
    const response = new Response('not json', { status: 500 });
    const result = await getErrorMessage(response);
    expect(result).toBe('Unknown error');
  });
});
