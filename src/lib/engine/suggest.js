// Il suggeritore: legge livelli, diario e mese in corso e propone cosa fare. Ogni proposta
// porta con sé il perché, in una riga, così si può decidere se seguirla.

import { BASE } from '../data/catalog.js';
import { addDays, diffDays, today as todayIso } from '../util/dates.js';
import { byTime } from './levels.js';
import { realTests } from './events.js';
import { drillsFor, weaknesses } from './stats.js';

/** Dopo quanti allenamenti su un percorso conviene misurarlo. */
export const TEST_AFTER = 2;
/** …o dopo quanti giorni, se nel frattempo lo si è allenato almeno una volta. */
export const TEST_AFTER_DAYS = 14;

/** Quante volte ogni percorso è stato allenato dopo il suo ultimo test. */
function sinceLastTest(events, catalog) {
  const info = {};
  for (const id of catalog.trackIds) info[id] = { lastTest: null, sessions: 0, lastTrained: null };
  for (const e of [...events].filter((x) => !x.planned).sort(byTime)) {
    for (const t of realTests(e)) {
      if (!info[t.track]) continue;
      info[t.track].lastTest = e.date;
      info[t.track].sessions = 0;
    }
    if (e.kind === 'training') {
      for (const id of e.trained ?? []) {
        if (!info[id]) continue;
        // Il test fatto nella stessa sessione non conta come allenamento «dopo».
        if (info[id].lastTest !== e.date || !realTests(e).some((t) => t.track === id)) info[id].sessions++;
        info[id].lastTrained = e.date;
      }
    }
  }
  return info;
}

/**
 * I percorsi da testare, i più urgenti prima.
 * @param focus  i percorsi del mese: quelli mai iniziati vanno al test di partenza
 */
export function testsDue({ events, tracks, catalog = BASE, focus = [], date = todayIso() }) {
  const info = sinceLastTest(events, catalog);
  const out = [];
  for (const id of catalog.activeTrackIds) {
    const st = tracks[id];
    const i = info[id];
    if (!st || st.completed) continue;
    if (!st.started) {
      if (focus.includes(id)) out.push({ track: id, placement: true, weight: 100, reason: 'mai misurato: test di partenza' });
      continue;
    }
    const days = i.lastTest ? diffDays(i.lastTest, date) : null;
    if (i.sessions >= TEST_AFTER) {
      out.push({ track: id, weight: 50 + i.sessions, reason: `${i.sessions} allenamenti dall’ultimo test` });
    } else if (i.sessions >= 1 && days != null && days >= TEST_AFTER_DAYS) {
      out.push({ track: id, weight: 20 + days / 7, reason: `ultimo test ${days} giorni fa` });
    }
  }
  return out.sort((a, b) => b.weight - a.weight);
}

/** I percorsi da mettere in un test oggi: quelli del mese, più quelli maturi per una misura. */
export function testPlan({ week, events, tracks, catalog = BASE, date = todayIso() }) {
  const block = week?.focusBlock ?? catalog.block('1');
  const focus = block.tracks.filter((id) => tracks[id]);
  const due = testsDue({ events, tracks, catalog, focus, date });
  const ids = [...focus];
  if (block.maint && week?.lastOfBlock && tracks[block.maint]?.started) ids.push(block.maint);
  for (const d of due) if (!ids.includes(d.track) && ids.length < 4) ids.push(d.track);
  return { trackIds: ids, due };
}

function round5(n) {
  return Math.max(5, Math.round(n / 5) * 5);
}

/**
 * Un allenamento su misura per oggi, come modello ({ steps }) più i motivi.
 * · i due percorsi del mese, con più tempo a quello più indietro;
 * · un esercizio correttivo per il colpo segnato più spesso nelle ultime tre settimane;
 * · servizi e partitella se il tempo c'è.
 */
export function suggestSession({ week, events, tracks, catalog = BASE, minutes = 90, date = todayIso() }) {
  const block = week?.focusBlock ?? catalog.block('1');
  const reasons = [];
  const steps = [];
  let left = minutes;

  const warm = minutes >= 45 ? 10 : 5;
  steps.push({ type: 'warmup', minutes: warm });
  left -= warm;

  const serve = minutes >= 75 ? 15 : minutes >= 60 ? 10 : 0;
  const match = minutes >= 75 ? 15 : minutes >= 50 ? 10 : 0;
  left -= serve + match;

  // Esercizi: i percorsi del mese e, se c'è, un correttivo.
  const items = block.tracks
    .filter((id) => tracks[id])
    .map((id, i) => ({ step: { type: 'focus', slot: i + 1 }, track: id, weight: 1 }));

  if (items.length === 2) {
    const [a, b] = items;
    const pa = tracks[a.track].started ? tracks[a.track].level / catalog.maxLevel(a.track) : 0;
    const pb = tracks[b.track].started ? tracks[b.track].level / catalog.maxLevel(b.track) : 0;
    if (Math.abs(pa - pb) >= 0.2) {
      const behind = pa < pb ? a : b;
      behind.weight = 1.4;
      reasons.push(`Più tempo su ${catalog.track(behind.track).short}: è il percorso del mese più indietro.`);
    }
  }

  const weak = weaknesses(events, { since: addDays(date, -21) }).strokes[0];
  if (weak && weak.count >= 2 && minutes >= 45) {
    const drill = drillsFor(weak.id, tracks, catalog).map((d) => d.match(/^(.*)-(\d+)$/)).find((m) => m && catalog.track(m[1]));
    const trackId = drill?.[1];
    if (trackId && !items.some((x) => x.track === trackId)) {
      items.push({ step: { type: 'track', track: trackId }, track: trackId, weight: 0.6 });
      reasons.push(`Correttivo: hai segnato ${weak.count} volte un problema su questo colpo nelle ultime tre settimane.`);
    } else if (trackId) {
      const it = items.find((x) => x.track === trackId);
      it.weight += 0.3;
      reasons.push(`Il colpo da correggere più frequente si lavora già qui: un po’ più di tempo.`);
    }
  }

  const total = items.reduce((n, x) => n + x.weight, 0) || 1;
  if (serve) steps.push({ type: 'serve', minutes: serve });
  for (const x of items) steps.push({ ...x.step, minutes: round5((left * x.weight) / total) });
  if (match) steps.push({ type: 'match', minutes: match });

  // Gli arrotondamenti non devono sforare: si sistema sull'esercizio più lungo.
  const sum = steps.reduce((n, s) => n + s.minutes, 0);
  if (sum !== minutes && items.length) {
    const longest = steps.filter((s) => s.type === 'focus' || s.type === 'track').sort((a, b) => b.minutes - a.minutes)[0];
    longest.minutes = Math.max(5, longest.minutes + (minutes - sum));
  }

  const due = testsDue({ events, tracks, catalog, focus: block.tracks, date });
  if (due.length) reasons.push(`Da misurare: ${due.slice(0, 3).map((d) => catalog.track(d.track).short).join(', ')}.`);

  return {
    template: { id: 'auto', name: 'Su misura', color: 'plum', auto: true, steps },
    reasons,
    due
  };
}
