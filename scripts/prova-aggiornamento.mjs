// Prova il passaggio di chi aveva già l'app (una 0.7.0 con piano, allenamenti e note): le novità, la
// guida, l'allenamento di prima letto a mattoni, il tema scuro e lo schermo largo.
// Chrome senza finestra, con gesti veri (tocchi e trascinamenti), in modalità locale.
//
//   VITE_LOCAL=1 npx vite --port 5175 --strictPort   (in un altro terminale)
//   node scripts/prova-aggiornamento.mjs <cartella per le schermate>
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const out = process.argv[2] ?? 'docs/design-shots/prova';
const BASE = 'http://localhost:5175/';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const profile = mkdtempSync(join(tmpdir(), 'tt-a-'));
const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', ['--headless=new', '--remote-debugging-port=9336', `--user-data-dir=${profile}`, '--no-first-run', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
async function target() { for (let i = 0; i < 50; i++) { try { const l = await (await fetch('http://127.0.0.1:9336/json/list')).json(); const p = l.find((t) => t.type === 'page'); if (p) return p.webSocketDebuggerUrl; } catch {} await sleep(200); } throw new Error('chrome'); }
const ws = new WebSocket(await target()); await new Promise((r) => (ws.onopen = r));
let seq = 0; const pending = new Map(); const errors = [];
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description?.split('\n').slice(0, 3).join(' | ') ?? m.params.exceptionDetails.text); if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') errors.push('log: ' + m.params.entry.text); };
const send = (method, params = {}) => new Promise((res, rej) => { const id = ++seq; pending.set(id, (m) => (m.error ? rej(new Error(m.error.message)) : res(m.result))); ws.send(JSON.stringify({ id, method, params })); });
const ev = async (x) => { const r = await send('Runtime.evaluate', { expression: x, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text); return r.result?.value; };
await send('Page.enable'); await send('Runtime.enable'); await send('Log.enable');
mkdirSync(out, { recursive: true });
const shot = async (name) => { const { data } = await send('Page.captureScreenshot', { format: 'jpeg', quality: 78 }); writeFileSync(join(out, name + '.jpg'), Buffer.from(data, 'base64')); };
let bad = 0;
const check = (name, got, want) => { const ok = JSON.stringify(got) === JSON.stringify(want); if (!ok) bad++; console.log(ok ? 'ok ' : 'NO ', name, ok ? '' : `→ ${JSON.stringify(got)} invece di ${JSON.stringify(want)}`); };
const at = (sel, fx = 0.5, fy = 0.5) => ev(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) throw new Error('non trovo ${sel.replace(/'/g, '')}'); e.scrollIntoView({ block: 'nearest', inline: 'nearest' }); const r = e.getBoundingClientRect(); return { x: r.x + r.width * ${fx}, y: r.y + r.height * ${fy} }; })()`);
const mouse = (type, x, y) => send('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mouseReleased' ? 0 : 1, clickCount: 1 });
const tap = async (sel, wait = 450) => { const p = await at(sel); await mouse('mousePressed', p.x, p.y); await mouse('mouseReleased', p.x, p.y); await sleep(wait); };
const tapText = async (re, sel = 'button', wait = 450) => { const p = await ev(`(() => { const e = [...document.querySelectorAll(${JSON.stringify(sel)})].find((x) => ${re}.test(x.textContent.trim()) && x.offsetParent !== null); if (!e) throw new Error('non trovo ' + ${JSON.stringify(String(re))}); e.scrollIntoView({ block: 'nearest' }); const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`); await mouse('mousePressed', p.x, p.y); await mouse('mouseReleased', p.x, p.y); await sleep(wait); };
const drag = async (a, b, n = 14) => { await mouse('mousePressed', a.x, a.y); for (let k = 1; k <= n; k++) { await mouse('mouseMoved', a.x + (b.x - a.x) * k / n, a.y + (b.y - a.y) * k / n); await sleep(24); } await mouse('mouseReleased', b.x, b.y); await sleep(450); };
const type = async (sel, text) => { await ev(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); e.focus(); e.select?.(); })()`); await send('Input.insertText', { text }); await sleep(200); };
const names = () => ev(`[...document.querySelectorAll('#tower .brk-t b')].map((b) => b.textContent)`);
const total = () => ev(`document.querySelector('.total').textContent`);
const store = () => ev(`JSON.parse(localStorage.getItem('tt-trainer:v1'))`);
const sameBox = (a, b) => ev(`(() => { const a = document.querySelector(${JSON.stringify(a)}).getBoundingClientRect(), b = document.querySelector(${JSON.stringify(b)}).getBoundingClientRect(); return Math.abs(a.top - b.top) < 10 && Math.abs(a.bottom - b.bottom) < 16 && Math.abs(a.left - b.left) < 10 && Math.abs(a.right - b.right) < 10; })()`);
const coach = () => ev(`document.querySelector('.coach .title')?.textContent ?? null`);
try {
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'dark' }] });
await send('Page.navigate', { url: BASE }); await sleep(800);
// Chi usava già l'app: un piano a tappe di prima, un allenamento suo, la versione 0.7.0 già vista.
const iso = (d) => d.toISOString().slice(0, 10);
const now = new Date(); now.setHours(12, 0, 0, 0);
const monday = new Date(now); monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7) - 14);
const wd = ((now.getDay() + 6) % 7) + 1;
const ago = (n) => { const d = new Date(now); d.setDate(d.getDate() - n); return iso(d); };
const seed = { session: true, meta: { onboarded: true, seenVersion: '0.7.0', profile: { name: 'Carlo' }, settings: { theme: 'dark', sound: false }, player: { level: 'intermedio', since: ago(20), history: [], declined: null },
  plan: { id: 'p1', start: iso(monday), weeks: ['1','1','1','1','2','2','2','2'], stages: [{ b: '1', n: 4, u: 'w' }, { b: '2', n: 4, u: 'w' }], slots: [{ id: 't1', day: wd, kind: 'training', template: 'completo' }, { id: 'x', day: wd, kind: 'test' }], skip: [] },
  custom: { templates: [{ id: 'cmio', custom: true, name: 'Rovescio 60′', color: 'pink', blocks: [{ name: 'Riscaldamento', minutes: 10, role: 'warmup', items: [] }, { name: 'Top', minutes: 30, role: null, items: [{ ex: 'top-r-block' }, { ex: 'top-r-due-punti' }] }, { name: 'Partitella', minutes: 15, role: 'match', items: [] }] }] } },
  events: { s1: { id: 's1', date: ago(9), createdAt: 1, kind: 'training', template: 'completo', minutes: 90, feel: 4, attempts: [{ ex: 'ap-d', fmt: 'su', tries: [9] }, { ex: 'top-d-block', fmt: 'fila', tries: [7, 12] }] }, s2: { id: 's2', date: ago(2), createdAt: 2, kind: 'test', minutes: 20, attempts: [{ ex: 'srv-pendolo', fmt: 'su', tries: [7] }, { ex: 'palleggio-d', fmt: 'fila', tries: [24] }] } },
  notes: { n1: { id: 'n1', stroke: 'ap-d', family: 'attacco', date: ago(9), text: 'Il polso parte troppo presto.', feel: 2, createdAt: 1, updatedAt: 1 } } };
await ev(`localStorage.clear(); localStorage.setItem('tt-trainer:v1', ${JSON.stringify(JSON.stringify(seed))}); localStorage.setItem('tt-trainer:theme', 'dark'); true`);
await send('Page.navigate', { url: `${BASE}?t=${Date.now()}#/oggi` }); await sleep(2200);
await shot('v-novita');
check('chi aveva già l’app vede le novità della 0.8.0', await ev(`document.querySelector('#wn-title')?.textContent`), 'Allenamenti a mattoni');
check('intanto la guida aspetta', await coach(), null);
await tapText('/^Andiamo$/', 'button', 1800); await shot('v-oggi-guida');
check('chiuse le novità, parte la guida delle medaglie', await coach(), 'Le medaglie');
await tap('.coach .skip', 600); await shot('v-oggi');
check('guida saltata e ricordata', [(await store()).meta.tour, await coach()], [{ app: true }, null]);
check('l’allenamento di prima si chiama per quello che contiene', await ev(`document.querySelector('.court h2').textContent`), 'Servizio e dritto');
check('con il test in calendario c’è la sua riga', await ev(`Boolean(document.querySelector('.test-pill'))`), true);
check('«Settimana 3 di 8»', await ev(`document.querySelector('.week .t-name').textContent`), 'Settimana 3 di 8');
await tap('.court .open', 800); await shot('v-foglio');
await tapText('/^Cambia i mattoni/', '.other', 1300); await shot('v-costruttore');
check('la prima volta nel costruttore parte la guida dei mattoni', await coach(), 'Aggiungi un mattone');
check('con i mattoni già nella torre c’è «Avanti»', await ev(`Boolean(document.querySelector('.coach .next'))`), true);
await tap('.coach .skip', 500);
check('l’allenamento di prima diventa mattoni', await names(), ['Riscaldamento', 'Servizio', 'Dritto', 'Dritto', 'Partita']);
await tapText('/^Salva$/', '.builder button', 1000); await shot('v-oggi-mio');
check('diventa un allenamento tuo, messo a oggi', [(await store()).meta.custom.templates.length, await ev(`document.querySelector('.court h2').textContent`)], [2, 'Servizio e dritto']);
await ev(`location.hash = '#/libreria'`); await sleep(1000); await shot('v-libreria');
check('in Libreria ci sono i due allenamenti tuoi', await ev(`[...document.querySelectorAll('.section')][0].querySelectorAll('.wk strong').length`), 2);
await ev(`location.hash = '#/progressi/mappa/dritto'`); await sleep(1300); await shot('v-mappa');
check('nella mappa le medaglie già prese', await ev(`document.querySelectorAll('#map .nd:not(.empty)').length > 0`), true);
await tap('.notes', 700); check('le note di prima sono fra quelle del dritto', await ev(`document.querySelector('.sheet').textContent.includes('Il polso parte troppo presto.')`), true); await shot('v-note'); await tap('.sheet .icon-btn');
await ev(`location.hash = '#/calendario'`); await sleep(1000); await shot('v-diario');
check('dal Diario si aggiunge un’attività', await ev(`[...document.querySelectorAll('button.add')].some((b) => /Aggiungi/.test(b.textContent))`), true);
await ev(`location.hash = '#/progressi'`); await sleep(1000); await shot('v-progressi');
await ev(`location.hash = '#/impostazioni'`); await sleep(900); await tapText('/^Novità/', 'button', 900); await shot('v-storia');
await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
await ev(`document.querySelector('.modal footer button')?.click()`); await ev(`location.hash = '#/oggi'`); await sleep(1200); await shot('v-largo-oggi');
await ev(`location.hash = '#/progressi/mappa/servizio'`); await sleep(1300); await shot('v-largo-mappa');
} catch (e) { bad++; console.log('FERMO:', e.message.split('\n')[0]); await shot('fermo').catch(() => {}); }
console.log('overflow orizzontale:', await ev('document.documentElement.scrollWidth > innerWidth'));
console.log('errori:', errors.length, errors.slice(0, 6));
console.log(bad ? `${bad} NON PASSATI` : 'tutti passati');
ws.close(); chrome.kill(); await sleep(300); rmSync(profile, { recursive: true, force: true });
