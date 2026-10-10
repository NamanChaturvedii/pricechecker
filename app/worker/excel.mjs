import ExcelJS from 'exceljs';
import { reportPath } from './store.mjs';
import { SITES } from './sites.mjs';

const GREEN = 'FFD1FADF';
const HEAD = 'FF0F766E';

export async function writeReport(run) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Price Checker';
  const sites = run.sites;
  const when = new Date(run.startedAt).toLocaleString('en-IN');

  // ---- Sheet 1: comparison ----
  const ws = wb.addWorksheet('Price Comparison', { views: [{ state: 'frozen', ySplit: 3, xSplit: 2 }] });
  ws.mergeCells(1, 1, 1, sites.length + 4);
  ws.getCell(1, 1).value = `Vegetable price comparison — ${when} — Pincode ${run.pincode}`;
  ws.getCell(1, 1).font = { bold: true, size: 14 };
  const header = ['Item', 'Quantity', ...sites.map((s) => SITES[s].label), 'Cheapest (₹)', 'Cheapest at'];
  ws.getRow(3).values = header;
  ws.getRow(3).eachCell((c) => {
    c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEAD } };
    c.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  });
  run.items.forEach((item, i) => {
    const r = ws.getRow(4 + i);
    const res = run.results[item.id] || {};
    const prices = sites.map((s) => (res[s]?.status === 'ok' ? res[s].price : null));
    const valid = prices.filter((p) => p != null);
    const min = valid.length ? Math.min(...valid) : null;
    r.values = [
      item.name,
      `${item.qty} ${item.unit}`,
      ...sites.map((s, k) => (prices[k] != null ? prices[k] : res[s]?.status === 'out_of_stock' ? 'Out of stock' : res[s]?.status === 'error' ? 'Error' : res[s]?.status === 'not_delivered' ? 'Not delivered' : 'Not found')),
      min,
      min != null ? sites.filter((s, k) => prices[k] === min).map((s) => SITES[s].label).join(', ') : '-',
    ];
    sites.forEach((s, k) => {
      const c = r.getCell(3 + k);
      if (prices[k] != null) {
        c.numFmt = '₹#,##0.00';
        if (prices[k] === min) c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GREEN } };
        const notes = [];
        if (res[s].fallback) notes.push(`${SITES[s].label} does not deliver to ${run.pincode} — price taken from pincode ${res[s].fromPincode}`);
        if (res[s].locationUnverified) notes.push('Delivery location could not be confirmed — price may be from the site default area');
        if (res[s].approx) notes.push(`Approx — sold as ${res[s].packText || 'pack'} at ₹${res[s].packPrice}`);
        if (notes.length) c.note = notes.join('\n');
        if ((res[s].fallback || res[s].locationUnverified) && prices[k] !== min) c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
      } else c.font = { color: { argb: 'FF9CA3AF' }, italic: true };
    });
    r.getCell(sites.length + 3).numFmt = '₹#,##0.00';
    r.getCell(sites.length + 3).font = { bold: true };
  });
  ws.columns.forEach((col, i) => (col.width = i === 0 ? 24 : i === 1 ? 11 : 17));
  ws.addRow([]);
  ws.addRow(['Green = cheapest. Yellow = site does not deliver to this pincode, price taken from another area. Prices are converted to the quantity shown; hover a cell with a note for details.']).font = { italic: true, color: { argb: 'FF6B7280' } };

  // ---- Sheet 2: details ----
  const ds = wb.addWorksheet('Details', { views: [{ state: 'frozen', ySplit: 1 }] });
  ds.columns = [
    { header: 'Item', key: 'item', width: 22 },
    { header: 'Qty', key: 'qty', width: 9 },
    { header: 'Site', key: 'site', width: 16 },
    { header: 'Status', key: 'status', width: 13 },
    { header: 'Matched product', key: 'product', width: 42 },
    { header: 'Pack size', key: 'pack', width: 16 },
    { header: 'Pack price (₹)', key: 'packPrice', width: 13 },
    { header: 'MRP (₹)', key: 'mrp', width: 10 },
    { header: 'Price for qty (₹)', key: 'price', width: 15 },
    { header: 'Approx?', key: 'approx', width: 9 },
    { header: 'Price from pincode', key: 'from', width: 16 },
    { header: 'Link', key: 'url', width: 40 },
  ];
  ds.getRow(1).eachCell((c) => {
    c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEAD } };
  });
  for (const item of run.items)
    for (const s of sites) {
      const r = run.results[item.id]?.[s] || { status: 'not_run' };
      ds.addRow({
        item: item.name,
        qty: `${item.qty} ${item.unit}`,
        site: SITES[s].label,
        status: r.status,
        product: r.product || r.error || '',
        pack: r.packText || '',
        packPrice: r.packPrice ?? null,
        mrp: r.mrp ?? null,
        price: r.price ?? null,
        approx: r.approx ? 'Yes' : '',
        from: r.status === 'ok' ? (r.fallback ? r.fromPincode : run.pincode) + (r.locationUnverified ? ' (unconfirmed)' : '') : '',
        url: r.url ? { text: 'open', hyperlink: r.url } : '',
      });
    }

  const out = reportPath(run.id);
  await wb.xlsx.writeFile(out);
  return out;
}
