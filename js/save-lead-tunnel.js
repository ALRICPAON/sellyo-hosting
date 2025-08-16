// js/save-lead-tunnel.js (robuste)
import { app } from "./firebase-init.js";
import {
  getFirestore, collection, addDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const db = getFirestore(app);

function q(f, sel){ return f.querySelector(sel); }
function v(f, name){ return (q(f, `[name="${name}"]`)?.value || "").trim(); }

async function handleSubmit(form){
  const userId = v(form,"userId");
  if(!userId){ alert("Erreur : userId manquant. Merci de recharger la page."); return; }

  const email = v(form,"email");
  const tel   = v(form,"telephone");
  if(!email && !tel){ alert("Merci d’indiquer au moins un email ou un téléphone."); return; }

  const payload = {
    userId,
    nom: v(form,"nom"),
    prenom: v(form,"prenom"),
    email,
    telephone: tel,
    adresse: v(form,"adresse"),
    name: v(form,"name"),
    type: v(form,"type") || "tunnel",
    slug: v(form,"slug"),
    createdAt: serverTimestamp(),
    source: { type: v(form,"type") || "tunnel", refId: v(form,"slug") || null },
    userAgent: navigator.userAgent,
    referer: document.referrer || null,
    page: location.href
  };

  await addDoc(collection(db,"leads"), payload);
  const nextUrl = v(form,"nextUrl");
  location.href = nextUrl || "https://alricpaon.github.io/sellyo-hosting/merci.html";
}

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("lead-form");
  if(!form) return;

  // 1) empêcher tout POST natif (GitHub Pages refuserait)
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    handleSubmit(form).catch(err => {
      console.error("Erreur lors de l'enregistrement :", err);
      alert("Erreur lors de l'envoi du formulaire.");
    });
  });

  // 2) si le bouton n'est pas type="submit", on capte le click aussi
  const btn = document.getElementById("lead-submit");
  if(btn){
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      handleSubmit(form).catch(err => {
        console.error("Erreur lors de l'enregistrement :", err);
        alert("Erreur lors de l'envoi du formulaire.");
      });
    });
  }
});
