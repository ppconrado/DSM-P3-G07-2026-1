import { test, expect } from '@playwright/test';

test('admin left width CSS variable is reflected on admin layout', async ({
  page,
}) => {
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

        if (pathname.startsWith('/users')) {
          return jsonResponse([]);
        }

        return originalFetch(input, init);
      };
    },
    { baseUrl: apiBaseUrl },
  );

  await page.goto('/dashboard/admin/users');
  await expect(page.locator('main#main-content')).toBeVisible({
    timeout: 15000,
  });

  const varValue = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue(
      '--admin-left-width',
    ),
  );

  expect(varValue).toContain('px');
});
