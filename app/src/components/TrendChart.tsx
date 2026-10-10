'use client';
import { useMemo, useState } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { SITE_META, SITE_ORDER, rupee, type Run, type SiteKey } from '@/lib/client';
import { SiteDot } from './ui';

type Point = { date: string } & Partial<Record<SiteKey, number>>;

function TipBox({ active, payload, label }: { active?: boolean; payload?: { dataKey: SiteKey; value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-line bg-surface-2/95 px-3 py-2 text-xs shadow-xl backdrop-blur">
      <div className="mb-1 font-medium text-ink">{label}</div>
      {[...payload]
        .sort((a, b) => a.value - b.value)
        .map((p) => (
          <div key={p.dataKey} className="flex items-center justify-between gap-4 text-ink-2">
            <span className="inline-flex items-center gap-1.5">
              <SiteDot site={p.dataKey} size={8} />
              {SITE_META[p.dataKey].label}
            </span>
            <span className="tabular text-ink">{rupee(p.value)}</span>
          </div>
        ))}
    </div>
  );
}

export default function TrendChart({ runs }: { runs: Run[] }) {
  const items = runs[0]?.items ?? [];
  const [itemId, setItemId] = useState(items[0]?.id ?? '');
  const item = items.find((i) => i.id === itemId) ?? items[0];

  const data: Point[] = useMemo(() => {
    const day = (r: Run) => new Date(r.startedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    const sameDay = new Set(runs.map(day)).size < runs.length; // several checks on one day → show the time too
    return [...runs]
        .reverse()
        .map((r) => {
          const p: Point = { date: sameDay ? `${day(r)}, ${new Date(r.startedAt).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}` : day(r) };
          for (const s of SITE_ORDER) {
            const x = r.results[item?.id ?? '']?.[s];
            if (x?.status === 'ok' && x.price != null) p[s] = x.price;
          }
          return p;
        });
  }, [runs, item]);
  const present = SITE_ORDER.filter((s) => data.some((d) => d[s] != null));

  return (
    <div className="card p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-medium">Price trend</h2>
          <p className="text-xs text-ink-3">
            {item ? `${item.name} · per ${item.qty} ${item.unit}` : ''} · last {runs.length} checks
          </p>
        </div>
        <select value={item?.id} onChange={(e) => setItemId(e.target.value)} className="rounded-xl border border-line bg-surface-2 px-3 py-2 text-sm">
          {items.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name}
            </option>
          ))}
        </select>
      </div>
      {/* legend: identity never by colour alone */}
      <div className="mb-3 flex flex-wrap gap-4 text-xs text-ink-2">
        {present.map((s) => (
          <span key={s} className="inline-flex items-center gap-1.5">
            <span className="h-0.5 w-4 rounded" style={{ background: SITE_META[s].color }} />
            {SITE_META[s].label}
          </span>
        ))}
      </div>
      <div className="h-64">
        {data.length < 2 ? (
          <div className="grid h-full place-items-center text-sm text-ink-3">The trend appears after the second daily check.</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={24} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} width={48} tickFormatter={(v) => `₹${v}`} />
              <Tooltip content={<TipBox />} cursor={{ stroke: 'rgba(255,255,255,0.2)', strokeWidth: 1 }} />
              {present.map((s) => (
                <Line
                  key={s}
                  type="monotone"
                  dataKey={s}
                  stroke={SITE_META[s].color}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 5, strokeWidth: 2, stroke: 'var(--surface-1)' }}
                  connectNulls
                  animationDuration={900}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
