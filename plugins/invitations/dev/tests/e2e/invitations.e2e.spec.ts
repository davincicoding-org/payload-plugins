import { loginAsDevUser } from '@davincicoding/payload-plugin-kit/testing/helpers';
import { expect, test } from '@playwright/test';

test('admin UI loads and login works', async ({ page }) => {
  await loginAsDevUser(page);
  await expect(page.locator('.dashboard')).toBeVisible();
});
