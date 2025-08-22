
# 📘 Sellyo — Document Maître : Gestion des Tunnels Marketing

> **Objectif** : Centraliser toutes les informations techniques, mappings, templates, variables et scripts nécessaires au fonctionnement des tunnels marketing générés par Sellyo.

---

## 1. Structure générale des tunnels

### 1.1. Pages générées
- `optin.html` → Formulaire de capture + CTA
- `sales.html` → Page de vente
- `checkout.html` → Paiement Stripe
- `thankyou.html` → Livraison produit

### 1.2. Arborescence des fichiers générés
```
tunnels/<userId>/<tunnelSlug>/<pageSlug>.html
```
Chaque page est un **fichier HTML complet** poussé dans GitHub via Make.

### 1.3. Scripts principaux
| Script | Rôle |
|--------|------|
| `submit-tunnel.js` | Collecte du formulaire tunnel + upload fichiers + envoi Make |
| `inject-content.js` | Injection du contenu dynamique dans templates |
| `save-lead-tunnel.js` | Capture des leads Firebase |
| `firebase-init.js` | Initialisation Firebase (auth + firestore) |

---

## 2. Architecture Make.com

### 2.1. Webhook → Iterator → GPT → GitHub
1. **Webhook** : reçoit les données complètes
2. **Iterator 133** : boucle sur les pages
3. **Sélection template** → selon `pageType`
4. **GPT** → remplace placeholders, ne touche pas à l'HTML
5. **Push GitHub** → PUT `tunnels/<userId>/<slug>.html`
6. **MàJ Firestore** : stocke `baseUrl`, `firstPageSlug`, `viewUrl`

### 2.2. Mapping templates
| pageType | Template GitHub |
|----------|----------------|
| optin | `templates/optin.html` |
| sales | `templates/sales.html` |
| checkout | `templates/checkout.html` |
| thankyou | `templates/thankyou.html` |

---

## 3. Champs et placeholders

### 3.1. Données globales (webhook 1.)
| Champ | Exemple | Description |
|-------|-----------------------|-----------------|
| `userId` | `pOoqftYacXhirXtjxVk60Or09nm2` | UID Firebase |
| `slug` | `pack-productivite` | Slug du tunnel |
| `baseUrl` | `https://sellyo.fr/tunnels/...` | Base URL |
| `ui.mainColor` | `#0b1220` | Couleur fond |
| `ui.buttonColor` | `#3b82f6` | Couleur CTA |
| `brand.logoUrl` | `https://.../logo.png` | Logo global |
| `coverUrl` | `https://.../cover.jpg` | Image fallback |
| `payment.paymentLink` | `https://buy.stripe.com/...` | Stripe Payment Link |
| `delivery.productUrl` | `https://drive.google.com/...` | Lien produit final |

### 3.2. Données par page (iterator 133.)
| Champ | Type | Description |
|--------|-------|---------------------|
| `slug` | string | Slug page |
| `pageType` | enum | optin / sales / checkout / thankyou |
| `title` | string | Titre H1 |
| `subtitle` | string | Sous-titre |
| `heroImage` | URL | Image principale |
| `videoUrl` | URL | Vidéo Firebase |
| `productFileUrl` | URL | Fichier PDF/ZIP |
| `productDescription` | string | Description produit |
| `flow.nextSlug` | string | Slug de la page suivante |

---

## 4. Fonctionnement des pages

| Page | Contenu principal | Particularités |
|------|-----------------|----------------|
| **Optin** | Formulaire + CTA | Scripts obligatoires : `firebase-init.js` + `save-lead-tunnel.js` |
| **Sales** | Présentation produit | CTA vers Stripe |
| **Checkout** | Récapitulatif paiement | Stripe Payment Link obligatoire |
| **Thankyou** | Livraison produit | Bouton `{{download.url}}` visible uniquement si produit disponible |

**⚠️ Règle automatique ajoutée** :  
Si `productFileUrl` **OU** `delivery.productUrl` est défini → **obligation** d’ajouter une page **thankyou**.  
Sinon → message : "_Ajoutez une page de remerciement pour livrer votre produit_".

---

## 5. Scripts frontend

### 5.1. submit-tunnel.js
- Collecte toutes les données du formulaire
- Upload Firebase : hero, vidéo, produit
- Construit `pagesData[]` avec flow.nextSlug
- Vérifie produit → force la thankyou si nécessaire
- Envoie les données à Make

### 5.2. inject-content.js
- Charge le template HTML
- Remplace tous les placeholders
- Fallback automatique si champ vide

### 5.3. save-lead-tunnel.js
- Détecte : `#lead-form` ou `[data-role="capture"]`
- Enregistre Firestore : `leads/{userId}/{tunnelSlug}`
- Redirige → `flow.nextSlug`

---

## 6. Intégrations externes
- **Firebase** : Auth, Firestore, Storage
- **Make.com** : Orchestrateur principal
- **GitHub Pages** : Hébergement HTML
- **Stripe** : Payment Link obligatoire
- **PayPal** : pas encore intégré

---

## 7. Problèmes connus

| Problème | Statut | Correctif |
|----------|--------|-----------|
| Lead optin non enregistré | ✅ Fixé | Multi-sélecteurs pour formulaire |
| Stripe Checkout vs PaymentLink | ❌ Supprimé | PaymentLink imposé |
| Logo manquant | ✅ Fixé | Fallback coverUrl |
| Lien produit absent | ⚠️ En cours | Utiliser `delivery.productUrl` |

---

## 8. Changelog

| Date | Modification | Fichier impacté |
|------|-------------|------------------|
| 20/08 | Passage JSON → HTML direct | Make + GitHub |
| 21/08 | Ajout `redirectURL` | submit-tunnel.js |
| 22/08 | Ajout règle thankyou obligatoire | submit-tunnel.js |
| 22/08 | Fix erreur syntaxe pagesData | submit-tunnel.js |

---

## 9. Prochaines étapes
- [ ] Finaliser la vérification automatique "page thankyou obligatoire"
- [ ] Tester tunnels sans image / sans vidéo
- [ ] Ajouter livraison produit dans `thankyou.html`
- [ ] Uploader ce fichier dans GitHub → `/docs/sellyo-tunnels-master.md`

