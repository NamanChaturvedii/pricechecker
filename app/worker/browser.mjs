// Launches a scraping browser with a brand-new temporary profile (fresh cookies every time)
// and loads any unpacked Chrome extensions found in <root>/extensions (e.g. a captcha solver).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';
import { ROOT_DIR } from './store.mjs';

export const EXTENSIONS_DIR = path.join(ROOT_DIR, 'extensions');

export function listExtensions() {
  if (!fs.existsSync(EXTENSIONS_DIR)) return [];
  return fs
    .readdirSync(EXTENSIONS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && fs.existsSync(path.join(EXTENSIONS_DIR, d.name, 'manifest.json')))
    .map((d) => path.join(EXTENSIONS_DIR, d.name));
}

export async function launchFresh({ visible = false, geo = null } = {}) {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'price-checker-'));
  const exts = listExtensions();
  const args = ['--disable-blink-features=AutomationControlled', '--no-first-run', '--no-default-browser-check'];
  if (!visible) args.push('--window-position=-32000,-32000');
  if (exts.length) args.push(`--disable-extensions-except=${exts.join(',')}`, `--load-extension=${exts.join(',')}`);
  // Headful (off-screen) on purpose: the quick-commerce sites block headless browsers,
  // and Chrome extensions only run in a real browser window.
  const ctx = await chromium.launchPersistentContext(profile, {
    headless: false,
    viewport: { width: 1366, height: 900 },
    locale: 'en-IN',
    timezoneId: 'Asia/Kolkata',
    args,
    ...(geo ? { geolocation: geo, permissions: ['geolocation'] } : {}),
    ignoreDefaultArgs: ['--enable-automation', ...(exts.length ? ['--disable-extensions'] : [])],
  });
  ctx.setDefaultTimeout(30000);
  const page = ctx.pages()[0] || (await ctx.newPage());
  if (exts.length) await new Promise((r) => setTimeout(r, 1500)); // let extensions boot
  return {
    ctx,
    page,
    extensions: exts.length,
    async close() {
      await ctx.close().catch(() => {});
      fs.rmSync(profile, { recursive: true, force: true });
    },
  };
}
