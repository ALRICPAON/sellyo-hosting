// js/save-lead.js
import { app } from "./firebase-init.js";
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const db = getFirestore(app);
const auth = getAuth(app);
const form = document.getElementById("lead-form");

if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const nom = form.querySelector('input[name="nom"]')?.value.trim();
    const prenom = form.querySelector('input[name="prenom"]')?.value.trim();
    const email = form.querySelector('input[name="email"]')?.value.trim();
    const telephone = form.querySelector('input[name="telephone"]')?.value.trim();
    const adresse = form.querySelector('input[name="adresse"]')?.value.trim();
    const name = form.querySelector('input[name="name"]')?.value.trim();
    const type = form.querySelector('input[name="type"]')?.value.trim();

    if (!email && !telephone) {
      alert("Merci de renseigner au moins un email ou un numéro de téléphone.");
      return;
    }

    const currentUser = auth.currentUser;
    const userId = currentUser?.uid || "";

    const lead = {
      userId,
      nom: nom || "",
      prenom: prenom || "",
      email: email || "",
      telephone: telephone || "",
      adresse: adresse || "",
      type: type || "landing",
      name: name || "",
      createdAt: serverTimestamp()
    };

    try {
      await addDoc(collection(db, "leads"), lead);
      window.location.href = "https://cdn.sellyo.fr/merci.html";
    } catch (err) {
      console.error("Erreur lors de l'enregistrement :", err);
      alert("Erreur lors de l'envoi du formulaire.");
    }
  });
}
