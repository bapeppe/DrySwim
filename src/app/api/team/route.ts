import { json } from '@/lib/server/http';
export function POST() {
  return json({ error: 'Lo spazio della squadra è già condiviso. Non servono inviti.' }, 410);
}
