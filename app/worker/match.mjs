// Quantity parsing, product matching and price normalisation.

const UNIT_G = { kg: 1000, kgs: 1000, kilo: 1000, kilogram: 1000, g: 1, gm: 1, gms: 1, gram: 1, grams: 1, gr: 1 };
const PCS = ['pc', 'pcs', 'piece', 'pieces', 'unit', 'units', 'no', 'nos', 'n'];
const BUNCH = ['bunch', 'bunches', 'bundle'];

const num = (s) => parseFloat(String(s).replace(/,/g, ''));

/** Parse "900 g - 1 kg", "6 pcs (approx 1 kg)", "1000 g X 2", "1 bunch" → { grams, pcs, bunch } */
export function parseQty(text) {
  const t = ` ${String(text || '').toLowerCase().replace(/\s+/g, ' ')} `;
  const out = {};
  let mult = 1;
  const m = t.match(/(?:x|×)\s*(\d+)\b(?!\s*(?:g|kg|gm))/);
  if (m) mult = num(m[1]);

  // weight range: "900 g - 1 kg", "200-300 g", "1 - 1.2 kg"
  const range = t.match(/(\d+(?:\.\d+)?)\s*(kg|g|gm|gms|grams?)?\s*(?:-|to|–)\s*(\d+(?:\.\d+)?)\s*(kgs?|g|gm|gms|grams?)\b/);
  if (range) {
    const u2 = UNIT_G[range[4]] ?? 1;
    const u1 = range[2] ? (UNIT_G[range[2]] ?? 1) : u2;
    out.grams = Math.max(num(range[1]) * u1, num(range[3]) * u2) * mult;
  } else {
    const w = t.match(/(\d+(?:\.\d+)?)\s*(kgs?|kilograms?|kilo|grams?|gms?|gr|g)\b/);
    if (w) out.grams = num(w[1]) * (UNIT_G[w[2]] ?? UNIT_G[w[2].replace(/s$/, '')] ?? 1) * mult;
  }
  const p = t.match(/(\d+)\s*(?:-\s*\d+\s*)?(pcs|pc|pieces|piece|units|unit|nos|no)\b/);
  if (p) out.pcs = num(p[1]) * mult;
  const b = t.match(/(\d+)?\s*(bunch|bunches|bundle)\b/);
  if (b) out.bunch = (b[1] ? num(b[1]) : 1) * mult;
  return out;
}

const wordRe = (w) => new RegExp(`(^|[^a-z])${w.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z]|$)`);
const has = (name, w) => wordRe(w).test(name);

/** Price for the item's target quantity (e.g. 1 kg / 3 pc / 1 bunch). */
export function normalise(item, q, price) {
  const target = item.qty || 1;
  const approxG = item.approxG || 0;
  if (item.unit === 'kg' || item.unit === 'g') {
    const tg = item.unit === 'kg' ? target * 1000 : target;
    if (q.grams) return { price: (price * tg) / q.grams, exact: Math.abs(q.grams - tg) < 1, approx: false };
    if (q.pcs && approxG) return { price: (price * tg) / (q.pcs * approxG), exact: false, approx: true };
    if (q.bunch && approxG) return { price: (price * tg) / (q.bunch * approxG), exact: false, approx: true };
    return null;
  }
  if (item.unit === 'pc') {
    if (q.pcs) return { price: (price * target) / q.pcs, exact: q.pcs === target, approx: false };
    if (q.grams && approxG) {
      // a single "1 pc" listed by weight (e.g. "Pineapple 1 kg") — treat a pack ~one piece as one piece
      const pieces = Math.max(1, Math.round(q.grams / approxG));
      return { price: (price * target) / pieces, exact: pieces === target, approx: true };
    }
    return { price: price * target, exact: target === 1, approx: true };
  }
  if (item.unit === 'bunch') {
    if (q.bunch) return { price: (price * target) / q.bunch, exact: q.bunch === target, approx: false };
    if (q.pcs) return { price: (price * target) / q.pcs, exact: false, approx: true };
    if (q.grams && approxG) return { price: (price * target * approxG) / q.grams, exact: false, approx: true };
    return { price: price * target, exact: false, approx: true };
  }
  return null;
}

/**
 * Pick the best product for an item from a site's search results.
 * products: [{ name, qtyText, price, mrp, inStock, url }]
 */
export function pickBest(item, products) {
  const cands = [];
  products.forEach((p, idx) => {
    const name = ` ${String(p.name || '').toLowerCase()} `;
    if (!p.price || p.price <= 0) return;
    if (!item.must.some((w) => has(name, w))) return;
    if (item.avoid.some((w) => has(name, w))) return;
    if (name.trim().split(/\s+/).length > 12) return; // long marketing titles are packaged goods, not produce
    const q = parseQty(`${p.qtyText || ''} ${p.name}`);
    const norm = normalise(item, q, p.price);
    if (!norm) return;
    let score = 10;
    score += item.prefer.filter((w) => has(name, w)).length * 4;
    if (norm.exact) score += 4;
    if (!norm.approx) score += 3;
    if (p.inStock === false) score -= 30;
    score -= idx * 0.15;
    cands.push({ ...p, q, norm, score });
  });
  if (!cands.length) return { status: 'not_found', alternatives: products.slice(0, 5).map((p) => `${p.name} ${p.qtyText || ''} ₹${p.price}`) };
  cands.sort((a, b) => b.score - a.score || a.norm.price - b.norm.price);
  const best = cands[0];
  return {
    status: best.inStock === false ? 'out_of_stock' : 'ok',
    product: best.name,
    packText: best.qtyText || '',
    packPrice: best.price,
    mrp: best.mrp && best.mrp >= best.price ? best.mrp : null, // ignore per-unit prices mistaken for MRP
    price: Math.round(best.norm.price * 100) / 100,
    exact: best.norm.exact,
    approx: best.norm.approx,
    url: best.url || null,
    alternatives: cands.slice(1, 4).map((c) => `${c.name} ${c.qtyText || ''} ₹${c.price}`),
  };
}
