// js/inject-content.js

// ---------- Helpers ----------
const $ = (sel) => document.querySelector(sel);
const show = (el) => { if (el) el.style.display = ""; };
const hide = (el) => { if (el) el.style.display = "none"; };

// Cache l'élément (ou son conteneur [data-block]) si vide
function setTextOrHide(sel, txt) {
  const el = $(sel); if (!el) return;
  const val = (txt ?? "").toString().trim();
  const host = el.closest("[data-block]") || el;
  if (!val) { el.textContent = ""; hide(host); }
  else { el.textContent = val; show(host); }
}

function setListOrHide(sel, items = []) {
  const el = $(sel); if (!el) return;
  const host = el.closest("[data-block]") || el;
  const arr = (items || []).map(s => (s ?? "").toString().trim()).filter(Boolean);
  if (!arr.length) { el.innerHTML = ""; hide(host); }
  else { el.innerHTML = arr.map(i => `<li>${i}</li>`).join(""); show(host); }
}

// ---------- Parser JSON tolérant ----------
function parseJsonLenient(s) {
  if (typeof s !== "string") return s;
  s = s.replace(/```json|```/g, "");
  const i = s.indexOf("{");
  const j = s.lastIndexOf("}");
  if (i !== -1 && j !== -1 && j > i) s = s.slice(i, j + 1);
  return JSON.parse(s);
}

// ---------- Charge JSON tunnel ----------
async function loadConfig(slug) {
  if (!slug) throw new Error("slug manquant dans l'URL");
  const qs = new URLSearchParams(location.search);
  const userId = qs.get("userId");
  if (!userId) throw new Error("userId manquant dans l'URL");

  const pageParam = qs.get("page");
  const hasSuffix = /-p\d+$/.test(slug);
  const effectiveSlug = hasSuffix ? slug : `${slug}-p${pageParam ? String(parseInt(pageParam, 10) || 1) : "1"}`;

  // Base absolue pour GitHub Pages: https://<host>/<repo>/
  const repo = (location.pathname.split("/")[1] || "");
  const rootPath = repo ? `/${repo}/` : "/";
  const ABS_BASE = `${location.origin}${rootPath}`;

  const rel1 = `tunnels/${encodeURIComponent(userId)}/${encodeURIComponent(effectiveSlug)}.json`;
  const rel2 = `tunnels/${encodeURIComponent(userId)}/${encodeURIComponent(slug)}.json`;
  const abs1 = `${ABS_BASE}${rel1}`;
  const abs2 = `${ABS_BASE}${rel2}`;

  const candidates = [abs1, abs2];

  for (const url of candidates) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      const text = await res.text();
      if (res.ok) return parseJsonLenient(text);
    } catch (_) {}
  }
  throw new Error(`Config introuvable pour slug=${slug}`);
}

// ---------- Microcopy optionnel ----------
async function loadMicrocopy(page, slug) {
  try {
    const url = `microcopy/${encodeURIComponent(page)}?slug=${encodeURIComponent(slug)}`;
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) return null;
    const t = await r.text();
    return parseJsonLenient(t);
  } catch (_) {
    return null;
  }
}

// ---------- Thème ----------
function applyThemeColors(cfg) {
  const bg = cfg.colors?.bg ?? "#0b1220";
  const text = cfg.colors?.text ?? "#ffffff";
  const btn = cfg.colors?.btn ?? cfg.ui?.buttonColor ?? cfg.ui?.mainColor ?? "#3b82f6";
  document.documentElement.style.setProperty("--bg", bg);
  document.documentElement.style.setProperty("--text", text);
  document.documentElement.style.setProperty("--btn", btn);
}

// ---------- Médias (logo / image / vidéo) ----------
function applyMedia(cfg) {
  // LOGO (depuis brand.logoUrl ; fallback legacy)
  const logoEl = document.getElementById("logo");
  const logoUrl =
    cfg.brand?.logoUrl ||
    cfg.logoUrl ||
    "";
  if (logoEl) {
    if (logoUrl) { logoEl.src = logoUrl; show(logoEl); }
    else { hide(logoEl); }
  }

  // IMAGE
  const imgWrap = document.querySelector('[data-optional="image"]');
  const img = document.getElementById("hero-img");
  const imgUrl = cfg.media?.imageUrl || cfg.heroImage || "";
  if (imgWrap && img) {
    if (imgUrl) { img.src = imgUrl; show(imgWrap); }
    else { img.removeAttribute("src"); hide(imgWrap); }
  }

  // VIDEO : mp4 → <video>, host (yt/vimeo/loom…) → <iframe>
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

  if (!mp4 && candidate && !isEmbedHost(candidate) && !candidate.startsWith("<iframe")) {
    mp4 = candidate; emb = "";
  } else if (!emb && candidate && (isEmbedHost(candidate) || candidate.startsWith("<iframe"))) {
    emb = candidate; mp4 = "";
  }

  if (!vidWrap || (!mp4 && !emb)) {
    if (vidWrap) hide(vidWrap);
    if (vid) vid.removeAttribute("src");
    if (iframeHost) iframeHost.innerHTML = "";
    return;
  }

  if (mp4 && vid) {
    vid.src = mp4; show(vid);
    if (iframeHost) { iframeHost.innerHTML = ""; hide(iframeHost); }
    show(vidWrap);
  } else if (emb && iframeHost) {
    if (emb.startsWith("<iframe")) iframeHost.innerHTML = emb;
    else iframeHost.innerHTML = `<iframe src="${emb}" frameborder="0" allow="autoplay; fullscreen" allowfullscreen style="width:100%;height:100%"></iframe>`;
    show(iframeHost);
    if (vid) { vid.removeAttribute("src"); hide(vid); }
    show(vidWrap);
  }
}

// ---------- CTA secondaire ----------
function applySecondaryCta(cfg) {
  const secondary = document.getElementById("secondary-cta");
  if (!secondary) return;
  const shouldShow = !!cfg.ui?.showSecondaryCta;
  if (shouldShow) show(secondary); else hide(secondary);
}

// ---------- Titres ----------
function applyTitles(cfg, copy) {
  const t = (document.title || "").toLowerCase();
  if (!t || ["sales", "optin", "paiement", "merci", "checkout"].includes(t)) {
    document.title = copy?.pageTitle || cfg.name || "Sellyo";
  }
  const h = document.querySelector('[data-slot="headline"]');
  if (h) h.textContent = (copy?.headline || "Titre").trim();
}

// ---------- Normalisation ----------
function normalizeConfig(cfg) {
  const pageType = cfg.pageType || cfg.type || "sales";

  const brand = {
    logoUrl:
      cfg.brand?.logoUrl ||
      cfg.logoUrl ||
      cfg.media?.logoUrl ||
      cfg.heroImage ||
      cfg.media?.imageUrl ||
      ""
  };

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
    headline:   cfg.copy?.headline   ?? cfg.title ?? "",
    subtitle:   cfg.copy?.subtitle   ?? cfg.subtitle ?? "",
    bullets:    cfg.copy?.bullets    ?? cfg.copy?.benefits ?? cfg.bullets ?? [],
    benefits:   cfg.copy?.benefits   ?? [],
    problem:    cfg.copy?.problem    ?? cfg.problem ?? "",
    solution:   cfg.copy?.solution   ?? cfg.solution ?? "",
    guarantee:  cfg.copy?.guarantee  ?? cfg.guarantee ?? "",
    cta:        cfg.copy?.cta        ?? cfg.ctaText ?? "Continuer",
    ctaPrimary: cfg.copy?.ctaPrimary ?? cfg.ctaText ?? cfg.copy?.cta ?? "Continuer",
    ctaSecondary: cfg.copy?.ctaSecondary ?? "Non merci",
    pageTitle:  cfg.copy?.pageTitle  ?? cfg.seo?.metaTitle ?? ""
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

  const formFields = cfg.formFields || cfg.components?.formFields || null;

  const payment = {
    stripePublishableKey: cfg.payment?.stripePublishableKey || cfg.stripePk || "",
    stripePriceId:        cfg.payment?.stripePriceId        || cfg.pricing?.priceId || "",
    paymentLink:          cfg.payment?.paymentLink          || cfg.paymentLink || "",
    paypalClientId:       cfg.payment?.paypalClientId       || cfg.paypal?.clientId || ""
  };

  const pricing = {
    priceId:  cfg.pricing?.priceId || payment.stripePriceId || "",
    currency: (cfg.pricing?.currency || cfg.currency || "").toUpperCase(),
    amount:   Number(cfg.pricing?.amount ?? cfg.payment?.price ?? 0)
  };

  const seo = cfg.seo ? { ...cfg.seo } : { metaTitle: "", metaDescription: "" };

  const productDescription = cfg.productDescription || "";
  const productRecap = cfg.productRecap || "";

  const slug = cfg.slug || "";

  return {
    ...cfg,
    slug,
    pageType,
    brand,
    media,
    copy,
    ui,
    flow,
    formFields,
    payment,
    pricing,
    seo,
    productDescription,
    productRecap
  };
}

// ---------- SEO ----------
function applySeo(cfg, copy) {
  const title = copy?.pageTitle || cfg.seo?.metaTitle || cfg.name || document.title;
  if (title) document.title = title;

  const desc = cfg.seo?.metaDescription || cfg.metaDescription || "";
  if (desc) {
    let m = document.querySelector('meta[name="description"]');
    if (!m) {
      m = document.createElement('meta');
      m.name = 'description';
      document.head.appendChild(m);
    }
    m.content = desc;
  }
}

// ---------- Applique tous les slots ----------
function applyCopySlots(cfg, copy) {
  applySeo(cfg, copy);

  // Headline + sous-éléments
  applyTitles(cfg, copy);
  setTextOrHide('[data-slot="subtitle"]',   copy?.subtitle);

  // Texte marketing
  setTextOrHide('[data-slot="problem"]',    copy?.problem);
  setTextOrHide('[data-slot="solution"]',   copy?.solution);
  setTextOrHide('[data-slot="guarantee"]',  copy?.guarantee);

  // Listes
  setListOrHide('[data-slot="bullets"]',    copy?.bullets);
  setListOrHide('[data-slot="benefits"]',   copy?.benefits);

  // CTAs
  setTextOrHide('[data-slot="cta"]',         copy?.cta);
  setTextOrHide('[data-slot="ctaPrimary"]',  copy?.ctaPrimary ?? copy?.cta);
  setTextOrHide('[data-slot="ctaSecondary"]',copy?.ctaSecondary);
}

// ---------- Fonction principale ----------
export async function injectSlots({ slug, page }) {
  let cfg = await loadConfig(slug);
  cfg = normalizeConfig(cfg);

  applyThemeColors(cfg);

  const mc = await loadMicrocopy(page, slug);
  const copy = {
    headline:     mc?.headline     ?? cfg.copy?.headline ?? "",
    subtitle:     mc?.subtitle     ?? cfg.copy?.subtitle ?? "",
    bullets:      mc?.bullets      ?? cfg.copy?.bullets ?? [],
    benefits:     mc?.benefits     ?? cfg.copy?.benefits ?? [],
    problem:      mc?.problem      ?? cfg.copy?.problem ?? "",
    solution:     mc?.solution     ?? cfg.copy?.solution ?? "",
    guarantee:    mc?.guarantee    ?? cfg.copy?.guarantee ?? "",
    cta:          mc?.cta          ?? cfg.copy?.cta ?? "Continuer",
    ctaPrimary:   mc?.ctaPrimary   ?? cfg.copy?.ctaPrimary ?? cfg.copy?.cta ?? "Continuer",
    ctaSecondary: mc?.ctaSecondary ?? cfg.copy?.ctaSecondary ?? "Non merci",
    pageTitle:    mc?.pageTitle    ?? cfg.copy?.pageTitle
  };

  applyCopySlots(cfg, copy);
  applyMedia(cfg);
  applySecondaryCta(cfg);

  return cfg;
}

export default { injectSlots };
