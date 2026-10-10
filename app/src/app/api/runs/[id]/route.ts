import { requireUser } from '@/lib/auth';
import { getRun, listRuns } from '@/lib/data';

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (user instanceof Response) return user;
  const { id } = await ctx.params;
  const run = id === 'latest' ? listRuns()[0] : getRun(id);
  return run ? Response.json(run) : Response.json({ error: 'Not found' }, { status: 404 });
}
