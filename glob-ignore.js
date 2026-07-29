export function compilePattern(rawPattern) {
  let pattern = rawPattern;
  let negate = false;

  if (pattern.startsWith('\\!') || pattern.startsWith('\\#')) {
    pattern = pattern.slice(1);
  } else if (pattern.startsWith('!')) {
    negate = true;
    pattern = pattern.slice(1);
  }

  let dirOnly = false;
  if (pattern.endsWith('/')) {
    dirOnly = true;
    pattern = pattern.slice(0, -1);
  }

  let anchored = false;
  if (pattern.startsWith('/')) {
    anchored = true;
    pattern = pattern.slice(1);
  } else if (pattern.includes('/')) {
    anchored = true;
  }

  let re = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');

  re = re
    .replace(/\*\*\//g, '\u0000DSTAR_SLASH\u0000')
    .replace(/\*\*/g, '\u0000DSTAR\u0000')
    .replace(/\*/g, '[^/]*')
    .replace(/\?/g, '[^/]')
    .replace(/\u0000DSTAR_SLASH\u0000/g, '(?:.*/)?')
    .replace(/\u0000DSTAR\u0000/g, '.*');

  const body = anchored ? `^${re}` : `(?:^|.*/)${re}`;
  const full = dirOnly ? `${body}(?:/.*)?$` : `${body}$`;

  return { regex: new RegExp(full), negate, dirOnly };
}

export function parsePatterns(rawText) {
  return rawText
    .split('\n')
    .map(l => l.trim())
    .filter(l => l !== '' && !l.startsWith('#'))
    .map(compilePattern);
}

export function isIgnored(filePath, compiledPatterns) {
  let ignored = false;
  for (const { regex, negate } of compiledPatterns) {
    if (regex.test(filePath)) {
      ignored = !negate;
    }
  }
  return ignored;
}

//module.exports = { compilePattern, parsePatterns, isIgnored };
