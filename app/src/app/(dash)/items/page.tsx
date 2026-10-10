'use client';
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Plus, RotateCcw, Save, Trash2 } from 'lucide-react';
import { Button, PageHeader } from '@/components/ui';
import { api, useApi, type Item } from '@/lib/client';

const UNITS = ['kg', 'g', 'pc', 'bunch'];

export default function ItemsPage() {
  const { data, setData } = useApi<Item[]>('/api/items');
  const [items, setItems] = useState<Item[]>([]);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState('');
  useEffect(() => {
    if (data) setItems(data);
  }, [data]);

  const update = (i: number, patch: Partial<Item>) => setItems((xs) => xs.map((x, k) => (k === i ? { ...x, ...patch } : x)));

  async function save(body: unknown) {
    setErr('');
    try {
      const next = await api<Item[]>('/api/items', { method: 'PUT', json: body });
      setData(next);
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Vegetables" subtitle="What to check, the exact quantity to price, and the word typed into each site's search box">
        <Button onClick={() => confirm('Reset to the original 29-item list?') && save({ reset: true })}>
          <RotateCcw className="size-4" /> Reset list
        </Button>
        <Button variant="primary" onClick={() => save(items)}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.span key={String(saved)} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="inline-flex items-center gap-2">
              {saved ? <Check className="size-4" /> : <Save className="size-4" />} {saved ? 'Saved' : 'Save changes'}
            </motion.span>
          </AnimatePresence>
        </Button>
      </PageHeader>
      {err && <p className="mb-4 text-sm text-red-400">{err}</p>}

      <div className="card overflow-hidden">
        <div className="grid grid-cols-[1fr_90px_100px_1fr_40px] gap-3 border-b border-line px-5 py-3 text-xs uppercase tracking-wide text-ink-3">
          <span>Item</span>
          <span>Qty</span>
          <span>Unit</span>
          <span>Search for</span>
          <span />
        </div>
        <AnimatePresence initial={false}>
          {items.map((it, i) => (
            <motion.div key={it.id || i} layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="grid grid-cols-[1fr_90px_100px_1fr_40px] items-center gap-3 border-b border-line px-5 py-2">
              <input className="rounded-lg bg-transparent px-2 py-1.5 text-sm hover:bg-white/5 focus:bg-white/5" value={it.name} onChange={(e) => update(i, { name: e.target.value })} />
              <input type="number" min={0.1} step={0.1} className="tabular rounded-lg bg-transparent px-2 py-1.5 text-sm hover:bg-white/5 focus:bg-white/5" value={it.qty} onChange={(e) => update(i, { qty: Number(e.target.value) })} />
              <select className="rounded-lg bg-surface-2 px-2 py-1.5 text-sm" value={it.unit} onChange={(e) => update(i, { unit: e.target.value })}>
                {UNITS.map((u) => (
                  <option key={u}>{u}</option>
                ))}
              </select>
              <input className="rounded-lg bg-transparent px-2 py-1.5 text-sm text-ink-2 hover:bg-white/5 focus:bg-white/5" value={it.query} onChange={(e) => update(i, { query: e.target.value })} />
              <button onClick={() => setItems((xs) => xs.filter((_, k) => k !== i))} className="grid size-8 place-items-center rounded-lg text-ink-3 transition hover:bg-red-500/10 hover:text-red-300" title="Remove">
                <Trash2 className="size-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
        <button onClick={() => setItems((xs) => [...xs, { id: '', name: '', qty: 1, unit: 'kg', query: '' }])} className="flex w-full items-center gap-2 px-5 py-3 text-sm text-emerald-300 transition hover:bg-white/[0.03]">
          <Plus className="size-4" /> Add vegetable
        </button>
      </div>
      <p className="mt-3 text-xs text-ink-3">
        Tip: when a site sells in a different pack (e.g. 500 g, or 3 pcs), the price is converted to your quantity and marked ≈ in the dashboard.
      </p>
    </div>
  );
}
