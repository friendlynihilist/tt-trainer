// Prova con gli emulatori: due iscritti, uno registra un allenamento fatto con l'altro (con una
// misura in due parti). Si guarda che la misura si salvi e valga la medaglia, e che l'allenamento
// arrivi nel diario dell'altro una volta sola.
//   emulatori + VITE_EMULATOR=1 npx vite --port 5176   →   node condiviso.mjs <cartella schermate>
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const out = process.argv[2];
mkdirSync(out, { recursive: true });
const APP = 'http://localhost:5176/';
const FS = 'http://127.0.0.1:8080/v1/projects/demo-tt-trainer/databases/(default)/documents';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let bad = 0;
const check = (name, got, want) => { const ok = JSON.stringify(got) === JSON.stringify(want); if (!ok) bad++; console.log(ok ? 'ok ' : 'NO ', name, ok ? '' : `→ ${JSON.stringify(got)} invece di ${JSON.stringify(want)}`); };

// Firestore via REST, come proprietario (salta le regole): serve solo a preparare e a guardare.
const val = (v) => v === null ? { nullValue: null } : typeof v === 'boolean' ? { booleanValue: v } : typeof v === 'number' ? (Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v }) : typeof v === 'string' ? { stringValue: v } : Array.isArray(v) ? { arrayValue: { values: v.map(val) } } : { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, val(x)])) } };
const own = { Authorization: 'Bearer owner', 'Content-Type': 'application/json' };
const put = (path, data) => fetch(`${FS}/${path}`, { method: 'PATCH', headers: own, body: JSON.stringify({ fields: val(data).mapValue.fields }) }).then((r) => r.ok || r.text().then((t) => { throw new Error(t); }));
const list = (path) => fetch(`${FS}/${path}`, { headers: own }).then((r) => r.json()).then((j) => j.documents ?? []);
const raw = (path) => fetch(`${FS}/${path}`, { headers: own }).then((r) => r.json());

async function browser(port) {
  const profile = mkdtempSync(join(tmpdir(), 'tt-e-'));
  const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--no-first-run', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
  let url;
  for (let i = 0; i < 50 && !url; i++) { try { url = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((t) => t.type === 'page')?.webSocketDebuggerUrl; } catch {} if (!url) await sleep(200); }
  const ws = new WebSocket(url); await new Promise((r) => (ws.onopen = r));
  let seq = 0; const pending = new Map(); const errors = [];
  ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description?.split('\n')[0] ?? m.params.exceptionDetails.text); };
  const send = (method, params = {}) => new Promise((res, rej) => { const id = ++seq; pending.set(id, (m) => (m.error ? rej(new Error(m.error.message)) : res(m.result))); ws.send(JSON.stringify({ id, method, params })); });
  const ev = async (x) => { const r = await send('Runtime.evaluate', { expression: x, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text); return r.result.value; };
  await send('Page.enable'); await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  const shot = async (name) => { const { data } = await send('Page.captureScreenshot', { format: 'jpeg', quality: 78 }); writeFileSync(join(out, name + '.jpg'), Buffer.from(data, 'base64')); };
  const close = async () => { ws.close(); chrome.kill(); await sleep(300); rmSync(profile, { recursive: true, force: true }); };
  return { send, ev, shot, close, errors };
}

const meta = (name) => ({ onboarded: true, intro: 3, seenVersion: '99.0.0', focus: ['dritto', 'servizio'], tour: { build: true, app: true }, noteTold: true, profile: { name }, settings: { sound: false }, player: { level: 'principiante', since: '2026-11-01', history: [], declined: null } });

async function enter(b, who, name) {
  await b.send('Page.navigate', { url: APP }); await sleep(2500);
  await b.ev(`[...document.querySelectorAll('button')].find((x) => x.textContent.trim() === ${JSON.stringify(who)}).click()`);
  let uid = null;
  for (let i = 0; i < 40 && !uid; i++) { await sleep(300); uid = await b.ev(`(Object.keys(localStorage).find((k) => k.startsWith('tt-trainer:role:')) ?? '').slice('tt-trainer:role:'.length) || null`); }
  await put(`users/${uid}`, meta(name));
  await sleep(1500);
  await b.ev(`import('/src/lib/store/app.svelte.js').then((m) => { window.__app = m.app; return true; })`);
  for (let i = 0; i < 30; i++) { if ((await b.ev(`__app.stage`)) === 'ready' && (await b.ev(`__app.onboarded`))) break; await sleep(300); }
  return uid;
}

await fetch(`http://127.0.0.1:8080/emulator/v1/projects/demo-tt-trainer/databases/(default)/documents`, { method: 'DELETE' });
await put('config/access', { admins: ['carlo@example.com'], emails: ['marco@example.com'], createdAt: 1 });
const A = await browser(9341);
const B = await browser(9342);
try {
  const a = await enter(A, 'Carlo Prova', 'Carlo');
  const b = await enter(B, 'Marco Prova', 'Marco');
  check('i due sono entrati', [await A.ev(`__app.stage`), await A.ev(`__app.role`), await B.ev(`__app.stage`), await B.ev(`__app.role`)], ['ready', 'admin', 'ready', 'member']);
  await sleep(3500); // il profilo del gruppo parte dopo un secondo e mezzo
  check('Carlo vede Marco fra gli iscritti', await A.ev(`__app.mates.map((m) => m.name)`), ['Marco']);
  check('Marco vede Carlo', await B.ev(`__app.mates.map((m) => m.name)`), ['Carlo']);

  const today = await A.ev(`__app.today`);
  // Carlo registra un allenamento fatto con Marco, con la misura in due parti.
  const saved = await A.ev(`(() => { const e = __app.saveEvent({ kind: 'training', date: __app.today, minutes: 52, partner: { kind: 'mate', id: ${JSON.stringify(b)}, name: 'Marco' }, bricks: [{ type: 'dritto', minutes: 20, exs: ['top-top-lontano'] }, { type: 'servizio', minutes: 10, exs: ['srv-regolare'] }], exercises: ['top-top-lontano', 'srv-regolare'], attempts: [{ ex: 'srv-regolare', fmt: 'su', tries: [[8, 8]] }], feel: 4 }); return { id: e.id, sharedTo: e.sharedTo }; })()`);
  check('la voce di Carlo è segnata come mandata a Marco', saved.sharedTo, b);
  await sleep(2500);
  check('nessun errore mostrato a Carlo', await A.ev(`__app.error`), null);
  check('Carlo rilegge la misura in due parti', await A.ev(`__app.rawEvents.find((e) => e.id === ${JSON.stringify(saved.id)})?.attempts[0].tries`), [[8, 8]]);
  check('e vale l’argento', await A.ev(`__app.medals['srv-regolare']?.A`), today);
  const stored = await raw(`users/${a}/events/${saved.id}`);
  check('in rete l’elenco interno è impacchettato', Object.keys(stored.fields.attempts.arrayValue.values[0].mapValue.fields.tries.arrayValue.values[0].mapValue.fields), ['_list']);

  // Marco: l'allenamento è arrivato nel diario.
  const got = await B.ev(`__app.events.map((e) => ({ id: e.id, kind: e.kind, date: e.date, minutes: e.minutes, from: e.from, partner: e.partner?.name, attempts: e.attempts?.length ?? 0, feel: e.feel ?? null, bricks: e.bricks.map((x) => x.type) }))`);
  check('Marco ha l’allenamento nel diario, senza le misure di Carlo', got, [{ id: 's' + saved.id, kind: 'training', date: today, minutes: 52, from: a, partner: 'Carlo', attempts: 0, feel: null, bricks: ['dritto', 'servizio'] }]);
  check('Marco non ha medaglie di Carlo', await B.ev(`Object.keys(__app.medals)`), []);
  check('a Marco viene detto', await B.ev(`[...document.querySelectorAll('.toast, [role=status]')].map((t) => t.textContent.trim()).filter((t) => /Carlo/.test(t)).length > 0`), true);
  await B.shot('marco-avviso');
  check('la posta di Marco è vuota', (await list(`users/${b}/inbox`)).length, 0);
  check('la voce di Marco non è tornata a Carlo', (await list(`users/${a}/inbox`)).length, 0);
  check('Carlo ha sempre una voce sola', await A.ev(`__app.events.length`), 1);

  // Carlo corregge la durata: a Marco non arriva niente di nuovo.
  await A.ev(`(() => { const e = __app.rawEvents.find((x) => x.id === ${JSON.stringify(saved.id)}); __app.saveEvent({ ...e, minutes: 60 }); return true; })()`);
  await sleep(2000);
  check('una correzione non riparte', [await B.ev(`__app.events.length`), await B.ev(`__app.events[0].minutes`), (await list(`users/${b}/inbox`)).length], [1, 52, 0]);

  // Marco registra da sé un allenamento con Carlo lo stesso giorno: a Carlo non si aggiunge (ce l'ha già).
  const back = await B.ev(`__app.saveEvent({ kind: 'training', date: __app.today, minutes: 30, partner: { kind: 'mate', id: ${JSON.stringify(a)}, name: 'Carlo' }, bricks: [{ type: 'gambe', minutes: 10, exs: [] }], attempts: [] }).sharedTo`);
  await sleep(2500);
  check('quello di Marco parte verso Carlo', back, a);
  check('ma Carlo quel giorno ce l’ha già con Marco: niente doppione', [await A.ev(`__app.events.length`), (await list(`users/${a}/inbox`)).length], [1, 0]);

  // Un altro giorno: a Carlo arriva.
  await B.ev(`__app.saveEvent({ kind: 'training', date: '2026-11-20', minutes: 45, partner: { kind: 'mate', id: ${JSON.stringify(a)}, name: 'Carlo' }, bricks: [{ type: 'rovescio', minutes: 20, exs: [] }], attempts: [] }).id`);
  await sleep(2500);
  check('un allenamento di un altro giorno arriva a Carlo', await A.ev(`__app.events.filter((e) => e.from).map((e) => [e.date, e.minutes, e.partner.name])`), [['2026-11-20', 45, 'Marco']]);

  // Le schermate: il diario di Marco e la voce aperta.
  await B.send('Page.navigate', { url: `${APP}#/calendario` }); await sleep(2500);
  await B.shot('marco-diario');
  await B.ev(`import('/src/lib/store/ui.svelte.js').then((m) => { m.ui.open('done', { id: ${JSON.stringify('s' + saved.id)} }); return true; })`); await sleep(900);
  await B.shot('marco-voce');
  check('nella voce c’è scritto chi l’ha segnata', await B.ev(`/L’ha segnato Carlo/.test(document.body.textContent)`), true);
  await A.send('Page.navigate', { url: `${APP}#/calendario` }); await sleep(2500);
  await A.shot('carlo-diario');
  check('nel diario di Carlo si legge il risultato', await A.ev(`[...document.querySelectorAll('.res')].map((x) => x.textContent.trim())`), ['Servizio regolamentare8·8/10']);
  console.log('errori nelle pagine:', A.errors.length + B.errors.length, [...A.errors, ...B.errors]);
  console.log(bad ? `${bad} non passati` : 'tutti passati');
} finally { await A.close(); await B.close(); }
process.exit(bad ? 1 : 0);
