/* VoltDrop shared chrome: country edition state (remembered per device),
   header chip, footer picker. Loaded on every page before the page script.
   Pages react to changes via the 'vd:country' event. */

const COUNTRIES = {
  us: {
    chip: '🇺🇸 US edition',
    codeName: 'U.S. National Electrical Code (NEC)',
    presets: { dc: [12, 24, 48], ac1: [120, 208, 240, 277], ac3: [208, 240, 480, 600] },
  },
  ca: {
    chip: '🇨🇦 Canada edition',
    codeName: 'Canadian Electrical Code (CEC)',
    presets: { dc: [12, 24, 48], ac1: [120, 208, 240, 347], ac3: [208, 480, 600] },
  },
};
const COUNTRY_KEY = 'voltdrop.country';

let _country = 'us';
try {
  const saved = localStorage.getItem(COUNTRY_KEY);
  if (saved && COUNTRIES[saved]) _country = saved;
} catch (e) { /* private mode — default to US */ }

window.VDCountry = {
  COUNTRIES,
  get: () => _country,
};

function vdApplyCountry() {
  const chip = document.getElementById('country-chip');
  if (chip) chip.textContent = COUNTRIES[_country].chip;
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

document.querySelectorAll('.country-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    _country = btn.dataset.country;
    try { localStorage.setItem(COUNTRY_KEY, _country); } catch (e) { /* private mode */ }
    vdApplyCountry();
  });
});

const _chip = document.getElementById('country-chip');
if (_chip) {
  _chip.addEventListener('click', () => {
    const picker = document.getElementById('country-picker');
    if (picker) picker.scrollIntoView({ behavior: 'smooth', block: 'center' });
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

/* Country-aware guides: when the CA edition is active, the Guides nav
   points at /ca/guides/, US guides with a Canadian twin offer it
   prominently, and NEC-citing tool pages get an honest note. */
const GUIDE_TWINS = {
  '/guides/': '/ca/guides/',
  '/guides/sub-panel-wire-size/': '/ca/guides/sub-panel-wire-size/',
  '/guides/50-amp-wire-size/': '/ca/guides/50-amp-wire-size/',
  '/guides/wire-ampacity-chart/': '/ca/guides/wire-ampacity-chart/',
  '/guides/how-far-12-gauge-wire/': '/ca/guides/how-far-12-gauge-wire/',
  '/guides/voltage-drop-formula/': '/ca/guides/voltage-drop-formula/',
};
const GUIDE_TWINS_REV = Object.fromEntries(Object.entries(GUIDE_TWINS).map(([us, ca]) => [ca, us]));

function vdCaNote() {
  const isCA = window.VDCountry && VDCountry.get() === 'ca';

  // 1. Swap the Guides nav destination (sidebar + mobile menu clones)
  document.querySelectorAll('.tool-link[data-tool="guides"]').forEach((a) => {
    a.href = isCA ? '/ca/guides/' : '/guides/';
  });

  const existing = document.getElementById('ca-note');
  if (existing) existing.remove();
  const path = location.pathname;
  const anchor = document.querySelector('.tool-intro') || document.querySelector('#bf-form, #fill-form');
  if (!anchor) return;

  let html = null;
  if (isCA && GUIDE_TWINS[path]) {
    html = '🇨🇦 <strong>You\'re on the Canada edition</strong> — this page is the U.S. version. '
      + '<a class="inline-link" href="' + GUIDE_TWINS[path] + '">Read the Canadian version of this guide →</a>';
  } else if (!isCA && GUIDE_TWINS_REV[path]) {
    html = '🇺🇸 <strong>You\'re on the US edition</strong> — this is the Canadian guide. '
      + '<a class="inline-link" href="' + GUIDE_TWINS_REV[path] + '">Read the US version →</a>';
  } else if (isCA && !path.startsWith('/ca/') && document.querySelector('main.guide, #bf-form, #fill-form')) {
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
