import { test, expect } from '@playwright/test';

test('measure left column width across admin forms', async ({ page }) => {
  const apiBaseUrl = 'http://localhost:8888';

  await page.addInitScript(
    ({ baseUrl }) => {
      const originalFetch = window.fetch.bind(window);

      function jsonResponse(data: unknown, status = 200) {
        return new Response(JSON.stringify(data), {
          status,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      window.fetch = async (input, init) => {
        const url = typeof input === 'string' ? input : input.url;
        const pathname = new URL(url, baseUrl).pathname;

        if (pathname === '/auth/me') {
          return jsonResponse({
            user: {
              id: 'admin-1',
              name: 'Admin',
              email: 'admin@example.com',
              role: 'ADMIN',
            },
          });
        }

        if (pathname === '/auth/refresh') {
          return jsonResponse({ message: 'ok' });
        }

        if (pathname.startsWith('/events')) {
          return jsonResponse([
            {
              id: 'event-1',
              title: 'Palestra sobre Meio Ambiente',
              location: 'Auditório Principal',
              type: 'Palestra',
              startDate: '2026-06-01T00:00:00.000Z',
              endDate: '2026-06-01T00:00:00.000Z',
              status: 'ATIVA',
            },
          ]);
        }

        if (pathname.startsWith('/users')) {
          return jsonResponse([]);
        }

        if (pathname.startsWith('/speakers')) {
          return jsonResponse([]);
        }

        if (pathname.startsWith('/certificates')) {
          return jsonResponse([]);
        }

        return originalFetch(input, init);
      };
    },
    { baseUrl: apiBaseUrl },
  );

  const pages = [
    '/dashboard/admin/users',
    '/dashboard/admin/events',
    '/dashboard/admin/speakers',
    '/dashboard/admin/certificates',
  ];

  const widths: number[] = [];
  const adminFormGrid =
    'div[class*="xl:grid-cols-[var(--admin-left-width)_1fr]"]';

  for (const p of pages) {
    await page.goto(p);
    await expect(page.locator('main#main-content')).toBeVisible({
      timeout: 15000,
    });
    // Wait for the admin two-column wrapper that uses the shared width variable.
    const grid = page.locator(adminFormGrid).first();
    await expect(grid).toBeVisible({ timeout: 15000 });
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
