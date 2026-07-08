import { expect, test } from '@playwright/test';

test('loads the setup state on a fresh local install', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /supabase setup required/i })).toBeVisible();
});
