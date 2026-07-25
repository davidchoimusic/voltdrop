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
    langs: { en: 'English' },
    presets: { dc: [12, 24, 48], ac1: [120, 208, 240, 277], ac3: [208, 240, 480, 600] },
  },
  ca: {
    chip: '🇨🇦 Canada edition',
    flag: '🇨🇦',
    name: 'Canada',
    codeShort: 'CEC',
    codeName: 'Canadian Electrical Code (CEC)',
    langs: { en: 'English' },
    presets: { dc: [12, 24, 48], ac1: [120, 208, 240, 347], ac3: [208, 480, 600] },
  },
};
const COUNTRY_KEY = 'voltdrop.country';
const LANGUAGE_KEY = 'voltdrop.lang';

let _country = 'us';
let _lang = 'en';
try {
  const saved = localStorage.getItem(COUNTRY_KEY);
  if (saved && COUNTRIES[saved]) _country = saved;
  const savedLang = localStorage.getItem(LANGUAGE_KEY);
  if (savedLang && COUNTRIES[_country].langs[savedLang]) _lang = savedLang;
} catch (e) { /* private mode — default to US */ }

window.VDCountry = {
  COUNTRIES,
  get: () => _country,
};
window.VDLanguage = {
  get: () => _lang,
};

const EDITION_PREFIXES = {
  'us|en': '',
  'ca|en': '/ca',
  'us|es': '/es',
  'ca|fr': '/ca-fr',
};
const GUIDE_PATHS = [
  '/guides/',
  '/guides/sub-panel-wire-size/',
  '/guides/50-amp-wire-size/',
  '/guides/wire-ampacity-chart/',
  '/guides/how-far-12-gauge-wire/',
  '/guides/voltage-drop-formula/',
];
const EDITION_PATHS = {
  'us|en': new Set(GUIDE_PATHS),
  'ca|en': new Set(GUIDE_PATHS.map((path) => `/ca${path}`)),
  'us|es': new Set(),
  'ca|fr': new Set(),
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
  if (_chipText) _chipText.textContent = `${data.flag} ${data.codeShort} · ${_lang.toUpperCase()}`;

  _editionCountries?.querySelectorAll('[data-country]').forEach((button) => {
    vdSetRadioState(button, button.dataset.country === _country);
  });

  if (_editionLanguageLabel) _editionLanguageLabel.textContent = `Language in ${data.name}`;
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
  const available = Object.values(COUNTRIES[country].langs).join(', ');
  _editionFallback.textContent = `${previousLanguage} isn't available for ${COUNTRIES[country].name} yet — showing English. Available here: ${available}.`;
  _editionFallback.hidden = false;
}

function vdHideFallback() {
  if (_editionFallback) _editionFallback.hidden = true;
}

function vdApplyCountry() {
  vdRenderEditionPicker();
  const codeName = document.getElementById('code-name');
  if (codeName) codeName.textContent = COUNTRIES[_country].codeName;
  const codeBasis = document.getElementById('code-basis');
  if (codeBasis) codeBasis.textContent = _country === 'ca'
    ? 'a MANDATORY limit in the'   // CEC Rule 8-102 is enforceable, unlike the NEC's note
    : 'based on a recommendation in the';
  document.querySelectorAll('.country-btn').forEach((b) => {
    b.classList.toggle('active', b.dataset.country === _country);
  });
  window.dispatchEvent(new CustomEvent('vd:country'));
}

function vdSetCountry(country) {
  if (!COUNTRIES[country]) return;
  const previousLanguage = COUNTRIES[_country].langs[_lang] || _lang.toUpperCase();
  const languageChanged = !COUNTRIES[country].langs[_lang];
  _country = country;
  try { localStorage.setItem(COUNTRY_KEY, _country); } catch (e) { /* private mode */ }

  if (languageChanged) {
    _lang = 'en';
    try { localStorage.setItem(LANGUAGE_KEY, _lang); } catch (e) { /* private mode */ }
    vdShowFallback(previousLanguage, country);
  } else {
    vdHideFallback();
  }

  vdApplyCountry();
  if (languageChanged) window.dispatchEvent(new CustomEvent('vd:lang'));

  if (_editionLanguageGroup && !_editionLanguageGroup.hidden) {
    _editionLanguageGroup.classList.remove('swapped');
    void _editionLanguageGroup.offsetWidth;
    _editionLanguageGroup.classList.add('swapped');
  }
}

function vdSetLanguage(lang) {
  if (!COUNTRIES[_country].langs[lang] || lang === _lang) return;
  _lang = lang;
  try { localStorage.setItem(LANGUAGE_KEY, _lang); } catch (e) { /* private mode */ }
  vdHideFallback();
  // Keep the clicked button attached while its click bubbles to the outside-click listener.
  vdUpdateEditionPickerState();
  window.dispatchEvent(new CustomEvent('vd:lang'));
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

/* Country-aware guides: the computed edition helper strips the current
   edition prefix, adds the target prefix, then checks that the page exists. */
function vdCaNote() {
  const isCA = window.VDCountry && VDCountry.get() === 'ca';

  // 1. Swap the Guides nav destination (sidebar + mobile menu clones)
  const guidesPath = vdEditionPath(_country, _lang, '/guides/') || '/guides/';
  document.querySelectorAll('.tool-link[data-tool="guides"]').forEach((a) => {
    a.href = guidesPath;
  });

  const existing = document.getElementById('ca-note');
  if (existing) existing.remove();
  const path = location.pathname;
  const anchor = document.querySelector('.tool-intro') || document.querySelector('#fill-form');
  if (!anchor) return;

  let html = null;
  const editionPath = vdEditionPath(_country, _lang, path);
  if (isCA && editionPath && editionPath !== path) {
    html = '🇨🇦 <strong>You\'re on the Canada edition</strong> — this page is the U.S. version. '
      + '<a class="inline-link" href="' + editionPath + '">Read the Canadian version of this guide →</a>';
  } else if (!isCA && editionPath && editionPath !== path) {
    html = '🇺🇸 <strong>You\'re on the US edition</strong> — this is the Canadian guide. '
      + '<a class="inline-link" href="' + editionPath + '">Read the US version →</a>';
  } else if (isCA && !path.startsWith('/ca/') && document.querySelector('main.guide, #fill-form')) {
    html = '🇨🇦 <strong>Canada edition note:</strong> this page cites the U.S. NEC. The math is universal and most table values match the Canadian CEC, but rule numbers and some details differ. Treat rule citations here as U.S.-specific.';
  }
  if (html) {
    const note = document.createElement('div');
    note.id = 'ca-note';
    note.className = 'ca-note';
    note.innerHTML = html;
    anchor.insertAdjacentElement('afterend', note);
  }
}
window.addEventListener('vd:country', vdCaNote);
vdCaNote();
