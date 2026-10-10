// Site adapters. Each adapter: setLocation(page, settings) and search(page, query) → products[]
// product = { name, qtyText, price, mrp, inStock, url }

import path from 'node:path';
import { DATA_DIR, readJson, writeJson } from './store.mjs';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Pincode → { latitude, longitude } via OpenStreetMap, cached in data/geo-cache.json */
export async function geocode(pincode) {
  const cacheFile = path.join(DATA_DIR, 'geo-cache.json');
  const cache = readJson(cacheFile, {});
  if (cache[pincode]) return cache[pincode];
  const r = await fetch(`https://nominatim.openstreetmap.org/search?postalcode=${pincode}&country=India&format=json&limit=1`, {
    headers: { 'User-Agent': 'price-checker/1.0' },
  });
  const j = await r.json();
  if (!j[0]) throw new Error(`Could not find coordinates for pincode ${pincode}`);
  cache[pincode] = { latitude: parseFloat(j[0].lat), longitude: parseFloat(j[0].lon) };
  writeJson(cacheFile, cache);
  return cache[pincode];
}

/**
 * Generic product-card extractor that runs inside the page.
 * Finds every "ADD" / "Notify" button, grows each to the largest ancestor that still
 * contains only one such button (= the product card), then parses the card's text.
 */
function extractCards() {
  const BTN = /^(add|add item|add to cart|\+\s*add|notify|notify me|out of stock|sold out)$/i;
  const all = [...document.querySelectorAll('button, [role=button], div, span, a, p')];
  const btns = all.filter((e) => {
    const t = (e.innerText || '').trim();
    return t.length < 20 && BTN.test(t) && ![...e.children].some((c) => BTN.test((c.innerText || '').trim()));
  });
  const countBtns = (el) => btns.filter((b) => el.contains(b)).length;
  const seen = new Set();
  const out = [];
  for (const b of btns) {
    let card = b;
    while (card.parentElement && card.parentElement !== document.body && countBtns(card.parentElement) === 1) card = card.parentElement;
    if (seen.has(card)) continue;
    seen.add(card);
    const text = card.innerText || '';
    const lines = text.split('\n').map((s) => s.trim()).filter(Boolean);
    const prices = [];
    for (const l of lines) {
      if (/\/\s*(\d|kg|g|gm|100|pc|piece|unit)/i.test(l)) continue; // per-unit price lines
      for (const m of l.matchAll(/₹\s*([\d,]+(?:\.\d+)?)/g)) prices.push(parseFloat(m[1].replace(/,/g, '')));
    }
    if (!prices.length) continue;
    const QTY = /^(approx\.?\s*)?\(?\d+(\.\d+)?\s*(-\s*\d+(\.\d+)?\s*)?(kg|kgs|g|gm|gms|grams?|pcs?|pieces?|units?|nos?|bunch(es)?|ml|l|pack)\b/i;
    const qtyLine = lines.find((l) => QTY.test(l) && !l.includes('₹')) || '';
    const junk = /₹|^(add|add item|notify|notify me|out of stock|sold out)$|%\s*off|\d+\s*mins?$|^(earliest|ad|sponsored|best\s*seller|bestseller|new|top rated|trending|organic|fresh)$/i;
    const nameLine = lines.filter((l) => !junk.test(l) && l !== qtyLine && /[a-z]{3}/i.test(l)).sort((a, b) => b.length - a.length)[0] || '';
    const link = card.querySelector('a[href]') || card.closest('a[href]');
    out.push({
      name: nameLine,
      qtyText: qtyLine,
      price: Math.min(...prices),
      mrp: prices.length > 1 ? Math.max(...prices) : null,
      inStock: !/notify|out of stock|sold out/i.test(b.innerText || ''),
      url: link ? link.href : null,
    });
  }
  return out;
}

async function scrollToLoad(page, rounds = 2) {
  for (let i = 0; i < rounds; i++) {
    await page.mouse.wheel(0, 1600);
    await sleep(700);
  }
}

/** Type a pincode into a location search box and click the first suggestion. */
async function pickLocation(page, inputSelector, pincode) {
  const input = page.locator(inputSelector).filter({ visible: true }).first();
  await input.waitFor({ state: 'visible', timeout: 15000 });
  await input.click({ timeout: 5000 }).catch(() => input.focus());
  await input.fill('');
  await input.pressSequentially(String(pincode), { delay: 80 });
  await sleep(3000);
  // click the first suggestion that mentions the pincode and sits below the input box (wait up to ~10s for it)
  const box = await input.boundingBox();
  let point = null;
  for (let i = 0; i < 10 && !point; i++) {
    point = await page.evaluate(
      ({ pin, top }) => {
        const els = [...document.querySelectorAll('body *')].filter((e) => {
          if (e.tagName === 'INPUT' || ![...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.includes(pin))) return false;
          const r = e.getBoundingClientRect();
          return r.width > 0 && r.height > 0 && r.top > top;
        });
        els.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);
        if (!els.length) return null;
        const r = els[0].getBoundingClientRect();
        return { x: r.left + Math.min(r.width / 2, 60), y: r.top + r.height / 2 };
      },
      { pin: String(pincode), top: box ? box.y + box.height : 0 },
    );
    if (!point) await sleep(1000);
  }
  if (!point) throw new Error('no location suggestion found');
  await page.mouse.click(point.x, point.y);
  await sleep(3000);
  for (const label of ['Confirm & Continue', 'Confirm Location', 'Confirm location', 'Confirm', 'Save address', 'Continue']) {
    const btn = page.getByRole('button', { name: label }).first();
    if (await btn.isVisible().catch(() => false)) {
      await btn.click().catch(() => {});
      await sleep(2000);
      break;
    }
  }
}

export const SITES = {
  zepto: {
    label: 'Zepto',
    home: 'https://www.zepto.com/',
    async setLocation(page, { pincode }) {
      await page.goto(this.home, { waitUntil: 'domcontentloaded' });
      await sleep(5000);
      const addr = 'input[placeholder*="address" i]';
      for (let i = 0; i < 3 && !(await page.locator(addr).first().isVisible().catch(() => false)); i++) {
        await page.getByText('Select Location', { exact: true }).first().click().catch(() => {});
        await sleep(2000);
      }
      await pickLocation(page, addr, pincode);
      await sleep(2000);
      // verify: the header still saying "Select Location" means the location did not stick
      if (await page.getByText('Select Location', { exact: true }).first().isVisible().catch(() => false)) throw new Error('location did not apply');
    },
    async search(page, query) {
      await page.goto(`https://www.zepto.com/search?query=${encodeURIComponent(query)}`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('text=/₹/', { timeout: 20000 }).catch(() => {});
      await sleep(1500);
      await scrollToLoad(page, 1);
      return page.evaluate(extractCards);
    },
  },

  blinkit: {
    label: 'Blinkit',
    home: 'https://blinkit.com/',
    async setLocation(page, { pincode }) {
      await page.goto(this.home, { waitUntil: 'domcontentloaded' });
      await sleep(4000);
      const input = 'input[placeholder*="location" i], input[name="select-locality"], input[placeholder*="area" i]';
      if (!(await page.locator(input).first().isVisible().catch(() => false))) {
        await page.locator('[class*="LocationBar"], [class*="location" i]').first().click().catch(() => {});
        await sleep(1500);
      }
      await pickLocation(page, input, pincode);
    },
    async search(page, query) {
      const collected = [];
      const onResp = async (r) => {
        if (!r.url().includes('/v1/layout/search')) return;
        try {
          const j = await r.json();
          for (const s of j?.response?.snippets || []) {
            const d = s.data || {};
            const ci = d.atc_action?.add_to_cart?.cart_item;
            if (!ci) continue;
            collected.push({
              name: ci.display_name || ci.product_name || d.name?.text,
              qtyText: ci.unit || d.variant?.text || '',
              price: Number(ci.price),
              mrp: Number(ci.mrp) || null,
              inStock: !d.is_sold_out && ci.inventory !== 0,
              url: `https://blinkit.com/prn/x/prid/${ci.product_id}`,
            });
          }
        } catch {}
      };
      page.on('response', onResp);
      await page.goto(`https://blinkit.com/s/?q=${encodeURIComponent(query)}`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('text=/₹/', { timeout: 20000 }).catch(() => {});
      await sleep(2500);
      page.off('response', onResp);
      return collected.length ? collected : page.evaluate(extractCards);
    },
  },

  amazon: {
    label: 'Amazon Fresh',
    home: 'https://www.amazon.in/',
    async setLocation(page, { pincode }) {
      await page.goto(this.home, { waitUntil: 'load' });
      await sleep(2500);
      for (let i = 0; i < 4 && !(await page.locator('#GLUXZipUpdateInput').isVisible().catch(() => false)); i++) {
        await page.locator('#nav-global-location-popover-link').click().catch(() => {});
        await sleep(3000);
      }
      await page.locator('#GLUXZipUpdateInput').waitFor({ state: 'visible', timeout: 10000 });
      await page.fill('#GLUXZipUpdateInput', String(pincode));
      await page.locator('#GLUXZipUpdate').click();
      await sleep(3000);
      const done = page.locator('#GLUXConfirmClose, .a-popover-footer input, [name="glowDoneButton"]').first();
      if (await done.isVisible().catch(() => false)) await done.click().catch(() => {});
      await sleep(1500);
      await page.reload({ waitUntil: 'domcontentloaded' });
      const shown = await page.locator('#glow-ingress-line2').innerText().catch(() => '');
      if (!shown.includes(String(pincode))) throw new Error(`location did not apply (Amazon shows "${shown.trim()}")`);
      // Fresh search just says "no results" where Fresh doesn't deliver; the Fresh store page says it explicitly
      await page.goto('https://www.amazon.in/alm/storefront?almBrandId=ctnow', { waitUntil: 'domcontentloaded' });
      await sleep(4000);
      if (await page.getByText(/Fresh is not available for this location/i).first().isVisible().catch(() => false)) throw new Error(`UNSERVICEABLE: Amazon Fresh does not deliver to ${pincode}`);
    },
    async search(page, query) {
      await page.goto(`https://www.amazon.in/s?k=${encodeURIComponent(query)}&i=nowstore`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('[data-component-type="s-search-result"], text=/not available for this location/i', { timeout: 20000 }).catch(() => {});
      if (await page.getByText(/Fresh is not available for this location/i).first().isVisible().catch(() => false)) throw new Error('UNAVAILABLE: Amazon Fresh does not deliver to this pincode');
      return page.$$eval('[data-component-type="s-search-result"]', (els) =>
        els.slice(0, 24).map((e) => {
          const name = (e.querySelector('[data-cy="title-recipe"]')?.innerText || [...e.querySelectorAll('h2')].map((h) => h.innerText).join(' ')).replace(/\s+/g, ' ').trim();
          const pr = (sel) => {
            const t = e.querySelector(sel)?.textContent || '';
            const v = parseFloat(t.replace(/[^\d.]/g, ''));
            return Number.isFinite(v) ? v : null;
          };
          const text = e.innerText || '';
          const qm = text.match(/\b\d+(?:\.\d+)?\s*(?:kg|g|gm|pcs?|pieces?|units?|bunch)\b[^\n₹]*/i);
          const a = e.querySelector('h2 a, a.a-link-normal[href*="/dp/"]');
          return {
            name,
            qtyText: qm ? qm[0].slice(0, 40) : '',
            price: pr('.a-price:not(.a-text-price) .a-offscreen'),
            mrp: pr('.a-price[data-a-strike="true"] .a-offscreen'),
            inStock: !/currently unavailable|out of stock/i.test(text),
            url: a ? new URL(a.getAttribute('href'), location.origin).href.split('?')[0] : null,
          };
        }),
      );
    },
  },

  flipkart: {
    label: 'Flipkart Minutes',
    home: 'https://www.flipkart.com/search?q=onion&marketplace=HYPERLOCAL',
    // Flipkart Minutes only accepts a GPS location, so we geocode the pincode and "share" it.
    async setLocation(page, { pincode }) {
      const geo = await geocode(pincode);
      await page.context().grantPermissions(['geolocation'], { origin: 'https://www.flipkart.com' });
      await page.context().setGeolocation(geo);
      await page.goto(this.home, { waitUntil: 'domcontentloaded' });
      await sleep(5000);
      const useCurrent = page.getByText(/Use my current location/i).first();
      for (let i = 0; i < 3 && !(await useCurrent.isVisible().catch(() => false)); i++) {
        await page.getByText(/Share your location|Select delivery|Delivery to/i).first().click().catch(() => {});
        await sleep(2500);
      }
      await useCurrent.click();
      await sleep(7000);
      if (await page.getByText(/not serviceable/i).first().isVisible().catch(() => false)) throw new Error(`UNSERVICEABLE: Flipkart Minutes does not deliver to ${pincode}`);
    },
    async search(page, query) {
      await page.goto(`https://www.flipkart.com/search?q=${encodeURIComponent(query)}&marketplace=HYPERLOCAL`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('text=/₹/', { timeout: 20000 }).catch(() => {});
      await sleep(1500);
      await scrollToLoad(page, 1);
      return page.evaluate(extractCards);
    },
  },
};
