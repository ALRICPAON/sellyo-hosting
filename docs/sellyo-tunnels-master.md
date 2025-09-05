📘 Sellyo — Document Maître : Gestion des Tunnels Marketing
Dernière mise à jour : 05/09/2025
Objectif : Centraliser toutes les infos techniques (mappings, templates, variables, scripts, logique média et paiement) pour les tunnels marketing Sellyo.
0) Résumé rapide (session du 05/09)
OPTIN ✅ : Fonctionne. Lead bien capturé → redirection → page suivante OK.
SALES ✅ :
Nouvelle logique texte à gauche / média à droite pour le bloc principal.
Bloc secondaire inversé média à gauche / texte à droite pour plus d’équilibre visuel.
Gestion unifiée des médias : priorité vidéo MP4 > embed YouTube/Vimeo > image.
CHECKOUT ⚠️ :
Mappings Stripe corrigés (1.* uniquement).
Redirection Stripe OK, mais la redirection automatique vers Thankyou reste à implémenter.
THANKYOU ✅ :
Affiche correctement le lien produit + fichier téléchargeable.
Ajout d’un bouton “Retour à la page 1 du tunnel”.
Make.com ✅ :
Pas de changement nécessaire dans le mapping des templates.
Vérifié que les bons champs médias passent (media.imageUrl, media.videoMp4, media.videoEmbed).
1) Structure des tunnels
1.1 Pages générées
Page	Rôle
optin.html	Formulaire de capture
sales.html	Page de vente complète
checkout.html	Paiement Stripe
thankyou.html	Livraison produit + retour
1.2 Arborescence
tunnels/<userId>/<tunnelSlug>/<pageSlug>.html
1.3 Scripts clés
Script	Rôle
submit-tunnel.js	Crée les pages, upload fichiers, envoie pagesData[] à Make.
inject-content.js	Gère le rendu dynamique des templates et fallback des champs.
save-lead-tunnel.js	Sauvegarde le lead dans Firestore, puis redirige automatiquement vers la page suivante.
firebase-init.js	Initialise Firebase (Auth + Firestore + Storage).
2) Architecture Make.com
2.1 Workflow
Webhook 1. : reçoit les données globales.
Iterator 133. : boucle sur pagesData[] pour générer une page par exécution.
Sélectionne le template selon pageType.
GPT remplace les placeholders.
Push vers GitHub Pages.
Firestore mis à jour avec baseUrl, firstPageSlug, viewUrl.
2.2 Mapping des templates
pageType	Template GitHub
optin	templates/optin.html
sales	templates/sales.html
checkout	templates/checkout.html
thankyou	templates/thankyou.html
3) Champs et placeholders
3.1 Données globales (1.*)
Champ	Exemple	Description
userId	pOoqft...	UID Firebase
slug	kit-productivite	Slug global du tunnel
baseUrl	https://alricpaon.github.io/sellyo-hosting/tunnels/.../	URL publique du tunnel
ui.mainColor	#0b1220	Couleur d’arrière-plan
ui.buttonColor	#3b82f6	Couleur CTA
brand.logoUrl	https://.../logo.png	Logo global
coverUrl	https://.../cover.jpg	Image par défaut
currency	EUR	Devise
payment.price	49	Prix produit
payment.paymentLink	https://buy.stripe.com/...	Stripe Payment Link
payment.stripePublishableKey	pk_test_...	Clé Stripe
payment.stripePriceId	price_...	ID du prix Stripe
delivery.productUrl	https://drive.com/...	URL finale produit
⚠️ Important : Les champs paiement viennent exclusivement de 1.*.
3.2 Données par page (133.*)
Champ	Type	Description
slug	string	Slug unique de la page
pageType	enum	optin / sales / checkout / thankyou
title	string	H1 principal
subtitle	string	Sous-titre
heroImage	URL	Image principale
videoUrl	URL	Vidéo MP4
videoEmbed	URL	Lien YouTube/Vimeo
productFileUrl	URL	Fichier PDF/ZIP
productDescription	string	Description
copy.*	string	Problème, solution, bénéfices, etc.
testimonials	[string]	Liste de témoignages
faqs	[{q,a}]	Liste FAQ
timers.*	obj	evergreenMinutes / deadlineISO
flow.nextSlug	string	Page suivante
4) Règles GPT pour injection
Remplacer uniquement les tokens présents.
Ne jamais supprimer d’ID ou de classes.
Valeurs vides → "".
testimonials → <div class="testimonial-item">"..."</div>
faqs → <div class="faq-item"><strong>Q</strong><br/>A</div>
5) Logique des médias (Optin & Sales)
Priorité d’affichage :
Vidéo MP4 → <video src="{{media.videoMp4}}">
Sinon Embed YouTube/Vimeo → <iframe src="{{media.videoEmbed}}">
Sinon Image → <img src="{{media.imageUrl}}">
Si aucun média → cacher complètement le bloc.
6) Implémentations front
6.1 save-lead-tunnel.js
Supporte #lead-form, [data-role="capture"] et #optin-form.
Ignore tokens non remplacés {{...}}.
Priorité data-next → nextUrl → fallback basé sur -pX → -pX+1.
6.2 Timers
Deux modes supportés :
Evergreen → timers.evergreenMinutes
Deadline ISO → timers.deadlineISO
Bloc caché si les deux sont vides.
6.3 Checkout : CTA Stripe
Priorité :
Stripe Checkout client-only (stripePriceId + pk)
→ Redirection automatique vers Thankyou via successUrl.
Payment Link (1.payment.paymentLink).
Sinon flow.nextHref.
7) Points ouverts
7.1 Fixes réalisés
✅ Unification logique Optin / Sales pour l’affichage image/vidéo.
✅ Champs paiement corrigés (Checkout utilise uniquement 1.*).
✅ Bloc secondaire inversé pour Sales (texte ⇄ média).
✅ Templates synchronisés sur le même moteur.
7.2 Tâches à venir
 Gérer la redirection automatique Stripe → Thankyou.
 Tester timers evergreenMinutes + deadlineISO.
 Vérifier Sales sans image ni vidéo.
 Ajouter ce document au repo docs/sellyo-tunnels-master.md.
8) État des tests
Élément	État	Notes
Optin	✅	OK
Sales (médias)	✅	Bloc haut = texte gauche / média droite, bloc bas inversé
Checkout → Stripe	✅	Bouton OK, mapping corrigé
Post-paiement → Merci	❌	Redirection manquante
Thankyou	✅	Affiche lien + fichier
9) Changelog
Date	Modification	Fichiers impactés
05/09/25	Unification logique médias + inversion Sales	templates/sales.html
05/09/25	Ajout support iframe YouTube/Vimeo	templates/sales.html
05/09/25	Mappings Stripe corrigés	templates/checkout.html
05/09/25	Bloc Sales responsive et symétrique	templates/sales.html
