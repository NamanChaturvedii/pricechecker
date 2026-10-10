'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { CalendarClock, Check, Clock, Download, MapPin, Pencil, Play, ShoppingBasket, Sparkles, Trophy, X } from 'lucide-react';
import ComparisonTable from '@/components/ComparisonTable';
import RunPanel from '@/components/RunPanel';
import TrendChart from '@/components/TrendChart';
import { AnimatedNumber, Button, Empty, PageHeader, SiteDot, stagger } from '@/components/ui';
import { api, fmtDate, timeAgo, useApi, SITE_META, type Run, type SiteKey, type StatusResp } from '@/lib/client';

function PincodeChip({ pincode, onSaved }: { pincode?: string; onSaved: () => void }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState('');
  const [err, setErr] = useState('');
  async function save() {
    if (!/^\d{6}$/.test(val)) return setErr('6 digits');
    try {
      await api('/api/settings', { method: 'PUT', json: { pincode: val } });
      setEditing(false);
      onSaved();
    } catch (e) {
      setErr((e as Error).message);
    }
  }
  if (!editing)
    return (
      <button onClick={() => (setVal(pincode ?? ''), setErr(''), setEditing(true))} title="Change pincode" className="inline-flex items-center gap-1 rounded-lg px-1.5 py-0.5 transition hover:bg-white/5 hover:text-ink">
        <MapPin className="size-3.5" /> Pincode {pincode ?? '…'} <Pencil className="size-3 opacity-60" />
      </button>
    );
  return (
    <motion.span initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="inline-flex items-center gap-1.5">
      <MapPin className="size-3.5" />
      <input autoFocus maxLength={6} value={val} onChange={(e) => setVal(e.target.value.replace(/\D/g, ''))} onKeyDown={(e) => (e.key === 'Enter' ? save() : e.key === 'Escape' && setEditing(false))} className="tabular w-20 rounded-lg border border-line bg-surface-2 px-2 py-0.5 text-ink" />
      <button onClick={save} className="rounded-lg bg-emerald-400/15 p-1 text-emerald-300 hover:bg-emerald-400/25"><Check className="size-3.5" /></button>
      <button onClick={() => setEditing(false)} className="rounded-lg p-1 hover:bg-white/5"><X className="size-3.5" /></button>
      {err && <span className="text-red-400">{err}</span>}
    </motion.span>
  );
}

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

export default function Dashboard() {
  const [polling, setPolling] = useState(4000);
  const { data: st, reload: reloadStatus } = useApi<StatusResp>('/api/status', polling);
  const { data: runs, reload: reloadRuns } = useApi<Run[]>('/api/runs?full=1&limit=30');
  const [err, setErr] = useState('');
  const running = !!st?.status.running;
  const wasRunning = useRef(false);

  // poll faster while a check runs; refresh results when it finishes
  useEffect(() => {
    setPolling(running ? 1500 : 6000);
    if (wasRunning.current && !running) reloadRuns();
    wasRunning.current = running;
  }, [running, reloadRuns]);

  const latest = runs?.[0];

  const stats = useMemo(() => {
    if (!latest) return null;
    const perSite = Object.fromEntries(latest.sites.map((s) => [s, { wins: 0, found: 0 }])) as Record<SiteKey, { wins: number; found: number }>;
    let basket = 0;
    let priced = 0;
    for (const item of latest.items) {
      const res = latest.results[item.id] || {};
      const ok = latest.sites.filter((s) => res[s]?.status === 'ok');
      ok.forEach((s) => perSite[s].found++);
      if (!ok.length) continue;
      priced++;
      const min = Math.min(...ok.map((s) => res[s]!.price!));
      basket += min;
      ok.filter((s) => res[s]!.price === min).forEach((s) => perSite[s].wins++);
    }
    return { perSite, basket, priced };
  }, [latest]);

  async function runNow() {
    setErr('');
    try {
      await api('/api/run', { method: 'POST' });
      setTimeout(reloadStatus, 800);
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title={`${greeting()} 👋`}
        subtitle={
          <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1">
            <PincodeChip pincode={st?.pincode} onSaved={reloadStatus} />
            <span>Last check {timeAgo(latest?.finishedAt)}</span>
          </span>
        }
      >
        {latest?.report && (
          <a href={`/api/runs/${latest.id}/excel`}>
            <Button>
              <Download className="size-4" /> Excel
            </Button>
          </a>
        )}
        <Button variant="primary" onClick={runNow} disabled={running}>
          <Play className="size-4" /> {running ? 'Running…' : 'Run check now'}
        </Button>
      </PageHeader>
      {err && <p className="mb-4 text-sm text-red-400">{err}</p>}

      <RunPanel status={st?.status} />

      {!runs ? (
        <div className="grid gap-4 md:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="card h-28 animate-pulse" />
          ))}
        </div>
      ) : !latest ? (
        <Empty icon={<Sparkles className="size-6" />} title="No price checks yet">
          Click <b>Run check now</b> to collect today&apos;s prices. It takes a few minutes; you can watch progress live. After that it runs automatically every day.
        </Empty>
      ) : (
        <>
          {/* KPI tiles */}
          <motion.div variants={stagger.container} initial="hidden" animate="show" className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              { icon: Clock, label: 'Last check', value: <span className="text-lg">{fmtDate(latest.finishedAt)}</span>, sub: latest.trigger === 'schedule' ? 'Automatic' : 'Manual' },
              { icon: CalendarClock, label: 'Next automatic check', value: <span className="text-lg">{st?.nextRun ? fmtDate(st.nextRun) : 'Off'}</span>, sub: 'Change time in Settings' },
              { icon: ShoppingBasket, label: 'Items priced', value: <AnimatedNumber value={stats?.priced ?? 0} />, sub: `of ${latest.items.length} vegetables` },
              { icon: Trophy, label: 'Cheapest basket', value: <AnimatedNumber value={Math.round(stats?.basket ?? 0)} prefix="₹" />, sub: 'Buying each item at its cheapest site' },
            ].map(({ icon: Icon, label, value, sub }) => (
              <motion.div key={label} variants={stagger.item} whileHover={{ y: -3 }} className="card p-4">
                <div className="flex items-center gap-2 text-xs text-ink-3">
                  <Icon className="size-3.5" />
                  {label}
                </div>
                <div className="mt-2 text-2xl font-semibold">{value}</div>
                <div className="mt-1 text-xs text-ink-3">{sub}</div>
              </motion.div>
            ))}
          </motion.div>

          {/* per-site tiles */}
          <motion.div variants={stagger.container} initial="hidden" animate="show" className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {latest.sites.map((s) => {
              const p = stats?.perSite[s];
              const pct = latest.items.length ? ((p?.found ?? 0) / latest.items.length) * 100 : 0;
              return (
                <motion.div key={s} variants={stagger.item} whileHover={{ y: -3 }} className="card relative overflow-hidden p-4">
                  <div className="absolute inset-x-0 top-0 h-0.5" style={{ background: SITE_META[s].color }} />
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <SiteDot site={s} />
                    {SITE_META[s].label}
                  </div>
                  <div className="mt-3 flex items-baseline gap-1.5">
                    <span className="text-2xl font-semibold">
                      <AnimatedNumber value={p?.wins ?? 0} />
                    </span>
                    <span className="text-xs text-ink-3">cheapest items</span>
                  </div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/5">
                    <motion.div className="h-full rounded-full" style={{ background: SITE_META[s].color }} initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }} />
                  </div>
                  <div className="mt-1.5 text-xs text-ink-3">
                    {p?.found ?? 0}/{latest.items.length} found{latest.siteErrors?.[s] ? ' · site error' : ''}
                  </div>
                </motion.div>
              );
            })}
          </motion.div>

          <div className="space-y-6">
            <ComparisonTable run={latest} />
            <TrendChart runs={runs} />
          </div>
        </>
      )}
    </div>
  );
}
