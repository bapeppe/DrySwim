import { WorkoutBuilder } from '@/components/workout-builder';
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; add?: string }>;
}) {
  const params = await searchParams;
  return (
    <WorkoutBuilder key={`${params.edit}-${params.add}`} editId={params.edit} addId={params.add} />
  );
}
