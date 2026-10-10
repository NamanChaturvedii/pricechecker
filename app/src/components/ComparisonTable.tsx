'use client';
import { Fragment, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, ExternalLink, MapPin, Search, Trophy } from 'lucide-react';
import { SITE_META, rupee, type Run, type SiteKey, type SiteResult } from '@/lib/client';
import { SiteDot } from './ui';

function cheapest(res: Partial<Record<SiteKey, SiteResult>> | undefined, sites: SiteKey[]) {
  const ok = sites.filter((s) => res?.[s]?.status === 'ok').map((s) => ({ s, p: res![s]!.price! }));
  if (!ok.length) return null;
  const min = Math.min(...ok.map((x) => x.p));
  return { min, sites: ok.filter((x) => x.p === min).map((x) => x.s) };
}

function Cell({ r, isMin }: { r?: SiteResult; isMin: boolean }) {
  if (!r) return <span className="text-ink-3">—</span>;
  if (r.status !== 'ok')
    return (
      <span className="text-xs italic text-ink-3" title={r.error || r.alternatives?.join('\n')}>
        {STATUS_LABEL[r.status] ?? 'Not found'}
      </span>
    );
  return (
    <span className="inline-flex flex-col items-end gap-0.5">
      <span className={`tabular inline-flex items-center gap-1 rounded-lg px-2 py-0.5 font-medium ${isMin ? 'bg-emerald-400/15 text-emerald-200 ring-1 ring-emerald-400/30' : ''}`}>
        {isMin && <Trophy className="size-3" />}
        {rupee(r.price)}
        {r.approx && <span className="text-[10px] text-ink-3" title={`Converted from ${r.packText} at ${rupee(r.packPrice)}`}>≈</span>}
      </span>
      {(r.fallback || r.locationUnverified) && (
        <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-300/80" title={r.fallback ? `Not delivered to your pincode — price from ${r.fromPincode}` : 'Delivery location could not be confirmed'}>
          <MapPin className="size-2.5" />
          {r.fallback ? r.fromPincode : 'unconfirmed'}
        </span>
      )}
    </span>
  );
}

export default function ComparisonTable({ run }: { run: Run }) {
  const [open, setOpen] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [tab, setTab] = useState<'compare' | 'details'>('compare');
  const sites = run.sites;
  const rows = useMemo(() => run.items.filter((i) => i.name.toLowerCase().includes(q.toLowerCase())), [run, q]);

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <h2 className="font-medium">Price results</h2>
            <p className="text-xs text-ink-3">{tab === 'compare' ? 'Prices converted to the quantity shown · click a row for matched products' : 'Every item on every site — exactly what was matched'}</p>
          </div>
          <div className="relative flex rounded-xl bg-white/[0.04] p-1 text-xs ring-1 ring-white/10">
            {(['compare', 'details'] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)} className={`relative rounded-lg px-3 py-1.5 transition ${tab === t ? 'text-ink' : 'text-ink-3 hover:text-ink-2'}`}>
                {tab === t && <motion.span layoutId="tab-pill" className="absolute inset-0 rounded-lg bg-white/10" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
                <span className="relative">{t === 'compare' ? 'Comparison' : 'Full details'}</span>
              </button>
            ))}
          </div>
        </div>
        <label className="flex items-center gap-2 rounded-xl border border-line bg-surface-2 px-3 py-2 text-sm">
          <Search className="size-4 text-ink-3" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter vegetables" className="w-40 bg-transparent" />
        </label>
      </div>
      {tab === 'details' ? (
        <DetailsTable run={run} rows={rows} />
      ) : (
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-ink-3">
              <th className="px-5 py-3 font-medium">Item</th>
              <th className="px-3 py-3 font-medium">Qty</th>
              {sites.map((s) => (
                <th key={s} className="px-3 py-3 text-right font-medium">
                  <span className="inline-flex items-center gap-1.5">
                    <SiteDot site={s} size={8} />
                    {SITE_META[s].label}
                  </span>
                </th>
              ))}
              <th className="px-5 py-3 text-right font-medium">Best</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((item, idx) => {
              const res = run.results[item.id];
              const c = cheapest(res, sites);
              const isOpen = open === item.id;
              return (
                <Fragment key={item.id}>
                  <motion.tr
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(idx * 0.025, 0.6) }}
                    onClick={() => setOpen(isOpen ? null : item.id)}
                    className={`cursor-pointer border-t border-line transition hover:bg-white/[0.025] ${isOpen ? 'bg-white/[0.03]' : ''}`}
                  >
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center gap-2 font-medium">
                        <ChevronDown className={`size-3.5 text-ink-3 transition ${isOpen ? 'rotate-180' : ''}`} />
                        {item.name}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-ink-2">
                      {item.qty} {item.unit}
                    </td>
                    {sites.map((s) => (
                      <td key={s} className="px-3 py-3 text-right">
                        <Cell r={res?.[s]} isMin={!!c && c.sites.includes(s)} />
                      </td>
                    ))}
                    <td className="px-5 py-3 text-right">
                      {c ? (
                        <span className="inline-flex items-center gap-1.5 text-xs text-ink-2">
                          {c.sites.map((s) => (
                            <SiteDot key={s} site={s} size={8} />
                          ))}
                          {c.sites.length === 1 ? SITE_META[c.sites[0]].label : `${c.sites.length} sites`}
                        </span>
                      ) : (
                        <span className="text-ink-3">—</span>
                      )}
                    </td>
                  </motion.tr>
                  <AnimatePresence>
                    {isOpen && (
                      <tr>
                        <td colSpan={sites.length + 3} className="p-0">
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                            <div className="grid gap-3 bg-black/20 px-5 py-4 sm:grid-cols-2 xl:grid-cols-4">
                              {sites.map((s) => {
                                const r = res?.[s];
                                return (
                                  <div key={s} className="rounded-xl border border-line bg-surface-1 p-3 text-xs">
                                    <div className="mb-2 flex items-center gap-1.5 font-medium text-ink">
                                      <SiteDot site={s} size={8} />
                                      {SITE_META[s].label}
                                    </div>
                                    {r?.status === 'ok' ? (
                                      <div className="space-y-1 text-ink-2">
                                        <div className="text-ink">{r.product}</div>
                                        <div>
                                          Pack: {r.packText || '—'} · {rupee(r.packPrice)}
                                          {r.mrp && r.mrp > (r.packPrice ?? 0) ? <span className="ml-1 text-ink-3 line-through">{rupee(r.mrp)}</span> : null}
                                        </div>
                                        <div>
                                          For {item.qty} {item.unit}: <b className="text-ink">{rupee(r.price)}</b> {r.approx && '(approx.)'}
                                        </div>
                                        {r.fallback && <div className="text-amber-300/80">Not delivered to {run.pincode} — price from {r.fromPincode}</div>}
                                        {r.url && (
                                          <a href={r.url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1 text-sky-300 hover:underline">
                                            Open on site <ExternalLink className="size-3" />
                                          </a>
                                        )}
                                      </div>
                                    ) : (
                                      <div className="text-ink-3">
                                        {r?.error || (r?.status === 'out_of_stock' ? 'Out of stock' : 'No matching product found')}
                                        {r?.alternatives?.length ? <div className="mt-1 text-[11px]">Seen: {r.alternatives.slice(0, 3).join(' · ')}</div> : null}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </motion.div>
                        </td>
                      </tr>
                    )}
                  </AnimatePresence>
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      )}
    </div>
  );
}

const STATUS_LABEL: Record<string, string> = { ok: 'Found', not_found: 'Not found', not_delivered: 'Not delivered', out_of_stock: 'Out of stock', error: 'Error' };

function DetailsTable({ run, rows }: { run: Run; rows: Run['items'] }) {
  return (
    <div className="max-h-[70vh] overflow-auto">
      <table className="w-full min-w-[1100px] text-sm">
        <thead className="sticky top-0 z-10 bg-surface-1">
          <tr className="text-left text-xs uppercase tracking-wide text-ink-3">
            {['Item', 'Site', 'Status', 'Matched product', 'Pack size', 'Pack price', 'MRP', 'Price for qty', 'Price from', ''].map((h, i) => (
              <th key={i} className={`px-3 py-3 font-medium first:pl-5 ${i >= 5 && i <= 7 ? 'text-right' : ''}`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((item, idx) => {
            const res = run.results[item.id] || {};
            const c = cheapest(res, run.sites);
            return run.sites.map((s, k) => {
              const r = res[s];
              const ok = r?.status === 'ok';
              return (
                <motion.tr key={`${item.id}-${s}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(idx * 0.02, 0.5) }} className={`${k === 0 ? 'border-t border-line' : ''} hover:bg-white/[0.025]`}>
                  <td className="py-2 pl-5 pr-3 align-top font-medium">{k === 0 ? `${item.name} · ${item.qty} ${item.unit}` : ''}</td>
                  <td className="px-3 py-2">
                    <span className="inline-flex items-center gap-1.5 text-ink-2">
                      <SiteDot site={s} size={8} />
                      {SITE_META[s].label}
                    </span>
                  </td>
                  <td className={`px-3 py-2 text-xs ${ok ? 'text-emerald-300' : 'text-ink-3'}`}>{r ? STATUS_LABEL[r.status] : '—'}</td>
                  <td className="max-w-72 px-3 py-2 text-ink-2" title={r?.error || r?.alternatives?.join('\n')}>
                    <span className="line-clamp-2">{r?.product || r?.error || (r?.alternatives?.length ? `Seen: ${r.alternatives.slice(0, 2).join(' · ')}` : '—')}</span>
                  </td>
                  <td className="px-3 py-2 text-ink-2">{r?.packText || '—'}</td>
                  <td className="tabular px-3 py-2 text-right">{ok ? rupee(r.packPrice) : '—'}</td>
                  <td className="tabular px-3 py-2 text-right text-ink-3">{ok && r.mrp ? rupee(r.mrp) : '—'}</td>
                  <td className="px-3 py-2 text-right">
                    {ok ? (
                      <span className={`tabular rounded-lg px-2 py-0.5 font-medium ${c?.sites.includes(s) ? 'bg-emerald-400/15 text-emerald-200 ring-1 ring-emerald-400/30' : ''}`}>
                        {rupee(r.price)}
                        {r.approx ? ' ≈' : ''}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs">{ok ? <span className={r.fallback || r.locationUnverified ? 'text-amber-300/80' : 'text-ink-3'}>{r.fallback ? r.fromPincode : run.pincode}{r.locationUnverified ? ' (unconfirmed)' : ''}</span> : ''}</td>
                  <td className="px-3 py-2 pr-5">
                    {r?.url && (
                      <a href={r.url} target="_blank" rel="noreferrer" className="text-sky-300 hover:text-sky-200" title="Open on site">
                        <ExternalLink className="size-3.5" />
                      </a>
                    )}
                  </td>
                </motion.tr>
              );
            });
          })}
        </tbody>
      </table>
    </div>
  );
}
