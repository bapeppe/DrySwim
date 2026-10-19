import { AthleteDetail } from '@/components/roster';
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AthleteDetail id={id} />;
}
