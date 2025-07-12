import { app } from "./firebase-init.js"; // 🔗 Import propre
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const db = getFirestore(app);

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
      window.location.href = "https://cdn.sellyo.fr/merci.html";
    } catch (error) {
      console.error("Erreur lors de l'enregistrement du lead :", error);
      alert("Erreur lors de l'envoi. Veuillez réessayer.");
    }
  });
}
