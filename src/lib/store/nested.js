// Firestore non accetta un elenco messo direttamente dentro un altro elenco. Le misure in due parti
// («8 di dritto e 6 di rovescio») sono proprio così: `tries: [[8, 6]]`. Prima di scrivere in rete
// l'elenco interno diventa un oggetto `{ _list: [...] }`, e in lettura torna un elenco. Il resto
// dell'app non se ne accorge: lavora sempre con gli elenchi veri.

const KEY = '_list';
const plain = (v) => v !== null && typeof v === 'object' && Object.getPrototypeOf(v) === Object.prototype;

/** Un valore pronto per Firestore: ogni elenco dentro un elenco diventa `{ _list }`. */
export function pack(value, inList = false) {
  if (Array.isArray(value)) {
    const list = value.map((x) => pack(x, true));
    return inList ? { [KEY]: list } : list;
  }
  if (plain(value)) return Object.fromEntries(Object.entries(value).map(([k, x]) => [k, pack(x, false)]));
  return value;
}

/** Il contrario: ogni `{ _list }` torna un elenco. */
export function unpack(value) {
  if (Array.isArray(value)) return value.map(unpack);
  if (plain(value)) {
    const keys = Object.keys(value);
    if (keys.length === 1 && keys[0] === KEY && Array.isArray(value[KEY])) return value[KEY].map(unpack);
    return Object.fromEntries(keys.map((k) => [k, unpack(value[k])]));
  }
  return value;
}
