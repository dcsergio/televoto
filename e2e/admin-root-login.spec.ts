import { test, expect } from '@playwright/test';
import { ROOT_PASSWORD } from './constants';

test.describe('Admin root login', () => {
  test('shows the password gate for an unauthenticated visitor', async ({ page }) => {
    await page.goto('/admin');
    await expect(page.getByRole('heading', { name: 'Admin' })).toBeVisible();
    await expect(page.getByPlaceholder('Password root')).toBeVisible();
  });

  test('rejects a wrong password with an inline error', async ({ page }) => {
    await page.goto('/admin');
    await page.getByPlaceholder('Password root').fill('definitely-wrong-password');
    await page.getByRole('button', { name: 'Accedi' }).click();
    await expect(page.getByText(/errata|non valid/i)).toBeVisible();
  });

  test('logs in with the correct root password and lands on the Dashboard section', async ({ page }) => {
    await page.goto('/admin');
    await page.getByPlaceholder('Password root').fill(ROOT_PASSWORD);
    await page.getByRole('button', { name: 'Accedi' }).click();

    await expect(page.getByRole('heading', { name: 'Panoramica generale' })).toBeVisible();
    await expect(page).toHaveURL(/adminSection=dashboard/);

    // Dashboard overview cards (all-events snapshot) should be present.
    await expect(page.getByText('Eventi totali')).toBeVisible();
    await expect(page.getByText('Televoto aperto')).toBeVisible();
  });
});
