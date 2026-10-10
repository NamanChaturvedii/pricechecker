'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { LayoutDashboard, History, Carrot, Settings, LogOut, Leaf, Download } from 'lucide-react';
import { api, useApi, type StatusResp } from '@/lib/client';

const NAV = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/history', label: 'History', icon: History },
  { href: '/items', label: 'Vegetables', icon: Carrot },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { data } = useApi<StatusResp>('/api/status', 15000);

  async function logout() {
    await api('/api/auth/logout', { method: 'POST' }).catch(() => {});
    location.href = '/login';
  }

  return (
    <div className="relative flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-line bg-surface-1/60 px-4 py-6 backdrop-blur md:flex">
        <div className="mb-8 flex items-center gap-2.5 px-2">
          <div className="grid size-9 place-items-center rounded-xl bg-emerald-400/15 text-emerald-300 ring-1 ring-emerald-400/30">
            <Leaf className="size-5" />
          </div>
          <div>
            <div className="text-sm font-semibold leading-tight">Price Checker</div>
            <div className="text-[11px] text-ink-3">v{data?.version ?? '…'}</div>
          </div>
        </div>
        <nav className="space-y-1">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = href === '/' ? path === '/' : path.startsWith(href);
            return (
              <Link key={href} href={href} className="relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-ink-2 transition hover:text-ink">
                {active && <motion.span layoutId="nav-pill" className="absolute inset-0 rounded-xl bg-white/[0.06] ring-1 ring-white/10" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
                <Icon className={`relative size-4 ${active ? 'text-emerald-300' : ''}`} />
                <span className={`relative ${active ? 'text-ink' : ''}`}>{label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto space-y-3">
          {data?.update?.available && (
            <Link href="/settings" className="flex items-center gap-2 rounded-xl bg-sky-400/10 px-3 py-2.5 text-xs text-sky-200 ring-1 ring-sky-400/20">
              <Download className="size-4" /> Update v{data.update.available} available
            </Link>
          )}
          <div className="flex items-center justify-between rounded-xl px-3 py-2 text-xs text-ink-3">
            <span>Signed in as {data?.user ?? '…'}</span>
            <button onClick={logout} title="Sign out" className="rounded-lg p-1.5 transition hover:bg-white/5 hover:text-ink">
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* mobile top nav */}
      <div className="fixed inset-x-0 bottom-0 z-30 flex justify-around border-t border-line bg-surface-1/90 py-2 backdrop-blur md:hidden">
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className={`flex flex-col items-center gap-0.5 px-3 text-[11px] ${(href === '/' ? path === '/' : path.startsWith(href)) ? 'text-emerald-300' : 'text-ink-3'}`}>
            <Icon className="size-5" />
            {label}
          </Link>
        ))}
      </div>

      <main className="relative min-w-0 flex-1 px-4 pb-24 pt-6 md:px-8 md:pb-10">
        <AnimatePresence mode="wait">
          <motion.div key={path} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
