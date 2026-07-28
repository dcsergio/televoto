import { test, expect } from '@playwright/test';
import { EVENT_CODE } from './constants';

test.describe('Public voting page smoke test', () => {
  test('loads the demo event and shows the candidate voting screen', async ({ page }) => {
    await page.goto(`/?eventCode=${EVENT_CODE}`);

    await expect(page.getByRole('heading', { level: 1, name: 'Televoto', exact: true })).toBeVisible();
    await expect(page.getByText('Evento non trovato per il codice inserito.')).toHaveCount(0);
    await expect(page.getByText('Scegli il tuo candidato')).toBeVisible();
  });

  test('rejects an unknown event code with a friendly message', async ({ page }) => {
    await page.goto('/?eventCode=99999');
    await expect(page.getByText('Evento non trovato per il codice inserito.')).toBeVisible();
  });

  test('prompts for an event code when none is provided', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Inserisci il codice evento' })).toBeVisible();
  });
});
