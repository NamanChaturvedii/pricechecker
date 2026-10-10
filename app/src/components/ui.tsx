'use client';
import { animate, motion, useMotionValue, useTransform } from 'framer-motion';
import { useEffect } from 'react';
import { SITE_META, type SiteKey } from '@/lib/client';

export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight md:text-[28px]">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink-2">{subtitle}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

export function AnimatedNumber({ value, prefix = '', decimals = 0 }: { value: number; prefix?: string; decimals?: number }) {
  const mv = useMotionValue(0);
  const text = useTransform(mv, (v) => `${prefix}${v.toLocaleString('en-IN', { maximumFractionDigits: decimals, minimumFractionDigits: decimals })}`);
  useEffect(() => {
    const c = animate(mv, value, { duration: 1.1, ease: [0.22, 1, 0.36, 1] });
    return c.stop;
  }, [value, mv]);
  return <motion.span className="tabular">{text}</motion.span>;
}

export function SiteDot({ site, size = 10 }: { site: SiteKey; size?: number }) {
  return <span className="inline-block shrink-0 rounded-full" style={{ width: size, height: size, background: SITE_META[site].color }} />;
}

export function Button({ children, variant = 'ghost', className = '', ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'danger' }) {
  const styles = {
    primary: 'bg-emerald-400 text-emerald-950 hover:bg-emerald-300 font-semibold',
    ghost: 'bg-white/[0.04] text-ink ring-1 ring-white/10 hover:bg-white/[0.08]',
    danger: 'bg-red-500/10 text-red-300 ring-1 ring-red-400/20 hover:bg-red-500/20',
  }[variant];
  return (
    <button {...p} className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm transition active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 ${styles} ${className}`}>
      {children}
    </button>
  );
}

export const stagger = {
  container: { hidden: {}, show: { transition: { staggerChildren: 0.05 } } },
  item: { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const } } },
};

export function Empty({ icon, title, children }: { icon: React.ReactNode; title: string; children?: React.ReactNode }) {
  return (
    <div className="card flex flex-col items-center px-6 py-16 text-center">
      <div className="mb-4 grid size-14 place-items-center rounded-2xl bg-white/5 text-ink-2">{icon}</div>
      <h3 className="font-medium">{title}</h3>
      {children && <div className="mt-1 max-w-md text-sm text-ink-2">{children}</div>}
    </div>
  );
}
