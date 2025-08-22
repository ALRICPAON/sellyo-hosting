# 📘 Sellyo — Document Maître : Gestion des Tunnels Marketing  
**Dernière mise à jour : 22/08/2025**

> **Objectif** : Centraliser toutes les informations techniques, mappings, templates, variables et scripts nécessaires au fonctionnement des tunnels marketing générés par **Sellyo**.

---

## 1. Structure générale des tunnels

### 1.1. Pages générées
- `optin.html` → Formulaire de capture + CTA
- `sales.html` → Page de vente
- `checkout.html` → Paiement Stripe
- `thankyou.html` → Livraison produit

### 1.2. Arborescence des fichiers générés
tunnels/<userId>/<tunnelSlug>/<pageSlug>.html
Chaque page est un **fichier HTML complet** poussé dans **GitHub** via **Make**.

### 1.3. Scripts principaux
| Script | Rôle |
|--------|------|
| `submit-tunnel.js` | Collecte les données du formulaire tunnel + upload fichiers + envoi à Make |
| `inject-content.js` | Injection du contenu dynamique dans les templates |
| `save-lead-tunnel.js` | Capture des leads Firebase et redirection |
| `firebase-init.js` | Initialisation Firebase (auth + firestore) |

---

## 2. Architecture Make.com

### 2.1. Workflow général
1. **Webhook** → reçoit toutes les données depuis le front.
2. **Iterator 133** → boucle sur les pages (`pagesData[]`).
3. **Sélection du template** → basé sur `pageType`.
4. **GPT** → remplace uniquement les placeholders, sans toucher à la structure HTML.
5. **Push GitHub** → PUT → `tunnels/<userId>/<tunnelSlug>/<pageSlug>.html`.
6. **Mise à jour Firestore** → stocke :  
   - `baseUrl`  
   - `firstPageSlug`  
   - `viewUrl`

### 2.2. Mapping des templates
| `pageType` | Template GitHub |
|------------|----------------|
| optin | `templates/optin.html` |
| sales | `templates/sales.html` |
| checkout | `templates/checkout.html` |
| thankyou | `templates/thankyou.html` |

---

## 3. Champs et placeholders

### 3.1. Données globales (webhook 1.)
| Champ | Exemple | Description |
|-------|-----------------------|-------------------------|
| `userId` | `pOoqftYacXhirXtjxVk60Or09nm2` | UID Firebase |
| `slug` | `pack-productivite` | Slug du tunnel |
| `baseUrl` | `https://sellyo.fr/tunnels/...` | URL d’accès au tunnel |
| `ui.mainColor` | `#0b1220` | Couleur de fond principale |
| `ui.buttonColor` | `#3b82f6` | Couleur des CTA |
| `brand.logoUrl` | `https://.../logo.png` | Logo global |
| `coverUrl` | `https://.../cover.jpg` | Image de couverture par défaut |
| `payment.paymentLink` | `https://buy.stripe.com/...` | Stripe Payment Link |
| `delivery.productUrl` | `https://drive.google.com/...` | Lien du produit final |

### 3.2. Données par page (iterator 133.)
| Champ | Type | Description |
|--------|-------|-------------------------|
| `slug` | string | Slug de la page |
| `pageType` | enum | optin / sales / checkout / thankyou |
| `title` | string | Titre H1 |
| `subtitle` | string | Sous-titre |
| `heroImage` | URL | Image principale |
| `videoUrl` | URL | Vidéo Firebase |
| `productFileUrl` | URL | Fichier PDF/ZIP |
| `productDescription` | string | Description du produit |
| `flow.nextSlug` | string | Slug de la page suivante |

---

## 4. Fonctionnement des pages

| Page | Contenu principal | Particularités |
|------|-----------------|-----------------|
| **Optin** | Formulaire + CTA | Scripts obligatoires : `firebase-init.js` + `save-lead-tunnel.js` |
| **Sales** | Présentation produit | Bouton CTA Stripe obligatoire |
| **Checkout** | Récapitulatif + paiement | Utilise Stripe Payment Link |
| **Thankyou** | Livraison produit | Bouton `{{download.url}}` visible uniquement si produit dispo |

⚠️ **Règle automatique ajoutée** :  
Si `productFileUrl` **OU** `delivery.productUrl` est défini → **page thankyou obligatoire**.  
Sinon → message d’erreur dans le formulaire :  
> "_Ajoutez une page de remerciement pour livrer votre produit_"

---

## 5. Scripts frontend

### 5.1. submit-tunnel.js
- Collecte toutes les données du formulaire.
- Upload les fichiers Firebase : **hero**, **vidéo**, **produit**.
- Construit `pagesData[]` avec `flow.nextSlug`.
- Vérifie présence produit → force création page thankyou si nécessaire.
- Envoie l’ensemble des données à Make.

### 5.2. inject-content.js
- Charge le template HTML depuis GitHub.
- Remplace **tous** les placeholders.
- Gère les fallbacks automatiques si champ manquant.

### 5.3. save-lead-tunnel.js
- Détecte les formulaires : `#lead-form`, `[data-role="capture"]`, `#optin-form`.
- Enregistre le lead dans Firestore → `leads/{userId}/{tunnelSlug}`.
- Redirige automatiquement vers `flow.nextSlug`.

---

## 6. Intégrations externes
| Service | Utilisation |
|---------|------------|
| **Firebase** | Auth, Firestore, Storage |
| **Make.com** | Orchestrateur principal des tunnels |
| **GitHub Pages** | Hébergement HTML des tunnels |
| **Stripe** | Payment Link obligatoire |
| **PayPal** | Non encore intégré |

---

## 7. Problèmes connus

| Problème | Statut | Correctif |
|----------|--------|-----------|
| Lead optin non enregistré | ✅ Corrigé | Multi-sélecteurs dans `save-lead-tunnel.js` |
| Stripe Checkout vs PaymentLink | ❌ Supprimé | On impose PaymentLink |
| Logo manquant | ✅ Corrigé | Fallback sur `coverUrl` |
| Lien produit absent | ⚠️ En cours | Ajout du `delivery.productUrl` |

---

## 8. Changelog

| Date | Modification | Fichiers impactés |
|------|-------------|---------------------|
| 20/08 | Passage JSON → HTML direct | Make + GitHub |
| 21/08 | Ajout `redirectURL` | submit-tunnel.js |
| 22/08 | Ajout règle page thankyou obligatoire | submit-tunnel.js |
| 22/08 | Fix bug `pagesData[]` | submit-tunnel.js |

---

## 9. Prochaines étapes
- [ ] Finaliser la vérification automatique **page thankyou obligatoire**
- [ ] Tester tunnels **sans image** / **sans vidéo**
- [ ] Ajouter la **livraison produit** dans `thankyou.html`
- [ ] Uploader ce fichier dans GitHub → `/docs/sellyo-tunnels-master.md`
