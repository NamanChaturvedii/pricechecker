import { cookies } from 'next/headers';
import { checkPassword, signSession, sessionCookie, isDefaultPassword } from '@/lib/auth';

export async function GET() {
  return Response.json({ defaultPassword: isDefaultPassword() });
}

export async function POST(req: Request) {
  const { username = '', password = '' } = await req.json().catch(() => ({}));
  if (!checkPassword(String(username), String(password))) {
    await new Promise((r) => setTimeout(r, 600)); // slow down guessing
    return Response.json({ error: 'Wrong username or password' }, { status: 401 });
  }
  (await cookies()).set(sessionCookie(signSession(String(username).trim().toLowerCase())));
  return Response.json({ ok: true });
}
