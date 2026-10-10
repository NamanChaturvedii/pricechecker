import { requireUser } from '@/lib/auth';
import { listRuns } from '@/lib/data';

// ?full=1 returns complete runs (used for trend charts); otherwise lightweight summaries
export async function GET(req: Request) {
  const user = await requireUser();
  if (user instanceof Response) return user;
  const url = new URL(req.url);
  const limit = Number(url.searchParams.get('limit') || 60);
  const runs = listRuns().slice(0, limit);
  if (url.searchParams.get('full')) return Response.json(runs);
  return Response.json(
    runs.map((r) => {
      const all = Object.values(r.results).flatMap((x) => Object.values(x));
      return {
        id: r.id,
        trigger: r.trigger,
        startedAt: r.startedAt,
        finishedAt: r.finishedAt,
        pincode: r.pincode,
        sites: r.sites,
        itemCount: r.items.length,
        found: all.filter((x) => x?.status === 'ok').length,
        total: all.length,
        report: !!r.report,
      };
    }),
  );
}
