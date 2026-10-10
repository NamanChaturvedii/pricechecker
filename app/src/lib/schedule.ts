import type { Settings } from './data';

/** Next scheduled run (local machine time) as ISO string, or null when the schedule is off. */
export function nextRunAt(s: Settings) {
  if (!s.scheduleEnabled) return null;
  const [h, m] = s.scheduleTime.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  if (d.getTime() <= Date.now()) d.setDate(d.getDate() + 1);
  return d.toISOString();
}
