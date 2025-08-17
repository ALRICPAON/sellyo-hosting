// js/inject-content.js

const DEBUG = true;
const dbg = (...a) => { if (DEBUG) console.log("[inject]", ...a); };

// Helpers
const $ = (sel) => document.querySelector(sel);
const show = (el) => { if (el) el.style.display = ""; };
const hide = (el) => { if (el) el.style.display = "none"; };
const setText = (sel, txt) => { const el = $(sel); if (el) el.textContent = txt ?? ""; };
const setBullets = (sel, items = []) => {
  const el = $(sel); if (!el) return;
  el.innerHTML = items.map(i => `<li>${i}</li>`).join("");
};

// js/inject-content.js — remplacer UNIQUEMENT loadConfig par ceci
async function loadConfig(slug) {
  if (!slug) throw new Error("slug manquant dans l'URL");
  const qs = new URLSearchParams(location.search);
  const userId = qs.get("userId");
  if (!userId) throw new Error("userId manquant dans l'URL");

  // slug base ⇒ ajoute -p1 (ou ?page=2 ⇒ -p2)
  const pageParam = qs.get("page");
  const hasSuffix = /-p\d+$/.test(slug);
  const effectiveSlug = hasSuffix ? slug : `${slug}-p${pageParam ? String(parseInt(pageParam,10)||1) : "1"}`;

  // Préfixe absolu pour site GitHub Pages de projet: https://host/<repo>/
  const repo = (location.pathname.split("/")[1] || "");
  const rootPath = repo ? `/${repo}/` : "/";
  const base = new URL(rootPath, location.origin).href; // ABSOLU

  const rel1 = `tunnels/${encodeURIComponent(userId)}/${encodeURIComponent(effectiveSlug)}.json`;
  const rel2 = `tunnels/${encodeURIComponent(userId)}/${encodeURIComponent(slug)}.json`;
  const abs1 = new URL(rel1, base).href;
  const abs2 = new URL(rel2, base).href;

  const candidates = [abs1, abs2, rel1, rel2]; // teste d'abord absolues
  console.log("[inject] candidates =", candidates);

  for (const path of candidates) {
    try {
      const res = await fetch(path, { cache: "no-store" });
      const body = await res.text();
      console.log("[inject] fetch", { path, status: res.status, ok: res.ok, sample: body.slice(0, 80) });
      if (res.ok) return JSON.parse(body);
    } catch (e) {
      console.log("[inject] fetch error", path, e);
    }
  }
  throw new Error(`Config introuvable pour slug=${slug}`);
}

// (Optionnel) microcopy depuis un endpoint Make si présent
async function loadMicrocopy(page, slug) {
  try {
    const url = `microcopy/${encodeURIComponent(page)}?slug=${encodeURIComponent(slug)}`;
    dbg("microcopy:fetch", url);
    const r = await fetch(url, { cache: "no-store" });
    const b = await r.text();
    dbg("microcopy:resp", { status: r.status, ok: r.ok, sample: b.slice(0, 120) });
    if (r.ok) return JSON.parse(b);
  } catch (e) {
    dbg("microcopy error", e);
  }
  return null;
}

// Applique couleurs du thème (lit cfg.colors et fallback sur cfg.ui)
function applyThemeColors(cfg) {
  const bg = cfg.colors?.bg ?? "#0b1220";
  const text = cfg.colors?.text ?? "#ffffff";
  const btn = cfg.colors?.btn ?? cfg.ui?.buttonColor ?? "#3b82f6";
  dbg("theme", { bg, text, btn });
  document.documentElement.style.setProperty("--bg", bg);
  document.documentElement.style.setProperty("--text", text);
  document.documentElement.style.setProperty("--btn", btn);
}

// Gère les médias (image / vidéo mp4 / embed)
function applyMedia(cfg) {
  const imgWrap = document.querySelector('[data-optional="image"]');
  const hasImage = cfg.ui?.showImage && cfg.media?.imageUrl;
  dbg("media:image", { hasImage, imageUrl: cfg.media?.imageUrl });
  if (hasImage) {
    const img = document.getElementById("hero-img");
    if (img) img.src = cfg.media.imageUrl;
    show(imgWrap);
  } else {
    hide(imgWrap);
  }

  const vidWrap = document.querySelector('[data-optional="video"]');
  const mp4 = cfg.media?.videoMp4;
  const emb = cfg.media?.videoEmbed;
  const allowVideo = cfg.ui?.showVideo && (mp4 || emb);
  dbg("media:video", { allowVideo, mp4, emb });

  const vid = document.getElementById("hero-mp4");
  const iframeHost = document.getElementById("hero-embed");

  if (allowVideo) {
    if (mp4 && vid) {
      vid.src = mp4; show(vid); hide(iframeHost);
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
  const shouldShow = !!cfg.ui?.showSecondaryCta;
  dbg("secondary-cta", { shouldShow });
  if (!secondary) return;
  if (shouldShow) show(secondary); else hide(secondary);
}

// Page title et headline fallback
function applyTitles(cfg, copy) {
  const t = (document.title || "").toLowerCase();
  if (!t || ["sales", "optin", "paiement", "merci"].includes(t)) {
    document.title = copy?.pageTitle || cfg.name || "Sellyo";
  }
  setText('[data-slot="headline"]', copy?.headline || "Titre");
}

// Normalisation pour compat arrière
function normalizeConfig(cfg) {
  const pageType = cfg.pageType || cfg.type || "sales";

  const rawVideo = cfg.media?.videoMp4 || cfg.media?.videoEmbed ? "" : (cfg.videoUrl || "");
  const media = {
    imageUrl: cfg.media?.imageUrl ?? cfg.heroImage ?? "",
    videoMp4: cfg.media?.videoMp4 ?? (rawVideo && /\.mp4($|\?)/i.test(rawVideo) ? rawVideo : ""),
    videoEmbed: cfg.media?.videoEmbed ?? (rawVideo && !/\.mp4($|\?)/i.test(rawVideo) ? rawVideo : "")
  };

  const copy = {
    headline: cfg.copy?.headline ?? cfg.title ?? "",
    bullets: cfg.copy?.bullets ?? cfg.copy?.benefits ?? cfg.bullets ?? [],
    cta: cfg.copy?.cta ?? cfg.ctaText ?? "Continuer",
    ctaPrimary: cfg.copy?.ctaPrimary ?? cfg.ctaText ?? cfg.copy?.cta ?? "Continuer",
    ctaSecondary: cfg.copy?.ctaSecondary ?? "Non merci",
    pageTitle: cfg.copy?.pageTitle ?? cfg.seo?.metaTitle ?? ""
  };

  const ui = {
    showImage: cfg.ui?.showImage ?? !!media.imageUrl,
    showVideo: cfg.ui?.showVideo ?? !!(media.videoMp4 || media.videoEmbed),
    showPrimaryCta: cfg.ui?.showPrimaryCta ?? true,
    showSecondaryCta: cfg.ui?.showSecondaryCta ?? (pageType === "upsell" || pageType === "downsell"),
    autoRedirect: cfg.ui?.autoRedirect ?? false,
    theme: cfg.ui?.theme ?? "dark",
    buttonColor: cfg.ui?.buttonColor
  };

  const flow = cfg.flow ? { ...cfg.flow } : {};
  if (!flow.nextSlug && cfg.nextSlug) flow.nextSlug = cfg.nextSlug;
  if (!flow.declineSlug && cfg.declineSlug) flow.declineSlug = cfg.declineSlug;

  const out = { ...cfg, pageType, media, copy, ui, flow };
  dbg("normalize", { pageType: out.pageType, slug: out.slug, hasBullets: !!out.copy?.bullets?.length });
  return out;
}

// Fonction principale exportée + LOGS
export async function injectSlots({ slug, page }) {
  dbg("injectSlots:begin", { slug, page });

  let cfg;
  try {
    cfg = await loadConfig(slug);
  } catch (e) {
    dbg("loadConfig failed", e);
    throw e;
  }

  dbg("cfg loaded", {
    cfgSlug: cfg.slug,
    pageType: cfg.pageType || cfg.type,
    headline: (cfg.copy && (cfg.copy.headline || cfg.title)) || null
  });

  cfg = normalizeConfig(cfg);

  // Theme
  applyThemeColors(cfg);

  // Microcopy optionnelle
  const mc = await loadMicrocopy(page, slug);
  dbg("microcopy data", mc);

  const copy = {
    headline: mc?.headline ?? cfg.copy?.headline ?? "",
    bullets: mc?.bullets ?? cfg.copy?.bullets ?? [],
    cta: mc?.cta ?? cfg.copy?.cta ?? "Continuer",
    ctaPrimary: mc?.ctaPrimary ?? cfg.copy?.ctaPrimary ?? cfg.copy?.cta ?? "Continuer",
    ctaSecondary: mc?.ctaSecondary ?? cfg.copy?.ctaSecondary ?? "Non merci",
    pageTitle: mc?.pageTitle ?? cfg.copy?.pageTitle
  };

  dbg("write DOM", copy);
  applyTitles(cfg, copy);
  setBullets('[data-slot="bullets"]', copy.bullets);
  setText('[data-slot="cta"]', copy.cta);
  setText('[data-slot="ctaPrimary"]', copy.ctaPrimary);
  setText('[data-slot="ctaSecondary"]', copy.ctaSecondary);

  applyMedia(cfg);
  applySecondaryCta(cfg);

  dbg("injectSlots:done");
  return cfg;
}

export default { injectSlots };
