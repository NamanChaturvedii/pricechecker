// File-based storage shared by the worker and the Next.js app. No database to install.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_ITEMS } from './items.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
export const APP_DIR = path.resolve(here, '..');
export const ROOT_DIR = path.resolve(APP_DIR, '..');
export const DATA_DIR = process.env.PRICE_CHECKER_DATA || path.join(ROOT_DIR, 'data');
export const RUNS_DIR = path.join(DATA_DIR, 'runs');
export const REPORTS_DIR = path.join(DATA_DIR, 'reports');
for (const d of [DATA_DIR, RUNS_DIR, REPORTS_DIR]) fs.mkdirSync(d, { recursive: true });

export const DEFAULT_SETTINGS = {
  pincode: '324002',
  // Items not found at `pincode` are searched at these, in order, until found.
  fallbackPincodes: ['302001'],
  scheduleEnabled: true,
  scheduleTime: '07:00',
  sites: { zepto: true, blinkit: true, amazon: true, flipkart: true },
  showBrowser: false,
};

const file = (n) => path.join(DATA_DIR, n);

export function readJson(p, fallback) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return fallback;
  }
}
export function writeJson(p, v) {
  const tmp = `${p}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(v, null, 2));
  fs.renameSync(tmp, p);
}

export const getSettings = () => ({ ...DEFAULT_SETTINGS, ...readJson(file('settings.json'), {}) });
/** Ordered backup pincodes (older versions stored one per site as an object). */
export const backupPincodes = (s) => {
  const v = s.fallbackPincodes;
  return [...new Set(Array.isArray(v) ? v : Object.values(v || {}))].map(String);
};
export const saveSettings =(s) => writeJson(file('settings.json'), { ...getSettings(), ...s });
export const getItems = () => readJson(file('items.json'), DEFAULT_ITEMS);
export const saveItems = (items) => writeJson(file('items.json'), items);

export const IDLE = { running: false, runId: null, progress: { done: 0, total: 0 }, current: '', log: [] };
export function getStatus() {
  const s = readJson(file('status.json'), IDLE);
  // a crashed run leaves running=true; treat a dead pid as idle
  if (s.running && s.pid) {
    try {
      process.kill(s.pid, 0);
    } catch {
      return { ...s, running: false };
    }
  }
  return s;
}
export const setStatus = (s) => writeJson(file('status.json'), s);

export function listRuns() {
  return fs
    .readdirSync(RUNS_DIR)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .reverse()
    .map((f) => readJson(path.join(RUNS_DIR, f), null))
    .filter(Boolean);
}
export const getRun = (id) => readJson(path.join(RUNS_DIR, `${id}.json`), null);
export const saveRun = (run) => writeJson(path.join(RUNS_DIR, `${run.id}.json`), run);
export const reportPath = (id) => path.join(REPORTS_DIR, `${id}.xlsx`);
