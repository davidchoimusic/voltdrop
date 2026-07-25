// Runtime localization may change display copy, but never strings that are
// part of the program's wiring. The scanner below separates JavaScript string
// literals from template-literal display text, then classifies code literals
// by their syntax and use.

const lineNumber = (source, offset) => source.slice(0, offset).split('\n').length;

export function scanJavaScriptStrings(source) {
  const strings = [];
  const templateText = [];

  const scanQuoted = (start, quote) => {
    let cursor = start + 1;
    while (cursor < source.length) {
      if (source[cursor] === '\\') {
        cursor += 2;
      } else if (source[cursor] === quote) {
        strings.push({
          start,
          end: cursor + 1,
          quote,
          raw: source.slice(start, cursor + 1),
          line: lineNumber(source, start),
        });
        return cursor + 1;
      } else {
        cursor++;
      }
    }
    throw new Error(`Unterminated ${quote} string on line ${lineNumber(source, start)}`);
  };

  const scanLineComment = (start) => {
    const end = source.indexOf('\n', start + 2);
    return end === -1 ? source.length : end + 1;
  };

  const scanBlockComment = (start) => {
    const end = source.indexOf('*/', start + 2);
    if (end === -1) throw new Error(`Unterminated block comment on line ${lineNumber(source, start)}`);
    return end + 2;
  };

  const scanExpression = (start) => {
    let cursor = start;
    let braces = 0;
    while (cursor < source.length) {
      const char = source[cursor];
      const next = source[cursor + 1];
      if (char === "'" || char === '"') {
        cursor = scanQuoted(cursor, char);
      } else if (char === '/' && next === '/') {
        cursor = scanLineComment(cursor);
      } else if (char === '/' && next === '*') {
        cursor = scanBlockComment(cursor);
      } else if (char === '`') {
        cursor = scanTemplate(cursor);
      } else if (char === '{') {
        braces++;
        cursor++;
      } else if (char === '}') {
        if (braces === 0) return cursor + 1;
        braces--;
        cursor++;
      } else {
        cursor++;
      }
    }
    throw new Error(`Unterminated template expression on line ${lineNumber(source, start)}`);
  };

  const scanTemplate = (start) => {
    let cursor = start + 1;
    let textStart = cursor;
    while (cursor < source.length) {
      const char = source[cursor];
      const next = source[cursor + 1];
      if (char === '\\') {
        cursor += 2;
      } else if (char === '`') {
        if (cursor > textStart) templateText.push({ start: textStart, end: cursor });
        return cursor + 1;
      } else if (char === '$' && next === '{') {
        if (cursor > textStart) templateText.push({ start: textStart, end: cursor });
        cursor = scanExpression(cursor + 2);
        textStart = cursor;
      } else {
        cursor++;
      }
    }
    throw new Error(`Unterminated template literal on line ${lineNumber(source, start)}`);
  };

  let cursor = 0;
  while (cursor < source.length) {
    const char = source[cursor];
    const next = source[cursor + 1];
    if (char === "'" || char === '"') {
      cursor = scanQuoted(cursor, char);
    } else if (char === '/' && next === '/') {
      cursor = scanLineComment(cursor);
    } else if (char === '/' && next === '*') {
      cursor = scanBlockComment(cursor);
    } else if (char === '`') {
      cursor = scanTemplate(cursor);
    } else {
      cursor++;
    }
  }

  return { strings, templateText };
}

const directCall = (before, names) =>
  new RegExp(`(?:\\b(?:${names.join('|')})|\\$)\\s*\\(\\s*$`).test(before);

export function codeStringCategory(source, token) {
  const before = source.slice(Math.max(0, token.start - 240), token.start);
  const after = source.slice(token.end, Math.min(source.length, token.end + 240));
  const literal = Function(`"use strict"; return (${token.raw});`)();

  if (directCall(before, ['getElementById'])) return 'element ID';
  if (directCall(before, ['querySelector', 'querySelectorAll', 'closest', 'matches'])) return 'query selector';
  if (/classList\.(?:add|remove|toggle|contains|replace)\([^)]*$/.test(before)
      || /\.className\s*=\s*$/.test(before)) return 'class name';
  if (directCall(before, ['addEventListener', 'removeEventListener', 'CustomEvent'])) return 'event name';
  if (/localStorage\.(?:getItem|setItem|removeItem)\([^)]*$/.test(before)
      || /\bconst\s+[A-Z0-9_]*KEY\s*=\s*$/.test(before)) return 'localStorage key';
  if (/\.dataset\s*\[\s*$/.test(before)
      || /^\s*\]\s*/.test(after) && /\.dataset\s*\[\s*$/.test(before)
      || /^\s+in\s+[^;\n]*\.dataset\b/.test(after)) return 'dataset key';
  if (/\.dataset(?:\.\w+|\[[^\]]+\])\s*(?:===|!==|==|!=)\s*$/.test(before)
      || /^\s*(?:===|!==|==|!=)\s*[^;\n]*\.dataset(?:\.|\[)/.test(after)) {
    return 'data attribute value';
  }
  if (/(?:===|!==|==|!=)\s*$/.test(before)
      || /^\s*(?:===|!==|==|!=)/.test(after)
      || /\bcase\s*$/.test(before)) return 'compared code value';
  if (/\.(?:id|type|className|href|pathname|hash)\s*=\s*$/.test(before)
      || /\.dataset\.\w+\s*=\s*$/.test(before)) return 'assigned code value';
  if (typeof literal === 'string'
      && (/^(?:\/|https?:\/\/|\?)/.test(literal)
        || /^#[A-Za-z_-]/.test(literal)
        || directCall(before, ['URL', 'URLSearchParams']))) return 'URL or fragment';
  if (/\[\s*$/.test(before) && /^\s*\]/.test(after)) return 'property key';
  if (/(?:\{|,)\s*$/.test(before) && /^\s*:/.test(after)) return 'object key';

  return null;
}

export function extractRuntimeCodeStrings(source) {
  return scanJavaScriptStrings(source).strings
    .map((token) => ({ ...token, category: codeStringCategory(source, token) }))
    .filter((token) => token.category)
    .map(({ category, raw, line }) => ({ category, raw, line }));
}

export function localizeRuntimeSource({
  source,
  file,
  entries,
  englishFor,
  localizedFor,
  quoteLike,
  localize,
}) {
  const scanned = scanJavaScriptStrings(source);
  const candidates = [];
  const wholePatterns = entries
    .map((entry) => englishFor(entry.key))
    .filter((value) => typeof value === 'string' && /\{[A-Za-z]+\}/.test(value));
  const supersededByWholePattern = (value) =>
    typeof value === 'string' && wholePatterns.some((pattern) => pattern.includes(value));

  for (const entry of entries) {
    const english = englishFor(entry.key);
    const localized = localizedFor(entry.key);
    if (entry.kind === 'quoted') {
      const raw = quoteLike(english, entry.quote);
      const matches = scanned.strings.filter((token) => token.raw === raw);
      const displayMatches = matches.filter((token) => !codeStringCategory(source, token));
      if (matches.length === 0) {
        if (supersededByWholePattern(english)) continue;
        throw new Error(`Runtime source fragment for ${entry.key} is missing from ${file}`);
      }
      if (displayMatches.length === 0) {
        // Some protected electrical designations are object keys that are
        // also shown to users. They may remain cataloged only while their
        // localized value is byte-identical to English.
        if (localized === english) continue;
        const codeUses = matches
          .map((token) => `${codeStringCategory(source, token) || 'unknown'} on line ${token.line}`)
          .join(', ');
        throw new Error(
          `Runtime catalog entry ${entry.key} in ${file} has no display-string occurrence`
          + `${codeUses ? ` (${codeUses})` : ''}`,
        );
      }
      for (const token of displayMatches) {
        candidates.push({
          start: token.start,
          end: token.end,
          replacement: localize ? quoteLike(localized, entry.quote) : raw,
          key: entry.key,
          priority: raw.length,
        });
      }
      continue;
    }

    const raw = `${entry.leading}${english}${entry.trailing}`;
    const replacement = localize
      ? `${entry.leading}${localized}${entry.trailing}`
      : raw;
    let found = 0;
    for (const range of scanned.templateText) {
      let start = source.indexOf(raw, range.start);
      while (start !== -1 && start + raw.length <= range.end) {
        candidates.push({
          start,
          end: start + raw.length,
          replacement,
          key: entry.key,
          priority: raw.length,
        });
        found++;
        start = source.indexOf(raw, start + raw.length);
      }
    }
    if (found === 0) {
      if (supersededByWholePattern(english)) continue;
      throw new Error(`Runtime template fragment for ${entry.key} is missing from ${file}`);
    }
  }

  // Longer template chunks win when one catalog fragment contains another.
  const accepted = [];
  for (const candidate of candidates.sort((a, b) =>
    b.priority - a.priority || a.start - b.start)) {
    const overlaps = accepted.some(({ start, end }) =>
      candidate.start < end && candidate.end > start);
    if (!overlaps) accepted.push(candidate);
  }

  let output = source;
  for (const candidate of accepted.sort((a, b) => b.start - a.start)) {
    output = output.slice(0, candidate.start)
      + candidate.replacement
      + output.slice(candidate.end);
  }
  return output;
}
