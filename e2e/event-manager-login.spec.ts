import { test, expect } from '@playwright/test';
import { loginAsRoot } from './helpers';
import { EVENT_CODE, EVENT_MANAGER_PASSWORD } from './constants';

test.describe('Event manager login', () => {
  test('unlocks candidate management for the demo event (00001 / ev_demo_2026)', async ({ page }) => {
    await loginAsRoot(page);

    // Explicitly pick the demo event from the toolbar switcher rather than
    // relying on it being auto-selected as the only event in the DB.
    await page.getByTestId('admin-event-select').click();
    await page.getByTestId(`admin-event-option-${EVENT_CODE}`).click();

    await page.getByTestId('admin-nav-candidates').click();
    await expect(page.getByRole('heading', { name: 'Candidati per evento selezionato' })).toBeVisible();

    await page.getByPlaceholder('Password manager evento').fill(EVENT_MANAGER_PASSWORD);
    await page.getByRole('button', { name: 'Sblocca gestione evento' }).click();

    await expect(page.getByRole('heading', { name: 'Aggiungi nuovo candidato' })).toBeVisible();
    await expect(page.getByText(/^Candidati attuali/)).toBeVisible();
  });

  test('shows an error for a wrong manager password', async ({ page }) => {
    await loginAsRoot(page);
    await page.getByTestId('admin-event-select').click();
    await page.getByTestId(`admin-event-option-${EVENT_CODE}`).click();

    await page.getByTestId('admin-nav-candidates').click();
    await page.getByPlaceholder('Password manager evento').fill('wrong-password-1234');
    await page.getByRole('button', { name: 'Sblocca gestione evento' }).click();

    await expect(page.getByText(/errata|non valid/i)).toBeVisible();
  });

  test('Dashboard reflects the selected event and unlocked judge-token stats', async ({ page }) => {
    await loginAsRoot(page);
    await page.getByTestId('admin-event-select').click();
    await page.getByTestId(`admin-event-option-${EVENT_CODE}`).click();

    await page.getByTestId('admin-nav-candidates').click();
    await page.getByPlaceholder('Password manager evento').fill(EVENT_MANAGER_PASSWORD);
    await page.getByRole('button', { name: 'Sblocca gestione evento' }).click();
    await expect(page.getByRole('heading', { name: 'Aggiungi nuovo candidato' })).toBeVisible();

    await page.getByTestId('admin-nav-dashboard').click();
    await expect(page.getByRole('heading', { name: 'Panoramica generale' })).toBeVisible();
    // Judge-token + candidate stats only render once the event manager token
    // is present (see admin-shell.ts loadDashboardJudgeTokens()).
    await expect(page.getByText('Codici giuria emessi')).toBeVisible();
    await expect(page.getByText('Stato voti giuria')).toBeVisible();
  });
});
