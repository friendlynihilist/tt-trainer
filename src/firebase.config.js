// Configurazione dell'app web Firebase.
// Console Firebase → Impostazioni progetto → Le tue app → Configurazione SDK.
//
// Questi valori non sono segreti: identificano il progetto e basta. La sicurezza la fanno
// le regole di Firestore (firestore.rules) e l'elenco dei domini autorizzati di Authentication.
//
// Finché apiKey è vuota l'app funziona in modalità locale: i dati restano nel browser.

export const firebaseConfig = {
  apiKey: '',
  authDomain: '',
  projectId: '',
  appId: ''
};
