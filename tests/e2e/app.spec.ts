import { test, expect, type Page } from '@playwright/test';
import { exercises } from '../../src/data/exercises';
import { type Workspace, type TeamWorkout } from '../../src/lib/team-models';
import { nameKey } from '../../src/lib/profiles';
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
function workspace(): Workspace {
  return {
    configured: true,
    status: 'ready',
    team: { id: team, name: 'Squadra test' },
    exercises: structuredClone(exercises),
    workouts: [],
    athletes: [],
    results: [],
    sessions: [],
  };
}
async function server(page: Page, data: Workspace, { fresh = false } = {}) {
  const state = structuredClone(data);
  if (!fresh && !state.athletes.some((a) => !a.archived))
    state.athletes.push({ id: user, teamId: team, displayName: 'Profilo Test', archived: false });
  if (!fresh) {
    const id =
      state.athletes.find((a) => a.id === user && !a.archived)?.id ||
      state.athletes.find((a) => !a.archived)?.id;
    await page.addInitScript((id) => {
      if (id && !localStorage.getItem('swimdryland:profile:v1'))
        localStorage.setItem('swimdryland:profile:v1', JSON.stringify({ athleteId: id }));
    }, id);
  }
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
    else if (path === '/api/profiles') {
      const displayName = `${body.firstName.trim()} ${body.lastName.trim()}`;
      const matches = state.athletes.filter(
        (a) => !a.archived && nameKey(a.displayName) === nameKey(displayName),
      );
      if (matches.length && !matches.some((a) => a.id === body.id))
        result = { kind: 'existing', athletes: matches };
      else {
        const athlete = matches[0] || { id: body.id, displayName, archived: false, teamId: team };
        if (!state.athletes.some((a) => a.id === athlete.id)) state.athletes.push(athlete);
        result = { kind: 'selected', athlete };
      }
    } else if (path === '/api/workouts') {
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
        { ...body, teamId: team },
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
    }

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
test('filtro progressi: etichetta e menu nel pannello in entrambi i temi', async ({
  page,
}, info) => {
  await server(page, workspace());
  await load(page, '/progressi');
  const filter = page.getByRole('combobox', { name: 'Filtra per allievo' });
  for (const theme of ['light', 'dark']) {
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    await expect(filter).toHaveValue(user);
    const bounds = await filter.evaluate((select) => {
      const label = select.closest('label')!;
      const range = document.createRange();
      range.selectNodeContents(label.firstChild!);
      const text = range.getBoundingClientRect();
      const panel = label.getBoundingClientRect();
      const control = select.getBoundingClientRect();
      return {
        textInside: text.top >= panel.top && text.left >= panel.left && text.right <= panel.right,
        separated: text.bottom < control.top,
        controlInside:
          control.left > panel.left && control.right < panel.right && control.bottom < panel.bottom,
      };
    });
    expect(bounds).toEqual({ textInside: true, separated: true, controlInside: true });
    await filter.selectOption('');
    await expect(page.getByRole('heading', { name: 'Progressi della squadra' })).toBeVisible();
    await filter.selectOption(user);
    await page.screenshot({
      path: `test-results/progress-filter-${info.project.name}-${theme}.png`,
      fullPage: true,
    });
    if (theme === 'light') await page.getByRole('button', { name: 'Attiva tema scuro' }).click();
  }
});
test('ricerca, filtri, preferiti sul dispositivo e video mancante', async ({ page }) => {
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
  const { state } = await server(page, workspace());
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
test('scheda personale: creazione dalla pagina allievo, bozza, modifica e pubblicazione', async ({
  page,
}, info) => {
  const data = workspace();
  data.athletes = [
    { id: student, teamId: team, displayName: 'Luca', archived: false },
    { id: user, teamId: team, displayName: 'Anna', archived: false },
  ];
  data.workouts = [
    structuredClone(plan),
    { ...structuredClone(plan), id: user, name: 'Scheda Anna', targetAthleteIds: [user] },
  ];
  const { state } = await server(page, data);
  await load(page, '/allievi');
  await page.getByRole('link', { name: /Luca/ }).click();
  const personal = page.getByRole('region', { name: 'Schede personali' });
  await expect(personal.locator('.workout-card')).toHaveCount(0);
  await page.getByRole('link', { name: 'Aggiungi scheda allenamento' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Scheda per Luca');
  await expect(page.getByText('Destinatario: solo Luca.', { exact: false })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Assegna a tutta la squadra' })).toHaveCount(0);
  await page.getByLabel('Nome dell’allenamento', { exact: true }).fill('Palestra · Giorno A');
  await page
    .getByLabel('Descrizione', { exact: true })
    .fill('Lunedì e giovedì: tecnica controllata e attrezzatura concordata con il coach.');
  await expect(page.getByLabel('Numero di giri')).toHaveValue('1');
  await page.getByLabel('Seleziona esercizio').selectOption('squat');
  await page.getByRole('button', { name: 'Aggiungi', exact: true }).click();
  await page.getByLabel('Serie', { exact: true }).fill('3');
  await page.getByLabel('Ripetizioni', { exact: true }).fill('8');
  await page.getByLabel('Recupero (sec)', { exact: true }).fill('90');
  await page.getByRole('button', { name: 'Salva allenamento' }).click();
  await expect(page.getByText('Bozza salvata.', { exact: true })).toBeVisible();
  const saved = state.workouts.find((w) => w.name === 'Palestra · Giorno A')!;
  expect(saved.targetAthleteIds).toEqual([student]);
  expect(saved.published).toBe(false);
  expect(saved.exercises[0]).toMatchObject({ sets: 3, restSeconds: 90, dose: { reps: 8 } });
  await page.getByRole('link', { name: '← Scheda di Luca' }).click();
  await expect(personal.locator('.workout-card')).toHaveCount(1);
  await expect(personal).toContainText('Bozza');
  await personal.locator('.workout-card').click();
  await expect(page.getByRole('button', { name: 'Inizia allenamento', exact: true })).toHaveCount(
    0,
  );
  await page.goto(`/allievi/${student}`);
  await page.getByRole('link', { name: 'Modifica Palestra · Giorno A', exact: true }).click();
  await expect(page.getByLabel('Serie', { exact: true })).toHaveValue('3');
  await page.getByLabel('Pubblica per Luca', { exact: true }).check();
  await page.getByRole('button', { name: 'Salva allenamento' }).click();
  await expect(page.getByText('Allenamento pubblicato per gli atleti selezionati.')).toBeVisible();
  expect(state.workouts.find((w) => w.id === saved.id)).toMatchObject({
    published: true,
    targetAthleteIds: [student],
  });
  expect(state.workouts.find((w) => w.id === workoutId)?.targetAthleteIds).toEqual([]);
  expect(state.workouts.find((w) => w.id === user)?.targetAthleteIds).toEqual([user]);
  await page.reload();
  await expect(page.getByLabel('Nome dell’allenamento', { exact: true })).toHaveValue(
    'Palestra · Giorno A',
  );
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Nuovo', exact: true }).click();
  await expect(page.getByLabel('Nome dell’allenamento', { exact: true })).toHaveValue('');
  await expect(page.getByText('Destinatario: solo Luca.', { exact: false })).toBeVisible();
  await expect(page.getByLabel('Pubblica per Luca', { exact: true })).not.toBeChecked();
  await page.getByLabel('Nome dell’allenamento', { exact: true }).fill('Palestra · Giorno B');
  await page.getByRole('button', { name: 'Aggiungi', exact: true }).click();
  await page.getByRole('button', { name: 'Salva allenamento' }).click();
  await expect(page.getByText('Bozza salvata.', { exact: true })).toBeVisible();
  expect(state.workouts.find((w) => w.name === 'Palestra · Giorno B')?.targetAthleteIds).toEqual([
    student,
  ]);
  await page.getByRole('link', { name: '← Scheda di Luca' }).click();
  await expect(personal.locator('.workout-card')).toHaveCount(2);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({
    path: `test-results/athlete-plans-${info.project.name}.png`,
    fullPage: true,
  });
  await personal.locator('.workout-card').filter({ hasText: 'Palestra · Giorno A' }).click();
  await expect(page.getByRole('button', { name: 'Inizia allenamento', exact: true })).toBeVisible();
});
test('schede personali: destinatario inesistente, archiviato o scheda estranea non diventano programmi di squadra', async ({
  page,
}) => {
  const data = workspace();
  data.athletes = [
    { id: student, teamId: team, displayName: 'Luca', archived: true },
    { id: user, teamId: team, displayName: 'Anna', archived: false },
  ];
  data.workouts = [structuredClone(plan)];
  await server(page, data);
  for (const path of [
    `/allenatore?athlete=${student}`,
    '/allenatore?athlete=inesistente',
    `/allenatore?athlete=${user}&edit=${workoutId}`,
  ]) {
    await load(page, path);
    await expect(
      page.getByRole('heading', { name: 'Scheda personale non disponibile' }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Salva allenamento' })).toHaveCount(0);
  }
  await page.goto(`/allievi/${student}`);
  await expect(page.getByRole('link', { name: 'Aggiungi scheda allenamento' })).toHaveCount(0);
});
test('allievi e storico: 1.12 è un minuto e dodici secondi', async ({ page }, info) => {
  const { state } = await server(page, workspace());
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
  await expect(page.getByRole('button', { name: 'Genera invito' })).toHaveCount(0);
  await page.screenshot({ path: `test-results/roster-${info.project.name}.png`, fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const local = await page.evaluate(() => JSON.stringify({ ...localStorage }));
  expect(local).not.toContain('Luca');
  expect(local).not.toContain('centiseconds');
});
test('nessun login: gestione aperta e tempi separati per allievo', async ({ page }) => {
  const data = workspace();
  data.athletes = [
    { id: student, teamId: team, displayName: 'Luca', archived: false },
    { id: user, teamId: team, displayName: 'Anna', archived: false },
  ];
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
    },
    {
      id: student,
      athleteId: user,
      distance: 100,
      stroke: 'medley',
      poolLength: 25,
      date: '2026-10-20',
      centiseconds: 6500,
      kind: 'race',
      note: '',
      recordedAt: '2026-10-20T12:00:00Z',
    },
  ];
  await server(page, data);
  await load(page, '/allenatore');
  await expect(page.getByRole('button', { name: 'Salva allenamento', exact: true })).toBeVisible();
  await page.goto('/allievi');
  await expect(page.getByRole('button', { name: 'Aggiungi allievo', exact: true })).toBeVisible();
  await page.goto('/esercizi');
  await expect(page.getByRole('button', { name: 'Aggiungi esercizio', exact: true })).toBeVisible();
  await page.goto('/progressi');
  await page.getByLabel('Filtra per allievo').selectOption('');
  await expect(page.locator('.swim-history')).toHaveCount(0);
  await page.getByLabel('Filtra per allievo').selectOption(student);
  await expect(page.locator('.swim-history')).toContainText('1:12.00');
  await expect(page.locator('.swim-history')).not.toContainText('1:05.00');
  await page.getByLabel('Filtra per allievo').selectOption(user);
  await expect(page.locator('.swim-history')).toContainText('1:05.00');
  await page.goto('/account');
  await expect(page).toHaveURL('/');
  await expect(page.getByRole('textbox', { name: /email|password/i })).toHaveCount(0);
});
test('player: pausa, recupero, countdown, salvataggio fallito e ripresa', async ({ page }) => {
  const data = workspace();
  data.workouts = [plan];
  data.athletes = [{ id: student, teamId: team, displayName: 'Luca', archived: false }];
  const fake = await server(page, data);
  await load(page, `/allenamenti/${workoutId}`);
  await page.getByRole('checkbox').check();
  const clockStart = new Date('2026-10-20T12:00:00Z');
  await page.clock.install({ time: clockStart });
  await page.clock.pauseAt(new Date(clockStart.getTime() + 1000));
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
  await expect(page.getByLabel('Allievo (facoltativo)')).toHaveValue(student);
  fake.failSession(true);
  await page.getByRole('button', { name: 'Salva il risultato' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Connessione interrotta' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Allenamento finito!' })).toBeVisible();
  fake.failSession(false);
  await page.getByRole('button', { name: 'Salva il risultato' }).click();
  await expect(page.getByRole('heading', { name: 'Allenamento salvato!' })).toBeVisible();
  expect(fake.state.sessions[0].athleteId).toBe(student);
  await page.goto('/progressi');
  await expect(page.locator('.history-row')).toHaveCount(1);
  await page.reload();
  await expect(page.locator('.history-row')).toContainText('Completato');
});
test('tema, tastiera e preferiti rimangono sul dispositivo senza account', async ({ page }) => {
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
  await expect(page).toHaveURL('/');
  await page.goto('/esercizi');
  await page.getByRole('button', { name: 'Preferiti', exact: true }).click();
  await expect(page.locator('.exercise-card')).toHaveCount(1);
});
test('database non configurato: catalogo pubblico e messaggio esplicito', async ({ page }) => {
  const data = workspace();
  Object.assign(data, { configured: false, status: 'setup-required', team: null });
  await server(page, data);
  await load(page, '/account');
  await expect(page.getByRole('heading', { name: 'La squadra non è ancora attiva' })).toBeVisible();
  await page.getByRole('link', { name: 'Esplora gli esercizi', exact: true }).click();
  await expect(page.locator('.exercise-card')).toHaveCount(52);
});

test('bozze condivise visibili, senza avvio prima della pubblicazione', async ({ page }) => {
  const data = workspace();
  data.workouts = [{ ...plan, published: false }];
  await server(page, data);
  await load(page, `/allenamenti/${workoutId}`);
  await expect(page.getByText(/deve approvarlo e pubblicarlo/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Inizia allenamento', exact: true })).toHaveCount(
    0,
  );
  await page.goto(`/allenamento/${workoutId}`);
  await expect(page.getByRole('heading', { name: 'Programma non disponibile' })).toBeVisible();
});

test('primo accesso: nome e cognome, saluto e scelta ricordata senza memorizzare nomi', async ({
  page,
}, info) => {
  if (info.project.name === 'mobile') await page.setViewportSize({ width: 320, height: 740 });
  const fake = await server(page, workspace(), { fresh: true });
  await load(page);
  await expect(page.getByRole('heading', { name: 'Come ti chiami?' })).toBeVisible();
  await expect(page.getByRole('navigation')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({
    path: `test-results/profile-welcome-${info.project.name}.png`,
    fullPage: true,
  });
  await page.getByLabel('Nome', { exact: true }).fill('Luca');
  await page.getByLabel('Cognome', { exact: true }).fill('Rossi');
  await page.getByRole('button', { name: 'Inizia', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Ciao, Luca!', exact: true })).toBeVisible();
  expect(fake.state.athletes).toHaveLength(1);
  expect(fake.state.athletes[0].displayName).toBe('Luca Rossi');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Ciao, Luca!', exact: true })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Cognome', exact: true })).toHaveCount(0);
  const local = await page.evaluate(() => JSON.stringify({ ...localStorage }));
  expect(local).not.toContain('Luca');
  expect(local).not.toContain('Rossi');
  expect(local).not.toContain('centiseconds');
  expect(
    JSON.parse(await page.evaluate(() => localStorage.getItem('swimdryland:profile:v1')!)),
  ).toEqual({ athleteId: fake.state.athletes[0].id });
  await page.goto('/impostazioni');
  await expect(page.getByText('Luca Rossi', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Cambia profilo', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Trova il tuo nome' })).toBeVisible();
  await page.getByRole('button', { name: 'Continua come Luca' }).click();
  await expect(page.getByRole('heading', { name: 'Impostazioni', exact: true })).toBeVisible();
});

test('nuovo dispositivo: sceglie il nome esistente e ritrova progressi e programmi personali', async ({
  page,
  browser,
}, info) => {
  const fake = await server(page, workspace(), { fresh: true });
  await load(page);
  await page.getByLabel('Nome', { exact: true }).fill('Anna');
  await page.getByLabel('Cognome', { exact: true }).fill('Bianchi');
  await page.getByRole('button', { name: 'Inizia', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Ciao, Anna!', exact: true })).toBeVisible();
  const athleteId = fake.state.athletes[0].id;
  const other = { ...plan, id: user, name: 'Altro allievo', targetAthleteIds: [student] };
  const data = structuredClone(fake.state);
  data.athletes.push({ id: student, teamId: team, displayName: 'Luca Rossi', archived: false });
  data.workouts = [other, { ...plan, targetAthleteIds: [athleteId] }];
  data.results = [
    {
      id: user,
      athleteId,
      distance: 100,
      stroke: 'freestyle',
      poolLength: 25,
      date: '2026-10-20',
      centiseconds: 7234,
      kind: 'training',
      note: '',
      recordedAt: '2026-10-20T12:00:00Z',
    },
  ];
  const context = await browser.newContext({
    viewport: { width: info.project.name === 'mobile' ? 390 : 1280, height: 844 },
  });
  try {
    const another = await context.newPage();
    const second = await server(another, data, { fresh: true });
    await load(another);
    await another.getByRole('button', { name: 'Scegli il tuo nome dalla lista' }).click();
    await expect(another.getByRole('heading', { name: 'Trova il tuo nome' })).toBeVisible();
    await another.getByLabel('Cerca il tuo nome').fill('Bianchi');
    await another.screenshot({
      path: `test-results/profile-list-${info.project.name}.png`,
      fullPage: true,
    });
    await another.getByRole('button', { name: 'Anna Bianchi', exact: true }).click();
    await expect(another.getByRole('heading', { name: 'Ciao, Anna!', exact: true })).toBeVisible();
    await expect(another.locator('.today-card')).toContainText(plan.name);
    await expect(another.locator('.today-card')).not.toContainText('Altro allievo');
    await another.goto('/progressi');
    await expect(another.getByLabel('Filtra per allievo')).toHaveValue(athleteId);
    await expect(another.locator('.swim-history')).toContainText('1:12.34');
    expect(second.state.athletes).toHaveLength(2);
    await another.reload();
    await expect(another.getByLabel('Filtra per allievo')).toHaveValue(athleteId);
  } finally {
    await context.close();
  }
});

test('nomi già presenti e lista vuota: nessuna duplicazione, ricerca e ritorno al modulo', async ({
  page,
}) => {
  const data = workspace();
  data.athletes = [{ id: student, teamId: team, displayName: 'Luca Rossi', archived: false }];
  const fake = await server(page, data, { fresh: true });
  await load(page);
  await page.getByLabel('Nome', { exact: true }).fill('Luca');
  await page.getByLabel('Cognome', { exact: true }).fill('Rossi');
  await page.getByRole('button', { name: 'Inizia', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('già presente');
  await page.getByLabel('Cerca il tuo nome').fill('Nessuno');
  await expect(page.getByRole('status')).toContainText('Nessun nome trovato');
  await page.getByRole('button', { name: 'Inserisci nome e cognome' }).click();
  await expect(page.getByLabel('Nome', { exact: true })).toHaveValue('Luca');
  await page.getByRole('button', { name: 'Scegli il tuo nome dalla lista' }).click();
  await page.getByLabel('Cerca il tuo nome').fill('Rossi');
  await page.getByRole('button', { name: 'Luca Rossi', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Ciao, Luca!', exact: true })).toBeVisible();
  expect(fake.state.athletes).toHaveLength(1);
});

test('cambio profilo: preferiti separati e nome archiviato non riutilizzato', async ({ page }) => {
  const data = workspace();
  data.athletes = [
    { id: user, teamId: team, displayName: 'Luca Rossi', archived: false },
    { id: student, teamId: team, displayName: 'Anna Bianchi', archived: false },
  ];
  const fake = await server(page, data, { fresh: true });
  await load(page);
  await page.getByRole('button', { name: 'Scegli il tuo nome dalla lista' }).click();
  await page.getByRole('button', { name: 'Luca Rossi', exact: true }).click();
  await page.goto('/esercizi');
  await page.getByRole('button', { name: 'Aggiungi ai preferiti: Wall Angels' }).click();
  await page.goto('/impostazioni');
  await page.getByRole('button', { name: 'Cambia profilo' }).click();
  await page.getByRole('button', { name: 'Anna Bianchi', exact: true }).click();
  await page.goto('/esercizi');
  await page.getByRole('button', { name: 'Preferiti', exact: true }).click();
  await expect(page.locator('.exercise-card')).toHaveCount(0);
  await page.goto('/impostazioni');
  await page.getByRole('button', { name: 'Cambia profilo' }).click();
  await page.getByRole('button', { name: 'Luca Rossi', exact: true }).click();
  await page.goto('/esercizi');
  await page.getByRole('button', { name: 'Preferiti', exact: true }).click();
  await expect(page.locator('.exercise-card')).toHaveCount(1);
  fake.state.athletes.find((a) => a.id === user)!.archived = true;
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Come ti chiami?' })).toBeVisible();
  await page.getByRole('button', { name: 'Scegli il tuo nome dalla lista' }).click();
  await expect(page.getByRole('button', { name: 'Luca Rossi', exact: true })).toHaveCount(0);
});

test('errore di rete al primo accesso: conserva i campi e permette di riprovare', async ({
  page,
}) => {
  const fake = await server(page, workspace(), { fresh: true });
  let failed = false;
  await page.route('**/api/profiles', async (route) => {
    if (!failed) {
      failed = true;
      await route.fulfill({ status: 503, json: { error: 'Connessione interrotta. Riprova.' } });
    } else await route.fallback();
  });
  await load(page);
  await page.getByLabel('Nome', { exact: true }).fill('Luca');
  await page.getByLabel('Cognome', { exact: true }).fill('Rossi');
  await page.getByRole('button', { name: 'Inizia', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Connessione interrotta' })).toBeVisible();
  expect(fake.state.athletes).toHaveLength(0);
  await expect(page.getByLabel('Cognome', { exact: true })).toHaveValue('Rossi');
  await page.getByRole('button', { name: 'Inizia', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Ciao, Luca!', exact: true })).toBeVisible();
  expect(fake.state.athletes).toHaveLength(1);
});
