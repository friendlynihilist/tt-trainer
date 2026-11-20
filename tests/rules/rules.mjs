// Prova delle regole di Firestore con l'emulatore: chi legge e scrive cosa.
//   npm run test:rules      (scarica l'emulatore la prima volta; serve Java)
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, deleteDoc, collection, getDocs } from 'firebase/firestore';

const env = await initializeTestEnvironment({ projectId: 'demo-tt-trainer', firestore: { rules: readFileSync('firestore.rules', 'utf8') } });
const user = (uid, email) => env.authenticatedContext(uid, { email, email_verified: true }).firestore();
let ok = 0;
let ko = 0;
async function check(name, promise) {
  try {
    await promise;
    ok++;
    console.log('ok ', name);
  } catch (e) {
    ko++;
    console.log('NO ', name, '→', e.message.split('\n')[0]);
  }
}

await env.clearFirestore();
const anna = user('anna', 'anna@example.com'); // la prima: amministratrice
const bea = user('bea', 'bea@example.com'); // invitata
const carla = user('carla', 'carla@example.com'); // fuori dal gruppo
const access = (db) => doc(db, 'config', 'access');

await check('la prima che entra crea il gruppo con sé sola come amministratrice', assertSucceeds(setDoc(access(anna), { admins: ['anna@example.com'], emails: [], createdAt: 1 })));
await check('nessun altro può ricrearlo', assertFails(setDoc(access(carla), { admins: ['carla@example.com'], emails: [] })));
await check('chi è fuori non legge chi può entrare', assertFails(getDoc(access(carla))));
await check('chi è fuori chiede di entrare', assertSucceeds(setDoc(doc(bea, 'requests', 'bea'), { email: 'bea@example.com', name: 'Bea', photo: '', at: 1 })));
await check('ma non con l’email di un’altra', assertFails(setDoc(doc(carla, 'requests', 'carla'), { email: 'bea@example.com', name: 'Carla', photo: '', at: 1 })));
await check('né con campi in più', assertFails(setDoc(doc(carla, 'requests', 'carla'), { email: 'carla@example.com', name: 'Carla', photo: '', at: 1, altro: 'x' })));
await check('né con un nome lunghissimo', assertFails(setDoc(doc(carla, 'requests', 'carla'), { email: 'carla@example.com', name: 'x'.repeat(500), photo: '', at: 1 })));
await check('l’amministratrice vede le richieste', assertSucceeds(getDocs(collection(anna, 'requests'))));
await check('chi è fuori no', assertFails(getDocs(collection(carla, 'requests'))));
await check('l’amministratrice invita', assertSucceeds(setDoc(access(anna), { emails: ['bea@example.com'] }, { merge: true })));
await check('l’amministratrice legge chi può entrare', assertSucceeds(getDoc(access(anna))));
await check('un membro non legge le email degli altri', assertFails(getDoc(access(bea))));
await check('ma legge i propri dati, anche se ancora vuoti', assertSucceeds(getDoc(doc(bea, 'users', 'bea'))));
await check('chi è fuori non legge nemmeno i propri', assertFails(getDoc(doc(carla, 'users', 'carla'))));
await check('un membro non cambia chi può entrare', assertFails(setDoc(access(bea), { emails: ['bea@example.com', 'carla@example.com'] }, { merge: true })));
await check('l’amministratrice non si toglie da sola', assertFails(setDoc(access(anna), { admins: ['bea@example.com'] }, { merge: true })));

await check('un membro scrive i propri dati', assertSucceeds(setDoc(doc(bea, 'users', 'bea'), { onboarded: true })));
await check('e le proprie voci', assertSucceeds(setDoc(doc(bea, 'users', 'bea', 'events', 'e1'), { kind: 'test', date: '2026-11-20' })));
await check('e le proprie note', assertSucceeds(setDoc(doc(bea, 'users', 'bea', 'notes', 'n1'), { stroke: 'ap-d', date: '2026-11-20' })));
await check('un altro membro non le legge', assertFails(getDoc(doc(anna, 'users', 'bea', 'events', 'e1'))));
await check('nemmeno l’elenco', assertFails(getDocs(collection(anna, 'users', 'bea', 'events'))));
await check('e non le scrive', assertFails(setDoc(doc(anna, 'users', 'bea'), { onboarded: false })));
await check('chi è fuori non scrive nemmeno i propri', assertFails(setDoc(doc(carla, 'users', 'carla'), { onboarded: true })));

await check('il profilo del gruppo accetta il nome', assertSucceeds(setDoc(doc(bea, 'profiles', 'bea'), { name: 'Bea', updatedAt: 1 })));
await check('non altri campi', assertFails(setDoc(doc(bea, 'profiles', 'bea'), { name: 'Bea', level: 'pro' })));
await check('non un nome lunghissimo', assertFails(setDoc(doc(bea, 'profiles', 'bea'), { name: 'x'.repeat(500), updatedAt: 1 })));
await check('non il profilo di un’altra', assertFails(setDoc(doc(bea, 'profiles', 'anna'), { name: 'Anna', updatedAt: 1 })));
await check('i membri leggono i profili', assertSucceeds(getDocs(collection(anna, 'profiles'))));
await check('chi è fuori no', assertFails(getDocs(collection(carla, 'profiles'))));
await check('ognuno toglie il proprio profilo', assertSucceeds(deleteDoc(doc(bea, 'profiles', 'bea'))));

await env.cleanup();
console.log(`\n${ok} ok, ${ko} no`);
process.exit(ko ? 1 : 0);
