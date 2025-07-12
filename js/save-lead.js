const firebaseConfig = {
  apiKey: "AIzaSyC2yzKA3kESPjgcFk6pojJQK4rNToywqJI",
  authDomain: "sellyo-3bbdb.firebaseapp.com",
  projectId: "sellyo-3bbdb",
  storageBucket: "sellyo-3bbdb.appspot.com",
  messagingSenderId: "465249279278",
  appId: "1:465249279278:web:319844f7477ab47930eebf",
  measurementId: "G-WWBQ4KPS5B"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

const form = document.getElementById("lead-form");

if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const formData = new FormData(form);
    const data = {};
    formData.forEach((value, key) => {
      data[key] = value;
    });
    data.createdAt = firebase.firestore.FieldValue.serverTimestamp();

    try {
      await db.collection("leads").add(data);
      const redirect = form.getAttribute("action") || form.dataset.redirect || "?success=true";
      window.location.href = redirect;
    } catch (error) {
      console.error("❌ Erreur enregistrement du lead :", error);
      alert("Erreur lors de l'envoi du formulaire. Veuillez réessayer.");
    }
  });
}
