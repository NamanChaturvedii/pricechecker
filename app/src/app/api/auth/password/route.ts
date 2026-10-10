import { requireUser, checkPassword, setPassword } from '@/lib/auth';

export async function POST(req: Request) {
  const user = await requireUser();
  if (user instanceof Response) return user;
  const { current = '', next = '' } = await req.json().catch(() => ({}));
  if (!checkPassword(user, String(current))) return Response.json({ error: 'Current password is wrong' }, { status: 400 });
  if (String(next).length < 6) return Response.json({ error: 'New password must be at least 6 characters' }, { status: 400 });
  setPassword(user, String(next));
  return Response.json({ ok: true });
}
