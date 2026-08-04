const literalCategories = [
  ['brand', 'exact'],
  ['standards', 'exact'],
  ['citations', 'exact'],
  ['wireAndCableDesignations', 'no-loss'],
  ['unitSymbols', 'no-loss'],
];

const countLiteral = (source, token) => {
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Temperature symbols conventionally attach to the number in translated
  // copy (75°C) while English source sometimes inserts a space (75 °C).
  // The left boundary must therefore sit before the number, not before °C.
  if (token === '°C') {
    return (source.match(new RegExp(`${escaped}(?![\\p{Script=Latin}\\p{N}])`, 'gu')) || []).length;
  }
  return (source.match(new RegExp(
    `(?<![\\p{Script=Latin}\\p{N}])${escaped}(?![\\p{Script=Latin}\\p{N}])`,
    'gu',
  )) || []).length;
};

const countContextualUnit = (source, token) => {
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return (source.match(new RegExp(
    `(?:\\d+(?:\\.\\d+)?|\\{[A-Za-z][A-Za-z0-9]*\\})\\s*${escaped}(?![\\p{Script=Latin}\\p{N}])`,
    'gu',
  )) || []).length;
};

const countsMismatch = (comparison, sourceCount, targetCount) =>
  comparison === 'exact'
    ? sourceCount !== targetCount
    : targetCount < sourceCount;

const mismatch = (category, kind, item, comparison, sourceCount, targetCount) => ({
  category,
  kind,
  item,
  comparison,
  sourceCount,
  targetCount,
});

const matchCounts = (source, re) => {
  const counts = new Map();
  for (const value of source.match(re) || []) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return counts;
};

// Temperature symbols conventionally attach to the number in translated
// copy. Canonicalizing that whitespace keeps the protected value itself exact.
const normalizeProtectedPatternSpacing = (source) => source
  .replace(/(\d+(?:\.\d+)?)[ \u3000]*°C/gu, '$1°C');

// A localized string may use a standard symbol where the English spells the
// same unit out. Only use the spelled form to account for a symbol-count
// difference; do not turn every prose occurrence into a new protected value.
// The separate exact number pattern still requires the value itself both ways.
const equivalentSpellingCount = (source, value) => {
  const parsed = value.match(/^(\d+(?:\.\d+)?)\s*(A|V|°C)$/u);
  if (!parsed) return 0;
  const [, number, unit] = parsed;
  const escapedNumber = number.replace('.', '\\.');
  const spelledUnit = unit === 'A'
    ? 'amp(?:ere)?s?'
    : unit === 'V'
      ? 'volts?'
      : 'degrees?\\s+C';
  return (source.match(new RegExp(
    `(?<![\\p{Script=Latin}\\p{N}])${escapedNumber}\\s+${spelledUnit}\\b`,
    'giu',
  )) || []).length;
};

const equivalentSpellingTotal = (source, unit) => {
  const spelledUnit = unit === 'A'
    ? 'amp(?:ere)?s?'
    : unit === 'V'
      ? 'volts?'
      : unit === '°C'
        ? 'degrees?\\s+C'
        : null;
  if (!spelledUnit) return 0;
  return (source.match(new RegExp(
    `(?<![\\p{Script=Latin}\\p{N}])\\d+(?:\\.\\d+)?\\s+${spelledUnit}\\b`,
    'giu',
  )) || []).length;
};

const equivalentUnitCountsMatch = (source, target, value, sourceCount, targetCount) => {
  if (sourceCount === targetCount) return true;
  if (sourceCount < targetCount) {
    return equivalentSpellingCount(source, value) >= targetCount - sourceCount;
  }
  return equivalentSpellingCount(target, value) >= sourceCount - targetCount;
};

export const findNeverTranslateMismatch = (source, target, policy) => {
  for (const [category, comparison] of literalCategories) {
    for (const token of policy[category] ?? []) {
      const sourceCount = countLiteral(source, token);
      const targetCount = countLiteral(target, token);
      const equivalentTargetCount = comparison === 'no-loss'
        ? targetCount + equivalentSpellingTotal(target, token)
        : targetCount;
      if (countsMismatch(comparison, sourceCount, equivalentTargetCount)) {
        return mismatch(category, 'token', token, comparison, sourceCount, targetCount);
      }
    }
  }

  for (const token of policy.contextualUnitSymbols ?? []) {
    const sourceCount = countContextualUnit(source, token);
    const targetCount = countContextualUnit(target, token);
    const equivalentTargetCount = targetCount + equivalentSpellingTotal(target, token);
    if (countsMismatch('no-loss', sourceCount, equivalentTargetCount)) {
      return mismatch(
        'contextualUnitSymbols',
        'token',
        token,
        'no-loss',
        sourceCount,
        targetCount,
      );
    }
  }

  const patternSource = normalizeProtectedPatternSpacing(source);
  const patternTarget = normalizeProtectedPatternSpacing(target);

  for (const pattern of policy.protectedPatterns ?? []) {
    const re = new RegExp(pattern.source, pattern.flags);
    const sourceCounts = matchCounts(patternSource, re);
    re.lastIndex = 0;
    const targetCounts = matchCounts(patternTarget, re);
    for (const value of new Set([...sourceCounts.keys(), ...targetCounts.keys()])) {
      const sourceCount = sourceCounts.get(value) ?? 0;
      const targetCount = targetCounts.get(value) ?? 0;
      const equivalentUnitSplit = pattern.name === 'electrical-values'
        && equivalentUnitCountsMatch(patternSource, patternTarget, value, sourceCount, targetCount);
      if (countsMismatch('exact', sourceCount, targetCount) && !equivalentUnitSplit) {
        return {
          ...mismatch(
            'protectedPatterns',
            'pattern',
            pattern.name,
            'exact',
            sourceCount,
            targetCount,
          ),
          value,
        };
      }
    }
  }

  return null;
};

export const formatNeverTranslateMismatch = (finding) => {
  if (!finding) return 'all protected tokens and patterns';
  const expectation = finding.comparison === 'exact'
    ? `expected exactly ${finding.sourceCount}`
    : `expected at least ${finding.sourceCount}`;
  const matchedValue = finding.value === undefined ? '' : ` match "${finding.value}"`;
  return `${finding.category} ${finding.kind} "${finding.item}"${matchedValue}: `
    + `${expectation}, found ${finding.targetCount}`;
};
