# Price Checker

Checks vegetable prices every day on **Zepto, Blinkit, Amazon Fresh and Flipkart Minutes**. It converts each price to the exact quantity you need (1 kg, 1 pc, 1 bunch, 3 pc …) and shows everything on a dashboard with a login. Each check can also be downloaded as an Excel report.

---

## For the person using it (client)

### Install (one time, ~5 minutes)
1. Download this folder (GitHub → **Code → Download ZIP**) and unzip it somewhere permanent, e.g. `C:\Price Checker`.
2. Double-click **`Setup.bat`**.
   It downloads everything it needs (Node.js, the app, a browser). You don't install anything else.
3. The dashboard opens at **http://localhost:3939**.
   Login: **admin / admin123**. Change the password in **Settings**.

After setup:
- The app **starts automatically with Windows** and runs in the background.
- A **Price Checker** shortcut on the Desktop opens the dashboard.
- The price check runs **every day at the time set in Settings** (default 07:00). If the laptop was off at that time, it runs as soon as the laptop is on again that day.

### Using the dashboard
| Page | What it does |
|---|---|
| **Dashboard** | Live progress of a running check, today's prices side by side (cheapest in green), and a **Full details** tab with the matched product, pack size, MRP and links. Also shows the cheapest site per item and price trends. Click the pincode at the top to change it. |
| **History** | Every past check. You can view it or download its Excel. |
| **Vegetables** | Add, remove or edit items, quantities and search words. |
| **Settings** | Primary + backup pincodes (add, remove, reorder), daily time, which sites to check, updates, password. |

**Pincodes:** in Settings you set one **primary** pincode and any number of **backup** pincodes, in order. Every item is searched at the primary first. Anything not found there (or on a site that doesn't deliver there) is searched at backup 1, then backup 2, and so on, until it is found. Prices from a backup are marked in amber with the pincode they came from.

### Stop / start
- `Stop.bat` stops it.
- `Start Price Checker.vbs` starts it again (or just restart the laptop).

### Captcha solver / browser extensions
Put any **unpacked** Chrome extension folder (the folder containing `manifest.json`) into `extensions\`. It is loaded into every scraping browser.

---

## For the developer: shipping updates

Auto-update pulls new versions from a GitHub repo.

**One-time:**
1. Create a GitHub repo, e.g. `price-checker`, and push this folder to it (`git remote add origin …`, `git push -u origin main`).
2. Edit **`update.config.json`**: set `"repo": "<your-github-user>/price-checker"`.
   - For a **private** repo, put a read-only fine-grained token (Contents: Read) in `"token"`.
3. Commit and push that change. Clients installed from that repo will now follow it.

**Every update:**
- Make your changes, then double-click **`Publish-Update.bat`**. It bumps `app/version.json` and runs `git push`.
- Clients check every 6 hours (and when they open Settings → **Check for updates**). They download the new code, rebuild and restart on their own. A running price check is never interrupted.
- Kept on update: `data/` (settings, vegetables, history, logins), `extensions/`, `update.config.json`.

---

## Hosted website instead of a laptop (optional)

```bash
docker build -t price-checker .
docker run -d -p 3939:3939 -v price-data:/data --restart unless-stopped price-checker
```
The browser runs inside a virtual display, because the grocery sites block headless browsers. Note that these sites often block datacenter IPs, so running from an office or home connection (the laptop setup) is more reliable. Put it behind HTTPS (e.g. Caddy or Nginx) if it's exposed to the internet.

---

## Project layout
```
Setup.bat / Start.bat / Stop.bat / Publish-Update.bat   Windows scripts
update.config.json      which GitHub repo to update from
extensions/             unpacked Chrome extensions (captcha solver etc.)
data/                   settings, vegetables, run history, Excel reports, logs (not in git)
app/
  src/                  Next.js dashboard + API (login, runs, settings, items, updates)
  worker/               scraper: sites.mjs (per-site logic), match.mjs (quantity matching),
                        run.mjs (one full check), excel.mjs (report)
  scripts/launcher.mjs  starts the dashboard, runs the daily schedule, auto-updates
  scripts/setup.ps1     what Setup.bat runs
```

Run one check from the command line: `cd app && node worker/run.mjs --items onion,potato --sites blinkit,zepto`
Logs: `data/launcher.log`, `data/worker.log`.
