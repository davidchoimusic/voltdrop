/* Wire Colour: rule lookup for new work. Colour mappings are rules, not
   sealed electrical tables; no ampacity, size, or calculation data lives here. */

const WIRE_COLOUR_RULES = {
  us: {
    neutral: ['white', 'grey'],
    bond: ['green', 'green-yellow', 'bare'],
    single2: { L1: ['black'], L2: ['red'] },
    single3: { L1: ['black'], L2: ['red'] },
    wye208: { A: ['black'], B: ['red'], C: ['blue'] },
    wye480: { A: ['brown'], B: ['orange'], C: ['yellow'] },
    delta: { A: ['black'], B: ['orange'], C: ['blue'] },
    highLeg: 'B',
  },
  ca: {
    neutral: ['white'],
    bond: ['green', 'green-yellow'],
    single2: { L1: ['black'], L2: ['red'] },
    single3: { L1: ['black'], L2: ['red'] },
    wye208: { A: ['red'], B: ['black'], C: ['blue'] },
    wye480: { A: ['red'], B: ['black'], C: ['blue'] },
    delta: { A: ['red'], B: ['black'], C: ['blue'] },
    highLeg: 'A',
  },
};

const wirePhaseForCircuit = (value) => {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1) return null;
  const row = Math.ceil(number / 2);
  return ['A', 'B', 'C'][(row - 1) % 3];
};

(() => {
  const form = document.getElementById('wire-colour-form');
  if (!form) return;

  const country = document.body.dataset.country === 'ca' ? 'ca' : 'us';
  const rules = WIRE_COLOUR_RULES[country];
  const modeButtons = [...document.querySelectorAll('[data-wire-mode]')];
  const roleButtons = [...document.querySelectorAll('[data-wire-role]')];
  const system = document.getElementById('wire-system');
  const roleFields = document.getElementById('wire-role-fields');
  const circuitFields = document.getElementById('wire-circuit-fields');
  const positionField = document.getElementById('wire-position-field');
  const positionThree = document.getElementById('wire-position-three');
  const positionSingle = document.getElementById('wire-position-single');
  const circuitInput = document.getElementById('wire-circuit');
  const circuitError = document.getElementById('wire-circuit-error');
  const deltaCallout = document.getElementById('wire-delta-callout');
  const results = document.getElementById('wire-results');
  const swatchGroup = document.getElementById('wire-result-swatch');
  const colourName = document.getElementById('wire-colour-name');
  const resultContext = document.getElementById('wire-result-context');
  const resultStatus = document.getElementById('wire-result-status');
  const resultNote = document.getElementById('wire-result-note');
  const roleMeterLine = document.getElementById('wire-role-meter-line');
  const circuitMeterLine = document.getElementById('wire-circuit-meter-line');
  const colourNames = Object.fromEntries(
    [...document.querySelectorAll('[data-colour-name]')]
      .map((item) => [item.dataset.colourName, item.textContent.trim()]),
  );
  const copy = (name) => document.getElementById('wire-copy-' + name).textContent.trim();
  const format = (pattern, values) => pattern.replace(/\{([A-Za-z]+)\}/g, (token, key) => (
    Object.prototype.hasOwnProperty.call(values, key) ? values[key] : token
  ));

  let mode = 'role';
  let role = 'neutral';

  const isSinglePhase = () => system.value === 'single2' || system.value === 'single3';
  const activePosition = () => isSinglePhase() ? positionSingle : positionThree;

  function setPressed(buttons, active, dataName) {
    buttons.forEach((button) => {
      const selected = button.dataset[dataName] === active;
      button.classList.toggle('active', selected);
      button.setAttribute('aria-pressed', selected ? 'true' : 'false');
    });
  }

  function setMode(nextMode) {
    if (nextMode === 'circuit' && isSinglePhase()) return;
    mode = nextMode;
    setPressed(modeButtons, mode, 'wireMode');
    roleFields.hidden = mode !== 'role';
    circuitFields.hidden = mode !== 'circuit';
    roleMeterLine.hidden = mode !== 'role';
    circuitMeterLine.hidden = mode !== 'circuit';
    update();
  }

  function selectedPhase() {
    if (mode === 'circuit') return wirePhaseForCircuit(circuitInput.value);
    return activePosition().value;
  }

  function resultRuleKind(phase) {
    if (role === 'neutral' && mode === 'role') return 'neutral';
    if (role === 'bond' && mode === 'role') return 'bond';
    if (system.value === 'delta' && phase === rules.highLeg) return 'high-leg';
    return 'phase';
  }

  function selectedColours(phase) {
    if (mode === 'role' && role === 'neutral') return rules.neutral;
    if (mode === 'role' && role === 'bond') return rules.bond;
    return rules[system.value][phase];
  }

  function renderSwatches(colours) {
    swatchGroup.replaceChildren();
    colours.forEach((colour) => {
      const swatch = document.createElement('span');
      swatch.className = 'wire-swatch';
      swatch.classList.add('wire-swatch--' + colour);
      swatchGroup.appendChild(swatch);
    });
  }

  function update() {
    const single = isSinglePhase();
    const circuitButton = modeButtons.find((button) => button.dataset.wireMode === 'circuit');
    circuitButton.disabled = single;
    if (single && mode === 'circuit') {
      setMode('role');
      return;
    }

    positionThree.hidden = single;
    positionThree.disabled = single;
    positionSingle.hidden = !single;
    positionSingle.disabled = !single;
    positionField.hidden = mode !== 'role' || role !== 'phase';
    deltaCallout.hidden = system.value !== 'delta';

    const phase = selectedPhase();
    const invalidCircuit = mode === 'circuit' && phase === null;
    circuitError.hidden = !invalidCircuit;
    results.hidden = invalidCircuit;
    if (invalidCircuit) return;

    const colours = selectedColours(phase);
    const kind = resultRuleKind(phase);
    const statusKeys = {
      neutral: 'neutral-status',
      bond: 'bond-status',
      phase: 'phase-status',
      'high-leg': 'high-leg-status',
    };
    const noteKeys = {
      neutral: 'neutral-note',
      bond: 'bond-note',
      phase: 'phase-note',
      'high-leg': 'high-leg-note',
    };
    const positionText = mode === 'role'
      ? (role === 'neutral'
        ? roleButtons.find((button) => button.dataset.wireRole === 'neutral').textContent.trim()
        : role === 'bond'
          ? roleButtons.find((button) => button.dataset.wireRole === 'bond').textContent.trim()
          : activePosition().selectedOptions[0].textContent.trim())
      : '';
    const context = mode === 'circuit'
      ? format(copy('circuit-pattern'), {
        circuit: circuitInput.value,
        phase,
        system: system.selectedOptions[0].textContent.trim(),
      })
      : format(copy('role-pattern'), {
        role: positionText,
        system: system.selectedOptions[0].textContent.trim(),
      });

    renderSwatches(colours);
    colourName.textContent = colours.map((colour) => colourNames[colour]).join(' / ');
    resultContext.textContent = context;
    resultStatus.textContent = copy(statusKeys[kind]);
    resultNote.textContent = copy(noteKeys[kind]);
    results.dataset.colours = colours.join(',');
    results.dataset.phase = phase || '';
    results.dataset.ruleKind = kind;
  }

  modeButtons.forEach((button) => {
    button.addEventListener('click', () => setMode(button.dataset.wireMode));
  });
  roleButtons.forEach((button) => {
    button.addEventListener('click', () => {
      role = button.dataset.wireRole;
      setPressed(roleButtons, role, 'wireRole');
      update();
    });
  });
  system.addEventListener('change', update);
  positionThree.addEventListener('change', update);
  positionSingle.addEventListener('change', update);
  circuitInput.addEventListener('input', update);

  update();
})();
