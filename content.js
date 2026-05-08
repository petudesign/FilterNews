const DEFAULT_SETTINGS = {
  enabled: true,
  mode: "soft",
  threshold: 1,
  topics: {
    war: true,
    violence: true,
    disaster: true,
    politics: false,
    crime: true
  },
  customKeywords: [],
  enabledSites: []
};

const TOPIC_KEYWORDS = {
  war: [
    "sota",
    "sodan",
    "sodassa",
    "hyokkays",
    "hyökkäys",
    "ohjus",
    "pommitus",
    "aseisku",
    "armeija",
    "rintama",
    "ukraina",
    "gaza",
    "israel",
    "palestiina",
    "war",
    "missile",
    "bombing",
    "invasion",
    "army"
  ],
  violence: [
    "kuoli",
    "kuollut",
    "kuolleet",
    "surma",
    "surmattiin",
    "ampui",
    "ammuskelu",
    "puukotus",
    "vakivalta",
    "väkivalta",
    "dead",
    "killed",
    "shooting",
    "stabbing",
    "violence"
  ],
  disaster: [
    "maanjäristys",
    "maanjaristys",
    "tulva",
    "onnettomuus",
    "turma",
    "katastrofi",
    "romahdus",
    "paloi",
    "palo",
    "earthquake",
    "flood",
    "disaster",
    "crash",
    "accident",
    "wildfire"
  ],
  politics: [
    "hallitus",
    "eduskunta",
    "presidentti",
    "ministeri",
    "vaalit",
    "puolue",
    "trump",
    "putin",
    "politics",
    "election",
    "government",
    "minister",
    "parliament"
  ],
  crime: [
    "rikos",
    "rikosepäily",
    "rikosepaily",
    "syyte",
    "tuomio",
    "oikeus",
    "poliisi",
    "varkaus",
    "ryosto",
    "ryöstö",
    "crime",
    "charged",
    "court",
    "police",
    "robbery"
  ]
};

const CONTAINER_SELECTORS = [
  "article",
  "a[href]",
  "[class*='article']",
  "[class*='story']",
  "[class*='teaser']",
  "[class*='card']",
  "[data-testid*='article']",
  "li"
];

const TEXT_SELECTORS = "h1, h2, h3, h4, a, p";
const HEADLINE_SELECTORS = "h1, h2, h3, h4, [class*='headline'], [class*='title']";
const NEWS_LINK_TEXT_MIN_LENGTH = 28;
const CUSTOM_KEYWORD_FAMILIES = [
  {
    roots: ["kuolema", "kuolla", "kuollut", "kuoli"],
    stems: ["kuole", "kuoll", "kuoli"]
  },
  {
    roots: ["sairaus", "sairas", "sairastua", "sairastunut"],
    stems: ["saira", "sairast"]
  },
  {
    roots: ["virus", "koronavirus"],
    stems: ["virus"]
  }
];
const NON_NEWS_KEYWORDS = [
  "lähetä video",
  "laheta video",
  "uutisvinkki",
  "lähetä whatsappissa",
  "laheta whatsappissa",
  "lähetä lomakkeella",
  "laheta lomakkeella",
  "maksamme julkaisusta",
  "tilaa uutiskirje",
  "kirjaudu",
  "rekisteröidy",
  "rekisteroidy",
  "mainos"
];
const FILTERED_ATTR = "data-filternews-filtered";
const STYLE_ATTR = "data-filternews-style";

let currentSettings = DEFAULT_SETTINGS;
let observer;
let debounceTimer;

init();

async function init() {
  currentSettings = await loadSettings();
  applyFilters();
  startObserver();

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "sync" || !changes.filterNewsSettings) return;
    currentSettings = normalizeSettings(changes.filterNewsSettings.newValue);
    applyFilters();
  });
}

function loadSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get({ filterNewsSettings: DEFAULT_SETTINGS }, (result) => {
      resolve(normalizeSettings(result.filterNewsSettings));
    });
  });
}

function normalizeSettings(settings = {}) {
  const mode = settings.mode === "hide" ? "hide" : DEFAULT_SETTINGS.mode;

  return {
    ...DEFAULT_SETTINGS,
    ...settings,
    mode,
    topics: {
      ...DEFAULT_SETTINGS.topics,
      ...(settings.topics || {})
    },
    customKeywords: normalizeCustomKeywords(settings.customKeywords),
    enabledSites: normalizeEnabledSites(settings.enabledSites)
  };
}

function startObserver() {
  observer = new MutationObserver(() => {
    window.clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(applyFilters, 250);
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

function applyFilters() {
  if (!currentSettings.enabled || !isEnabledOnCurrentSite()) {
    restoreFilteredItems();
    return;
  }

  const candidates = findCandidates();
  candidates.forEach((element) => {
    const text = getScoringText(element);
    const match = scoreText(text);

    if (match.score >= currentSettings.threshold) {
      filterElement(element, match);
    } else {
      restoreElement(element);
    }
  });
}

function findCandidates() {
  const elements = [];

  document.querySelectorAll(CONTAINER_SELECTORS.join(",")).forEach((element) => {
    if (!(element instanceof HTMLElement)) return;
    if (element.closest(".filternews-notice")) return;
    if (!looksLikeNewsItem(element)) return;
    elements.push(element);
  });

  return pruneNestedCandidates(elements);
}

function looksLikeNewsItem(element) {
  const text = collectText(element);
  if (text.length < 24 || text.length > 1200) return false;
  if (isProbablyUtilityContent(element, text)) return false;

  const headline = getHeadlineText(element) || getLinkHeadlineText(element);
  const hasLink = element.matches("a") || element.querySelector("a");
  if (!headline || headline.length < 12 || headline.length > 220) return false;

  return hasLink;
}

function pruneNestedCandidates(elements) {
  return elements.filter((element) => {
    const containsSmallerCandidate = elements.some((other) => {
      return other !== element && element.contains(other) && collectText(other).length >= 24;
    });

    return !containsSmallerCandidate || element.matches("article");
  });
}

function collectText(element) {
  const parts = [];
  element.querySelectorAll(TEXT_SELECTORS).forEach((node) => {
    const value = node.textContent?.trim();
    if (value) parts.push(value);
  });

  if (!parts.length) {
    const value = element.textContent?.trim();
    if (value) parts.push(value);
  }

  return Array.from(new Set(parts)).join(" ").replace(/\s+/g, " ").trim();
}

function getHeadlineText(element) {
  if (element.matches(HEADLINE_SELECTORS)) {
    return element.textContent?.trim() || "";
  }

  const headline = element.querySelector(HEADLINE_SELECTORS);
  return headline?.textContent?.trim() || "";
}

function getLinkHeadlineText(element) {
  if (element.matches("a[href]")) {
    return getCleanLinkText(element);
  }

  const links = Array.from(element.querySelectorAll("a[href]"));
  const headlineLink = links.find((link) => getCleanLinkText(link).length >= NEWS_LINK_TEXT_MIN_LENGTH);
  return headlineLink ? getCleanLinkText(headlineLink) : "";
}

function getCleanLinkText(link) {
  return link.textContent?.replace(/\s+/g, " ").trim() || "";
}

function getScoringText(element) {
  const parts = [];
  const headline = getHeadlineText(element) || getLinkHeadlineText(element);
  if (headline) parts.push(headline);

  const lead = getLeadText(element);
  if (lead) parts.push(lead);

  if (!parts.length) {
    parts.push(collectText(element));
  }

  return Array.from(new Set(parts)).join(" ");
}

function getLeadText(element) {
  const paragraphs = Array.from(element.querySelectorAll("p"));
  const lead = paragraphs.find((paragraph) => {
    const text = paragraph.textContent?.trim() || "";
    return text.length >= 24 && text.length <= 260;
  });

  return lead?.textContent?.trim() || "";
}

function isProbablyUtilityContent(element, text) {
  const normalized = normalizeForMatch(text);
  if (NON_NEWS_KEYWORDS.some((keyword) => normalized.includes(normalizeForMatch(keyword)))) {
    return true;
  }

  const interactiveCount = element.querySelectorAll("button, input, textarea, select").length;
  const linkCount = element.querySelectorAll("a").length;
  const hasForm = Boolean(element.querySelector("form"));
  const role = element.getAttribute("role") || "";

  return hasForm || role === "form" || interactiveCount >= 2 || linkCount > 8;
}

function scoreText(text) {
  const haystack = normalizeForMatch(text);
  const words = new Set(haystack.match(/[\p{L}\p{N}]+/gu) || []);
  const topics = [];
  let score = 0;

  Object.entries(TOPIC_KEYWORDS).forEach(([topic, keywords]) => {
    if (!currentSettings.topics[topic]) return;

    const matched = keywords.some((keyword) => keywordMatches(haystack, words, keyword));
    if (matched) {
      score += 1;
      topics.push(topic);
    }
  });

  currentSettings.customKeywords.forEach((keyword) => {
    if (!customKeywordMatches(haystack, words, keyword)) return;

    score += currentSettings.threshold;
    topics.push(`custom:${keyword}`);
  });

  return { score, topics };
}

function normalizeCustomKeywords(keywords) {
  if (!Array.isArray(keywords)) return [];

  const seen = new Set();
  return keywords
    .map((keyword) => String(keyword).trim())
    .filter((keyword) => keyword.length >= 2 && keyword.length <= 40)
    .filter((keyword) => {
      const normalized = normalizeForMatch(keyword);
      if (seen.has(normalized)) return false;
      seen.add(normalized);
      return true;
    });
}

function normalizeEnabledSites(sites) {
  if (!Array.isArray(sites)) return [];

  const seen = new Set();
  return sites
    .map((site) => normalizeSite(site))
    .filter(Boolean)
    .filter((site) => {
      if (seen.has(site)) return false;
      seen.add(site);
      return true;
    });
}

function normalizeSite(value) {
  const rawValue = String(value).trim();
  if (!rawValue) return "";

  try {
    const url = rawValue.includes("://") ? new URL(rawValue) : new URL(`https://${rawValue}`);
    return url.hostname.replace(/^www\./, "").toLocaleLowerCase("fi-FI");
  } catch {
    return rawValue
      .replace(/^https?:\/\//i, "")
      .replace(/^www\./i, "")
      .split("/")[0]
      .toLocaleLowerCase("fi-FI");
  }
}

function isEnabledOnCurrentSite() {
  if (!currentSettings.enabledSites.length) return true;

  const hostname = normalizeSite(window.location.hostname);
  return currentSettings.enabledSites.some((site) => hostname === site || hostname.endsWith(`.${site}`));
}

function normalizeForMatch(value) {
  return value
    .toLocaleLowerCase("fi-FI")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function keywordMatches(haystack, words, keyword) {
  const normalizedKeyword = normalizeForMatch(keyword);
  if (normalizedKeyword.includes(" ")) {
    return haystack.includes(normalizedKeyword);
  }

  return words.has(normalizedKeyword);
}

function customKeywordMatches(haystack, words, keyword) {
  const variants = getCustomKeywordVariants(keyword);

  return variants.some((variant) => {
    if (variant.includes(" ")) {
      return haystack.includes(variant);
    }

    if (words.has(variant)) return true;
    if (variant.length < 4) return false;

    return Array.from(words).some((word) => {
      return word.startsWith(variant) || word.endsWith(variant);
    });
  });
}

function getCustomKeywordVariants(keyword) {
  const normalizedKeyword = normalizeForMatch(keyword);
  const variants = new Set([normalizedKeyword]);

  CUSTOM_KEYWORD_FAMILIES.forEach((family) => {
    const normalizedRoots = family.roots.map((root) => normalizeForMatch(root));
    if (!normalizedRoots.includes(normalizedKeyword)) return;

    family.stems.forEach((stem) => variants.add(normalizeForMatch(stem)));
  });

  return Array.from(variants);
}

function filterElement(element, match) {
  if (element.getAttribute(FILTERED_ATTR) === "true" && element.getAttribute(STYLE_ATTR) === currentSettings.mode) {
    return;
  }

  element.setAttribute(FILTERED_ATTR, "true");
  element.setAttribute(STYLE_ATTR, currentSettings.mode);
  element.classList.remove("filternews-soft", "filternews-dim", "filternews-hide");
  element.classList.add(`filternews-${currentSettings.mode}`);

  if (!element.querySelector(":scope > .filternews-notice")) {
    const notice = document.createElement("button");
    notice.type = "button";
    notice.className = "filternews-notice";
    notice.textContent = `Suodatettu: ${formatTopics(match.topics)}. Näytä silti`;
    notice.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      revealElement(element);
    });
    element.prepend(notice);
  }
}

function restoreFilteredItems() {
  document.querySelectorAll(`[${FILTERED_ATTR}="true"]`).forEach((element) => restoreElement(element));
}

function restoreElement(element) {
  element.removeAttribute(FILTERED_ATTR);
  element.removeAttribute(STYLE_ATTR);
  element.classList.remove("filternews-soft", "filternews-dim", "filternews-hide", "filternews-revealed");
  element.querySelectorAll(":scope > .filternews-notice").forEach((notice) => notice.remove());
}

function revealElement(element) {
  element.classList.remove("filternews-soft", "filternews-dim", "filternews-hide");
  element.classList.add("filternews-revealed");
  element.querySelectorAll(":scope > .filternews-notice").forEach((notice) => notice.remove());
}

function formatTopics(topics) {
  const labels = {
    war: "sota ja konfliktit",
    violence: "väkivalta",
    disaster: "onnettomuudet",
    politics: "politiikka",
    crime: "rikokset"
  };

  return topics.map((topic) => {
    if (topic.startsWith("custom:")) {
      return `oma sana: ${topic.replace("custom:", "")}`;
    }

    return labels[topic] || topic;
  }).join(", ");
}
