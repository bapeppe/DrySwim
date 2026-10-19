import { WorkoutPlayer } from '@/components/workout-player';
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <WorkoutPlayer id={id} />;
}
