// js/save-lead-tunnel.js
import { app } from "./firebase-init.js";
import {
  getFirestore, collection, addDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  getAuth, signInAnonymously, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const db = getFirestore(app);
const auth = getAuth(app);

// ✅ Garantit une auth (anonyme) sur pages publiques
onAuthStateChanged(auth, (u) => {
  if (!u) signInAnonymously(auth).catch(console.error);
});

document.addEventListener("DOMContentLoaded", () => {
  // ✅ Supporte #lead-form, [data-role="capture"] et #optin-form (legacy)
  const form = document.querySelector("#lead-form,[data-role='capture'],#optin-form");
  if (!form) {
    console.error("[lead] form introuvable (#lead-form | [data-role='capture'] | #optin-form)");
    return;
  }

  // helper lecture champs
  const val = (name) => {
    const el = form.querySelector(`[name="${name}"]`);
    return el ? String(el.value || "").trim() : "";
  };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const qs     = new URLSearchParams(location.search);
    const userId = val("userId") || qs.get("userId") || "";
    const slug   = val("slug")   || qs.get("slug")   || "";
    const email  = (val("email") || "").toLowerCase();
    const phone  = val("telephone") || val("phone");

    if (!userId) { alert("Erreur : userId manquant."); return; }
    if (!email && !phone) { alert("Merci d’indiquer un email ou un téléphone."); return; }

    const payload = {
  userId,
  slug,
  email: email || null,
  telephone: phone || null,
  type: val("type") || "tunnel",
  createdAt: serverTimestamp(),
  meta: { href: location.href, ua: navigator.userAgent, ref: document.referrer || null }
};

// Capture tous les champs du formulaire automatiquement
form.querySelectorAll("input, textarea, select").forEach(el => {
  const name = el.name?.trim();
  if (!name || ["userId","slug","type","nextUrl"].includes(name)) return; // ignore champs techniques
  payload[name] = el.value?.trim() || null;
});

    try {
      await addDoc(collection(db, "leads"), payload);
      console.log("[lead] enregistré");
    } catch (err) {
      // On n'empêche pas la redirection si Firestore bloque
      console.warn("[lead] Firestore error (lead non sauvegardé)", err?.code || err?.message || err);
    }

    // 🔗 Redirection : priorité à data-next puis nextUrl
    let next = form.dataset.next || val("nextUrl") || "";
    if (!next) {
      // petit fallback si pas fourni : tente slug -pX → -p(X+1)
      if (/-p(\d+)$/.test(slug)) {
        const n = Number(RegExp.$1) + 1;
        next = slug.replace(/-p\d+$/, `-p${n}`) + ".html";
      }
    }

    // event custom (si besoin d’écouter ailleurs)
    window.dispatchEvent(new CustomEvent("sellyo:redirect", { detail: { next } }));

    if (next) location.href = next;
  });

  console.log("[lead] listener installé sur", form.id || "[data-role='capture']");
});
