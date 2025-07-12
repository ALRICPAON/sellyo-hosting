// js/save-lead.js

import { app } from './firebase-init.js';
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

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

    data.createdAt = serverTimestamp();

    try {
      await addDoc(collection(db, "leads"), data);
      const redirect = form.getAttribute("action") || form.dataset.redirect || "/";
      window.location.href = redirect + "?success=true";
    } catch (error) {
      console.error("Erreur lors de l'enregistrement du lead :", error);
      alert("Une erreur est survenue. Veuillez réessayer.");
    }
  });
}
