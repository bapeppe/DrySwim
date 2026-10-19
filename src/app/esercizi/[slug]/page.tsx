import { notFound } from 'next/navigation';
import { exercises } from '@/data/exercises';
import { ExerciseDetail } from '@/components/exercise-detail';
export function generateStaticParams() {
  return exercises.map((e) => ({ slug: e.slug }));
}
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const exercise = exercises.find((e) => e.slug === slug);
  if (!exercise) notFound();
  return <ExerciseDetail exercise={exercise} />;
}
