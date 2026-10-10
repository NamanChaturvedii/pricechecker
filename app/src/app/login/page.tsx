'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Leaf, Lock, User, ArrowRight, Loader2 } from 'lucide-react';
import { api } from '@/lib/client';

export default function LoginPage() {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [isDefault, setIsDefault] = useState(false);

  useEffect(() => {
    api<{ defaultPassword: boolean }>('/api/auth/login').then((r) => setIsDefault(r.defaultPassword)).catch(() => {});
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api('/api/auth/login', { method: 'POST', json: { username, password } });
      location.href = '/';
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden px-4">
      {/* floating produce orbs */}
      {['🥕', '🍅', '🥦', '🧅', '🍌', '🥒'].map((e, i) => (
        <motion.div
          key={e}
          className="pointer-events-none absolute select-none text-4xl opacity-20"
          style={{ left: `${10 + i * 15}%`, top: `${15 + ((i * 37) % 70)}%` }}
          animate={{ y: [0, -24, 0], rotate: [0, 8, -6, 0] }}
          transition={{ duration: 6 + i, repeat: Infinity, ease: 'easeInOut' }}
        >
          {e}
        </motion.div>
      ))}

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="card relative w-full max-w-sm p-8 shadow-2xl shadow-black/40 backdrop-blur"
      >
        <motion.div
          initial={{ scale: 0, rotate: -30 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 260, damping: 18 }}
          className="mx-auto mb-5 grid size-14 place-items-center rounded-2xl bg-emerald-400/15 text-emerald-300 ring-1 ring-emerald-400/30"
        >
          <Leaf className="size-7" />
        </motion.div>
        <h1 className="text-center text-2xl font-semibold tracking-tight">Price Checker</h1>
        <p className="mt-1 text-center text-sm text-ink-2">Daily vegetable prices from Zepto, Blinkit, Amazon Fresh & Flipkart</p>

        <form onSubmit={submit} className="mt-7 space-y-3">
          <label className="flex items-center gap-3 rounded-xl border border-line bg-surface-2 px-3.5 py-3 transition focus-within:border-emerald-400/50">
            <User className="size-4 text-ink-3" />
            <input className="w-full bg-transparent text-sm" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
          </label>
          <label className="flex items-center gap-3 rounded-xl border border-line bg-surface-2 px-3.5 py-3 transition focus-within:border-emerald-400/50">
            <Lock className="size-4 text-ink-3" />
            <input className="w-full bg-transparent text-sm" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" autoFocus />
          </label>
          {error && (
            <motion.p initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: [0, -6, 6, -3, 0] }} className="text-sm text-red-400">
              {error}
            </motion.p>
          )}
          <motion.button
            whileHover={{ scale: 1.015 }}
            whileTap={{ scale: 0.98 }}
            disabled={busy}
            className="group flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-400 py-3 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-300 disabled:opacity-60"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <>Sign in <ArrowRight className="size-4 transition group-hover:translate-x-0.5" /></>}
          </motion.button>
        </form>
        {isDefault && (
          <p className="mt-5 rounded-lg bg-amber-400/10 px-3 py-2 text-center text-xs text-amber-200/90">
            First login: <b>admin</b> / <b>admin123</b> — change it in Settings.
          </p>
        )}
      </motion.div>
    </main>
  );
}
