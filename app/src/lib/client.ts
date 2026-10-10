'use client';
import { useCallback, useEffect, useRef, useState } from 'react';

export const SITE_ORDER = ['zepto', 'blinkit', 'amazon', 'flipkart'] as const;
export type SiteKey = (typeof SITE_ORDER)[number];
export const SITE_META: Record<SiteKey, { label: string; color: string; short: string }> = {
  zepto: { label: 'Zepto', color: 'var(--site-zepto)', short: 'Z' },
  blinkit: { label: 'Blinkit', color: 'var(--site-blinkit)', short: 'B' },
  amazon: { label: 'Amazon Fresh', color: 'var(--site-amazon)', short: 'A' },
  flipkart: { label: 'Flipkart Minutes', color: 'var(--site-flipkart)', short: 'F' },
};

export async function api<T = unknown>(url: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    body: init?.json !== undefined ? JSON.stringify(init.json) : init?.body,
    cache: 'no-store',
  });
  if (res.status === 401 && typeof window !== 'undefined' && !location.pathname.startsWith('/login')) {
    location.href = '/login';
    throw new Error('Not logged in');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || `Request failed (${res.status})`);
  return data as T;
}

/** Fetch + optional polling. */
export function useApi<T>(url: string | null, pollMs?: number) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const urlRef = useRef(url);
  urlRef.current = url;
  const reload = useCallback(async () => {
    if (!urlRef.current) return;
    try {
      setData(await api<T>(urlRef.current));
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);
  useEffect(() => {
    reload();
    if (!pollMs) return;
    const t = setInterval(reload, pollMs);
    return () => clearInterval(t);
  }, [url, pollMs, reload]);
  return { data, error, reload, setData };
}

export const rupee = (n?: number | null) =>
  n == null ? '—' : `₹${n.toLocaleString('en-IN', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;

export const fmtDate = (iso?: string | null, withTime = true) =>
  iso
    ? new Date(iso).toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        ...(withTime ? { hour: 'numeric', minute: '2-digit' } : { year: 'numeric' }),
      })
    : '—';

export function timeAgo(iso?: string | null) {
  if (!iso) return 'never';
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return `${Math.floor(s / 86400)} d ago`;
}

export type SiteResult = {
  status: 'ok' | 'not_found' | 'not_delivered' | 'out_of_stock' | 'error';
  product?: string;
  packText?: string;
  packPrice?: number;
  mrp?: number | null;
  price?: number;
  approx?: boolean;
  url?: string | null;
  fallback?: boolean;
  fromPincode?: string;
  locationUnverified?: boolean;
  error?: string;
  alternatives?: string[];
};
export type Item = { id: string; name: string; qty: number; unit: string; query: string; must?: string[]; prefer?: string[]; avoid?: string[]; approxG?: number };
export type Run = {
  id: string;
  trigger: string;
  startedAt: string;
  finishedAt: string | null;
  pincode: string;
  sites: SiteKey[];
  items: Item[];
  results: Record<string, Partial<Record<SiteKey, SiteResult>>>;
  siteErrors: Record<string, string>;
  report?: boolean;
};
export type StatusResp = {
  status: { running: boolean; runId?: string; progress?: { done: number; total: number }; current?: string; log?: string[]; finishedAt?: string };
  user: string;
  nextRun: string | null;
  pincode: string;
  version: string;
  update: { available?: string; checkedAt?: string; state?: string; message?: string };
};
