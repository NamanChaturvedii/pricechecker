import { requireUser } from '@/lib/auth';
import { getItems, saveItems, defaultItems, type Item } from '@/lib/data';

const BASIC_AVOID = ['chips', 'powder', 'paste', 'pickle', 'sauce', 'juice', 'frozen', 'organic', 'snack', 'namkeen'];

export async function GET() {
  const user = await requireUser();
  if (user instanceof Response) return user;
  return Response.json(getItems());
}

export async function PUT(req: Request) {
  const user = await requireUser();
  if (user instanceof Response) return user;
  const body = await req.json().catch(() => null);
  if (body?.reset) {
    saveItems(defaultItems());
    return Response.json(getItems());
  }
  if (!Array.isArray(body)) return Response.json({ error: 'Expected a list of items' }, { status: 400 });
  const clean: Item[] = body
    .filter((i) => i?.name && i?.qty > 0 && ['kg', 'g', 'pc', 'bunch'].includes(i.unit))
    .map((i) => {
      const name = String(i.name).trim();
      // new items get sensible matching words from their name: last word must match, others are preferred
      const words = name.toLowerCase().replace(/\(.*?\)/g, '').split(/[^a-z]+/).filter((w: string) => w.length > 2);
      return {
        id: String(i.id || name.toLowerCase().replace(/[^a-z0-9]+/g, '-')).replace(/^-|-$/g, ''),
        name,
        qty: Number(i.qty),
        unit: i.unit,
        query: String(i.query || name).trim(),
        must: Array.isArray(i.must) && i.must.length ? i.must : words.slice(-1),
        prefer: Array.isArray(i.prefer) ? i.prefer : words.slice(0, -1),
        avoid: Array.isArray(i.avoid) ? i.avoid : BASIC_AVOID,
        approxG: Number(i.approxG) || undefined,
      };
    });
  saveItems(clean);
  return Response.json(getItems());
}
