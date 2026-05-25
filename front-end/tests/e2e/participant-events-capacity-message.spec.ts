import { test, expect } from '@playwright/test';

test('shows capacity error inside the event card and hides it automatically', async ({
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
              id: 'participant-1',
              name: 'Participant',
              email: 'participant@example.com',
              role: 'PARTICIPANTE',
            },
          });
        }

        if (pathname === '/auth/refresh') {
          return jsonResponse({ message: 'ok' });
        }

        if (pathname === '/events') {
          return jsonResponse([
            {
              id: 'event-full',
              title: 'Evento com lotação máxima',
              description: 'Card usado para validar a mensagem inline.',
              location: 'Auditório 1',
              type: 'Palestra',
              startDate: '2026-06-01T00:00:00.000Z',
              endDate: '2026-06-01T00:00:00.000Z',
              status: 'ATIVA',
              capacity: 1,
            },
            {
              id: 'event-open',
              title: 'Evento com vagas',
              description: 'Outro card para garantir contexto de listagem.',
              location: 'Auditório 2',
              type: 'Curso',
              startDate: '2026-06-02T00:00:00.000Z',
              endDate: '2026-06-02T00:00:00.000Z',
              status: 'ATIVA',
              capacity: 50,
            },
          ]);
        }

        if (pathname === '/speakers') {
          return jsonResponse([]);
        }

        if (pathname === '/registrations' && (!init || init.method === 'GET')) {
          return jsonResponse([]);
        }

        if (pathname === '/registrations' && init?.method === 'POST') {
          return jsonResponse({ error: 'Capacidade do evento atingida.' }, 400);
        }

        return originalFetch(input, init);
      };
    },
    { baseUrl: apiBaseUrl },
  );

  await page.goto('/dashboard/participant/events');
  await expect(page.locator('main#main-content')).toBeVisible({
    timeout: 15000,
  });

  const fullEventCard = page
    .locator('div[class*="rounded-2xl"][class*="bg-slate-50"][class*="p-4"]')
    .filter({ hasText: 'Evento com lotação máxima' })
    .first();

  await expect(fullEventCard).toBeVisible({ timeout: 15000 });
  await fullEventCard.getByRole('button', { name: 'Inscrever' }).click();

  const capacityMessage = fullEventCard.getByText(
    'Capacidade do evento atingida.',
  );
  await expect(capacityMessage).toBeVisible({ timeout: 15000 });

  const secondEventCard = page
    .locator('div[class*="rounded-2xl"][class*="bg-slate-50"][class*="p-4"]')
    .filter({ hasText: 'Evento com vagas' })
    .first();
  await expect(secondEventCard).toBeVisible();
  await expect(
    secondEventCard.getByText('Capacidade do evento atingida.'),
  ).toHaveCount(0);

  await page.waitForTimeout(3500);
  await expect(capacityMessage).toHaveCount(0);
});
