// Backend cloud: Firebase Authentication (Google) + Firestore.
//
//   config/access            chi può entrare: { admins: [email], emails: [email] }
//   requests/{uid}           richieste di accesso in attesa
//   users/{uid}              impostazioni e piano dell'utente
//   users/{uid}/events/{id}  le sue attività (sessioni, test, note)
//   profiles/{uid}           ciò che il gruppo può vedere: nome e livelli
//
// Ognuno legge e scrive solo sotto il proprio uid (vedi firestore.rules). Gli esercizi e la
// tassonomia non stanno nel database: sono nel codice, quindi nessuno può sovrascriverli.

import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signInWithCredential,
  signOut,
  connectAuthEmulator
} from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  connectFirestoreEmulator,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
  arrayUnion
} from 'firebase/firestore';

const ROLE_KEY = 'tt-trainer:role:';

function toUser(u) {
  return u ? { uid: u.uid, name: u.displayName ?? '', email: (u.email ?? '').toLowerCase(), photo: u.photoURL ?? '' } : null;
}

const denied = (err) => err?.code === 'permission-denied';

export function createCloudBackend(config, { emulator = false } = {}) {
  const app = initializeApp(config);
  const auth = getAuth(app);
  // Cache persistente: l'app si apre e registra anche senza rete, e sincronizza dopo.
  const db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
  });

  if (emulator) {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
  }

  const accessRef = doc(db, 'config', 'access');
  const userRef = (uid) => doc(db, 'users', uid);
  const eventsRef = (uid) => collection(db, 'users', uid, 'events');

  return {
    mode: 'cloud',
    emulator,

    onAuth(cb) {
      return onAuthStateChanged(auth, (u) => cb(toUser(u)));
    },

    async signIn() {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
    },

    /** Solo con gli emulatori: entra come utente finto, senza popup. */
    async devSignIn(email, name) {
      if (!emulator) throw new Error('Disponibile solo con gli emulatori');
      const token = JSON.stringify({ sub: email, email, email_verified: true, name });
      await signInWithCredential(auth, GoogleAuthProvider.credential(token));
    },

    signOut() {
      return signOut(auth);
    },

    /**
     * Stabilisce il ruolo di chi è appena entrato.
     * Il primo in assoluto crea config/access e diventa amministratore.
     * Con `fresh: false` chi è già stato riconosciuto su questo dispositivo entra subito,
     * anche senza rete: a far rispettare i permessi sono comunque le regole sul server.
     */
    async enter(user, { fresh = false } = {}) {
      const key = ROLE_KEY + user.uid;
      const remember = (role) => {
        try {
          localStorage.setItem(key, role);
        } catch {}
        return role;
      };
      if (!fresh) {
        const known = localStorage.getItem(key);
        if (known === 'admin' || known === 'member') return { role: known };
      }

      try {
        const snap = await getDoc(accessRef);
        if (snap.exists()) {
          return { role: remember(snap.data().admins?.includes(user.email) ? 'admin' : 'member') };
        }
      } catch (err) {
        if (!denied(err)) throw err;
      }

      try {
        await setDoc(accessRef, { admins: [user.email], emails: [], createdAt: Date.now() });
        return { role: remember('admin') };
      } catch (err) {
        if (!denied(err)) throw err;
      }

      let requested = false;
      try {
        requested = (await getDoc(doc(db, 'requests', user.uid))).exists();
      } catch {}
      remember('none');
      return { role: 'none', requested };
    },

    requestAccess(user) {
      return setDoc(doc(db, 'requests', user.uid), {
        email: user.email,
        name: user.name,
        photo: user.photo,
        at: Date.now()
      });
    },

    watch(uid, h, { admin = false } = {}) {
      const fail = (err) => h.error?.(err);
      const list = (snap) => snap.docs.map((d) => ({ ...d.data(), id: d.id }));
      const subs = [
        onSnapshot(userRef(uid), (snap) => h.meta(snap.exists() ? snap.data() : null), fail),
        onSnapshot(eventsRef(uid), (snap) => h.events(list(snap)), fail),
        onSnapshot(collection(db, 'profiles'), (snap) => h.profiles?.(list(snap)), fail),
        onSnapshot(accessRef, (snap) => h.access?.(snap.data() ?? null), fail)
      ];
      if (admin) subs.push(onSnapshot(collection(db, 'requests'), (snap) => h.requests?.(list(snap)), fail));
      return () => subs.forEach((off) => off());
    },

    // Le scritture non aspettano il server: Firestore aggiorna subito la cache locale
    // e le mette in coda se manca la rete.
    saveMeta(uid, patch) {
      return setDoc(userRef(uid), patch, { merge: true });
    },
    saveEvent(uid, ev) {
      return setDoc(doc(eventsRef(uid), ev.id), ev);
    },
    deleteEvent(uid, id) {
      return deleteDoc(doc(eventsRef(uid), id));
    },
    saveProfile(uid, profile) {
      return profile ? setDoc(doc(db, 'profiles', uid), profile) : deleteDoc(doc(db, 'profiles', uid));
    },

    // Amministrazione del gruppo
    setMembers(emails) {
      return setDoc(accessRef, { emails }, { merge: true });
    },
    async approve(request) {
      const batch = writeBatch(db);
      batch.set(accessRef, { emails: arrayUnion(request.email) }, { merge: true });
      batch.delete(doc(db, 'requests', request.id));
      await batch.commit();
    },
    reject(request) {
      return deleteDoc(doc(db, 'requests', request.id));
    },

    async wipe(uid) {
      const snap = await getDocs(eventsRef(uid));
      // I batch arrivano a 500 scritture.
      for (let i = 0; i < snap.docs.length; i += 400) {
        const batch = writeBatch(db);
        snap.docs.slice(i, i + 400).forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }
      await deleteDoc(userRef(uid));
      await deleteDoc(doc(db, 'profiles', uid)).catch(() => {});
    }
  };
}
