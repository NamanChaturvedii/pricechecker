// Runs one full price check: every enabled site × every item. Usage:
//   node worker/run.mjs [--sites zepto,blinkit] [--items onion,potato] [--trigger manual|schedule]
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { launchFresh, listExtensions } from './browser.mjs';
import { SITES } from './sites.mjs';
import { pickBest } from './match.mjs';
import { writeReport } from './excel.mjs';
import { getSettings, getItems, getStatus, setStatus, saveRun, IDLE, backupPincodes } from './store.mjs';

const arg = (name) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : null;
};

export async function runCheck({ sites: onlySites, items: onlyItems, trigger = 'manual' } = {}) {
  if (getStatus().running) throw new Error('A price check is already running');
  const settings = getSettings();
  const pinChain = [settings.pincode, ...backupPincodes(settings)].filter((p, i, a) => /^\d{6}$/.test(p) && a.indexOf(p) === i);
  const sites = Object.keys(SITES).filter((s) => settings.sites[s] !== false && (!onlySites || onlySites.includes(s)));
  const items = getItems().filter((i) => !onlyItems || onlyItems.includes(i.id));
  const now = new Date();
  const id = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const run = { id, trigger, startedAt: now.toISOString(), finishedAt: null, pincode: settings.pincode, backupPincodes: pinChain.slice(1), sites, items, results: {}, siteErrors: {} };

  const status = { ...IDLE, running: true, pid: process.pid, runId: id, startedAt: run.startedAt, progress: { done: 0, total: sites.length * items.length }, current: 'Starting browsers…', log: [] };
  const log = (msg) => {
    status.log = [...status.log, `${new Date().toLocaleTimeString('en-IN')}  ${msg}`].slice(-80);
    status.current = msg;
    setStatus(status);
    console.log(msg);
  };
  log(`Price check started for ${items.length} items on ${sites.map((s) => SITES[s].label).join(', ')}${listExtensions().length ? ` (${listExtensions().length} browser extension(s) loaded)` : ''}`);

  await Promise.all(
    sites.map(async (key) => {
      const site = SITES[key];
      // One session per pincode, opened only when needed: the primary pincode first, then each
      // backup pincode in order for items that were not found at the previous one.
      const sessions = {};
      const open = async (pin) => {
        if (sessions[pin] !== undefined) return sessions[pin];
        // Fresh browser + fresh cookies every time, so a site never sees a stale/flagged session.
        const s = await launchFresh({ visible: settings.showBrowser });
        s.pin = pin;
        s.empty = 0;
        log(`${site.label}: setting delivery location to ${pin}${pin !== settings.pincode ? ' (backup pincode)' : ''}`);
        for (let attempt = 1; attempt <= 2; attempt++) {
          try {
            await site.setLocation(s.page, { ...settings, pincode: pin });
            s.unverified = false;
            break;
          } catch (e) {
            const msg = e.message.split('\n')[0];
            if (/^(UNSERVICEABLE|UNAVAILABLE)/.test(msg)) {
              log(`${site.label}: ${msg.replace(/^(UNSERVICEABLE|UNAVAILABLE): /, '')}`);
              s.dead = true;
              s.unserviceable = true;
              break;
            }
            s.unverified = true;
            log(`${site.label}: could not set location${attempt === 1 ? ', retrying' : ' — prices may be from the site default area'} (${msg})`);
          }
        }
        sessions[pin] = s;
        return s;
      };
      const searchIn = async (s, item) => {
        let last;
        for (let attempt = 1; attempt <= 2; attempt++) {
          try {
            const products = await site.search(s.page, item.query || item.name);
            s.empty = products.length ? 0 : s.empty + 1;
            if (s.empty >= 2) s.dead = s.unserviceable = true; // nothing at all twice in a row → site doesn't serve this area
            return { ...pickBest(item, products), candidates: products.length };
          } catch (e) {
            last = { status: 'error', error: e.message.split('\n')[0].replace(/^(UNSERVICEABLE|UNAVAILABLE): /, '') };
            if (/^(UNSERVICEABLE|UNAVAILABLE)/.test(e.message)) {
              s.dead = true;
              break;
            }
          }
        }
        return last;
      };
      try {
        for (const item of items) {
          let result = { status: 'not_found' };
          for (const pin of pinChain) {
            const s = await open(pin);
            if (s.dead) continue;
            const r = await searchIn(s, item);
            if (pin === settings.pincode || r.status === 'ok') result = r; // keep the primary's reason if every backup fails too
            if (r.status === 'ok') {
              if (pin !== settings.pincode) Object.assign(result, { fallback: true, fromPincode: pin });
              if (s.unverified) result.locationUnverified = true;
              break;
            }
          }
          // explain a miss: which pincodes the site doesn't deliver to, and where it simply lacked the item
          if (result.status === 'not_found') {
            const noDelivery = pinChain.filter((p) => sessions[p]?.unserviceable);
            const searched = pinChain.filter((p) => sessions[p] && !sessions[p].unserviceable);
            if (noDelivery.length === pinChain.length) result = { status: 'not_delivered', error: `${site.label} does not deliver to ${pinChain.join(', ')}` };
            else if (noDelivery.length) result.error = `Not delivered to ${noDelivery.join(', ')} · not found at ${searched.join(', ')}`;
          }
          run.results[item.id] = { ...(run.results[item.id] || {}), [key]: result };
          status.progress.done++;
          log(`${site.label} · ${item.name}: ${result.status === 'ok' ? `₹${result.price} (${result.product}${result.packText ? `, ${result.packText}` : ''})${result.fallback ? ` [from ${result.fromPincode}]` : ''}` : result.status.replace('_', ' ')}`);
          await new Promise((r) => setTimeout(r, 600 + Math.random() * 900));
        }
      } catch (e) {
        run.siteErrors[key] = e.message.split('\n')[0];
        log(`${site.label}: FAILED — ${run.siteErrors[key]}`);
        for (const item of items) {
          if (!run.results[item.id]?.[key]) {
            run.results[item.id] = { ...(run.results[item.id] || {}), [key]: { status: 'error', error: run.siteErrors[key] } };
            status.progress.done++;
          }
        }
      } finally {
        for (const s of Object.values(sessions)) await s?.close();
      }
    }),
  );

  run.finishedAt = new Date().toISOString();
  saveRun(run);
  try {
    await writeReport(run);
    run.report = true;
    saveRun(run);
  } catch (e) {
    log(`Excel export failed: ${e.message}`);
  }
  log(`Done. Report ready.`);
  setStatus({ ...status, running: false, current: 'Finished', finishedAt: run.finishedAt });
  return run;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  runCheck({ sites: arg('sites')?.split(','), items: arg('items')?.split(','), trigger: arg('trigger') || 'manual' })
    .then(() => process.exit(0))
    .catch((e) => {
      console.error(e);
      const s = getStatus();
      setStatus({ ...s, running: false, current: `Failed: ${e.message}` });
      process.exit(1);
    });
}
