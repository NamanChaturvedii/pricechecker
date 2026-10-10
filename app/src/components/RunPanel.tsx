'use client';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { useEffect, useRef } from 'react';
import type { StatusResp } from '@/lib/client';

export default function RunPanel({ status }: { status: StatusResp['status'] | undefined }) {
  const logRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' });
  }, [status?.log?.length]);
  const running = !!status?.running;
  const pct = status?.progress?.total ? Math.round((status.progress.done / status.progress.total) * 100) : 0;

  return (
    <AnimatePresence>
      {running && (
        <motion.section
          initial={{ opacity: 0, height: 0, marginBottom: 0 }}
          animate={{ opacity: 1, height: 'auto', marginBottom: 24 }}
          exit={{ opacity: 0, height: 0, marginBottom: 0 }}
          className="card overflow-hidden"
        >
          <div className="p-5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="relative grid size-9 shrink-0 place-items-center rounded-xl bg-emerald-400/15 text-emerald-300">
                  <Loader2 className="size-4 animate-spin" />
                  <span className="absolute inset-0 animate-ping rounded-xl bg-emerald-400/10" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium">Checking prices…</div>
                  <div className="truncate text-xs text-ink-2">{status?.current}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="tabular text-xl font-semibold">{pct}%</div>
                <div className="tabular text-xs text-ink-3">
                  {status?.progress?.done ?? 0} / {status?.progress?.total ?? 0}
                </div>
              </div>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/5">
              <motion.div className="relative h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-300" animate={{ width: `${pct}%` }} transition={{ ease: 'easeOut', duration: 0.6 }}>
                <motion.span className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,.35),transparent)]" animate={{ x: ['-100%', '100%'] }} transition={{ repeat: Infinity, duration: 1.4, ease: 'linear' }} />
              </motion.div>
            </div>
            <div ref={logRef} className="mt-4 max-h-36 overflow-y-auto rounded-lg bg-black/30 p-3 font-mono text-[11px] leading-5 text-ink-2">
              {status?.log?.map((l, i) => (
                <motion.div key={`${i}-${l}`} initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }}>
                  {l}
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>
      )}
    </AnimatePresence>
  );
}
