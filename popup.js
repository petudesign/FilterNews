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

const enabledInput = document.querySelector("#enabled");
const modeInputs = Array.from(document.querySelectorAll("input[name='mode']"));
const topicInputs = Array.from(document.querySelectorAll("[data-topic]"));
const customForm = document.querySelector("#customForm");
const customKeywordInput = document.querySelector("#customKeyword");
const keywordTags = document.querySelector("#keywordTags");
const siteForm = document.querySelector("#siteForm");
const siteInput = document.querySelector("#siteInput");
const addCurrentSiteButton = document.querySelector("#addCurrentSite");
const siteTags = document.querySelector("#siteTags");
const thresholdInput = document.querySelector("#threshold");
const thresholdValue = document.querySelector("#thresholdValue");
const statusElement = document.querySelector("#status");

let settings = DEFAULT_SETTINGS;
let statusTimer;

loadSettings();

enabledInput.addEventListener("change", () => {
  settings.enabled = enabledInput.checked;
  saveSettings();
});

modeInputs.forEach((input) => {
  input.addEventListener("change", () => {
    if (!input.checked) return;
    settings.mode = input.value;
    saveSettings();
  });
});

topicInputs.forEach((input) => {
  input.addEventListener("change", () => {
    settings.topics[input.dataset.topic] = input.checked;
    saveSettings();
  });
});

customForm.addEventListener("submit", (event) => {
  event.preventDefault();
  addCustomKeyword(customKeywordInput.value);
});

siteForm.addEventListener("submit", (event) => {
  event.preventDefault();
  addEnabledSite(siteInput.value);
});

addCurrentSiteButton.addEventListener("click", addCurrentSite);

thresholdInput.addEventListener("input", () => {
  settings.threshold = Number(thresholdInput.value);
  renderThreshold();
  saveSettings();
});

function loadSettings() {
  chrome.storage.sync.get({ filterNewsSettings: DEFAULT_SETTINGS }, (result) => {
    settings = normalizeSettings(result.filterNewsSettings);
    render();
  });
}

function saveSettings() {
  chrome.storage.sync.set({ filterNewsSettings: settings }, () => {
    showStatus("Tallennettu");
  });
}

function normalizeSettings(value = {}) {
  const mode = value.mode === "hide" ? "hide" : DEFAULT_SETTINGS.mode;

  return {
    ...DEFAULT_SETTINGS,
    ...value,
    mode,
    topics: {
      ...DEFAULT_SETTINGS.topics,
      ...(value.topics || {})
    },
    customKeywords: normalizeCustomKeywords(value.customKeywords),
    enabledSites: normalizeEnabledSites(value.enabledSites)
  };
}

function render() {
  enabledInput.checked = settings.enabled;

  modeInputs.forEach((input) => {
    input.checked = input.value === settings.mode;
  });

  topicInputs.forEach((input) => {
    input.checked = Boolean(settings.topics[input.dataset.topic]);
  });

  thresholdInput.value = String(settings.threshold);
  renderThreshold();
  renderKeywordTags();
  renderSiteTags();
}

function renderThreshold() {
  const labels = {
    1: "Korkea",
    2: "Keski",
    3: "Matala"
  };

  thresholdValue.value = labels[thresholdInput.value] || thresholdInput.value;
}

function showStatus(message) {
  window.clearTimeout(statusTimer);
  statusElement.textContent = message;
  statusTimer = window.setTimeout(() => {
    statusElement.textContent = "";
  }, 1200);
}

function addCustomKeyword(value) {
  const keywords = splitKeywordInput(value);
  if (!keywords.length) return;

  settings.customKeywords = normalizeCustomKeywords([...settings.customKeywords, ...keywords]);
  customKeywordInput.value = "";
  renderKeywordTags();
  saveSettings();
}

function removeCustomKeyword(keywordToRemove) {
  const target = normalizeForCompare(keywordToRemove);
  settings.customKeywords = settings.customKeywords.filter((keyword) => normalizeForCompare(keyword) !== target);
  renderKeywordTags();
  saveSettings();
}

function renderKeywordTags() {
  keywordTags.replaceChildren();

  if (!settings.customKeywords.length) {
    const empty = document.createElement("p");
    empty.className = "keyword-empty";
    empty.textContent = "Lisää sanoja, joita haluat pehmentää otsikoista.";
    keywordTags.append(empty);
    return;
  }

  settings.customKeywords.forEach((keyword) => {
    const tag = document.createElement("span");
    tag.className = "keyword-tag";

    const label = document.createElement("span");
    label.textContent = keyword;

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.textContent = "×";
    removeButton.setAttribute("aria-label", `Poista ${keyword}`);
    removeButton.addEventListener("click", () => removeCustomKeyword(keyword));

    tag.append(label, removeButton);
    keywordTags.append(tag);
  });
}

function normalizeCustomKeywords(keywords) {
  if (!Array.isArray(keywords)) return [];

  const seen = new Set();
  return keywords
    .flatMap((keyword) => splitKeywordInput(keyword))
    .filter((keyword) => keyword.length >= 2 && keyword.length <= 40)
    .filter((keyword) => {
      const normalized = normalizeForCompare(keyword);
      if (seen.has(normalized)) return false;
      seen.add(normalized);
      return true;
    });
}

function splitKeywordInput(value) {
  return String(value)
    .split(",")
    .map((keyword) => keyword.trim())
    .filter(Boolean);
}

function normalizeForCompare(value) {
  return value
    .toLocaleLowerCase("fi-FI")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function addEnabledSite(value) {
  const site = normalizeSite(value);
  if (!site) return;

  settings.enabledSites = normalizeEnabledSites([...settings.enabledSites, site]);
  siteInput.value = "";
  renderSiteTags();
  saveSettings();
}

function removeEnabledSite(siteToRemove) {
  const target = normalizeSite(siteToRemove);
  settings.enabledSites = settings.enabledSites.filter((site) => site !== target);
  renderSiteTags();
  saveSettings();
}

function addCurrentSite() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const url = tabs[0]?.url || "";
    addEnabledSite(url);
  });
}

function renderSiteTags() {
  siteTags.replaceChildren();

  if (!settings.enabledSites.length) {
    const empty = document.createElement("p");
    empty.className = "keyword-empty";
    empty.textContent = "Tyhjänä FilterNews toimii kaikilla sivuilla.";
    siteTags.append(empty);
    return;
  }

  settings.enabledSites.forEach((site) => {
    const tag = document.createElement("span");
    tag.className = "keyword-tag";

    const label = document.createElement("span");
    label.textContent = site;

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.textContent = "×";
    removeButton.setAttribute("aria-label", `Poista ${site}`);
    removeButton.addEventListener("click", () => removeEnabledSite(site));

    tag.append(label, removeButton);
    siteTags.append(tag);
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
