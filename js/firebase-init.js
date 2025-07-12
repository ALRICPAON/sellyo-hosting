// js/firebase-init.js
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";

const firebaseConfig = {
  apiKey: "AIzaSyC2yzKA3kESPjgcFk6pojJQK4rNToywqJI",
  authDomain: "sellyo-3bbdb.firebaseapp.com",
  projectId: "sellyo-3bbdb",
  storageBucket: "sellyo-3bbdb.appspot.com",
  messagingSenderId: "465249279278",
  appId: "1:465249279278:web:319844f7477ab47930eebf",
  measurementId: "G-WWBQ4KPS5B"
};

// ✅ Initialisation sécurisée
export const app = getApps().length === 0
  ? initializeApp(firebaseConfig)
  : getApps()[0];
