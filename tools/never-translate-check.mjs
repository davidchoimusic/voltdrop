const literalCategories = [
  ['brand', 'exact'],
  ['standards', 'exact'],
  ['citations', 'exact'],
  ['wireAndCableDesignations', 'no-loss'],
  ['unitSymbols', 'no-loss'],
];

const countLiteral = (source, token) => {
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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

export const findNeverTranslateMismatch = (source, target, policy) => {
  for (const [category, comparison] of literalCategories) {
    for (const token of policy[category] ?? []) {
      const sourceCount = countLiteral(source, token);
      const targetCount = countLiteral(target, token);
      if (countsMismatch(comparison, sourceCount, targetCount)) {
        return mismatch(category, 'token', token, comparison, sourceCount, targetCount);
      }
    }
  }

  for (const token of policy.contextualUnitSymbols ?? []) {
    const sourceCount = countContextualUnit(source, token);
    const targetCount = countContextualUnit(target, token);
    if (countsMismatch('no-loss', sourceCount, targetCount)) {
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

  for (const pattern of policy.protectedPatterns ?? []) {
    const re = new RegExp(pattern.source, pattern.flags);
    const sourceCounts = matchCounts(source, re);
    re.lastIndex = 0;
    const targetCounts = matchCounts(target, re);
    for (const value of new Set([...sourceCounts.keys(), ...targetCounts.keys()])) {
      const sourceCount = sourceCounts.get(value) ?? 0;
      const targetCount = targetCounts.get(value) ?? 0;
      if (countsMismatch('exact', sourceCount, targetCount)) {
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
