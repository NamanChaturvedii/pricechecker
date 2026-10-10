import fs from 'node:fs';
import { requireUser } from '@/lib/auth';
import { reportPath } from '@/lib/data';

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (user instanceof Response) return user;
  const { id } = await ctx.params;
  if (!/^[\w-]+$/.test(id) || !fs.existsSync(reportPath(id))) return new Response('Report not found', { status: 404 });
  return new Response(fs.readFileSync(reportPath(id)), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="vegetable-prices-${id.slice(0, 10)}.xlsx"`,
    },
  });
}
