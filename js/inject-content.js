<!-- /js/inject-content.js -->
<script type="module">
// Helpers
const $ = (sel) => document.querySelector(sel);
const show = (el) => { if (el) el.style.display = ""; };
const hide = (el) => { if (el) el.style.display = "none"; };
const setText = (sel, txt) => { const el = $(sel); if (el) el.textContent = txt ?? ""; };
const setHTML = (sel, html) => { const el = $(sel); if (el) el.innerHTML = html ?? ""; };
const setBullets = (sel, items=[]) => {
  const el = $(sel); if (!el) return;
  el.innerHTML = items.map(i => `<li>${i}</li>`).join("");
};

// Charge JSON de config tunnel (sans "/" initial pour GitHub Pages)
async function loadConfig(slug) {
  if (!slug) throw new Error("slug manquant dans l'URL");
  const qs = new URLSearchParams(location.search);
  const userId = qs.get("userId");
  if (!userId) throw new Error("userId manquant dans l'URL");

  const path = `tunnels/${encodeURIComponent(userId)}/${encodeURIComponent(slug)}.json`;
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) throw new Error(`Config introuvable: ${path}`);
  return res.json();
}

// (Optionnel) microcopy depuis un endpoint Make si présent
async function loadMicrocopy(page, slug) {
  try {
    const r = await fetch(`microcopy/${encodeURIComponent(page)}?slug=${encodeURIComponent(slug)}`, { cache: "no-store" });
    if (r.ok) return r.json();
  } catch (_e) {}
  return null;
}

// Applique couleurs du thème
function applyThemeColors(colors) {
  if (!colors) return;
  document.documentElement.style.setProperty("--bg", colors.bg ?? "#0b1220");
  document.documentElement.style.setProperty("--text", colors.text ?? "#ffffff");
  document.documentElement.style.setProperty("--btn", colors.btn ?? "#3b82f6");
}

// Gère les médias (image / vidéo mp4 / embed)
function applyMedia(cfg) {
  // Image
  const imgWrap = document.querySelector('[data-optional="image"]');
  const hasImage = cfg.ui?.showImage && cfg.media?.imageUrl;
  if (hasImage) {
    const img = document.getElementById("hero-img");
    if (img) img.src = cfg.media.imageUrl;
    show(imgWrap);
  } else {
    hide(imgWrap);
  }

  // Vidéo
  const vidWrap = document.querySelector('[data-optional="video"]');
  const mp4 = cfg.media?.videoMp4;
  const emb = cfg.media?.videoEmbed;
  const allowVideo = cfg.ui?.showVideo && (mp4 || emb);

  const vid = document.getElementById("hero-mp4");
  const iframeHost = document.getElementById("hero-embed");

  if (allowVideo) {
    if (mp4 && vid) {
      vid.src = mp4;
      show(vid); hide(iframeHost);
    } else if (emb && iframeHost) {
      if (emb.startsWith("<iframe")) {
        iframeHost.innerHTML = emb;
      } else {
        iframeHost.innerHTML = `<iframe src="${emb}" frameborder="0" allow="autoplay; fullscreen" allowfullscreen style="width:100%;height:100%"></iframe>`;
      }
      show(iframeHost); hide(vid);
    }
    show(vidWrap);
  } else {
    hide(vidWrap);
    if (vid) vid.removeAttribute("src");
    if (iframeHost) iframeHost.innerHTML = "";
  }
}

// Affiche/masque CTA secondaire (upsell/downsell)
function applySecondaryCta(cfg) {
  const secondary = document.getElementById("secondary-cta");
  if (!secondary) return;
  const shouldShow = !!cfg.ui?.showSecondaryCta;
  if (shouldShow) show(secondary); else hide(secondary);
}

// Page title et headline fallback
function applyTitles(cfg, copy) {
  if (!document.title || document.title.toLowerCase() === "sales" || document.title.toLowerCase() === "optin" || document.title.toLowerCase() === "paiement" || document.title.toLowerCase() === "merci") {
    document.title = copy?.pageTitle || cfg.name || "Sellyo";
  }
  setText('[data-slot="headline"]', copy?.headline || "Titre");
}

// Exporte la fonction principale
export async function injectSlots({ slug, page }) {
  const cfg = await loadConfig(slug);

  // Theme
  applyThemeColors(cfg.colors);

  // Microcopy optionnelle
  const mc = await loadMicrocopy(page, slug);
  const copy = {
    headline: mc?.headline ?? cfg.copy?.headline ?? "",
    bullets: mc?.bullets ?? cfg.copy?.bullets ?? [],
    cta: mc?.cta ?? cfg.copy?.cta ?? "Continuer",
    ctaPrimary: mc?.ctaPrimary ?? cfg.copy?.ctaPrimary ?? cfg.copy?.cta ?? "Continuer",
    ctaSecondary: mc?.ctaSecondary ?? cfg.copy?.ctaSecondary ?? "Non merci",
    pageTitle: mc?.pageTitle ?? cfg.copy?.pageTitle
  };

  // Texte / bullets / CTA
  applyTitles(cfg, copy);
  setBullets('[data-slot="bullets"]', copy.bullets);
  // Pour optin/checkout
  setText('[data-slot="cta"]', copy.cta);
  // Pour sales (upsell/downsell)
  setText('[data-slot="ctaPrimary"]', copy.ctaPrimary);
  setText('[data-slot="ctaSecondary"]', copy.ctaSecondary);

  // Médias & CTA secondaire visibles selon flags
  applyMedia(cfg);
  applySecondaryCta(cfg);

  // Retourne la config pour que la page gère ses redirections (checkout/thankyou)
  return cfg;
}
</script>
