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

/* Canada edition: pages whose content cites the U.S. NEC get an honest
   note when the CA edition is active. Injected (not baked into HTML) so
   it always follows the current country choice. */
function vdCaNote() {
  const target = document.querySelector('main.guide .tool-intro, #amp-form, #bf-form, #fill-form, main.guide');
  const existing = document.getElementById('ca-note');
  const isCA = window.VDCountry && VDCountry.get() === 'ca';
  if (!target) return;
  if (isCA && !existing) {
    const note = document.createElement('div');
    note.id = 'ca-note';
    note.className = 'ca-note';
    note.innerHTML = '🇨🇦 <strong>Canada edition note:</strong> this page cites the U.S. NEC. The math is universal and most table values match the Canadian CEC, but rule numbers and some details differ — a fully CEC-verified Canadian version is in the works. Treat rule citations here as U.S.-specific.';
    const anchor = document.querySelector('main.guide .tool-intro') || document.querySelector('.tool-intro') || target;
    anchor.insertAdjacentElement('afterend', note);
  } else if (!isCA && existing) {
    existing.remove();
  }
}
window.addEventListener('vd:country', vdCaNote);
vdCaNote();
