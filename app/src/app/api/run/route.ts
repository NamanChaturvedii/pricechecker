import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { requireUser } from '@/lib/auth';
import { APP_DIR, DATA_DIR, getStatus } from '@/lib/data';

export async function POST(req: Request) {
  const user = await requireUser();
  if (user instanceof Response) return user;
  if (getStatus().running) return Response.json({ error: 'A price check is already running' }, { status: 409 });
  const { sites, items } = await req.json().catch(() => ({}));
  const args = [path.join(APP_DIR, 'worker', 'run.mjs'), '--trigger', 'manual'];
  if (Array.isArray(sites) && sites.length) args.push('--sites', sites.join(','));
  if (Array.isArray(items) && items.length) args.push('--items', items.join(','));
  const out = fs.openSync(path.join(DATA_DIR, 'worker.log'), 'a');
  const child = spawn(process.execPath, args, { cwd: APP_DIR, detached: true, stdio: ['ignore', out, out], windowsHide: true, env: { ...process.env, PRICE_CHECKER_DATA: DATA_DIR } });
  child.unref();
  return Response.json({ ok: true });
}
