// Screenshot di tutte le pagine a 390 px, tema scuro e chiaro, con dati di esempio.
// Usa Chrome senza finestra e il suo protocollo di debug: nessuna dipendenza in più.
//
//   VITE_LOCAL=1 npx vite --port 5175 --strictPort   (in un altro terminale)
//   node scripts/screenshots.mjs docs/design-shots/prima
//   node scripts/screenshots.mjs docs/design-shots oggi,sessione   (solo alcune)
//
// CHROME=/percorso/di/chrome per un'installazione diversa da quella standard su macOS.
// W=1280 H=800 per lo schermo largo.

import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE = process.env.BASE ?? 'http://localhost:5175/';
const PORT = 9333;
const OUT = process.argv[2] ?? 'docs/design-shots';
const ONLY = process.argv[3]?.split(',') ?? null;
// W=1280 H=800 per guardare lo schermo largo (di base il telefono, 390 × 844).
const W = Number(process.env.W ?? 390);
const H = Number(process.env.H ?? 844);
const MAX_H = 2600;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── Dati di esempio: un giocatore intermedio a metà del primo mese ─────────

function iso(d) {
  return d.toISOString().slice(0, 10);
}
function daysAgo(n) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return iso(d);
}
function mondayOf(d) {
  const x = new Date(d);
  const wd = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - wd);
  return iso(x);
}

function seed(theme, stages = null) {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const weekday = ((today.getDay() + 6) % 7) + 1; // 1 lunedì … 7 domenica
  const start = new Date(mondayOf(today));
  start.setDate(start.getDate() - 14); // terza settimana del piano
  let n = 0;
  const ev = (days, extra) => ({ id: `s${++n}`, date: daysAgo(days), createdAt: Date.now() - days * 864e5, ...extra });
  const events = [
    ev(15, { kind: 'training', template: 'pkg-intermedio-90', minutes: 90, feel: 3, attempts: [{ ex: 'top-d-block', fmt: 'fila', tries: [7, 12] }, { ex: 'ap-d', fmt: 'su', tries: [6] }] }),
    ev(12, { kind: 'test', minutes: 25, attempts: [{ ex: 'ap-d-multiball', fmt: 'su', tries: [8] }, { ex: 'srv-pendolo', fmt: 'su', tries: [5] }, { ex: 'palleggio-d', fmt: 'fila', tries: [24] }] }),
    ev(9, { kind: 'training', template: 'completo', minutes: 90, feel: 4, partner: { id: null, name: 'Marco' }, attempts: [{ ex: 'ap-d', fmt: 'su', tries: [9] }] }),
    ev(7, { kind: 'lezione', minutes: 60, note: 'Lezione sul servizio' }),
    ev(5, { kind: 'training', template: 'pkg-intermedio-60', minutes: 60, feel: 4, attempts: [{ ex: 'top-r-block', fmt: 'fila', tries: [6, 11] }, { ex: 'ric-taglio-corto', fmt: 'su', tries: [6] }] }),
    ev(2, { kind: 'test', minutes: 20, attempts: [{ ex: 'ap-d', fmt: 'su', tries: [9] }, { ex: 'srv-pendolo', fmt: 'su', tries: [7] }] }),
    ev(1, { kind: 'partite', minutes: 90 }),
    // Stamattina un test veloce: metà oro sul pendolo, così in Oggi c'è una medaglia presa oggi.
    ev(0, { kind: 'test', minutes: 15, attempts: [{ ex: 'srv-pendolo', fmt: 'su', tries: [8] }] })
  ];
  const notes = [
    { id: 'n1', stroke: 'ap-d', family: 'attacco', date: daysAgo(9), text: 'Il polso parte troppo presto.', feel: 2, createdAt: 1, updatedAt: 1 },
    { id: 'n2', stroke: 'ap-d', family: 'attacco', date: daysAgo(2), text: 'Meglio quando aspetto la palla. Gambe più basse.', feel: 4, ex: 'ap-d-multiball', createdAt: 2, updatedAt: 2 },
    { id: 'n3', stroke: 'srv-pendolo', family: 'servizio', date: daysAgo(5), text: 'Lancio più alto.', feel: 3, createdAt: 3, updatedAt: 3 }
  ];
  const meta = {
    onboarded: true,
    seenVersion: '9.9.9',
    // Le guide già viste: nelle schermate non devono coprire la pagina.
    tour: { build: true, app: true },
    focus: ['dritto', 'servizio'],
    profile: { name: 'Carlo' },
    settings: { theme, sound: false },
    player: { level: 'intermedio', since: daysAgo(20), history: [{ date: daysAgo(20), level: 'intermedio', how: 'scelto' }], declined: null },
    plan: {
      id: 'p1',
      start: iso(start),
      weeks: ['1', '1', '1', '1', '2', '2', '2', '2', '3', '3', '3', '3'],
      // Le tappe: Dritto 4 settimane, Rovescio per un allenamento, Primi colpi 2 settimane, una pausa,
      // Rovescio 4 settimane. Le settimane si ricavano dalle tappe all'apertura.
      stages: stages ?? [
        { b: '1', n: 4, u: 'w' },
        { b: '2', n: 1, u: 's' },
        { b: '3', n: 2, u: 'w' },
        { b: 'P', n: 1, u: 'w' },
        { b: '2', n: 4, u: 'w' }
      ],
      // Oggi un allenamento; gli altri appuntamenti in giorni diversi da oggi.
      slots: [
        { id: 't2', day: weekday, kind: 'training', template: 'pkg-intermedio-60' },
        ...[
          { id: 't1', kind: 'training', template: 'pkg-intermedio-90' },
          { id: 'x1', kind: 'test' },
          { id: 't3', kind: 'training', template: 'completo' }
        ].map((s, i) => ({ ...s, day: [1, 2, 3, 4, 5, 6, 7].filter((d) => d !== weekday)[i * 2] }))
      ],
      skip: [],
      createdAt: 1
    },
    custom: { templates: [{ id: 'cmio', name: 'Rovescio 60′', color: 'pink', blocks: [{ name: 'Riscaldamento', minutes: 10, role: 'warmup', items: [] }, { name: 'Top', minutes: 30, role: null, items: [{ ex: 'top-r-block' }, { ex: 'top-r-due-punti' }] }, { name: 'Partitella', minutes: 15, role: 'match', items: [] }] }] }
  };
  return { session: true, meta, events: Object.fromEntries(events.map((e) => [e.id, e])), notes: Object.fromEntries(notes.map((x) => [x.id, x])) };
}

// ── Le pagine ─────────────────────────────────────────────────────────────

const click = (pattern, sel = 'button') =>
  `(() => { const b = [...document.querySelectorAll(${JSON.stringify(sel)})].find((x) => ${pattern}.test(x.textContent.trim()) || ${pattern}.test(x.getAttribute('aria-label') ?? '')); if (!b) throw new Error('non trovo ' + ${JSON.stringify(String(pattern))}); b.click(); })()`;

// Apre l'obiettivo del terzo esercizio (top di dritto contro block) e registra 20 di fila: metà oro.
const MEDAL = [
  click('/^(Inizia|Riprendi)/'),
  `document.querySelectorAll('[role=tab]')[2].click()`,
  click('/Prova l.obiettivo/'),
  `(() => { const i = document.querySelector('.goal input[type=number]'); i.value = '20'; i.dispatchEvent(new Event('input', { bubbles: true })); })()`,
  click('/^Registra il 1/')
];

const SHOTS = [
  { name: 'oggi', hash: 'oggi' },
  { name: 'diario', hash: 'calendario' },
  { name: 'progressi', hash: 'progressi' },
  // Gli esercizi chiave aperti e il medagliere filtrato sull'attacco.
  // Il riflesso sulle medaglie del medagliere, fermato a metà corsa.
  {
    name: 'progressi-riflesso',
    hash: 'progressi',
    steps: [
      `document.querySelector('.tiers').scrollIntoView({ block: 'center' })`,
      `document.getAnimations().filter((a) => /sweep|glare/.test(a.animationName)).forEach((a) => { a.pause(); a.currentTime = a.effect.getTiming().delay + (/sweep/.test(a.animationName) ? 600 : 320); })`
    ],
    viewport: true
  },
  { name: 'progressi-dettagli', hash: 'progressi', steps: [click('/^Esercizi chiave/'), click('/^Attacco/', '.fam')] },
  { name: 'libreria-allenamenti', hash: 'libreria/allenamenti' },
  { name: 'libreria-esercizi', hash: 'libreria/esercizi' },
  { name: 'libreria-colpi', hash: 'libreria/colpi' },
  // La ricerca: «top» apre le famiglie che hanno un esercizio con quel nome.
  {
    name: 'libreria-cerca',
    hash: 'libreria/esercizi',
    steps: [`(() => { const i = document.querySelector('.search input'); i.value = 'top'; i.dispatchEvent(new Event('input', { bubbles: true })); })()`]
  },
  { name: 'guida', hash: 'guida' },
  { name: 'impostazioni', hash: 'impostazioni' },
  // Gli altri fogli.
  // Oggi vuoto nel Diario: resta la riga «Aggiungi a oggi», che apre il foglio per aggiungere.
  {
    name: 'diario-oggi-vuoto',
    hash: 'calendario',
    patch: (d) => {
      const today = new Date();
      today.setHours(12, 0, 0, 0);
      const iso = today.toISOString().slice(0, 10);
      const wd = ((today.getDay() + 6) % 7) + 1;
      d.events = Object.fromEntries(Object.entries(d.events).filter(([, e]) => e.date !== iso));
      d.meta.plan.slots = d.meta.plan.slots.filter((x) => x.day !== wd);
      return d;
    },
    steps: [click('/^Aggiungi a oggi/')],
    viewport: true
  },
  { name: 'foglio-voce', hash: 'calendario', steps: [click('/^Test/', 'button.item')] },
  { name: 'foglio-fatto', hash: 'calendario', steps: [click('/^Nel mese/'), `[...document.querySelectorAll('button.item')].find((b) => b.querySelector('.chips') && !/^Test/.test(b.querySelector('strong').textContent)).click()`], viewport: true },
  { name: 'quando', hash: 'oggi', steps: [`document.querySelector('nav button.add').click()`, `document.querySelector('[data-tile=dritto]').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 5, clientY: 5 })); window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: 5, clientY: 5 }))`, `[...document.querySelectorAll('.builder footer button')].find((b) => /Avanti/.test(b.textContent)).click()`], viewport: true },
  { name: 'foglio-livello', hash: 'progressi', steps: [`document.querySelector('.lv-top button').click()`] },
  { name: 'foglio-percorso', hash: 'libreria/allenamenti', steps: [click('/^Percorsi/'), click('/^Top di dritto/', 'button.item')] },
  { name: 'foglio-mese', hash: 'libreria/allenamenti', steps: [click('/^Mesi/'), click('/^Dritto/', 'button.item')] },
  { name: 'foglio-nota', hash: 'libreria/colpi', steps: [click('/^Attacco/'), click('/^Apertura di dritto su taglio/', 'button.item'), click('/^Aggiungi una nota/')] },
  // Il foglio per aggiungere un'attività si apre dal Diario; il tasto + apre il costruttore.
  { name: 'foglio-aggiungi', hash: 'calendario', steps: [click('/Aggiungi a/', 'button.add')], viewport: true },
  { name: 'costruttore', hash: 'oggi', steps: [`document.querySelector('nav button.add').click()`, `document.querySelector('[data-tile=dritto]').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 5, clientY: 5 })); window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: 5, clientY: 5 }))`], viewport: true },
  { name: 'mappa', hash: 'progressi/mappa/dritto' },
  { name: 'novita', hash: 'oggi', patch: (d) => ({ ...d, meta: { ...d.meta, seenVersion: '0.7.0' } }), viewport: true },
  { name: 'scheda-esercizio', hash: 'libreria/esercizi', steps: [click('/^Attacco/'), click('/^Top di dritto contro block/', 'button.item')] },
  { name: 'scheda-allenamento', hash: 'libreria/allenamenti', steps: [click('/^Pacchetti/'), click('/^90′$/', '.pk button')] },
  { name: 'scheda-colpo', hash: 'libreria/colpi', steps: [click('/^Attacco/'), click('/^Apertura di dritto su taglio/', 'button.item')] },
  {
    name: 'sessione',
    hash: 'oggi',
    steps: [click('/^(Inizia|Riprendi)/'), `document.querySelectorAll('[role=tab]')[2].click()`, click('/Prova l.obiettivo/')],
    viewport: true
  },
  { name: 'sessione-chiusura', hash: 'oggi', steps: [click('/^(Inizia|Riprendi)/'), `document.querySelector('[role=tab][aria-label=Chiusura]').click()`], viewport: true },
  // Il foglio dell'allenamento di oggi, con i suoi fondamentali.
  { name: 'oggi-fondamentali', hash: 'oggi', steps: [`document.querySelector('.court .open').click()`], viewport: true },
  // Il primo avvio: la prima schermata, per chi arriva ora.
  { name: 'primo-avvio', hash: 'oggi', patch: (d) => ({ ...d, meta: { settings: d.meta.settings } }), viewport: true },
  { name: 'accesso', hash: 'oggi', patch: (d) => ({ ...d, session: false }), viewport: true },
  // Oggi un tema per un allenamento solo, in mezzo ad altri: Dritto 2 settimane, poi Rovescio,
  // Primi colpi (oggi) e Dritto per un allenamento ciascuno, poi Rovescio 2 settimane.
  {
    name: 'oggi-allenamento-solo',
    hash: 'oggi',
    stages: [
      { b: '1', n: 2, u: 'w' },
      { b: '2', n: 1, u: 's' },
      { b: '3', n: 1, u: 's' },
      { b: '1', n: 1, u: 's' },
      { b: '2', n: 2, u: 'w' }
    ],
    viewport: true
  },
  { name: 'sessione-inizio', hash: 'oggi', steps: [click('/^(Inizia|Riprendi)/')], viewport: true },
  // Il cambio: a metà esercizio tocca al compagno e il riquadro diventa scuro (qui con l'inversione a mano).
  { name: 'sessione-cambio', hash: 'oggi', steps: [click('/^(Inizia|Riprendi)/'), `document.querySelectorAll('[role=tab]')[2].click()`, click('/^Tocca a te/')], viewport: true },
  { name: 'sessione-medaglia', hash: 'oggi', steps: [...MEDAL], viewport: true },
  { name: 'sessione-chiusura-medaglia', hash: 'oggi', steps: [...MEDAL, `document.querySelector('[role=tab][aria-label=Chiusura]').click()`], viewport: true }
];

// ── Chrome e il protocollo di debug ───────────────────────────────────────

const profile = mkdtempSync(join(tmpdir(), 'tt-shots-'));
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', '--hide-scrollbars', '--mute-audio', 'about:blank'], { stdio: 'ignore' });

async function target() {
  for (let i = 0; i < 50; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      const page = list.find((t) => t.type === 'page');
      if (page) return page.webSocketDebuggerUrl;
    } catch {}
    await sleep(200);
  }
  throw new Error('Chrome non risponde');
}

const ws = new WebSocket(await target());
await new Promise((r) => (ws.onopen = r));
let seq = 0;
const pending = new Map();
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) {
    pending.get(m.id)(m);
    pending.delete(m.id);
  }
};
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const id = ++seq;
    pending.set(id, (m) => (m.error ? reject(new Error(`${method}: ${m.error.message}`)) : resolve(m.result)));
    ws.send(JSON.stringify({ id, method, params }));
  });
const evaluate = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
  return r.result?.value;
};

await send('Page.enable');
await send('Runtime.enable');
mkdirSync(OUT, { recursive: true });

try {
  for (const theme of ['dark', 'light']) {
    await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: theme }] });
    for (const shot of SHOTS) {
      if (ONLY && !ONLY.includes(shot.name)) continue;
      await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 2, mobile: W < 700 });
      await send('Page.navigate', { url: BASE });
      await sleep(600);
      await evaluate(`localStorage.clear(); localStorage.setItem('tt-trainer:v1', ${JSON.stringify(JSON.stringify((shot.patch ?? ((x) => x))(seed(theme, shot.stages === 'solo' ? SHOTS.find((x) => x.name === 'oggi-allenamento-solo').stages : shot.stages))))}); localStorage.setItem('tt-trainer:theme', '${theme}'); true`);
      await send('Page.navigate', { url: `${BASE}?t=${Date.now()}#/${shot.hash}` });
      await sleep(1600);
      for (const step of shot.steps ?? []) {
        await evaluate(step);
        await sleep(900);
      }
      await sleep(600);
      let height = H;
      if (!shot.viewport) {
        height = Math.min(MAX_H, await evaluate('document.documentElement.scrollHeight'));
        await send('Emulation.setDeviceMetricsOverride', { width: W, height, deviceScaleFactor: 2, mobile: W < 700 });
        await sleep(500);
      }
      const { data } = await send('Page.captureScreenshot', { format: 'jpeg', quality: 72 });
      const file = join(OUT, `${shot.name}-${theme === 'dark' ? 'scuro' : 'chiaro'}.jpg`);
      writeFileSync(file, Buffer.from(data, 'base64'));
      console.log(file, height);
    }
  }
} finally {
  ws.close();
  chrome.kill();
  await sleep(300);
  rmSync(profile, { recursive: true, force: true });
}
