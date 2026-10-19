import { writeFileSync } from 'node:fs';
import { exercises } from '../src/data/exercises';
const rows = exercises.map(
  (exercise) =>
    `('${exercise.id}', null, '${JSON.stringify(exercise).replaceAll("'", "''")}'::jsonb)`,
);
writeFileSync(
  'supabase/migrations/202610200002_catalog.sql',
  `-- Catalogo base condiviso: 52 esercizi, nessun programma predefinito.\nbegin;\ninsert into public.exercises(id,team_id,document) values\n${rows.join(',\n')}\non conflict(id) do update set document=excluded.document where public.exercises.team_id is null;\ncommit;\n`,
);
