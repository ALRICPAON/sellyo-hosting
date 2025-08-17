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

// Charge JSON de config tunnel (gère slug base OU slug -pX)
async function loadConfig(slug) {
  if (!slug) throw new Error("slug manquant dans l'URL");
  const qs = new URLSearchParams(location.search);
  const userId = qs.get("userId");
  if (!userId) throw new Error("userId manquant dans l'URL");

  // si l'URL ne donne que le slug "base", on prend p=1 par défaut
  const pageParam = qs.get("page");
  const hasSuffix = /-p\d+$/.test(slug);
  const effectiveSlug = hasSuffix
    ? slug
    : `${slug}-p${pageParam ? String(parseInt(pageParam,10)||1) : "1"}`;

  const candidates = [
    `tunnels/${encodeURIComponent(userId)}/${encodeURIComponent(effectiveSlug)}.json`,
    `tunnels/${encodeURIComponent(userId)}/${encodeURIComponent(slug)}.json` // fallback si jamais le fichier a été créé sans suffixe
  ];

  for (const path of candidates) {
    const res = await fetch(path, { cache: "no-store" });
    if (res.ok) return res.json();
  }
  throw new Error(`Config introuvable pour ${slug} (essayé: ${candidates.join(" ; ")})`);
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
function normalizeConfig(cfg){
  // pageType
  const pageType = cfg.pageType || cfg.type || "sales";

  // media : map heroImage / videoUrl -> media.*
  const rawVideo = cfg.media?.videoMp4 || cfg.media?.videoEmbed ? "" : (cfg.videoUrl || "");
  const media = {
    imageUrl: cfg.media?.imageUrl ?? cfg.heroImage ?? "",
    videoMp4: cfg.media?.videoMp4 ?? (rawVideo && /\.mp4($|\?)/i.test(rawVideo) ? rawVideo : ""),
    videoEmbed: cfg.media?.videoEmbed ?? (rawVideo && !/\.mp4($|\?)/i.test(rawVideo) ? rawVideo : "")
  };

  // copy : map title / bullets / ctaText -> copy.*
  const copy = {
    headline: cfg.copy?.headline ?? cfg.title ?? "",
    bullets:  cfg.copy?.bullets  ?? cfg.copy?.benefits ?? cfg.bullets ?? [],
    cta:      cfg.copy?.cta      ?? cfg.ctaText ?? "Continuer",
    ctaPrimary:   cfg.copy?.ctaPrimary ?? cfg.ctaText ?? cfg.copy?.cta ?? "Continuer",
    ctaSecondary: cfg.copy?.ctaSecondary ?? "Non merci",
    pageTitle:    cfg.copy?.pageTitle ?? cfg.seo?.metaTitle ?? ""
  };

  // ui : si non fourni, déduire du média
  const ui = {
    showImage: cfg.ui?.showImage ?? !!media.imageUrl,
    showVideo: cfg.ui?.showVideo ?? !!(media.videoMp4 || media.videoEmbed),
    showPrimaryCta: cfg.ui?.showPrimaryCta ?? true,
    showSecondaryCta: cfg.ui?.showSecondaryCta ?? (pageType === "upsell" || pageType === "downsell"),
    autoRedirect: cfg.ui?.autoRedirect ?? false,
    theme: cfg.ui?.theme ?? "dark"
  };

  // flow : reprendre d’anciens champs si présents
  const flow = cfg.flow ? { ...cfg.flow } : {};
  if (!flow.nextSlug && cfg.nextSlug) flow.nextSlug = cfg.nextSlug;
  if (!flow.declineSlug && cfg.declineSlug) flow.declineSlug = cfg.declineSlug;

  return { ...cfg, pageType, media, copy, ui, flow };
}

// Exporte la fonction principale
export async function injectSlots({ slug, page }) {
  let cfg = await loadConfig(slug);
cfg = normalizeConfig(cfg);


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
