import { Page, expect } from '@playwright/test';
import { ROOT_PASSWORD } from './constants';

/** Logs into /admin as root and waits for the Dashboard (new default landing section) to render. */
export async function loginAsRoot(page: Page): Promise<void> {
  await page.goto('/admin');
  await page.getByPlaceholder('Password root').fill(ROOT_PASSWORD);
  await page.getByRole('button', { name: 'Accedi' }).click();
  await expect(page.getByRole('heading', { name: 'Panoramica generale' })).toBeVisible();
}
