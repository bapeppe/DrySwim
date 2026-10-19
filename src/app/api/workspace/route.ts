import { endpoint, json } from '@/lib/server/http';
import { readWorkspace } from '@/lib/server/workspace';
export const dynamic = 'force-dynamic';
export async function GET() {
  return endpoint(async () => json(await readWorkspace()));
}
