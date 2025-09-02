# 📘 Sellyo — Document Maître : Gestion des Tunnels Marketing

**Dernière mise à jour : 02/09/2025**

> **Objectif** : Centraliser toutes les infos techniques (mappings, templates, variables, scripts) pour les tunnels marketing **Sellyo**.

---

## 0) Résumé rapide (session du 02/09)

* **OPTIN** ✅ : OK. Lead capturé, redirection → page suivante OK. `save-lead-tunnel.js` renforcé (détection `nextUrl` + ignore placeholders `{{...}}`).
* **SALES** ⚠️ : Template unifié avec bloc **Problème/Solution/Bénéfices/Garantie** + **Timer**. À re‑tester que `timers.*` transite bien.
* **CHECKOUT** 🔧 : Mappings paiement corrigés (tous depuis **webhook 1.**\*). Bouton paiement OK → Stripe. Problème restant : **rediriger automatiquement vers merci** sans que l’utilisateur configure Stripe manuellement.
* **THANKYOU** ✅ : Affiche **lien de téléchargement** (URL) *et* **fichier** si présents, plus lien “Retour à la page 1 du tunnel”. Texte de remerciement inséré.
* **À faire demain** 👉 Voir §7.2 Plan redirection Stripe (auto success URL) et validations finales.

---

## 1) Structure des tunnels

### 1.1 Pages générées

* `optin.html` → Formulaire de capture + CTA
* `sales.html` → Page de vente
* `checkout.html` → Paiement (Stripe)
* `thankyou.html` → Livraison produit / récap

### 1.2 Arborescence

```
tunnels/<userId>/<tunnelSlug>/<pageSlug>.html
```

* GitHub Pages sert les fichiers HTML (Make → GitHub PUT).

### 1.3 Scripts

| Script                | Rôle                                                                                                                             |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `submit-tunnel.js`    | Collecte du formulaire, upload Firebase (hero/vidéo/produit), construit `pagesData[]` + `flow.nextSlug`, envoie au Webhook Make. |
| `inject-content.js`   | Charge template + remplace tokens (placeholders). Gère fallbacks.                                                                |
| `save-lead-tunnel.js` | Sauvegarde lead Firestore; redirection auto → `nextUrl`/`data-next`/fallback `-pX→pX+1`.                                         |
| `firebase-init.js`    | Init Firebase (Auth Anonyme + Firestore).                                                                                        |

---

## 2) Architecture Make.com

### 2.1 Workflow

1. **Webhook (1.)** reçoit toutes les données globales.
2. **Iterator (133.)** boucle sur `pagesData[]` (une exécution par page).
3. Sélection du **template** selon `pageType`.
4. **GPT** : remplacement **strict** des placeholders du template avec les VALEURS.
5. **GitHub** : push du HTML → `tunnels/<userId>/<tunnelSlug>/<pageSlug>.html`.
6. **Firestore** : MAJ `baseUrl`, `firstPageSlug`, `viewUrl`.

### 2.2 Mapping des templates

| `pageType` | Template GitHub           |
| ---------- | ------------------------- |
| optin      | `templates/optin.html`    |
| sales      | `templates/sales.html`    |
| checkout   | `templates/checkout.html` |
| thankyou   | `templates/thankyou.html` |

---

## 3) Champs et placeholders (vérité terrain)

### 3.1 Données **globales** (Webhook **1.**)

| Champ (1.\*)                   | Exemple                        | Description                           |
| ------------------------------ | ------------------------------ | ------------------------------------- |
| `userId`                       | `pOoqft...`                    | UID Firebase                          |
| `slug`                         | `pack-productivite`            | Slug du tunnel                        |
| `baseUrl`                      | `https://.../tunnels/.../`     | Base publique GitHub Pages            |
| `ui.mainColor`                 | `#0b1220`                      | Couleur fond                          |
| `ui.buttonColor`               | `#3b82f6`                      | Couleur CTA                           |
| `brand.logoUrl`                | `https://.../logo.png`         | Logo global                           |
| `coverUrl`                     | `https://.../cover.jpg`        | Couverture par défaut                 |
| `currency`                     | `EUR`                          | **Devise globale**                    |
| `payment.price`                | `49`                           | **Prix global**                       |
| `payment.paymentLink`          | `https://buy.stripe.com/...`   | **Stripe Payment Link**               |
| `payment.stripePublishableKey` | `pk_test_...`                  | (optionnel) pour Checkout client‑only |
| `payment.stripePriceId`        | `price_...`                    | (optionnel) pour Checkout client‑only |
| `delivery.productUrl`          | `https://drive.google.com/...` | Lien produit final                    |

> **Important** : Les **champs paiement** viennent **uniquement** du Webhook **1.**\* (pas de 133.\*).

### 3.2 Données **par page** (Iterator **133.**)

| Champ (133.\*)       | Type      | Description                                                 |
| -------------------- | --------- | ----------------------------------------------------------- |
| `slug`               | string    | Slug de la page (ex. `mardi3-xxxx-p2`)                      |
| `pageType`           | enum      | `optin` / `sales` / `checkout` / `thankyou`                 |
| `title`              | string    | H1                                                          |
| `subtitle`           | string    | Sous‑titre                                                  |
| `heroImage`          | URL       | Image                                                       |
| `videoUrl`           | URL       | Vidéo                                                       |
| `productFileUrl`     | URL       | Fichier (PDF/ZIP)                                           |
| `productDescription` | string    | Description                                                 |
| `copy.*`             | string    | `problem` / `solution` / `benefits` / `guarantee` / etc.    |
| `testimonials`       | \[string] | Témoignages                                                 |
| `faqs`               | \[{q,a}]  | Faq                                                         |
| `timers.*`           | obj       | `evergreenMinutes` / `deadlineISO`                          |
| `flow.nextSlug`      | string    | Slug de la page suivante (**utilisé pour `flow.nextHref`**) |

---

## 4) Règles d’injection (GPT)

* **Remplacer uniquement** les tokens présents.
* **Ne pas** ajouter/supprimer des balises/ids/classes/scripts.
* Si **valeur vide** → insérer `""`.
* **Priorité** aux **premières valeurs non vides**.
* `testimonials` → concat `<div class="testimonial-item">"..."</div>`
* `faqs` → concat `<div class="faq-item"><strong>Q</strong><br/>A</div>`

---

## 5) VALEURS → Templates (références à utiliser)

### 5.1 OPTIN — VALEURS

```
seo.metaTitle:        {{133.seo.metaTitle}} | {{1.seo.siteTitle}}
seo.metaDescription:  {{133.seo.metaDescription}} | {{1.seo.siteDescription}}
ui.mainColor:         {{1.mainColor}} | #0b1220
ui.buttonColor:       {{1.buttonColor}} | #3b82f6
brand.logoUrl:        {{133.logoUrl}} | {{1.logoUrl}}
media.videoMp4:       {{133.media.videoMp4}} | {{133.videoUrl}} | ""
media.imageUrl:       {{133.media.imageUrl}} | {{133.heroImage}} | {{1.coverUrl}} | ""
copy.title:           {{133.title}} | ""
copy.subtitle:        {{133.subtitle}} | ""
copy.productDescription: {{133.productDescription}} | ""
copy.problem:         {{133.copy.problem}} | ""
copy.solution:        {{133.copy.solution}} | ""
copy.benefits:        {{133.copy.benefits}} | ""
copy.bullets:         {{133.copy.bullets}} | ""
copy.guarantee:       {{133.copy.guarantee}} | ""
copy.ctaText:         {{133.ctaText}} | {{1.cta}} | "Continuer"

components.formFields / formFields: {{133.components.formFields}} | {{133.formFields}} | {{1.fields}}

flow.nextHref:        {{133.flow.nextSlug}}.html | ""

timers.evergreenMinutes: {{133.timers.evergreenMinutes}} | {{1.timers.defaultEvergreen}} | ""
timers.deadlineISO:      {{133.timers.deadlineISO}} | ""

analytics.fbPixelId:  {{1.analytics.fbPixelId}} | ""
analytics.gtmId:      {{1.analytics.gtmId}} | ""
```

### 5.2 SALES — VALEURS (mêmes blocs + timer)

```
seo/meta/ui/brand/media/copy.* : idem OPTIN
copy.ctaText:         {{133.ctaText}} | {{1.cta}} | "Commander"

flow.nextHref:        {{133.flow.nextSlug}}.html | ""

timers.evergreenMinutes / deadlineISO : idem OPTIN

// Paiement (si CTA=payment, permet d’aller direct Stripe depuis SALES)
payment.paymentLink:  {{1.payment.paymentLink}} | ""

analytics.fbPixelId / gtmId : idem OPTIN
```

### 5.3 CHECKOUT — VALEURS (**corrigées**)

```
seo/meta/ui/brand/media/copy.* : idem SALES

// ⚠️ Tous les champs PAIEMENT viennent de 1.* (webhook global)
currency:                 {{1.currency}} | "EUR"
payment.price:            {{1.payment.price}} | ""
payment.paymentLink:      {{1.payment.paymentLink}} | ""
payment.stripePublishableKey: {{1.payment.stripePublishableKey}} | ""
payment.stripePriceId:    {{1.payment.stripePriceId}} | ""

// CTA & navigation
cta.action:            {{133.ctaAction}} | "payment"
cta.url:               {{133.ctaUrl}} | ""
flow.nextHref:         {{133.flow.nextSlug}}.html | ""

timers.evergreenMinutes / deadlineISO : idem
analytics.fbPixelId / gtmId : idem
```

### 5.4 THANKYOU — VALEURS (livraison)

```
seo/meta/ui/brand/media : idem
thankyouText:          {{133.thankyouText}} | ""
productRecap:          {{133.productRecap}} | ""

// Livraison — prendre la première URL valide
page.productFile:      {{133.productFileUrl}} | ""
delivery.fileUrl:      {{1.delivery.fileUrl}} | ""
delivery.url:          {{1.delivery.productUrl}} | {{1.delivery.url}} | ""

// Bouton retour → 1ère page
tunnel.firstPageSlug:  {{1.firstPageSlug}} | ""
```

---

## 6) Implémentations côté Front

### 6.1 `save-lead-tunnel.js` (en prod)

* Sélecteurs : `#lead-form`, `[data-role="capture"]`, `#optin-form`.
* Ignore placeholders `{{...}}` dans `nextUrl` (évite rediriger vers des tokens non remplacés).
* Priorité : `data-next` > `<input name="nextUrl">` > fallback `-pX → -p(X+1).html`.
* N’empêche pas la redirection si Firestore échoue (warn + continue).

### 6.2 Timers (sales + checkout)

* `timers.evergreenMinutes` **ou** `timers.deadlineISO`.
* Le script masque/affiche automatiquement le bloc.

### 6.3 Media logic (sales + checkout)

* Affiche **vidéo** si `media.videoMp4` → sinon **image** si `media.imageUrl` → sinon masque le bloc.

### 6.4 Checkout — CTA paiement

* Priorité : `payment (Stripe)` > `next` > `url` > `download`.
* Deux modes supportés :

  1. **Payment Link** (`1.payment.paymentLink`)
  2. **Stripe Checkout client‑only** (si `1.payment.stripePriceId` + `1.payment.stripePublishableKey`) avec `stripe.redirectToCheckout({ successUrl, cancelUrl })` ; `successUrl` est construit **dynamiquement** depuis `flow.nextHref`.

### 6.5 Thankyou — livraison

* Affiche **deux actions** si deux sources : `download.url` **et** `file`.
* Bouton “Retour à l’accueil” → vers **page 1 du tunnel** si dispo.

---

## 7) Points ouverts & plan d’action

### 7.1 Incohérences déjà fixées

* ❌ Références aux champs `133.*` pour le paiement dans Checkout → **corrigé** en `1.*`.
* ✅ Nettoyage CSS/UI si couleurs vides (fallbacks au besoin).

### 7.2 **Redirection automatique après paiement Stripe** (objectif de demain)

**Problème** : avec **Payment Link**, Stripe ne connaît pas l’URL de `thankyou` tant que l’utilisateur ne la configure pas.

**Options proposées** :

1. **Stripe Checkout client‑only** (recommandé si `priceId + pk` existent)
   → `successUrl = baseUrl + flow.nextSlug + '.html'` (absolue)
   → Pas besoin que l’utilisateur connaisse l’URL.
2. **Redirector Make** (compatible Payment Link)
   → Dans l’URL du Payment Link, ajouter `?r=<ID>` → Stripe renvoie vers un **endpoint Make** qui fait un 302 vers la bonne `thankyou` (construit via `userId/tunnelSlug/flow.nextSlug`). Pas de saisie manuelle côté user.
3. **Webhook Stripe (server)**
   → Plus lourd (signatures, events), à éviter pour MVP.

**Action demain** : décider entre **(1)** et **(2)** et implémenter.

---

## 8) État des tests & Known issues

| Élément               | État | Notes                                                 |
| --------------------- | ---- | ----------------------------------------------------- |
| Optin                 | ✅    | OK multi‑sélecteurs form + redirection                |
| Sales (Timer)         | ⚠️   | Confirmer que `timers.*` est bien transmis par 133.\* |
| Checkout → Stripe     | ✅    | Redirection Stripe OK (bouton visible).               |
| Post‑paiement → Merci | ❌    | À résoudre (voir §7.2).                               |
| Thankyou              | ✅    | Affiche URL + fichier + retour P1.                    |

---

## 9) Changelog

| Date     | Modification                                         | Fichiers                                  |
| -------- | ---------------------------------------------------- | ----------------------------------------- |
| 02/09    | Corrige mappings Checkout (paiement via `1.*`)       | `templates/checkout.html`, prompt VALEURS |
| 02/09    | Thankyou : affiche URL **et** Fichier + retour P1    | `templates/thankyou.html`                 |
| 02/09    | `save-lead-tunnel.js` : ignore tokens, clean nextUrl | `js/save-lead-tunnel.js`                  |
| 20‑22/08 | Historique initial                                   | divers                                    |

---

## 10) À faire (checklist)

* [ ] Choisir stratégie de **post‑paiement** (Checkout client‑only vs Redirector Make) et livrer.
* [ ] Vérifier transmission `timers.*` depuis 133 → SALES/CHECKOUT.
* [ ] Tests de régression : sans image, sans vidéo, sans testimonials/faqs.
* [ ] Ajouter ce document dans le repo : `docs/sellyo-tunnels-master.md`.
