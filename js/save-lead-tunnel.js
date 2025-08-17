// js/save-lead-tunnel.js
import { app } from "./firebase-init.js";
import {
  getFirestore, collection, addDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const db = getFirestore(app);

document.addEventListener("DOMContentLoaded", () => {
  // ⚠️ ton HTML utilise id="optin-form"
  const form = document.getElementById("optin-form");
  if (!form) {
    console.error("[lead] form #optin-form introuvable");
    return;
  }

  const val = (name) => (form.querySelector(`[name="${name}"]`)?.value || "").trim();

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // fallback sur l’URL si les hidden ne sont pas encore remplis
    const qs = new URLSearchParams(location.search);
    const userId = val("userId") || qs.get("userId") || "";
    const slug   = val("slug")   || qs.get("slug")   || "";

    if (!userId) { alert("Erreur : userId manquant."); return; }

    const email = val("email").toLowerCase();
    const phone = val("telephone") || val("phone");
    if (!email && !phone) {
      alert("Merci d’indiquer un email ou un téléphone.");
      return;
    }

    const payload = {
      userId, slug,
      name: val("name"),
      prenom: val("prenom") || null,
      nom: val("nom") || null,
      email,
      telephone: phone || null,
      adresse: val("adresse") || null,
      type: val("type") || "tunnel",
      createdAt: serverTimestamp(),
      meta: { href: location.href, ua: navigator.userAgent, ref: document.referrer || null }
    };

    // Tente l’écriture, mais ne bloque pas la redirection si ça échoue
    try {
      await addDoc(collection(db, "leads"), payload);
      console.log("[lead] enregistré");
    } catch (err) {
      console.warn("[lead] Firestore error (lead non sauvegardé)", err?.code || err?.message || err);
      // on continue quand même
    }

    const next = val("nextUrl")
      || `checkout.html?slug=${encodeURIComponent(slug)}&userId=${encodeURIComponent(userId)}`;

    location.href = next;
  });
});
