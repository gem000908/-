export function getPeriodRange(period, today = isoToday()) {
  const date = parseIsoDate(today);
  if (period === "weekly") return weeklyRange(date);
  if (period === "monthly") return monthlyRange(date);
  if (period === "yearly") return yearlyRange(date);
  throw new Error(`Unsupported period: ${period}`);
}

export function isDateInPeriod(date, period, today = isoToday()) {
  const range = getPeriodRange(period, today);
  return date >= range.start && date <= range.end;
}

export function isoToday(now = new Date()) {
  return formatDate(new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())));
}

function weeklyRange(date) {
  const day = date.getUTCDay();
  const offsetFromMonday = (day + 6) % 7;
  const start = addDays(date, -offsetFromMonday);
  const end = addDays(start, 6);
  return { start: formatDate(start), end: formatDate(end) };
}

function monthlyRange(date) {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
  return { start: formatDate(start), end: formatDate(end) };
}

function yearlyRange(date) {
  const year = date.getUTCFullYear();
  return { start: `${year}-01-01`, end: `${year}-12-31` };
}

function parseIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`Invalid ISO date: ${value}`);
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid ISO date: ${value}`);
  }
  return date;
}

function addDays(date, days) {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}
