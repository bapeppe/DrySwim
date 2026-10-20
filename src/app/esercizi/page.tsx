import { ExerciseLibrary } from '@/components/exercise-library';
export const metadata = { title: 'Libreria esercizi' };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ nuovo?: string }>;
}) {
  const params = await searchParams;
  return <ExerciseLibrary startAdding={params.nuovo === '1'} />;
}
