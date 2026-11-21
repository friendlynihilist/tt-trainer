// Prova il primo avvio dall'inizio alla fine: le domande, il costruttore con la guida, Oggi, la mappa,
// il tasto +, la Libreria, la sessione e le note.
// Chrome senza finestra, con gesti veri (tocchi e trascinamenti), in modalità locale.
//
//   VITE_LOCAL=1 npx vite --port 5175 --strictPort   (in un altro terminale)
//   node scripts/prova-primo-avvio.mjs <cartella per le schermate>
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
await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }] });
await send('Page.navigate', { url: BASE }); await sleep(800);
await ev(`localStorage.clear(); localStorage.setItem('tt-trainer:v1', JSON.stringify({ session: true, meta: { settings: { theme: 'light', sound: false } }, events: {}, notes: {} })); true`);
await send('Page.navigate', { url: `${BASE}?t=${Date.now()}#/oggi` }); await sleep(1800);
await shot('1-benvenuto');
await type('input.field', 'Carlo'); await tapText('/^Comincia$/'); await shot('2-livello');
await tapText('/^Intermedio/', '.choice'); await shot('2-colpi');
check('senza colpi non si va avanti', await ev(`[...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Avanti').disabled`), true);
await tapText('/^Dritto/', '.mat button'); await tapText('/^Servizio/', '.mat button'); await tapText('/^Avanti$/'); await sleep(300); await shot('2-scelta');
check('tre allenamenti proposti', await ev(`[...document.querySelectorAll('.choice.col .row > b')].map((b) => b.textContent)`), ['Dritto e servizio', 'Dritto, servizio e ricezione', 'Dritto, servizio, ricezione e gambe']);
await tapText('/Preferisco costruirlo io/'); await sleep(1200); await shot('3-guida-aggiungi');
check('la guida parte dal vassoio', await coach(), 'Aggiungi un fondamentale');
check('il fuoco è sul vassoio', await ev(`(() => { const a = document.querySelector('.coach .ring').getBoundingClientRect(), b = document.getElementById('tray').getBoundingClientRect(); return Math.abs(a.top - b.top) < 10 && Math.abs(a.bottom - b.bottom) < 10; })()`), true);
check('si va avanti solo aggiungendo', await ev(`Boolean(document.querySelector('.coach .next'))`), false);
check('i colpi scelti sono i primi del vassoio', await ev(`[...document.querySelectorAll('[data-tile]')].slice(0, 2).map((b) => b.dataset.tile)`), ['dritto', 'servizio']);
await tap('[data-tile=dritto]', 1100); await shot('3-guida-durata');
check('aggiunto, la guida passa alla durata', await coach(), 'Decidi quanto dura');
check('il fuoco è sul fondamentale', await sameBox('.coach .ring', '#tower .brk'), true);
check('fuori dal fuoco non si tocca', await ev(`(() => { const r = document.getElementById('tray').getBoundingClientRect(); return document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)?.className.split(' ')[0]; })()`), 'dim');
{ const g = await at('#tower .brk [data-grip]', 0.5, 0.4); await drag(g, { x: g.x, y: g.y + 50 }); await sleep(900); }
check('allungato, la guida passa agli esercizi', [await coach(), await total()], ['Scegli gli esercizi', '30']);
check('il fuoco segue il fondamentale allungato', await sameBox('.coach .ring', '#tower .brk'), true);
await shot('3-guida-esercizi');
await tap('#tower .brk', 900); await shot('5-dentro-il-fondamentale');
check('nel fondamentale ci sono gli esercizi del dritto', await ev(`document.querySelectorAll('.opt').length > 12`), true);
check('si parte da 10 minuti', await ev(`document.querySelector('.mins button').textContent`), '10′');
await tap('.opt[aria-pressed=false]'); await tapText('/^Fatto$/'); await sleep(1100);
check('due esercizi sul fondamentale', await ev(`document.querySelector('#tower .brk small').textContent.includes(', ')`), true);
check('chiuso il fondamentale, la guida passa all’ordine', await coach(), 'Cambia l’ordine');
await shot('3-guida-ordine'); await tap('.coach .next');
check('guida finita e ricordata', [await coach(), (await store()).meta.tour], [null, { build: true }]);
await tap('[data-tile=servizio]'); await tap('[data-tile=partita]');
check('tre fondamentali', [await names(), await total()], [['Dritto', 'Servizio', 'Partita'], '50']);
{ const g = await at('#tower .brk:nth-child(2) [data-grip]', 0.5, 0.4); await drag(g, { x: g.x, y: g.y - 40 }); }
check('mai sotto i 10 minuti', await total(), '50');
{ const s1 = await at('#tower .brk:nth-child(2)'); const d1 = await at('#tower .brk:nth-child(1)', 0.5, 0.1); await drag(s1, { x: s1.x, y: d1.y - 10 }, 20); await sleep(300); }
check('spostato in cima', await names(), ['Servizio', 'Dritto', 'Partita']);
{ const t1 = await at('[data-tile=gambe]'); const p1 = await at('#tower .brk:nth-child(3)', 0.5, 0.2); await drag(t1, { x: p1.x, y: p1.y }, 20); }
check('trascinato dal vassoio nel punto scelto', await names(), ['Servizio', 'Dritto', 'Gambe', 'Partita']);
await shot('4-torre');
await tapText('/^Avanti$/'); await shot('5-per-quanto'); await tapText('/^Un mese/', '.choice'); await shot('6-giorni');
await tapText('/^Avanti$/'); await sleep(700); await shot('7-pronto'); await tapText('/^Andiamo$/'); await sleep(1800);
const d = await store();
check('salvato: livello, colpi, allenamento, programma di 4 settimane', [d.meta.onboarded, d.meta.player.level, d.meta.focus, d.meta.custom.templates.length, d.meta.custom.templates[0].name, d.meta.custom.templates[0].gaps, d.meta.plan.stages, d.meta.plan.slots.map((s) => s.day)], [true, 'intermedio', ['dritto', 'servizio'], 1, 'Servizio, dritto e gambe', false, [{ b: '1', n: 4, u: 'w' }], [2, 5]]);
await shot('8-oggi-guida');
check('in Oggi parte la guida delle medaglie', await coach(), 'Le medaglie');
check('il fuoco è sulla scheda delle medaglie', await sameBox('.coach .ring', '#nearcard'), true);
await tap('.coach .next', 1600); await shot('8-guida-mappa');
check('la guida porta alla mappa del primo colpo scelto', [await coach(), await ev('location.hash')], ['La mappa', '#/progressi/mappa/dritto']);
await tap('.coach .next', 1600); await shot('8-guida-adesso');
check('il fuoco è sulla casella di adesso', await ev(`(() => { const a = document.querySelector('.coach .ring').getBoundingClientRect(), b = document.querySelector('#map .nd.now').getBoundingClientRect(); return Math.abs(a.left - b.left) < 10 && Math.abs(a.bottom - b.bottom) < 10 && a.top < b.top; })()`), true);
await tap('#map .nd.now', 900); await shot('8-casella');
check('toccata la casella: le tre soglie, e la guida è finita', [await ev(`document.querySelectorAll('.steps3 > span').length`), await coach(), (await store()).meta.tour], [3, null, { build: true, app: true }]);
await tap('.sheet .icon-btn'); await ev(`location.hash = '#/oggi'`); await sleep(900); await shot('9-oggi');
check('Oggi: il nome dell’allenamento', await ev(`document.querySelector('.court h2').textContent`), 'Servizio, dritto e gambe');
check('la guida non riparte', await coach(), null);
// Il foglio dell'allenamento e la sessione
await tap('.court .open', 700); await shot('9-foglio');
check('nel foglio i quattro fondamentali', await ev(`document.querySelectorAll('.stack-b .b').length`), 4);
await tap('.sheet .icon-btn');
// Il tasto +: un allenamento nuovo
await tap('nav .add', 800); check('il + apre il costruttore, senza guida', [await ev(`document.querySelector('.builder h1').textContent`), await coach()], ['Nuovo allenamento', null]);
await tap('[data-tile=rovescio]'); await tap('[data-tile=ricezione]'); await shot('nuovo');
await tapText('/^Avanti$/', '.builder button', 900); await shot('quando');
check('salvato, si sceglie quando farlo', await ev(`[...document.querySelectorAll('.sheet .choice b')].map((b) => b.textContent)`), ['Oggi', 'Un altro giorno', 'Una settimana', 'Un mese']);
await tapText('/^Oggi/', '.sheet .choice', 900);
check('il nuovo è l’allenamento di oggi', await ev(`document.querySelector('.court h2').textContent`), 'Rovescio e ricezione');
await shot('9-oggi-nuovo');
// Libreria
await ev(`location.hash = '#/libreria'`); await sleep(900); await shot('libreria');
check('i due allenamenti, quello di oggi segnato', await ev(`[...document.querySelectorAll('.li.col')].slice(0, 2).map((b) => [b.querySelector('b').textContent, Boolean(b.querySelector('.today-tag'))])`), [['Rovescio e ricezione', true], ['Servizio, dritto e gambe', false]]);
await tap('.box .li.col:nth-of-type(2)', 700); await shot('allenamento');
await type('.field.name', 'Martedì forte'); await tap('.sheet .icon-btn', 700);
check('rinominato', await ev(`document.querySelectorAll('.li.col b.grow')[1].textContent`), 'Martedì forte');
await tap('.box .li.col:nth-of-type(2)', 700); await tapText('/^Cambia i fondamentali/', '.other', 800); await tap('[data-tile=taglio]'); await tapText('/^Salva$/', '.builder button', 800);
check('cambiati i fondamentali, il nome scritto a mano resta', await ev(`[document.querySelectorAll('.li.col b.grow')[1].textContent, document.querySelectorAll('.li.col')[1].querySelectorAll('.pill').length]`), ['Martedì forte', 5]);
await tap('.box .li.col:nth-of-type(2)', 700); await tapText('/^Mettilo in calendario$/', 'button', 800); await tapText('/^Oggi/', '.sheet .choice', 900);
check('messo oggi dalla Libreria', [await ev('location.hash'), await ev(`document.querySelector('.court h2').textContent`)], ['#/oggi', 'Martedì forte']);
await ev(`location.hash = '#/libreria'`); await sleep(900);
await tap('.box .li.col:nth-of-type(1)', 700); await tapText('/^Elimina/', '.other', 700); await ev(`[...document.querySelectorAll('.sheet')].at(-1).querySelector('.btn.danger, .btn.accent, .btn.primary').click()`); await sleep(900);
check('eliminato', await ev(`document.querySelectorAll('.li.col').length`), 1);
await tapText('/^Rovescio/', '.mat button', 1200); await shot('mappa-rovescio');
check('dai fondamentali alla mappa', await ev('location.hash'), '#/progressi/mappa/rovescio');
// La sessione, la chiusura, le note
await ev(`location.hash = '#/oggi'`); await sleep(900); await tapText('/^Inizia/', '.court button', 1500); await shot('sessione');
await ev(`document.querySelector('[role=tab][aria-label=Chiusura]').click()`); await sleep(900); await shot('chiusura');
check('una riga per ogni colpo allenato, e si dice dove restano le note', [await ev(`[...document.querySelectorAll('.hand .grow')].map((x) => x.textContent)`), await ev(`document.querySelector('.live').textContent.includes('Le ritrovi in Progressi')`)], [['Servizio', 'Dritto', 'Gambe', 'Gioco tagliato'], true]);
await tapText('/^Dritto/', '.hand', 800); await type('.sheet textarea', 'Gomito più avanti.'); await shot('nota'); await tapText('/^Salva/', '.sheet button', 900);
check('prima nota: si dice dove resta', await ev(`document.querySelector('.toast')?.textContent.includes('Le note sono in Progressi')`), true);
await tapText('/Salva nel diario/', 'button', 1500); await shot('oggi-fatto');
check('fatto', await ev(`Boolean(document.querySelector('.court .done'))`), true);
await ev(`location.hash = '#/progressi/mappa/dritto'`); await sleep(1200); await tap('.notes', 700); await shot('note-colpo');
check('la nota è fra quelle del dritto', await ev(`document.querySelector('.sheet').textContent.includes('Gomito più avanti.')`), true);
await tap('.sheet .icon-btn');
await ev(`location.hash = '#/calendario'`); await sleep(1000); await shot('diario');
await ev(`location.hash = '#/progressi'`); await sleep(1000); await shot('progressi');
} catch (e) { bad++; console.log('FERMO:', e.message.split('\n')[0]); await shot('fermo').catch(() => {}); }
console.log('overflow orizzontale:', await ev('document.documentElement.scrollWidth > innerWidth'));
console.log('errori:', errors.length, errors.slice(0, 6));
console.log(bad ? `${bad} NON PASSATI` : 'tutti passati');
ws.close(); chrome.kill(); await sleep(300); rmSync(profile, { recursive: true, force: true });
