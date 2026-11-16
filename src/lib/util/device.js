// Suoni brevi e schermo sempre acceso durante la sessione.

let ctx = null;

/** Da chiamare dentro un tocco dell'utente: i browser sbloccano l'audio solo così. */
export function unlockAudio() {
  try {
    ctx ??= new (window.AudioContext ?? window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
  } catch {}
}

/** Una o più note in sequenza. */
export function chime(notes = [880, 1318]) {
  if (!ctx) return;
  try {
    notes.forEach((freq, i) => {
      const t = ctx.currentTime + i * 0.16;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.22, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.35);
    });
  } catch {}
}

/** Tiene acceso lo schermo finché non si chiama la funzione restituita. */
export function keepAwake() {
  let lock = null;
  let active = true;

  const acquire = async () => {
    if (!active || document.hidden || !('wakeLock' in navigator)) return;
    try {
      lock = await navigator.wakeLock.request('screen');
    } catch {}
  };
  // Il sistema rilascia il blocco quando la pagina va in secondo piano: lo si richiede al ritorno.
  const onVisible = () => {
    if (!document.hidden) acquire();
  };

  acquire();
  document.addEventListener('visibilitychange', onVisible);

  return () => {
    active = false;
    document.removeEventListener('visibilitychange', onVisible);
    lock?.release?.().catch(() => {});
  };
}
