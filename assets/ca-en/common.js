/* VoltDrop shared chrome: country + language edition state (remembered per
   device), header picker, footer country picker. Loaded on every page before
   the page script. Pages react via 'vd:country' and 'vd:lang' events. */

const COUNTRIES = {
  us: {
    chip: '🇺🇸 US edition',
    flag: '🇺🇸',
    name: 'United States',
    codeShort: 'NEC',
    codeName: 'U.S. National Electrical Code (NEC)',
    langs: { en: 'English', es: 'Español', 'zh-Hans': '简体中文' },
    presets: { dc: [12, 24, 48], ac1: [120, 208, 240, 277], ac3: [208, 240, 480, 600] },
  },
  ca: {
    chip: '🇨🇦 Canada edition',
    flag: '🇨🇦',
    name: 'Canada',
    codeShort: 'CEC',
    codeName: 'Canadian Electrical Code (CEC)',
    langs: { en: 'English', 'fr-CA': 'Français (Québec)', 'zh-Hans': '简体中文' },
    presets: { dc: [12, 24, 48], ac1: [120, 208, 240, 347], ac3: [208, 480, 600] },
  },
};
const COUNTRY_KEY = 'voltdrop.country';
const LANGUAGE_KEY = 'voltdrop.lang';
const PICKER_TEXT = {
  languageLabel: 'Language in {country}',
  unavailableLanguage: "{language} isn't available for this page in {country} yet — showing English. Available here: {available}.",
};

function vdFormat(pattern, values) {
  return pattern.replace(/\{([A-Za-z]+)\}/g, (token, key) => (
    Object.prototype.hasOwnProperty.call(values, key) ? values[key] : token
  ));
}

// Editions are explicit URLs. Stored choices never override the page the user
// deliberately opened, and there is no language or country auto-detection.
let _country = document.body.dataset.country || 'us';
let _lang = document.body.dataset.locale || 'en';

window.VDCountry = {
  COUNTRIES,
  get: () => _country,
};
window.VDLanguage = {
  get: () => _lang,
};

const EDITION_PREFIXES = {
  'us|en': '',
  'us|es': '/es',
  'us|zh-Hans': '/zh',
  'ca|en': '/ca',
  'ca|fr-CA': '/ca-fr',
  'ca|zh-Hans': '/ca-zh',
};
const TOOL_PATHS = [
  '/',
  '/wire-size-calculator/',
  '/max-wire-length/',
  '/ampacity-check/',
  '/conduit-fill/',
  '/box-fill/',
  '/power-calculator/',
  '/ohms-law/',
  '/landscape-lighting-calculator/',
  '/solar-battery-wire-size/',
  '/solar-wire-size-calculator/',
  '/wire-colour/',
  '/privacy/',
  '/how-we-verify/',
  '/terms/',
];
const GUIDE_PATHS = [
  '/guides/',
  '/guides/sub-panel-wire-size/',
  '/guides/50-amp-wire-size/',
  '/guides/wire-ampacity-chart/',
  '/guides/how-far-12-gauge-wire/',
  '/guides/voltage-drop-formula/',
  '/guides/nec-vs-cec/',
];
const EDITION_PATHS = {
  'us|en': new Set([...TOOL_PATHS, ...GUIDE_PATHS]),
  'us|es': new Set([...TOOL_PATHS, ...GUIDE_PATHS].map((path) => `/es${path}`)),
  'us|zh-Hans': new Set([...TOOL_PATHS, ...GUIDE_PATHS].map((path) => `/zh${path}`)),
  'ca|en': new Set([
    ...TOOL_PATHS.map((path) => `/ca${path}`),
    ...GUIDE_PATHS.map((path) => `/ca${path}`),
  ]),
  'ca|fr-CA': new Set([...TOOL_PATHS, ...GUIDE_PATHS].map((path) => `/ca-fr${path}`)),
  'ca|zh-Hans': new Set([...TOOL_PATHS, ...GUIDE_PATHS].map((path) => `/ca-zh${path}`)),
};

function vdEditionPath(country, lang, pathname = location.pathname) {
  const key = `${country}|${lang}`;
  if (!Object.prototype.hasOwnProperty.call(EDITION_PREFIXES, key)) return null;

  let basePath = (pathname || '/').split(/[?#]/, 1)[0];
  if (!basePath.startsWith('/')) basePath = `/${basePath}`;
  const knownPrefixes = [...new Set(Object.values(EDITION_PREFIXES))]
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);
  for (const prefix of knownPrefixes) {
    if (basePath === prefix) {
      basePath = '/';
      break;
    }
    if (basePath.startsWith(`${prefix}/`)) {
      basePath = basePath.slice(prefix.length);
      break;
    }
  }

  const targetPath = `${EDITION_PREFIXES[key]}${basePath}`;
  return EDITION_PATHS[key].has(targetPath) ? targetPath : null;
}

window.VDEdition = {
  PREFIXES: EDITION_PREFIXES,
  AVAILABLE_PATHS: EDITION_PATHS,
  pathFor: vdEditionPath,
};

const _chip = document.getElementById('country-chip');
const _chipText = document.getElementById('country-chip-text');
const _editionPanel = document.getElementById('edition-panel');
const _editionCountries = document.getElementById('edition-countries');
const _editionLanguageDivider = document.getElementById('edition-language-divider');
const _editionLanguageGroup = document.getElementById('edition-language-group');
const _editionLanguageLabel = document.getElementById('edition-language-label');
const _editionLanguages = document.getElementById('edition-languages');
const _editionFallback = document.getElementById('edition-fallback');

function vdRadioMark() {
  const mark = document.createElement('span');
  mark.className = 'edition-radio-mark';
  mark.setAttribute('aria-hidden', 'true');
  return mark;
}

function vdSetRadioState(button, selected) {
  button.setAttribute('aria-checked', selected ? 'true' : 'false');
  button.tabIndex = selected ? 0 : -1;
}

function vdAddRadioKeys(group) {
  if (!group) return;
  group.addEventListener('keydown', (event) => {
    if (!['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft'].includes(event.key)) return;
    const radios = [...group.querySelectorAll('[role="radio"]')];
    if (!radios.length) return;
    event.preventDefault();
    const current = Math.max(0, radios.indexOf(document.activeElement));
    const step = ['ArrowDown', 'ArrowRight'].includes(event.key) ? 1 : -1;
    const next = radios[(current + step + radios.length) % radios.length];
    next.focus();
    next.click();
  });
}

function vdRenderCountryOptions() {
  if (!_editionCountries) return;
  _editionCountries.replaceChildren();
  Object.entries(COUNTRIES).forEach(([country, data]) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'edition-option edition-country-option';
    button.dataset.country = country;
    button.setAttribute('role', 'radio');
    button.setAttribute('aria-label', `${data.codeShort} — ${data.name}`);
    vdSetRadioState(button, country === _country);
    button.append(vdRadioMark(), document.createTextNode(`${data.flag} ${data.codeShort} — `));
    const name = document.createElement('span');
    name.className = 'edition-country-name';
    name.textContent = data.name;
    button.appendChild(name);
    button.addEventListener('click', () => vdSetCountry(country));
    _editionCountries.appendChild(button);
  });
}

function vdUpdateEditionPickerState() {
  const data = COUNTRIES[_country];
  const shortLanguage = _lang.split('-', 1)[0].toUpperCase();
  if (_chipText) _chipText.textContent = `${data.flag} ${data.codeShort} · ${shortLanguage}`;

  _editionCountries?.querySelectorAll('[data-country]').forEach((button) => {
    vdSetRadioState(button, button.dataset.country === _country);
  });

  if (_editionLanguageLabel) {
    _editionLanguageLabel.textContent = vdFormat(PICKER_TEXT.languageLabel, {
      country: data.name,
    });
  }
  _editionLanguages?.querySelectorAll('[data-lang]').forEach((button) => {
    vdSetRadioState(button, button.dataset.lang === _lang);
  });
}

function vdRenderEditionPicker() {
  const data = COUNTRIES[_country];
  if (!_editionLanguages || !_editionLanguageGroup || !_editionLanguageDivider) return;
  const languages = Object.entries(data.langs);
  const showLanguages = languages.length >= 2;
  _editionLanguageGroup.hidden = !showLanguages;
  _editionLanguageDivider.hidden = !showLanguages;
  _editionLanguages.replaceChildren();

  languages.forEach(([lang, label]) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'edition-option edition-language-option';
    button.dataset.lang = lang;
    button.setAttribute('role', 'radio');
    button.setAttribute('lang', lang);
    button.append(vdRadioMark(), document.createTextNode(label));
    button.addEventListener('click', () => vdSetLanguage(lang));
    _editionLanguages.appendChild(button);
  });
  vdUpdateEditionPickerState();
}

function vdShowFallback(previousLanguage, country) {
  if (!_editionFallback) return;
  const available = Object.entries(COUNTRIES[country].langs)
    .filter(([lang]) => vdEditionPath(country, lang))
    .map(([, name]) => name)
    .join(', ');
  _editionFallback.textContent = vdFormat(PICKER_TEXT.unavailableLanguage, {
    language: previousLanguage,
    country: COUNTRIES[country].name,
    available,
  });
  _editionFallback.hidden = false;
}

function vdHideFallback() {
  if (_editionFallback) _editionFallback.hidden = true;
}

function vdApplyCountry() {
  vdRenderEditionPicker();
  const codeName = document.getElementById('code-name');
  if (codeName) codeName.textContent = COUNTRIES[_country].codeName;
  document.querySelectorAll('.country-btn').forEach((b) => {
    b.classList.toggle('active', b.dataset.country === _country);
  });
  window.dispatchEvent(new CustomEvent('vd:country'));
}

function vdSetCountry(country) {
  if (!COUNTRIES[country]) return;
  const previousLanguage = COUNTRIES[_country].langs[_lang] || _lang.toUpperCase();
  const lang = COUNTRIES[country].langs[_lang] ? _lang : 'en';
  const target = vdEditionPath(country, lang);
  if (!target) {
    vdShowFallback(previousLanguage, country);
    return;
  }
  try {
    localStorage.setItem(COUNTRY_KEY, country);
    localStorage.setItem(LANGUAGE_KEY, lang);
  } catch (e) { /* private mode */ }
  location.assign(target);
}

function vdSetLanguage(lang) {
  if (!COUNTRIES[_country].langs[lang]) return;
  const target = vdEditionPath(_country, lang);
  if (!target) {
    vdShowFallback(COUNTRIES[_country].langs[lang], _country);
    return;
  }
  try {
    localStorage.setItem(COUNTRY_KEY, _country);
    localStorage.setItem(LANGUAGE_KEY, lang);
  } catch (e) { /* private mode */ }
  location.assign(target);
}

function vdSetPanelOpen(open) {
  if (!_chip || !_editionPanel) return;
  _editionPanel.hidden = !open;
  _chip.setAttribute('aria-expanded', open ? 'true' : 'false');
}

vdRenderCountryOptions();
vdAddRadioKeys(_editionCountries);
vdAddRadioKeys(_editionLanguages);

document.querySelectorAll('.country-btn').forEach((button) => {
  button.addEventListener('click', () => vdSetCountry(button.dataset.country));
});

if (_chip && _editionPanel) {
  _chip.addEventListener('click', () => {
    vdRenderEditionPicker();
    vdSetPanelOpen(_editionPanel.hidden);
  });
  document.addEventListener('click', (event) => {
    if (!_editionPanel.hidden && !_editionPanel.contains(event.target) && !_chip.contains(event.target)) {
      vdSetPanelOpen(false);
    }
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !_editionPanel.hidden) {
      vdSetPanelOpen(false);
      _chip.focus();
    }
  });
}

vdApplyCountry();

// Keep internal links inside the current explicit edition when an equivalent
// page exists.
document.querySelectorAll('a[href^="/"]').forEach((link) => {
  const targetCountry = link.dataset.editionCountry || _country;
  const targetLanguage = COUNTRIES[targetCountry].langs[_lang] ? _lang : 'en';
  const target = vdEditionPath(targetCountry, targetLanguage, link.getAttribute('href'));
  if (target) link.setAttribute('href', target);
});

/* Mobile Tools menu: clones the sidebar's tool links so there's one source
   of truth for the tool list (the <aside> nav in the page). */
const _toolsBtn = document.getElementById('tools-btn');
const _mobileTools = document.getElementById('mobile-tools');
if (_toolsBtn && _mobileTools) {
  const _nav = document.querySelector('.tool-nav');
  if (_nav) {
    _nav.querySelectorAll('a.tool-link').forEach((a) => {
      _mobileTools.appendChild(a.cloneNode(true));
    });
  }
  _toolsBtn.addEventListener('click', () => {
    const open = _mobileTools.hidden;
    _mobileTools.hidden = !open;
    _toolsBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
}

/* Country-aware guide links use the same reviewed edition existence registry. */
function vdCaNote() {
  const guidesPath = vdEditionPath(_country, _lang, '/guides/') || '/guides/';
  document.querySelectorAll('.tool-link[data-tool="guides"]').forEach((a) => {
    a.href = guidesPath;
  });
}
window.addEventListener('vd:country', vdCaNote);
vdCaNote();

/* Tool-usage event: one GA4 'calculate' event per calculator run, so page
   traffic can be compared against real tool use. window.gtag only exists when
   the gated loader in the page head ran (production host, not automation), so
   this inherits that gate — locally and under Playwright it is a no-op.
   Deliberately never sends anything the user typed: only which tool and which
   edition. Submit-driven calculators are caught by the document listener
   below; the instant-update wire-colour page has no submit and calls
   window.VDTrack.toolUse() on its first real interaction instead. */
const CALC_FORM_IDS = ['calc-form', 'amp-form', 'fill-form', 'bf-form', 'pw-form', 'sol-form', 'ls-form'];

function vdTrackToolUse() {
  if (typeof window.gtag !== 'function') return;
  const prefix = EDITION_PREFIXES[`${_country}|${_lang}`] || '';
  let path = location.pathname;
  if (prefix && path.indexOf(`${prefix}/`) === 0) path = path.slice(prefix.length);
  const tool = path.replace(/^\/+|\/+$/g, '') || 'voltage-drop';
  window.gtag('event', 'calculate', {
    tool,
    edition: prefix ? prefix.slice(1) : 'us',
  });
}

document.addEventListener('submit', (event) => {
  if (event.target && CALC_FORM_IDS.includes(event.target.id)) vdTrackToolUse();
}, true);

window.VDTrack = { toolUse: vdTrackToolUse };
