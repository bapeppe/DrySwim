import { json } from '@/lib/server/http';
export function POST() {
  return json({ error: 'L’app non richiede account. Apri direttamente gli allenamenti.' }, 410);
}
