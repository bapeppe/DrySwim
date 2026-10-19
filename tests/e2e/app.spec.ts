import { test, expect, type Page } from '@playwright/test';
import { exercises } from '../../src/data/exercises';
import { type Workspace, type TeamWorkout, type SwimResult } from '../../src/lib/team-models';
import { makeCustomExercise } from '../../src/lib/custom-exercises';
const user = '10000000-0000-4000-8000-000000000001',
  team = '20000000-0000-4000-8000-000000000001',
  student = '30000000-0000-4000-8000-000000000001',
  workoutId = '40000000-0000-4000-8000-000000000001';
const plan: TeamWorkout = {
  id: workoutId,
  name: 'Programma del coach',
  description: 'Tecnica controllata',
  rounds: 1,
  roundRestSeconds: 60,
  warmupSeconds: 60,
  warmupInstructions: 'Marcia graduale',
  cooldownSeconds: 60,
  cooldownInstructions: 'Respira con calma',
  custom: true,
  published: true,
  targetAthleteIds: [],
  exercises: [
    {
      id: 'squat-set',
      exerciseId: 'squat',
      sets: 1,
      dose: { mode: 'reps', reps: 5, sides: 1, positions: 1, secondsPerRep: 3 },
      restSeconds: 30,
    },
    {
      id: 'plank-set',
      exerciseId: 'forearm-plank',
      sets: 1,
      dose: { mode: 'time', durationSeconds: 5, sides: 1, positions: 1, secondsPerRep: 3 },
      restSeconds: 30,
    },
  ],
};
function workspace(role: 'coach' | 'athlete' = 'athlete'): Workspace {
  return {
    configured: true,
    status: 'ready',
    user: { id: user, email: 'test@example.test' },
    member: {
      userId: user,
      teamId: team,
      role,
      athleteId: role === 'athlete' ? student : null,
      teamName: 'Squadra test',
    },
    exercises: structuredClone(exercises),
    workouts: [],
    athletes: [],
    results: [],
    sessions: [],
  };
}
async function server(page: Page, data: Workspace) {
  const state = structuredClone(data);
  let failSession = false;
  await page.route('**/api/**', async (route) => {
    const request = route.request(),
      path = new URL(request.url()).pathname,
      body =
        request.method() === 'POST' || request.method() === 'DELETE'
          ? request.postDataJSON()
          : null;
    let result: unknown = { ok: true };
    let status = 200;
    if (path === '/api/workspace') result = state;
    else if (path === '/api/workouts') {
      if (request.method() === 'DELETE')
        state.workouts = state.workouts.filter((w) => w.id !== body.id);
      else state.workouts = [...state.workouts.filter((w) => w.id !== body.id), body];
    } else if (path === '/api/exercises') {
      const exercise = makeCustomExercise(body);
      state.exercises.push(exercise);
      result = { exercise };
    } else if (path === '/api/athletes') {
      state.athletes = [
        ...state.athletes.filter((a) => a.id !== body.id),
        { ...body, teamId: team, linked: false },
      ];
    } else if (path === '/api/results') {
      state.results = state.results.filter((r) => r.id !== body.id);
      if (request.method() !== 'DELETE')
        state.results.push({ ...body, recordedAt: new Date().toISOString() });
    } else if (path === '/api/sessions') {
      if (failSession) {
        status = 503;
        result = { error: 'Connessione interrotta. Riprova.' };
      } else if (!state.sessions.some((s) => s.id === body.id)) state.sessions.push(body);
    } else if (path === '/api/auth' && body.action === 'signout') {
      state.user = null;
      state.member = null;
      state.status = 'signed-out';
      state.athletes = [];
      state.results = [];
      state.workouts = [];
      state.sessions = [];
    } else if (path === '/api/team') result = { token: 'a'.repeat(64) };
    await route.fulfill({ status, json: result });
  });
  return {
    state,
    failSession: (value: boolean) => {
      failSession = value;
    },
  };
}
async function load(page: Page, path = '/') {
  await page.goto(path);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
}
test('nessun programma predefinito e navigazione responsive', async ({ page }, info) => {
  await server(page, workspace());
  for (const path of [
    '/',
    '/allenamenti',
    '/esercizi',
    '/progressi',
    '/impostazioni',
    '/account',
  ]) {
    await load(page, path);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  await page.goto('/allenamenti');
  await expect(page.locator('.workout-card')).toHaveCount(0);
  await expect(page.getByText('Nessun allenamento disponibile')).toBeVisible();
  await page.screenshot({ path: `test-results/empty-${info.project.name}.png`, fullPage: true });
});
test('ricerca, filtri, preferiti per account e video mancante', async ({ page }) => {
  await server(page, workspace());
  await load(page, '/esercizi');
  await page.getByLabel('Cerca un esercizio').fill('Wall Angels');
  await page.getByRole('button', { name: 'Aggiungi ai preferiti: Wall Angels' }).click();
  await page.reload();
  await page.getByRole('button', { name: 'Preferiti', exact: true }).click();
  await expect(page.locator('.exercise-card')).toHaveCount(1);
  await page.getByRole('link', { name: 'Wall Angels', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Cerca “Wall Angels” su YouTube' })).toHaveAttribute(
    'href',
    /search_query=Wall%20Angels/,
  );
  await expect(page.locator('iframe')).toHaveCount(0);
  await page.goto('/esercizi');
  await page.getByRole('button', { name: 'Filtri', exact: true }).click();
  await page.getByRole('combobox', { name: 'Difficoltà', exact: true }).selectOption('beginner');
  await page.getByLabel('Tipo di esercizio').selectOption('core');
  await page.getByRole('button', { name: 'Mostra i risultati' }).click();
  await expect(page.locator('.exercise-card')).not.toHaveCount(0);
});
test('allenatore: crea esercizio, circuito, pubblica, riordina, duplica ed elimina', async ({
  page,
}, info) => {
  const { state } = await server(page, workspace('coach'));
  await load(page, '/esercizi');
  await page.getByRole('button', { name: 'Aggiungi esercizio', exact: true }).click();
  await page.getByLabel('Nome dell’esercizio', { exact: true }).fill('Mobilità coach');
  await page.getByLabel('Link del video YouTube').fill('https://youtu.be/abcdefghijk');
  await page.getByRole('button', { name: 'Salva esercizio', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Mobilità coach', exact: true })).toBeVisible();
  const customId = state.exercises.at(-1)!.id;
  await page.goto('/allenatore');
  await page.getByLabel('Nome dell’allenamento', { exact: true }).fill('Circuito junior');
  await page.getByLabel('Seleziona esercizio').selectOption(customId);
  await page.getByRole('button', { name: 'Aggiungi', exact: true }).click();
  await page.getByLabel('Seleziona esercizio').selectOption('dead-bug');
  await page.getByRole('button', { name: 'Aggiungi', exact: true }).click();
  await page.getByRole('button', { name: 'Sposta su Dead Bug' }).click();
  await expect(page.locator('.builder-exercise').first()).toContainText('Dead Bug');
  await page.getByLabel('Pubblica per gli atleti').check();
  await page.getByRole('button', { name: 'Salva allenamento', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('pubblicato');
  await page.getByRole('button', { name: 'Duplica Circuito junior', exact: true }).click();
  await page.getByRole('button', { name: 'Salva allenamento', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Elimina Circuito junior · copia', exact: true }),
  ).toBeVisible();
  page.on('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'Elimina Circuito junior · copia', exact: true }).click();
  await page.goto('/allenamenti');
  await expect(page.locator('.workout-card')).toHaveCount(1);
  await page.screenshot({ path: `test-results/coach-${info.project.name}.png`, fullPage: true });
  expect(state.workouts[0].published).toBe(true);
});
test('allievi e storico: 1.12 è un minuto e dodici secondi', async ({ page }, info) => {
  const { state } = await server(page, workspace('coach'));
  await load(page, '/allievi');
  await page.getByLabel('Nome o nome breve').fill('Luca');
  await page.getByRole('button', { name: 'Aggiungi allievo', exact: true }).click();
  await page.getByRole('link', { name: /Luca/ }).click();
  await page.getByLabel('Tempo', { exact: true }).fill('1.12');
  await page.getByRole('button', { name: 'Salva tempo', exact: true }).click();
  await expect(page.locator('.swim-history')).toContainText('1:12.00');
  expect(state.results[0].centiseconds).toBe(7200);
  await page.reload();
  await expect(page.locator('.swim-history')).toContainText('1:12.00');
  await page.getByLabel('Tempo', { exact: true }).fill('1:10.50');
  await page.getByRole('button', { name: 'Salva tempo', exact: true }).click();
  await expect(page.locator('.swim-history li')).toHaveCount(2);
  await expect(page.getByText(/Variazione dal primo/)).toContainText('−1.50 s');
  await page.getByRole('button', { name: 'Genera invito' }).click();
  await expect(page.getByLabel('Link di invito')).toHaveValue(/invito=a{64}/);
  await page.screenshot({ path: `test-results/roster-${info.project.name}.png`, fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const local = await page.evaluate(() => JSON.stringify({ ...localStorage }));
  expect(local).not.toContain('Luca');
  expect(local).not.toContain('centiseconds');
});
test('atleta: aree allenatore protette e propri tempi consultabili', async ({ page }) => {
  const data = workspace();
  data.results = [
    {
      id: user,
      athleteId: student,
      distance: 100,
      stroke: 'medley',
      poolLength: 25,
      date: '2026-10-20',
      centiseconds: 7200,
      kind: 'race',
      note: '',
      recordedAt: '2026-10-20T12:00:00Z',
    } as SwimResult,
  ];
  await server(page, data);
  for (const path of ['/allenatore', '/allievi']) {
    await load(page, path);
    await expect(page.getByRole('button', { name: 'Aggiungi allievo' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Salva allenamento' })).toHaveCount(0);
  }
  await page.goto('/esercizi');
  await expect(page.getByRole('button', { name: 'Aggiungi esercizio', exact: true })).toHaveCount(
    0,
  );
  await page.goto('/progressi');
  await expect(page.locator('.swim-history')).toContainText('1:12.00');
  await expect(page.getByRole('button', { name: 'Modifica', exact: true })).toHaveCount(0);
});
test('player: pausa, recupero, countdown, salvataggio fallito e ripresa', async ({ page }) => {
  const data = workspace();
  data.workouts = [plan];
  const fake = await server(page, data);
  await load(page, `/allenamenti/${workoutId}`);
  await page.getByRole('checkbox').check();
  await page.clock.install();
  await page.getByRole('button', { name: 'Inizia allenamento', exact: true }).click();
  await expect(page.getByRole('timer')).toHaveText('01:00');
  await page.clock.fastForward(10000);
  await expect(page.getByRole('timer')).toHaveText('00:50');
  await page.getByRole('button', { name: 'Pausa', exact: true }).click();
  await page.clock.fastForward(20000);
  await expect(page.getByRole('timer')).toHaveText('00:50');
  await page.reload();
  await expect(page.getByRole('timer')).toHaveText('00:50');
  await page.getByRole('button', { name: 'Riprendi', exact: true }).click();
  await page.clock.fastForward(51000);
  await page.getByRole('button', { name: 'Ho finito' }).click();
  await expect(page.getByRole('heading', { name: 'Riprendi fiato', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Salta recupero' }).click();
  await expect(page.getByRole('timer')).toHaveText('00:05');
  await page.clock.fastForward(6000);
  await page.clock.fastForward(61000);
  await expect(page.getByRole('heading', { name: 'Allenamento finito!' })).toBeVisible();
  fake.failSession(true);
  await page.getByRole('button', { name: 'Salva il risultato' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Connessione interrotta' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Allenamento finito!' })).toBeVisible();
  fake.failSession(false);
  await page.getByRole('button', { name: 'Salva il risultato' }).click();
  await expect(page.getByRole('heading', { name: 'Allenamento salvato!' })).toBeVisible();
  await page.goto('/progressi');
  await expect(page.locator('.history-row')).toHaveCount(1);
  await page.reload();
  await expect(page.locator('.history-row')).toContainText('Completato');
});
test('tema, tastiera e logout rimuovono i dati del precedente account', async ({ page }) => {
  await server(page, workspace());
  await load(page);
  await page.getByRole('button', { name: 'Attiva tema scuro' }).click();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Vai al contenuto' })).toBeFocused();
  await page.goto('/esercizi');
  await page.getByRole('button', { name: 'Aggiungi ai preferiti: Wall Angels' }).click();
  await page.goto('/account');
  await page.getByRole('button', { name: 'Esci dal tuo account' }).click();
  await expect(page.getByRole('heading', { name: 'Accedi alla squadra' })).toBeVisible();
  expect(
    await page.evaluate(() => Object.keys(localStorage).filter((k) => k.includes(':device:'))),
  ).toEqual([]);
});
test('database non configurato: catalogo pubblico e messaggio esplicito', async ({ page }) => {
  const data = workspace();
  Object.assign(data, { configured: false, status: 'setup-required', user: null, member: null });
  await server(page, data);
  await load(page, '/account');
  await expect(page.getByRole('heading', { name: 'Attiviamo la tua squadra' })).toBeVisible();
  await page.getByRole('link', { name: 'Intanto esplora gli esercizi' }).click();
  await expect(page.locator('.exercise-card')).toHaveCount(52);
});
