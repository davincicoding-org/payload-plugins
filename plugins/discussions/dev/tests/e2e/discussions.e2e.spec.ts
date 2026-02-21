import { loginAsDevUser } from '@davincicoding/payload-plugin-kit/testing';
import { expect, test } from '@playwright/test';

test.describe('discussions admin UI', () => {
  test('admin panel loads and comments collection is accessible', async ({
    page,
  }) => {
    await loginAsDevUser(page);

    // Verify admin panel loaded
    await expect(page).toHaveURL(/\/admin/);

    // Navigate to feature-requests collection
    await page.goto('/admin/collections/feature-requests');
    await expect(page.locator('h1')).toContainText('Feature Requests');
  });
});
