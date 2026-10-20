import { WorkoutBuilder } from '@/components/workout-builder';
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; add?: string; athlete?: string }>;
}) {
  const params = await searchParams;
  return (
    <WorkoutBuilder
      key={`${params.edit}-${params.add}-${params.athlete}`}
      editId={params.edit}
      addId={params.add}
      athleteId={params.athlete}
    />
  );
}
