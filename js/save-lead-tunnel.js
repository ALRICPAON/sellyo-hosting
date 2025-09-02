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

   // 🔗 Redirection : priorité nextUrl (input hidden) puis data-next
function clean(s){ return (s || "").toString().trim(); }
function isToken(s){ return /\{\{.*\}\}/.test(s || ""); }

let next = clean(val("nextUrl")) || clean(form.dataset.next) || "";

// Ignore tout placeholder non remplacé ({{...}})
if (isToken(next)) next = "";

// Fallback intelligent si rien de valide fourni : slug -pX → -p(X+1).html
if (!next) {
  const s = clean(val("slug")) || "";
  const m = s.match(/-p(\d+)$/i);
  if (m) next = s.replace(/-p(\d+)$/i, (_, n) => `-p${Number(n) + 1}`) + ".html";
}

// Event custom (si besoin d’écouter ailleurs)
window.dispatchEvent(new CustomEvent("sellyo:redirect", { detail: { next } }));

if (next) {
  location.href = next; // relatif → reste dans le même dossier GitHub Pages
} else {
  console.warn("[lead] Aucune nextUrl valide (ni hidden, ni data-next, ni fallback).");
}
  });

  console.log("[lead] listener installé sur", form.id || "[data-role='capture']");
});
