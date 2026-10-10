import { requireUser } from '@/lib/auth';
import { getSettings, saveSettings, type Settings } from '@/lib/data';

export async function GET() {
  const user = await requireUser();
  if (user instanceof Response) return user;
  return Response.json(getSettings());
}

export async function PUT(req: Request) {
  const user = await requireUser();
  if (user instanceof Response) return user;
  const body = (await req.json().catch(() => ({}))) as Partial<Settings>;
  if (body.pincode && !/^\d{6}$/.test(body.pincode)) return Response.json({ error: 'Pincode must be 6 digits' }, { status: 400 });
  if (body.fallbackPincodes !== undefined) {
    if (!Array.isArray(body.fallbackPincodes) || body.fallbackPincodes.some((p) => !/^\d{6}$/.test(String(p)))) return Response.json({ error: 'Backup pincodes must be 6 digits each' }, { status: 400 });
    body.fallbackPincodes = [...new Set(body.fallbackPincodes.map(String))].filter((p) => p !== (body.pincode ?? getSettings().pincode));
  }
  if (body.scheduleTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(body.scheduleTime)) return Response.json({ error: 'Time must be HH:MM' }, { status: 400 });
  saveSettings(body);
  return Response.json(getSettings());
}
