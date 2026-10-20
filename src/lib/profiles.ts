import { z } from 'zod';
import type { Athlete, TeamWorkout } from './team-models';

export const cleanName = (value: string) => value.normalize('NFC').trim().replace(/\s+/gu, ' ');
export const nameKey = (value: string) => cleanName(value).toLocaleLowerCase('it-IT');
const namePart = z
  .string()
  .transform(cleanName)
  .pipe(
    z
      .string()
      .min(1, 'Compila nome e cognome.')
      .max(40, 'Usa al massimo 40 caratteri per campo.')
      .regex(/^[\p{L}\p{M}][\p{L}\p{M} '’\p{Pd}.]*$/u, 'Usa lettere, spazi, apostrofi o trattini.'),
  );
export const newProfileSchema = z
  .object({
    id: z.string().uuid(),
    firstName: namePart,
    lastName: namePart,
  })
  .refine(
    (value) => `${value.firstName} ${value.lastName}`.length <= 80,
    'Nome e cognome sono troppo lunghi.',
  );
export type NewProfile = z.infer<typeof newProfileSchema>;
export type ProfileReply =
  { kind: 'selected'; athlete: Athlete } | { kind: 'existing'; athletes: Athlete[] };
export const currentProfile = (athletes: Athlete[], id: string | null) =>
  athletes.find((athlete) => athlete.id === id && !athlete.archived);
export const greetingName = (displayName: string) => cleanName(displayName).split(' ')[0];
export const isAssignedTo = (workout: TeamWorkout, id: string | null) =>
  workout.targetAthleteIds.length === 0 || (!!id && workout.targetAthleteIds.includes(id));
