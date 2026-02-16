import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
  User,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// Promesa para esperar a que haya usuario autenticado (anónimo)
export const authReady: Promise<User> = new Promise((resolve, reject) => {
  const unsub = onAuthStateChanged(auth, async (user) => {
    try {
      if (user) {
        unsub();
        resolve(user);
        return;
      }
      console.log('Iniciando sesión anónima en Firebase...');
      const cred = await signInAnonymously(auth);
      console.log('Sesión anónima establecida correctamente');
      unsub();
      resolve(cred.user);
    } catch (e) {
      console.error('ERROR: No se pudo iniciar sesión anónima en Firebase:', e);
      console.error('SOLUCIÓN: Debes habilitar la autenticación anónima en Firebase Console');
      console.error('Ve a: https://console.firebase.google.com/project/clasespadelsil/authentication/providers');
      reject(e);
    }
  });
});
