import { expect, type Page, test } from '@playwright/test';

test.describe('Frontend', () => {
  // biome-ignore lint/correctness/noUnusedVariables: nevermind
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    page = await context.newPage();
  });

  test('can go on homepage', async ({ page }) => {
    await page.goto('http://localhost:3000');

    await expect(page).toHaveTitle(/Payload Blank Template/);

    const heading = page.locator('h1').first();

    await expect(heading).toHaveText('Welcome to your new project.');
  });
});
