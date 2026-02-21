import type { Page } from '@playwright/test';
import { DEV_USER } from './seed';

export async function loginAsDevUser(page: Page): Promise<void> {
  await page.goto('/admin');
  await page.fill('#field-email', DEV_USER.email);
  await page.fill('#field-password', DEV_USER.password);
  await page.click('[type="submit"]');
  await page.waitForURL('**/admin');
}
