// Configurazione dell'app web Firebase.
// Console Firebase → Impostazioni progetto → Le tue app → Configurazione SDK.
//
// Questi valori non sono segreti: identificano il progetto e basta. La sicurezza la fanno
// le regole di Firestore (firestore.rules) e l'elenco dei domini autorizzati di Authentication.
//
// Finché apiKey è vuota l'app funziona in modalità locale: i dati restano nel browser.

export const firebaseConfig = {
  apiKey: 'AIzaSyCBDPp5HbS9bDimHmAagZ-94ILQMoTV1Xs',
  authDomain: 'tt-trainer-19e1a.firebaseapp.com',
  projectId: 'tt-trainer-19e1a',
  appId: '1:850504660523:web:f9f732de26301f98301c6e'
};
