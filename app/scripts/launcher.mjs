// Price Checker launcher — the one long-running process on the client's machine.
//  1. checks GitHub for a newer version and installs it (then asks Start.bat to restart us: exit 42)
//  2. starts the Next.js dashboard on http://localhost:PORT
//  3. runs the daily price check at the time set in Settings
//  4. re-checks for updates every few hours, or when the dashboard asks (data/update-request.json)
import fs from 'node:fs';
import os from 'node:os';
import net from 'node:net';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import AdmZip from 'adm-zip';

const APP_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT = path.resolve(APP_DIR, '..');
const DATA = process.env.PRICE_CHECKER_DATA || path.join(ROOT, 'data');
const PORT = Number(process.env.PORT || 3939);
const NO_UPDATE = process.env.PRICE_CHECKER_NO_UPDATE === '1';
const RESTART = 42;
const ALREADY_RUNNING = 3;
const UPDATE_EVERY_MS = 6 * 60 * 60 * 1000;
// never overwritten by an update
const KEEP = new Set(['data', 'runtime', 'extensions', '.git', 'update.config.json', 'node_modules', '.next']);

fs.mkdirSync(DATA, { recursive: true });
const log = (...a) => console.log(new Date().toISOString(), ...a);
const readJson = (p, d) => {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return d;
  }
};
const writeJson = (p, v) => fs.writeFileSync(p, JSON.stringify(v, null, 2));
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const run = (cmd, args, opts = {}) => {
  const r = spawnSync(cmd, args, { cwd: APP_DIR, stdio: 'inherit', shell: process.platform === 'win32', ...opts });
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(' ')} failed (${r.status})`);
};

// ---------------------------------------------------------------- updates
const updateCfg = () => {
  const c = readJson(path.join(ROOT, 'update.config.json'), {});
  return c.repo && !c.repo.startsWith('YOUR-') ? c : { ...c, repo: '' };
};
const localVersion = () => readJson(path.join(APP_DIR, 'version.json'), { version: '0.0.0' }).version;
const newer = (a, b) => {
  const pa = a.split('.').map(Number), pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) > (pb[i] || 0);
  return false;
};
const setUpdateState = (patch) => writeJson(path.join(DATA, 'update-state.json'), { ...readJson(path.join(DATA, 'update-state.json'), {}), ...patch });

function ghHeaders(cfg, raw) {
  const h = { 'User-Agent': 'price-checker-updater', Accept: raw ? 'application/vnd.github.raw' : 'application/vnd.github+json' };
  if (cfg.token) h.Authorization = `Bearer ${cfg.token}`;
  return h;
}

async function remoteVersion() {
  const cfg = updateCfg();
  if (!cfg.repo || NO_UPDATE) return null;
  const url = `https://api.github.com/repos/${cfg.repo}/contents/app/version.json?ref=${cfg.branch || 'main'}`;
  const r = await fetch(url, { headers: ghHeaders(cfg, true) });
  if (!r.ok) throw new Error(`GitHub said ${r.status} — check update.config.json`);
  return JSON.parse(await r.text()).version;
}

async function checkForUpdate() {
  const cfg = updateCfg();
  if (!cfg.repo || NO_UPDATE) {
    setUpdateState({ state: 'idle', message: NO_UPDATE ? 'Updates are managed by the server deployment' : 'Auto-update not configured (update.config.json)', checkedAt: new Date().toISOString() });
    return null;
  }
  setUpdateState({ state: 'checking', message: 'Checking for updates…' });
  try {
    const remote = await remoteVersion();
    const available = remote && newer(remote, localVersion()) ? remote : null;
    setUpdateState({ state: 'idle', available, checkedAt: new Date().toISOString(), message: available ? `Version ${available} is available` : 'You are on the latest version' });
    return available;
  } catch (e) {
    setUpdateState({ state: 'idle', checkedAt: new Date().toISOString(), message: `Update check failed: ${e.message}` });
    return null;
  }
}

const hashFile = (p) => (fs.existsSync(p) ? crypto.createHash('sha1').update(fs.readFileSync(p)).digest('hex') : '');

function copyTree(src, dst) {
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    if (KEEP.has(e.name)) continue;
    const s = path.join(src, e.name), d = path.join(dst, e.name);
    if (e.isDirectory()) {
      fs.mkdirSync(d, { recursive: true });
      copyTree(s, d);
    } else fs.copyFileSync(s, d);
  }
}

async function installUpdate(version) {
  const cfg = updateCfg();
  setUpdateState({ state: 'installing', message: `Downloading version ${version}…` });
  log(`Installing update ${version}`);
  const r = await fetch(`https://api.github.com/repos/${cfg.repo}/zipball/${cfg.branch || 'main'}`, { headers: ghHeaders(cfg) });
  if (!r.ok) throw new Error(`download failed (${r.status})`);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'price-checker-update-'));
  const zipPath = path.join(tmp, 'update.zip');
  fs.writeFileSync(zipPath, Buffer.from(await r.arrayBuffer()));
  new AdmZip(zipPath).extractAllTo(path.join(tmp, 'x'), true);
  const top = fs.readdirSync(path.join(tmp, 'x'))[0]; // GitHub wraps everything in "<owner>-<repo>-<sha>/"
  const src = path.join(tmp, 'x', top);
  if (!fs.existsSync(path.join(src, 'app', 'version.json'))) throw new Error('downloaded archive does not look like Price Checker');

  const lockBefore = hashFile(path.join(APP_DIR, 'package-lock.json'));
  // replace code folders wholesale so deleted files disappear too
  for (const dir of ['src', 'worker', 'scripts']) fs.rmSync(path.join(APP_DIR, dir), { recursive: true, force: true });
  copyTree(src, ROOT);
  fs.rmSync(tmp, { recursive: true, force: true });

  setUpdateState({ state: 'installing', message: 'Installing…' });
  if (hashFile(path.join(APP_DIR, 'package-lock.json')) !== lockBefore || !fs.existsSync(path.join(APP_DIR, 'node_modules'))) run(npm, ['ci', '--no-audit', '--no-fund']);
  run(process.execPath, [path.join(APP_DIR, 'node_modules', 'playwright', 'cli.js'), 'install', 'chromium']);
  run(npm, ['run', 'build']);
  setUpdateState({ state: 'idle', available: null, message: `Updated to ${version}`, checkedAt: new Date().toISOString() });
  log(`Update ${version} installed — restarting`);
}

// ---------------------------------------------------------------- server
const portInUse = (port) =>
  new Promise((res) => {
    const s = net.createConnection({ port, host: '127.0.0.1' });
    s.once('connect', () => (s.destroy(), res(true)));
    s.once('error', () => res(false));
  });

let server;
function startServer() {
  if (!fs.existsSync(path.join(APP_DIR, '.next', 'BUILD_ID'))) run(npm, ['run', 'build']);
  server = spawn(process.execPath, [path.join(APP_DIR, 'node_modules', 'next', 'dist', 'bin', 'next'), 'start', '-p', String(PORT)], {
    cwd: APP_DIR,
    stdio: 'inherit',
    env: { ...process.env, PRICE_CHECKER_DATA: DATA },
  });
  server.on('exit', (code) => {
    if (shuttingDown) return;
    log(`dashboard server exited (${code}) — restarting in 3s`);
    setTimeout(startServer, 3000);
  });
}

// ---------------------------------------------------------------- scheduler
let checkRunning = false;
function scheduler() {
  const s = { scheduleEnabled: true, scheduleTime: '07:00', ...readJson(path.join(DATA, 'settings.json'), {}) };
  if (!s.scheduleEnabled || checkRunning) return;
  const now = new Date();
  const today = now.toLocaleDateString('en-CA');
  const state = readJson(path.join(DATA, 'scheduler.json'), {});
  if (state.lastDate === today) return;
  const [h, m] = String(s.scheduleTime).split(':').map(Number);
  const due = new Date(now);
  due.setHours(h, m, 0, 0);
  // run at the set time — or as soon as the laptop is on later that same day (missed run catch-up)
  if (now < due) return;
  const status = readJson(path.join(DATA, 'status.json'), {});
  if (status.running) return;
  writeJson(path.join(DATA, 'scheduler.json'), { lastDate: today, startedAt: now.toISOString() });
  log('Starting scheduled price check');
  checkRunning = true;
  const child = spawn(process.execPath, [path.join(APP_DIR, 'worker', 'run.mjs'), '--trigger', 'schedule'], { cwd: APP_DIR, stdio: 'inherit', env: { ...process.env, PRICE_CHECKER_DATA: DATA } });
  child.on('exit', (code) => {
    checkRunning = false;
    log(`Scheduled price check finished (${code})`);
  });
}

// ---------------------------------------------------------------- main
let shuttingDown = false;
async function updateAndMaybeRestart() {
  const v = await checkForUpdate();
  if (!v) return;
  if (checkRunning || readJson(path.join(DATA, 'status.json'), {}).running) return; // never interrupt a price check
  // stop the dashboard first: Windows locks files that a running server has open
  shuttingDown = true;
  server?.kill();
  await new Promise((r) => setTimeout(r, 1500));
  try {
    await installUpdate(v);
    process.exit(RESTART);
  } catch (e) {
    log('Update failed:', e.message);
    setUpdateState({ state: 'idle', message: `Update failed: ${e.message}` });
    shuttingDown = false;
    if (server) startServer();
  }
}

if (await portInUse(PORT)) {
  log(`Price Checker already running on port ${PORT}`);
  process.exit(ALREADY_RUNNING);
}

const autoInstall = updateCfg().autoInstall !== false;
if (autoInstall) await updateAndMaybeRestart();
else await checkForUpdate();

startServer();
log(`Dashboard: http://localhost:${PORT}`);
setInterval(scheduler, 30 * 1000);
setTimeout(scheduler, 10 * 1000);
setInterval(() => (autoInstall ? updateAndMaybeRestart() : checkForUpdate()), UPDATE_EVERY_MS);

// dashboard "Check for updates" / "Install" buttons
setInterval(async () => {
  const reqFile = path.join(DATA, 'update-request.json');
  if (!fs.existsSync(reqFile)) return;
  const req = readJson(reqFile, {});
  fs.rmSync(reqFile, { force: true });
  if (req.action === 'install') await updateAndMaybeRestart();
  else await checkForUpdate();
}, 4000);

for (const sig of ['SIGINT', 'SIGTERM'])
  process.on(sig, () => {
    shuttingDown = true;
    server?.kill();
    process.exit(0);
  });
