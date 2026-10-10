'use client';
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Download, Eye, History as HistoryIcon, X } from 'lucide-react';
import ComparisonTable from '@/components/ComparisonTable';
import { Button, Empty, PageHeader, SiteDot, stagger } from '@/components/ui';
import { api, fmtDate, useApi, type Run, type SiteKey } from '@/lib/client';

type Summary = { id: string; trigger: string; startedAt: string; finishedAt: string | null; pincode: string; sites: SiteKey[]; itemCount: number; found: number; total: number; report: boolean };

export default function HistoryPage() {
  const { data } = useApi<Summary[]>('/api/runs?limit=200');
  const [view, setView] = useState<Run | null>(null);

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="History" subtitle="Every price check, with its Excel report" />
      {data && !data.length && <Empty icon={<HistoryIcon className="size-6" />} title="No checks yet" />}
      <motion.div variants={stagger.container} initial="hidden" animate="show" className="card divide-y divide-line overflow-hidden">
        {data?.map((r) => {
          const mins = r.finishedAt ? Math.max(1, Math.round((+new Date(r.finishedAt) - +new Date(r.startedAt)) / 60000)) : null;
          const pct = r.total ? Math.round((r.found / r.total) * 100) : 0;
          return (
            <motion.div key={r.id} variants={stagger.item} className="flex flex-wrap items-center gap-4 px-5 py-4 transition hover:bg-white/[0.02]">
              <div className="min-w-48 flex-1">
                <div className="font-medium">{fmtDate(r.startedAt)}</div>
                <div className="text-xs text-ink-3">
                  {r.trigger === 'schedule' ? 'Automatic' : 'Manual'} · pincode {r.pincode} · {mins ? `${mins} min` : 'incomplete'}
                </div>
              </div>
              <div className="flex items-center gap-1">
                {r.sites.map((s) => (
                  <SiteDot key={s} site={s} size={8} />
                ))}
              </div>
              <div className="w-40">
                <div className="flex justify-between text-xs text-ink-3">
                  <span>{r.itemCount} items</span>
                  <span className="tabular">{pct}% priced</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/5">
                  <div className="h-full rounded-full bg-emerald-400/70" style={{ width: `${pct}%` }} />
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={async () => setView(await api<Run>(`/api/runs/${r.id}`))}>
                  <Eye className="size-4" /> View
                </Button>
                {r.report && (
                  <a href={`/api/runs/${r.id}/excel`}>
                    <Button>
                      <Download className="size-4" /> Excel
                    </Button>
                  </a>
                )}
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      <AnimatePresence>
        {view && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 overflow-y-auto bg-black/60 p-4 backdrop-blur-sm md:p-10" onClick={() => setView(null)}>
            <motion.div initial={{ y: 30, scale: 0.98 }} animate={{ y: 0, scale: 1 }} exit={{ y: 20, opacity: 0 }} className="mx-auto max-w-6xl" onClick={(e) => e.stopPropagation()}>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-medium">Check from {fmtDate(view.startedAt)}</h2>
                <Button onClick={() => setView(null)}>
                  <X className="size-4" /> Close
                </Button>
              </div>
              <ComparisonTable run={view} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
