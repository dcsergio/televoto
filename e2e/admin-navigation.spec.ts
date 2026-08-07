import { test, expect } from '@playwright/test';
import { loginAsRoot } from './helpers';

test.describe('Admin sidenav navigation', () => {
  test('every sidenav section is reachable and updates the adminSection query param', async ({ page }) => {
    await loginAsRoot(page);

    await page.getByTestId('admin-nav-events').click();
    await expect(page).toHaveURL(/adminSection=events/);
    await expect(page.getByRole('heading', { name: 'Anagrafica eventi' })).toBeVisible();

    await page.getByTestId('admin-nav-candidates').click();
    await expect(page).toHaveURL(/adminSection=candidates/);
    await expect(page.getByRole('heading', { name: 'Candidati per evento selezionato' })).toBeVisible();

    await page.getByTestId('admin-nav-voting-codes').click();
    await expect(page).toHaveURL(/adminSection=voting-codes/);
    await expect(page.getByRole('heading', { name: 'Generazione e validazione codici giuria' })).toBeVisible();

    await page.getByTestId('admin-nav-voting-backstage').click();
    await expect(page).toHaveURL(/adminSection=voting-backstage/);
    await expect(page.getByRole('heading', { name: 'Backstage con progresso delle votazioni' })).toBeVisible();

    await page.getByTestId('admin-nav-dashboard').click();
    await expect(page).toHaveURL(/adminSection=dashboard/);
    await expect(page.getByRole('heading', { name: 'Panoramica generale' })).toBeVisible();
  });

  test('a page refresh on a deep section preserves it via the query param (no 404, no real child route)', async ({
    page,
  }) => {
    await loginAsRoot(page);
    await page.getByTestId('admin-nav-candidates').click();
    await expect(page).toHaveURL(/adminSection=candidates/);

    await page.reload();
    await expect(page.getByRole('heading', { name: 'Candidati per evento selezionato' })).toBeVisible();
    // Still served from the flat /admin route, never a nested path.
    expect(new URL(page.url()).pathname).toBe('/admin');
  });

  test('toolbar quick actions are present for the selected event', async ({ page }) => {
    await loginAsRoot(page);

    await expect(page.getByTestId('admin-event-select')).toBeVisible();
    await expect(page.getByTestId('admin-open-voting')).toBeVisible();
    await expect(page.getByTestId('admin-open-score')).toBeVisible();
    await expect(page.getByTestId('admin-toolbar-logout')).toBeVisible();
  });

  test('logout returns to the password gate', async ({ page }) => {
    await loginAsRoot(page);
    await page.getByTestId('admin-toolbar-logout').click();
    await expect(page.getByRole('heading', { name: 'Admin' })).toBeVisible();
    await expect(page.getByPlaceholder('Password root')).toBeVisible();
  });
});
