'use client';
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowDown, ArrowUp, Check, Clock, Download, KeyRound, Loader2, MapPin, Plus, RefreshCw, Store, Trash2 } from 'lucide-react';
import { Button, PageHeader, SiteDot } from '@/components/ui';
import { api, fmtDate, useApi, SITE_META, SITE_ORDER, type SiteKey, type StatusResp } from '@/lib/client';

type Settings = {
  pincode: string;
  fallbackPincodes: string[];
  scheduleEnabled: boolean;
  scheduleTime: string;
  sites: Record<SiteKey, boolean>;
  showBrowser: boolean;
};

function Section({ icon: Icon, title, desc, children }: { icon: React.ElementType; title: string; desc?: string; children: React.ReactNode }) {
  return (
    <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card p-5">
      <div className="mb-4 flex items-start gap-3">
        <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/5 text-ink-2">
          <Icon className="size-4" />
        </div>
        <div>
          <h2 className="font-medium">{title}</h2>
          {desc && <p className="text-xs text-ink-3">{desc}</p>}
        </div>
      </div>
      {children}
    </motion.section>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!on)} className={`relative h-6 w-11 rounded-full transition ${on ? 'bg-emerald-400' : 'bg-white/10'}`}>
      <motion.span layout transition={{ type: 'spring', stiffness: 500, damping: 30 }} className={`absolute top-1 size-4 rounded-full bg-white shadow ${on ? 'right-1' : 'left-1'}`} />
    </button>
  );
}

function PincodeList({ s, save }: { s: Settings; save: (p: Partial<Settings>) => void }) {
  const [primary, setPrimary] = useState(s.pincode);
  const [adding, setAdding] = useState('');
  const [err, setErr] = useState('');
  const backups = s.fallbackPincodes ?? [];
  const setBackups = (list: string[]) => save({ fallbackPincodes: list });
  const move = (i: number, d: number) => {
    const l = [...backups];
    [l[i], l[i + d]] = [l[i + d], l[i]];
    setBackups(l);
  };
  function add() {
    if (!/^\d{6}$/.test(adding)) return setErr('Enter a 6-digit pincode');
    if (adding === s.pincode || backups.includes(adding)) return setErr('Already in the list');
    setErr('');
    setBackups([...backups, adding]);
    setAdding('');
  }
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="w-24 text-xs font-medium uppercase tracking-wide text-emerald-300">Primary</span>
        <input className={`${field} tabular w-32`} maxLength={6} value={primary} onChange={(e) => setPrimary(e.target.value.replace(/\D/g, ''))} onBlur={() => primary.length === 6 && primary !== s.pincode && save({ pincode: primary })} />
        <span className="text-xs text-ink-3">Every item is searched here first</span>
      </div>

      <div>
        <div className="mb-2 text-xs text-ink-2">Backup pincodes — items not found at the primary are searched at backup 1, then backup 2, … until found. Prices from a backup are marked in amber.</div>
        <div className="space-y-2">
          <AnimatePresence initial={false}>
            {backups.map((p, i) => (
              <motion.div key={p} layout initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 20 }} className="flex items-center gap-3 rounded-xl bg-white/[0.03] px-3 py-2">
                <span className="w-24 text-xs text-amber-300/80">Backup {i + 1}</span>
                <span className="tabular flex-1 text-sm">{p}</span>
                <button disabled={i === 0} onClick={() => move(i, -1)} title="Move up" className="rounded-lg p-1.5 text-ink-3 transition hover:bg-white/5 hover:text-ink disabled:opacity-30">
                  <ArrowUp className="size-3.5" />
                </button>
                <button disabled={i === backups.length - 1} onClick={() => move(i, 1)} title="Move down" className="rounded-lg p-1.5 text-ink-3 transition hover:bg-white/5 hover:text-ink disabled:opacity-30">
                  <ArrowDown className="size-3.5" />
                </button>
                <button onClick={() => setBackups(backups.filter((x) => x !== p))} title="Remove" className="rounded-lg p-1.5 text-ink-3 transition hover:bg-red-500/10 hover:text-red-300">
                  <Trash2 className="size-3.5" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input className={`${field} tabular w-32`} maxLength={6} placeholder="Pincode" value={adding} onChange={(e) => setAdding(e.target.value.replace(/\D/g, ''))} onKeyDown={(e) => e.key === 'Enter' && add()} />
          <Button onClick={add}>
            <Plus className="size-4" /> Add backup pincode
          </Button>
          {err && <span className="text-xs text-red-400">{err}</span>}
        </div>
      </div>
    </div>
  );
}

const field = 'rounded-xl border border-line bg-surface-2 px-3 py-2 text-sm focus:border-emerald-400/50';

export default function SettingsPage() {
  const { data } = useApi<Settings>('/api/settings');
  const { data: st, reload: reloadStatus } = useApi<StatusResp>('/api/status', 3000);
  const [s, setS] = useState<Settings | null>(null);
  const [msg, setMsg] = useState('');
  const [pw, setPw] = useState({ current: '', next: '' });
  const [pwMsg, setPwMsg] = useState('');
  useEffect(() => {
    if (data) setS(data);
  }, [data]);

  async function save(patch: Partial<Settings>) {
    if (!s) return;
    const next = { ...s, ...patch };
    setS(next);
    try {
      setS(await api<Settings>('/api/settings', { method: 'PUT', json: next }));
      setMsg('Saved');
    } catch (e) {
      setMsg((e as Error).message);
    }
    setTimeout(() => setMsg(''), 2000);
  }

  async function changePw(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api('/api/auth/password', { method: 'POST', json: pw });
      setPwMsg('Password changed');
      setPw({ current: '', next: '' });
    } catch (err) {
      setPwMsg((err as Error).message);
    }
  }

  async function update(action: 'check' | 'install') {
    await api('/api/update', { method: 'POST', json: { action } });
    setTimeout(reloadStatus, 1500);
  }

  if (!s) return <div className="card mx-auto h-64 max-w-3xl animate-pulse" />;
  const up = st?.update;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader title="Settings" subtitle={msg ? <span className="inline-flex items-center gap-1 text-emerald-300"><Check className="size-3.5" /> {msg}</span> : 'Changes save instantly'} />

      <Section icon={MapPin} title="Delivery pincodes" desc="Prices on these sites depend on the delivery pincode">
        <PincodeList s={s} save={save} />
      </Section>

      <Section icon={Clock} title="Daily automatic check" desc="Runs while this computer is on and the Price Checker is running">
        <div className="flex flex-wrap items-center gap-4">
          <Toggle on={s.scheduleEnabled} onChange={(v) => save({ scheduleEnabled: v })} />
          <input type="time" className={field} value={s.scheduleTime} onChange={(e) => save({ scheduleTime: e.target.value })} disabled={!s.scheduleEnabled} />
          {st?.nextRun && <span className="text-xs text-ink-3">Next: {fmtDate(st.nextRun)}</span>}
        </div>
      </Section>

      <Section icon={Store} title="Websites" desc="Which sites to check">
        <div className="grid gap-2 sm:grid-cols-2">
          {SITE_ORDER.map((k) => (
            <div key={k} className="flex items-center justify-between rounded-xl bg-white/[0.03] px-3 py-2.5 text-sm">
              <span className="inline-flex items-center gap-2">
                <SiteDot site={k} /> {SITE_META[k].label}
              </span>
              <Toggle on={s.sites[k] !== false} onChange={(v) => save({ sites: { ...s.sites, [k]: v } })} />
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between rounded-xl bg-white/[0.03] px-3 py-2.5 text-sm">
          <span>
            Show browser windows while checking <span className="text-xs text-ink-3">(for troubleshooting)</span>
          </span>
          <Toggle on={s.showBrowser} onChange={(v) => save({ showBrowser: v })} />
        </div>
      </Section>

      <Section icon={RefreshCw} title="Updates" desc={`Installed version ${st?.version ?? '…'}`}>
        <div className="flex flex-wrap items-center gap-3">
          {up?.available ? (
            <Button variant="primary" onClick={() => update('install')} disabled={up.state === 'installing'}>
              {up.state === 'installing' ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />} Install v{up.available} &amp; restart
            </Button>
          ) : (
            <Button onClick={() => update('check')} disabled={up?.state === 'checking'}>
              {up?.state === 'checking' ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />} Check for updates
            </Button>
          )}
          <span className="text-xs text-ink-3">
            {up?.message || (up?.checkedAt ? `Last checked ${fmtDate(up.checkedAt)}` : 'Updates are checked automatically every few hours')}
          </span>
        </div>
      </Section>

      <Section icon={KeyRound} title="Password">
        <form onSubmit={changePw} className="flex flex-wrap items-center gap-3">
          <input type="password" placeholder="Current password" className={field} value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} />
          <input type="password" placeholder="New password" className={field} value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} />
          <Button type="submit">Change</Button>
          {pwMsg && <span className="text-xs text-ink-2">{pwMsg}</span>}
        </form>
      </Section>
    </div>
  );
}
