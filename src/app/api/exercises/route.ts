import { customExerciseInputSchema, makeCustomExercise } from '@/lib/custom-exercises';
import { endpoint, json, payload, context, databaseError } from '@/lib/server/http';
export async function POST(request: Request) {
  return endpoint(async () => {
    const { db, user, member } = await context(true);
    const input = customExerciseInputSchema.parse(await payload(request));
    const exercise = makeCustomExercise(input);
    const { error } = await db.from('exercises').upsert({
      id: exercise.id,
      team_id: member.team_id,
      document: exercise,
      created_by: user.id,
    });
    databaseError(error);
    return json({ exercise });
  });
}
