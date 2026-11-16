// Bozza della sessione dal vivo: salvata sul dispositivo a ogni tocco, così un telefono
// che si blocca o una pagina ricaricata non fanno perdere i test già contati.

const KEY = 'tt-trainer:live:';

export function loadLive(uid) {
  try {
    const raw = localStorage.getItem(KEY + uid);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveLive(uid, draft) {
  try {
    localStorage.setItem(KEY + uid, JSON.stringify(draft));
  } catch {}
}

export function clearLive(uid) {
  try {
    localStorage.removeItem(KEY + uid);
  } catch {}
}
