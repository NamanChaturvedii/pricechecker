import path from 'node:path';
import { requireUser } from '@/lib/auth';
import { DATA_DIR, writeJson, getUpdateState } from '@/lib/data';

// The launcher (scripts/launcher.mjs) watches for this request file and performs the check/update.
export async function POST(req: Request) {
  const user = await requireUser();
  if (user instanceof Response) return user;
  const { action = 'check' } = await req.json().catch(() => ({}));
  writeJson(path.join(DATA_DIR, 'update-request.json'), { action: action === 'install' ? 'install' : 'check', at: new Date().toISOString() });
  return Response.json({ ok: true, state: getUpdateState() });
}
