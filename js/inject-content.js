// js/inject-content.js

// Helpers
const $ = (sel) => document.querySelector(sel);
const show = (el) => { if (el) el.style.display = ""; };
const hide = (el) => { if (el) el.style.display = "none"; };
const setText = (sel, txt) => { const el = $(sel); if (el) el.textContent = txt ?? ""; };
const setBullets = (sel, items = []) => {
  const el = $(sel); if (!el) return;
  el.innerHTML = items.map(i => `<li>${i}</li>`).join("");
};

// Parser JSON tolérant (si GPT a ajouté du texte/fences)
function parseJsonLenient(s) {
  if (typeof s !== "string") return s;
  s = s.replace(/```json|```/g, "");
  const i = s.indexOf("{");
  const j = s.lastIndexOf("}");
  if (i !== -1 && j !== -1 && j > i) s = s.slice(i, j + 1);
  return JSON.parse(s);
}

// Charge JSON de config tunnel (slug base ou -pX) — chemins absolus GitHub Pages
async function loadConfig(slug) {
  if (!slug) throw new Error("slug manquant dans l'URL");
  const qs = new URLSearchParams(location.search);
  const userId = qs.get("userId");
  if (!userId) throw new Error("userId manquant dans l'URL");

  const pageParam = qs.get("page");
  const hasSuffix = /-p\d+$/.test(slug);
  const effectiveSlug = hasSuffix ? slug : `${slug}-p${pageParam ? String(parseInt(pageParam, 10) || 1) : "1"}`;

  // Base absolue pour project site: https://<host>/<repo>/
  const repo = (location.pathname.split("/")[1] || "");
  const rootPath = repo ? `/${repo}/` : "/";
  const ABS_BASE = `${location.origin}${rootPath}`;

  const rel1 = `tunnels/${encodeURIComponent(userId)}/${encodeURIComponent(effectiveSlug)}.json`;
  const rel2 = `tunnels/${encodeURIComponent(userId)}/${encodeURIComponent(slug)}.json`;
  const abs1 = `${ABS_BASE}${rel1}`;
  const abs2 = `${ABS_BASE}${rel2}`;

  const candidates = [abs1, abs2]; // on force absolu pour Safari/Pages

  for (const url of candidates) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      const text = await res.text();
      if (res.ok) return parseJsonLenient(text);
    } catch (e) {
      // on tente la suivante
    }
  }
  throw new Error(`Config introuvable pour slug=${slug}`);
}

// (Optionnel) microcopy depuis Make
async function loadMicrocopy(page, slug) {
  try {
    const url = `microcopy/${encodeURIComponent(page)}?slug=${encodeURIComponent(slug)}`;
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) return null;
    const t = await r.text();
    return parseJsonLenient(t);
  } catch (e) {
    return null;
  }
}

// Applique couleurs du thème
function applyThemeColors(cfg) {
  const bg = cfg.colors?.bg ?? "#0b1220";
  const text = cfg.colors?.text ?? "#ffffff";
  // bouton = buttonColor OU mainColor
  const btn = cfg.colors?.btn ?? cfg.ui?.buttonColor ?? cfg.ui?.mainColor ?? "#3b82f6";
  document.documentElement.style.setProperty("--bg", bg);
  document.documentElement.style.setProperty("--text", text);
  document.documentElement.style.setProperty("--btn", btn);
}

// Gère les médias (image / vidéo mp4 / embed)
function applyMedia(cfg) {
  // LOGO
  const logoEl = document.getElementById("logo");
  const logoUrl = cfg.brand?.logoUrl || cfg.logoUrl || "";
  if (logoEl && logoUrl) { logoEl.src = logoUrl; logoEl.style.display = ""; }
  else if (logoEl) logoEl.style.display = "none";

  // IMAGE (affiche si on a une URL, peu importe ui.showImage)
  const imgWrap = document.querySelector('[data-optional="image"]');
  const img = document.getElementById("hero-img");
  const imgUrl = cfg.media?.imageUrl || cfg.heroImage || "";
  if (imgWrap && img) {
    if (imgUrl) { img.src = imgUrl; imgWrap.style.display = ""; }
    else { img.removeAttribute("src"); imgWrap.style.display = "none"; }
  }

  // VIDEO — heuristique :
  // - Si emb contient <iframe> ou un host "embed" => iframe
  // - Sinon, on joue la vidéo dans <video> (mp4/webm/ogg), parfait pour Firebase Storage
  const vidWrap = document.querySelector('[data-optional="video"]');
  const vid = document.getElementById("hero-mp4");
  const iframeHost = document.getElementById("hero-embed");

  const raw = (cfg.videoUrl || "").trim(); // legacy éventuel
  let mp4 = (cfg.media?.videoMp4 || "").trim();
  let emb = (cfg.media?.videoEmbed || "").trim();

  const candidate = mp4 || emb || raw;

  const isEmbedHost = (u) => {
    try {
      const h = new URL(u).hostname;
      return /(youtube\.com|youtu\.be|vimeo\.com|player\.vimeo\.com|loom\.com|dailymotion\.com|twitch\.tv)/i.test(h);
    } catch { return false; }
  };

  // Reclassement tolérant si besoin
  if (!mp4 && candidate && !isEmbedHost(candidate) && !candidate.startsWith("<iframe")) {
    mp4 = candidate;   // Firebase/Storage → <video>
    emb = "";
  } else if (!emb && candidate && (isEmbedHost(candidate) || candidate.startsWith("<iframe"))) {
    emb = candidate;   // YouTube/Vimeo → <iframe>
    mp4 = "";
  }

  if (!vidWrap || (!mp4 && !emb)) {
    if (vidWrap) vidWrap.style.display = "none";
    if (vid) vid.removeAttribute("src");
    if (iframeHost) iframeHost.innerHTML = "";
    return;
  }

  if (mp4 && vid) {
    vid.src = mp4;
    vid.style.display = "";
    if (iframeHost) { iframeHost.innerHTML = ""; iframeHost.style.display = "none"; }
    vidWrap.style.display = "";
  } else if (emb && iframeHost) {
    if (emb.startsWith("<iframe")) iframeHost.innerHTML = emb;
    else iframeHost.innerHTML = `<iframe src="${emb}" frameborder="0" allow="autoplay; fullscreen" allowfullscreen style="width:100%;height:100%"></iframe>`;
    iframeHost.style.display = "";
    if (vid) { vid.removeAttribute("src"); vid.style.display = "none"; }
    vidWrap.style.display = "";
  }
}

// CTA secondaire (upsell/downsell)
function applySecondaryCta(cfg) {
  const secondary = document.getElementById("secondary-cta");
  if (!secondary) return;
  const shouldShow = !!cfg.ui?.showSecondaryCta;
  if (shouldShow) show(secondary); else hide(secondary);
}

// Titres
function applyTitles(cfg, copy) {
  const t = (document.title || "").toLowerCase();
  if (!t || ["sales", "optin", "paiement", "merci"].includes(t)) {
    document.title = copy?.pageTitle || cfg.name || "Sellyo";
  }
  setText('[data-slot="headline"]', copy?.headline || "Titre");
}

// Normalisation
function normalizeConfig(cfg) {
  const pageType = cfg.pageType || cfg.type || "sales";

  // normalisation logo (fallback image si pas de logo dédié)
  const brand = {
    logoUrl:
      cfg.brand?.logoUrl ||
      cfg.logoUrl ||
      cfg.media?.logoUrl ||
      cfg.heroImage ||
      cfg.media?.imageUrl ||
      ""
  };

  // tolérant aux variantes (images[], videos[], coverUrl, videoUrl brut, etc.)
  const rawVideo = cfg.media?.videoMp4 || cfg.media?.videoEmbed ? "" : (cfg.videoUrl || "");
  const arrVideo0 = Array.isArray(cfg.media?.videos) ? cfg.media.videos[0] : "";
  const media = {
    imageUrl: (
      cfg.media?.imageUrl ??
      cfg.heroImage ??
      (Array.isArray(cfg.media?.images) ? cfg.media.images[0] : "") ??
      cfg.coverUrl ??
      ""
    ),
    videoMp4: (
      cfg.media?.videoMp4 ??
      (/\.mp4($|\?)/i.test(arrVideo0) ? arrVideo0 : "") ??
      (rawVideo && /\.mp4($|\?)/i.test(rawVideo) ? rawVideo : "")
    ),
    videoEmbed: (
      cfg.media?.videoEmbed ??
      (arrVideo0 && !/\.mp4($|\?)/i.test(arrVideo0) ? arrVideo0 : "") ??
      (rawVideo && !/\.mp4($|\?)/i.test(rawVideo) ? rawVideo : "")
    )
  };

  const copy = {
    headline: cfg.copy?.headline ?? cfg.title ?? "",
    bullets:  cfg.copy?.bullets  ?? cfg.copy?.benefits ?? cfg.bullets ?? [],
    cta:      cfg.copy?.cta      ?? cfg.ctaText ?? "Continuer",
    ctaPrimary:   cfg.copy?.ctaPrimary ?? cfg.ctaText ?? cfg.copy?.cta ?? "Continuer",
    ctaSecondary: cfg.copy?.ctaSecondary ?? "Non merci",
    pageTitle:    cfg.copy?.pageTitle ?? cfg.seo?.metaTitle ?? ""
  };

  const ui = {
    showImage: cfg.ui?.showImage ?? !!media.imageUrl,
    showVideo: cfg.ui?.showVideo ?? !!(media.videoMp4 || media.videoEmbed),
    showPrimaryCta: cfg.ui?.showPrimaryCta ?? true,
    showSecondaryCta: cfg.ui?.showSecondaryCta ?? (pageType === "upsell" || pageType === "downsell"),
    autoRedirect: cfg.ui?.autoRedirect ?? false,
    theme: cfg.ui?.theme ?? "dark",
    buttonColor: cfg.ui?.buttonColor ?? cfg.ui?.mainColor
  };

  const flow = cfg.flow ? { ...cfg.flow } : {};
  if (!flow.nextSlug && cfg.nextSlug) flow.nextSlug = cfg.nextSlug;
  if (!flow.declineSlug && cfg.declineSlug) flow.declineSlug = cfg.declineSlug;

  return { ...cfg, pageType, brand, media, copy, ui, flow };
}

// Fonction principale
export async function injectSlots({ slug, page }) {
  let cfg = await loadConfig(slug);
  cfg = normalizeConfig(cfg);

  applyThemeColors(cfg);

  const mc = await loadMicrocopy(page, slug);
  const copy = {
    headline: mc?.headline ?? cfg.copy?.headline ?? "",
    bullets: mc?.bullets ?? cfg.copy?.bullets ?? [],
    cta: mc?.cta ?? cfg.copy?.cta ?? "Continuer",
    ctaPrimary: mc?.ctaPrimary ?? cfg.copy?.ctaPrimary ?? cfg.copy?.cta ?? "Continuer",
    ctaSecondary: mc?.ctaSecondary ?? cfg.copy?.ctaSecondary ?? "Non merci",
    pageTitle: mc?.pageTitle ?? cfg.copy?.pageTitle
  };

  applyTitles(cfg, copy);
  setBullets('[data-slot="bullets"]', copy.bullets);
  setText('[data-slot="cta"]', copy.cta);
  setText('[data-slot="ctaPrimary"]', copy.ctaPrimary);
  setText('[data-slot="ctaSecondary"]', copy.ctaSecondary);

  applyMedia(cfg);
  applySecondaryCta(cfg);

  return cfg;
}

export default { injectSlots };
