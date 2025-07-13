// js/save-lead.js
import { app } from "./firebase-init.js";
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const db = getFirestore(app);
const form = document.getElementById("lead-form");

if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const formData = new FormData(form);
    const data = {};
    formData.forEach((value, key) => {
      data[key] = value.trim();
    });

    // 🧪 Sécurité : vérifie qu’au moins email ou téléphone est rempli
    if (!data.email && !data.telephone) {
      alert("Merci de renseigner au moins un email ou un numéro de téléphone.");
      return;
    }

    // 🧩 Ajoute le timestamp
    data.createdAt = new Date().toISOString();

    // 📦 Ajoute le type si pas déjà dans le formulaire HTML
    if (!data.type) {
      data.type = "landing"; // ou "tunnel", "email", selon la page
    }

    try {
      await addDoc(collection(db, "leads"), data);
      window.location.href = "https://cdn.sellyo.fr/merci.html";
    } catch (error) {
      console.error("Erreur lors de l'enregistrement du lead :", error);
      alert("Erreur lors de l'envoi. Veuillez réessayer.");
    }
  });
}
