import { test, expect, type Page } from '@playwright/test';
async function openPlayerOptions(page: Page) {
  const options = page
    .locator('details')
    .filter({ has: page.getByText('Altre opzioni', { exact: true }) });
  if (!(await options.evaluate((el) => el.hasAttribute('open'))))
    await options.locator('summary').click();
}
test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});
test('dashboard reale e nessun overflow sulle pagine principali', async ({ page }, testInfo) => {
  await page.screenshot({
    path: `test-results/dashboard-${testInfo.project.name}.png`,
    fullPage: true,
  });
  for (const route of ['/', '/esercizi', '/allenamenti', '/progressi', '/impostazioni']) {
    await page.goto(route);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
  }
  await expect(page.getByText('I dati restano qui.')).toBeVisible();
});
test('ricerca, preferiti persistenti e fallback video', async ({ page }) => {
  await page.goto('/esercizi');
  await page.getByRole('textbox', { name: 'Cerca un esercizio' }).fill('Wall Angels');
  await expect(page.getByRole('status')).toHaveText('1 esercizio trovato');
  await page.getByRole('button', { name: 'Aggiungi ai preferiti: Wall Angels' }).click();
  await page.reload();
  await page.getByRole('button', { name: 'Preferiti', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('1 esercizio trovato');
  await page.getByRole('link', { name: 'Wall Angels', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Wall Angels');
  await expect(page.getByRole('link', { name: 'Cerca “Wall Angels” su YouTube' })).toHaveAttribute(
    'href',
    /search_query=Wall%20Angels/,
  );
  expect(await page.locator('iframe').count()).toBe(0);
});
test('builder locale: crea, riordina, salva, duplica ed elimina', async ({ page }) => {
  await page.goto('/allenatore');
  await page.getByRole('button', { name: 'Entra in modalità allenatore' }).click();
  await page.getByLabel('Nome dell’allenamento', { exact: true }).fill('Circuito di prova');
  await page.getByRole('button', { name: 'Aggiungi', exact: true }).click();
  await page.getByLabel('Seleziona esercizio').selectOption('dead-bug');
  await page.getByRole('button', { name: 'Aggiungi', exact: true }).click();
  await page.getByRole('button', { name: 'Sposta su Dead Bug' }).click();
  await expect(page.locator('.builder-exercise').first()).toContainText('Dead Bug');
  await page.getByRole('button', { name: 'Salva allenamento', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('salvato');
  await page.getByRole('button', { name: 'Duplica Circuito di prova', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Elimina Circuito di prova · copia', exact: true }),
  ).toBeVisible();
  page.on('dialog', (dialog) => dialog.accept());
  await page
    .getByRole('button', { name: 'Elimina Circuito di prova · copia', exact: true })
    .click();
  await page.goto('/allenamenti');
  await expect(page.getByRole('heading', { name: 'Circuito di prova', exact: true })).toBeVisible();
});
test('player: timer, pausa, recupero, fine e persistenza dei progressi', async ({ page }) => {
  await page.goto('/allenamenti/forza-core');
  await page.getByRole('checkbox').check();
  await page.clock.install();
  await page.getByRole('button', { name: 'Inizia allenamento', exact: true }).click();
  await expect(page.getByRole('timer')).toHaveText('05:00');
  await page.clock.fastForward(10000);
  await expect(page.getByRole('timer')).toHaveText('04:50');
  await page.getByRole('button', { name: 'Pausa', exact: true }).click();
  await page.clock.fastForward(20000);
  await expect(page.getByRole('timer')).toHaveText('04:50');
  await page.getByRole('button', { name: 'Riprendi', exact: true }).click();
  await page.clock.fastForward(291000);
  await expect(page.getByRole('heading', { name: 'Bodyweight Squat', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Ho finito' }).click();
  await expect(page.getByRole('heading', { name: 'Riprendi fiato', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Salta recupero' }).click();
  await expect(page.getByRole('heading', { name: 'Push-up', exact: true })).toBeVisible();
  for (let i = 0; i < 40; i++) {
    if (await page.getByRole('heading', { name: 'Allenamento finito!' }).count()) break;
    const complete = page.getByRole('button', { name: 'Ho finito', exact: true }),
      timed = page.getByRole('button', { name: 'Termina la tenuta' }),
      rest = page.getByRole('button', { name: 'Salta recupero' });
    if (await complete.count()) await complete.click();
    else if (await rest.count()) await rest.click();
    else {
      await openPlayerOptions(page);
      if (await timed.isVisible()) await timed.click();
      else await page.getByRole('button', { name: 'Salta fase' }).click();
    }
  }
  await expect(page.getByRole('heading', { name: 'Allenamento finito!' })).toBeVisible();
  await page.getByRole('button', { name: 'Salva il risultato' }).click();
  await page.goto('/progressi');
  await expect(page.locator('.history-row')).toHaveCount(1);
  await expect(page.locator('.history-row')).toContainText('Completato');
  await page.reload();
  await expect(page.locator('.history-row')).toHaveCount(1);
});
test('tema scuro e navigazione da tastiera', async ({ page }) => {
  await page.getByRole('button', { name: 'Attiva tema scuro' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Vai al contenuto' })).toBeFocused();
});

test('ripresa dopo reload e salvataggio di una sessione parziale', async ({ page }) => {
  await page.goto('/allenamento/mobilita-controllo');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Inizia allenamento', exact: true }).click();
  await page.getByRole('button', { name: 'Pausa', exact: true }).click();
  const time = await page.getByRole('timer').textContent();
  await page.reload();
  await expect(page.getByRole('timer')).toHaveText(time!);
  await expect(page.getByRole('button', { name: 'Riprendi', exact: true })).toBeVisible();
  await openPlayerOptions(page);
  await page.getByRole('button', { name: 'Termina allenamento', exact: true }).click();
  await page.getByRole('button', { name: 'Sì, termina', exact: true }).click();
  await page.getByRole('button', { name: 'Salva il risultato' }).click();
  await page.goto('/progressi');
  await expect(page.locator('.history-row')).toContainText('Interrotto');
  await expect(page.locator('.stat').first()).toContainText('0');
});

test('storage disabilitato: messaggio visibile e app navigabile', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new Error('Storage disabled');
      },
    });
  });
  await page.reload();
  await expect(
    page.getByRole('alert').filter({ hasText: 'Il browser non consente' }),
  ).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.getByRole('button', { name: 'Attiva tema scuro' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('percorso semplice: Home, programma, timer senza avvii duplicati', async ({ page }) => {
  const primary = page.getByRole('link', { name: 'Vai all’allenamento', exact: true });
  await expect(primary).toBeInViewport();
  await primary.click();
  const start = page.getByRole('button', { name: 'Inizia allenamento', exact: true });
  await expect(start).toBeInViewport();
  await expect(start).toBeDisabled();
  await page.getByRole('checkbox').check();
  await start.click();
  await expect(page.getByRole('timer')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Pausa', exact: true })).toBeInViewport();
  await expect(page.getByRole('button', { name: 'Prepara la sessione' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: /Marcia/ })).toBeVisible();
  await page.goto('/');
  await expect(page.getByRole('link', { name: /Riprendi allenamento/ })).toBeInViewport();
});

test('filtri su richiesta e preferenze raggiungibili da telefono', async ({ page }) => {
  await page.goto('/esercizi');
  await expect(page.getByRole('combobox', { name: 'Difficoltà', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Filtri', exact: true }).click();
  await page.getByRole('combobox', { name: 'Difficoltà', exact: true }).selectOption('beginner');
  await page.getByLabel('Tipo di esercizio').selectOption('core');
  await page.getByRole('button', { name: 'Mostra i risultati' }).click();
  await expect(page.locator('.exercise-card')).not.toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Filtri (2)', exact: true })).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Difficoltà', exact: true })).toHaveCount(0);
  await page.getByRole('link', { name: 'Apri impostazioni' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Impostazioni');
  await expect(page.getByRole('link', { name: 'Spazio allenatore', exact: true })).toBeVisible();
});
