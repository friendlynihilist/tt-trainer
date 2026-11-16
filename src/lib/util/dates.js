// Date come stringhe ISO locali 'YYYY-MM-DD': niente fusi orari, niente sorprese.

const DAY = 86400000;

export const WEEKDAYS = ['lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato', 'domenica'];
export const WEEKDAYS_SHORT = ['lun', 'mar', 'mer', 'gio', 'ven', 'sab', 'dom'];
export const WEEKDAYS_MIN = ['L', 'M', 'M', 'G', 'V', 'S', 'D'];
export const MONTHS = [
  'gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
  'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'
];
export const MONTHS_SHORT = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];

const pad = (n) => String(n).padStart(2, '0');

export function iso(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Mezzogiorno locale: così sommare giorni non inciampa nell'ora legale. */
export function parse(isoDate) {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
}

export function today() {
  return iso(new Date());
}

export function addDays(isoDate, n) {
  const d = parse(isoDate);
  d.setDate(d.getDate() + n);
  return iso(d);
}

export function diffDays(a, b) {
  return Math.round((parse(b) - parse(a)) / DAY);
}

/** Giorno della settimana ISO: 1 = lunedì … 7 = domenica. */
export function weekday(isoDate) {
  return ((parse(isoDate).getDay() + 6) % 7) + 1;
}

export function mondayOf(isoDate) {
  return addDays(isoDate, 1 - weekday(isoDate));
}

export function monthKey(isoDate) {
  return isoDate.slice(0, 7);
}

export function addMonths(key, n) {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1, 12);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

/** Griglia del mese: settimane intere da lunedì a domenica. */
export function monthGrid(key) {
  const first = `${key}-01`;
  const start = mondayOf(first);
  const [y, m] = key.split('-').map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  const last = `${key}-${pad(daysInMonth)}`;
  const weeks = [];
  let cursor = start;
  while (cursor <= last) {
    const week = [];
    for (let i = 0; i < 7; i++) week.push(addDays(cursor, i));
    weeks.push(week);
    cursor = addDays(cursor, 7);
  }
  return weeks;
}

/** 'ven 20 nov' */
export function fmtShort(isoDate) {
  const d = parse(isoDate);
  return `${WEEKDAYS_SHORT[weekday(isoDate) - 1]} ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
}

/** 'venerdì 20 novembre' */
export function fmtLong(isoDate) {
  const d = parse(isoDate);
  return `${WEEKDAYS[weekday(isoDate) - 1]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/** '20 nov' */
export function fmtDay(isoDate) {
  const d = parse(isoDate);
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
}

/** 'novembre 2026' */
export function fmtMonth(key) {
  const [y, m] = key.split('-').map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}

/** 'oggi', 'domani', 'ieri' oppure la data breve. */
export function fmtRelative(isoDate, ref = today()) {
  const n = diffDays(ref, isoDate);
  if (n === 0) return 'oggi';
  if (n === 1) return 'domani';
  if (n === -1) return 'ieri';
  return fmtShort(isoDate);
}

export function fmtClock(totalSeconds) {
  const sec = Math.max(0, Math.round(totalSeconds));
  return `${Math.floor(sec / 60)}:${pad(sec % 60)}`;
}

export function fmtDuration(minutes) {
  if (!minutes) return '0 min';
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${m}` : `${h} h`;
}
