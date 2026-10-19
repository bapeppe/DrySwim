import { Account } from '@/components/account';
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ invito?: string; reset?: string; errore?: string }>;
}) {
  const params = await searchParams;
  return (
    <Account
      invitation={params.invito}
      reset={params.reset === '1'}
      confirmationError={!!params.errore}
    />
  );
}
