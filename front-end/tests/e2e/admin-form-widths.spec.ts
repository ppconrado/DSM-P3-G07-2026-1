import { test, expect } from '@playwright/test';

test('measure left column width across admin forms', async ({ page }) => {
  // Mock authenticated admin session and basic list APIs so pages render predictably
  await page.route('**/auth/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        user: {
          id: 'admin-1',
          name: 'Admin',
          email: 'admin@example.com',
          role: 'ADMIN',
        },
      }),
    });
  });

  // Minimal events list used by several pages
  await page.route('**/events', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 'event-1',
          title: 'Palestra sobre Meio Ambiente',
          location: 'Auditório Principal',
          type: 'Palestra',
          startDate: '2026-06-01T00:00:00.000Z',
          endDate: '2026-06-01T00:00:00.000Z',
          status: 'ATIVA',
        },
      ]),
    });
  });

  await page.route('**/users*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });

  await page.route('**/speakers', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });

  await page.route('**/certificates*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });

  const pages = [
    '/dashboard/admin/users',
    '/dashboard/admin/events',
    '/dashboard/admin/speakers',
    '/dashboard/admin/certificates',
  ];

  const widths: number[] = [];

  for (const p of pages) {
    await page.goto(p);
    await page.waitForLoadState('networkidle');
    // Wait for grid and left column to appear (longer timeout to account for client rendering)
    await page.waitForSelector('div.grid', {
      state: 'visible',
      timeout: 15000,
    });
    const grid = page.locator('div.grid').first();
    const leftCard = grid.locator(':scope > div').first();
    await expect(leftCard).toBeVisible();
    const box = await leftCard.boundingBox();
    if (!box) throw new Error('Left card bounding box not found');
    widths.push(Math.round(box.width));
  }

  const max = Math.max(...widths);
  const min = Math.min(...widths);
  // Allow a small tolerance for rendering differences
  expect(max - min).toBeLessThanOrEqual(6);
});
