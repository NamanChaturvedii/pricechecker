// Server-side access to the shared data folder written by the worker (see worker/store.mjs).
import fs from 'node:fs';
import path from 'node:path';
import { DEFAULT_ITEMS } from '../../worker/items.mjs';

export const APP_DIR = process.cwd();
export const DATA_DIR = process.env.PRICE_CHECKER_DATA || path.resolve(/*turbopackIgnore: true*/ APP_DIR, '..', 'data');
export const RUNS_DIR = path.join(DATA_DIR, 'runs');
export const REPORTS_DIR = path.join(DATA_DIR, 'reports');
for (const d of [DATA_DIR, RUNS_DIR, REPORTS_DIR]) fs.mkdirSync(d, { recursive: true });

export type SiteKey = 'zepto' | 'blinkit' | 'amazon' | 'flipkart';
export const SITE_LABELS: Record<SiteKey, string> = {
  zepto: 'Zepto',
  blinkit: 'Blinkit',
  amazon: 'Amazon Fresh',
  flipkart: 'Flipkart Minutes',
};

export type Item = { id: string; name: string; qty: number; unit: string; query: string; must: string[]; prefer: string[]; avoid: string[]; approxG?: number };
export type Settings = {
  pincode: string;
  fallbackPincodes: string[]; // ordered backups for items not found at `pincode`
  scheduleEnabled: boolean;
  scheduleTime: string;
  sites: Record<SiteKey, boolean>;
  showBrowser: boolean;
};

export const DEFAULT_SETTINGS: Settings = {
  pincode: '122004',
  fallbackPincodes: ['122001', '122018', '122505'],
  scheduleEnabled: true,
  scheduleTime: '07:00',
  sites: { zepto: true, blinkit: true, amazon: true, flipkart: true },
  showBrowser: false,
};

export function readJson<T>(p: string, fallback: T): T {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8')) as T;
  } catch {
    return fallback;
  }
}
export function writeJson(p: string, v: unknown) {
  const tmp = `${p}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(v, null, 2));
  fs.renameSync(tmp, p);
}
const file = (n: string) => path.join(/*turbopackIgnore: true*/ DATA_DIR, n);

export const getSettings = (): Settings => {
  const s = { ...DEFAULT_SETTINGS, ...readJson<Partial<Settings>>(file('settings.json'), {}) };
  // older versions stored one fallback per site as an object
  const fb = s.fallbackPincodes as unknown;
  s.fallbackPincodes = [...new Set(Array.isArray(fb) ? fb : Object.values((fb as object) || {}))].map(String);
  return s;
};
export const saveSettings = (s: Partial<Settings>) => writeJson(file('settings.json'), { ...getSettings(), ...s });
export const getItems = (): Item[] => readJson<Item[]>(file('items.json'), DEFAULT_ITEMS as Item[]);
export const saveItems = (items: Item[]) => writeJson(file('items.json'), items);
export const defaultItems = () => DEFAULT_ITEMS as Item[];

export function getStatus() {
  const s = readJson<{ running: boolean; pid?: number; [k: string]: unknown }>(file('status.json'), { running: false });
  if (s.running && s.pid) {
    try {
      process.kill(s.pid, 0);
    } catch {
      return { ...s, running: false };
    }
  }
  return s;
}

export type SiteResult = {
  status: 'ok' | 'not_found' | 'not_delivered' | 'out_of_stock' | 'error';
  product?: string;
  packText?: string;
  packPrice?: number;
  mrp?: number | null;
  price?: number;
  approx?: boolean;
  exact?: boolean;
  url?: string | null;
  fallback?: boolean;
  fromPincode?: string;
  locationUnverified?: boolean;
  error?: string;
  alternatives?: string[];
};
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

export function listRuns(): Run[] {
  return fs
    .readdirSync(RUNS_DIR)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .reverse()
    .map((f) => readJson<Run | null>(path.join(RUNS_DIR, f), null))
    .filter((r): r is Run => !!r);
}
export const getRun = (id: string) => (/^[\w-]+$/.test(id) ? readJson<Run | null>(path.join(RUNS_DIR, `${id}.json`), null) : null);
export const reportPath = (id: string) => path.join(REPORTS_DIR, `${id}.xlsx`);

export function getVersion() {
  return readJson<{ version: string }>(path.join(APP_DIR, 'version.json'), { version: '0.0.0' }).version;
}
export const getUpdateState = () => readJson<Record<string, unknown>>(file('update-state.json'), {});
