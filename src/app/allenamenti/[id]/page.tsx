import { WorkoutDetail } from '@/components/workouts-view';
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <WorkoutDetail id={id} />;
}
