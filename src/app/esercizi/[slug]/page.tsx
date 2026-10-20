import { ExerciseResolver } from '@/components/exercise-detail';
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <ExerciseResolver slug={slug} />;
}
