import { requireUser } from '@/lib/auth';
import { getStatus, getSettings, getVersion, getUpdateState } from '@/lib/data';
import { nextRunAt } from '@/lib/schedule';

export async function GET() {
  const user = await requireUser();
  if (user instanceof Response) return user;
  const settings = getSettings();
  return Response.json({ status: getStatus(), user, nextRun: nextRunAt(settings), pincode: settings.pincode, version: getVersion(), update: getUpdateState() });
}
