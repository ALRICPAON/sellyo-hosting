import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// 🔧 Configuration Firebase
const firebaseConfig = {
  apiKey: "AIzaSyC2yzKA3kESPjgcFk6pojJQK4rNToywqJI",
  authDomain: "sellyo-3bbdb.firebaseapp.com",
  projectId: "sellyo-3bbdb",
  storageBucket: "sellyo-3bbdb.appspot.com",
  messagingSenderId: "465249279278",
  appId: "1:465249279278:web:319844f7477ab47930eebf"
};

// ✅ Vérifie si Firebase est déjà initialisé
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

// 🧠 Soumission du formulaire
const form = document.getElementById("lead-form");

if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const formData = new FormData(form);
    const data = {};
    formData.forEach((value, key) => {
      data[key] = value;
    });

    try {
      await addDoc(collection(db, "leads"), data);
      const redirectURL = form.getAttribute("data-redirect");
      if (redirectURL) {
        window.location.href = redirectURL;
      } else {
        alert("Merci ! Votre demande a été envoyée.");
        form.reset();
      }
    } catch (error) {
      console.error("Erreur lors de l'enregistrement du lead :", error);
      alert("Erreur lors de l'envoi. Veuillez réessayer.");
    }
  });
}
