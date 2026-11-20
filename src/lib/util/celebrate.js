// Riscontri: suono, vibrazione e coriandoli per i momenti che contano (una medaglia, la fine
// della sessione). Suono e vibrazione seguono le Impostazioni; i coriandoli il movimento ridotto.
// La libreria dei coriandoli (canvas-confetti, licenza ISC) si carica solo la prima volta.

import { app } from '../store/app.svelte.js';
import { buzz } from '../store/ui.svelte.js';
import { chime } from './device.js';
import { reducedMotion } from './motion.js';

let loading = null;

async function confetti(options) {
  if (reducedMotion() || typeof window === 'undefined') return;
  try {
    loading ??= import('canvas-confetti').then((m) => m.default);
    const fire = await loading;
    fire({ disableForReducedMotion: true, zIndex: 120, ...options });
  } catch {}
}

function sound(notes) {
  if (app.settings.sound) chime(notes);
}
function vibrate(pattern) {
  if (app.settings.haptics) buzz(pattern);
}

/** I colori delle medaglie per i coriandoli, letti dal tema in uso. */
function medalColors(tier) {
  const css = getComputedStyle(document.documentElement);
  const read = (t) => css.getPropertyValue(`--medal-${t}`).trim();
  return tier ? [read(tier), '#ffffff', read(tier)] : ['B', 'A', 'O', 'P'].map(read);
}

/** Una medaglia nuova (o una metà oro). */
export function celebrateMedal(tier) {
  sound([784, 988, 1175, 1568]);
  vibrate([30, 60, 30, 60, 80]);
  confetti({ particleCount: 90, spread: 75, startVelocity: 38, origin: { y: 0.55 }, colors: medalColors(tier), scalar: 0.9 });
}

/** La sessione è finita: due getti dai lati con i colori delle famiglie allenate. */
export function celebrateFinish(families = []) {
  sound([523, 659, 784, 1047, 1319]);
  vibrate([40, 40, 120]);
  const css = getComputedStyle(document.documentElement);
  const colors = [...new Set(families)].map((f) => css.getPropertyValue(`--fam-${f}`).trim()).filter(Boolean);
  const palette = colors.length ? colors : medalColors();
  confetti({ particleCount: 70, angle: 60, spread: 60, origin: { x: 0, y: 0.75 }, colors: palette });
  confetti({ particleCount: 70, angle: 120, spread: 60, origin: { x: 1, y: 0.75 }, colors: palette });
}
