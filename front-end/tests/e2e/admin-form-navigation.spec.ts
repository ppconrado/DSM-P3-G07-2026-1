import { test, expect } from '@playwright/test';

test('admin left width CSS variable is defined', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  const varValue = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue(
      '--admin-left-width',
    ),
  );

  expect(varValue).toBeTruthy();
  // basic sanity: should be a pixel value like '390px'
  expect(/\d+px/.test(varValue.trim())).toBeTruthy();
});
