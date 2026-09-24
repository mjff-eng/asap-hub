// ESLint formatter behind `yarn colours:report`: how product code uses colour.
// Set DETAILS=1 to also list every old colour name by file and line.

const { readFileSync } = require('fs');
const { relative } = require('path');

const root = process.cwd();

const themePattern = /\bcolour\.(foreground|background|border)\b/g;
const primitivePattern = /\bcolour\.(neutral|brand|general|utilitarian)\b/g;
const hardcodedPattern =
  /(?<![\w&])(#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b|rgba?\(\s*\d)/g;
const themeNamePattern =
  /\bcolour\.((?:foreground|background|border)(?:\.[A-Za-z0-9]+|\['[^']+'\])+)/g;

const isProductCode = (file) =>
  !/__tests__|\.test\.|\.stories\.|^apps\/storybook\//.test(file);
const isColourDefinition = (file) =>
  /(^|\/)colors\.ts$|cas-tokens\.generated\.ts$|(^|\/)theme\.ts$/.test(file);
const isArtwork = (file) => /\/(icons|images)\//.test(file);

const statusOf = (message) => {
  if (/waiting on a design decision/.test(message)) return 'design';
  if (/closest is/.test(message)) return 'shift';
  return 'ready';
};
const statusLabels = {
  ready: 'can move now, same colour',
  shift: 'can move now, slight colour shift',
  design: 'waiting on a design decision',
};

const count = (map, key, by = 1) => map.set(key, (map.get(key) ?? 0) + by);
const top = (map, limit) =>
  [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
const number = (value) => value.toLocaleString('en-GB');
const percent = (part, total) =>
  total === 0 ? '0%' : `${Math.round((part / total) * 100)}%`;
const row = (label, value, total) =>
  `  ${label.padEnd(44)} ${number(value).padStart(6)}  ${percent(
    value,
    total,
  ).padStart(4)}`;

module.exports = (results) => {
  const details = [];
  const oldByName = new Map();
  const oldStatus = new Map();
  const oldByStatus = new Map();
  const oldByFile = new Map();
  const hardcodedByFile = new Map();
  const themeNamesUsed = new Set();
  let theme = 0;
  let primitives = 0;
  let old = 0;
  let hardcoded = 0;

  results.forEach(({ filePath, messages }) => {
    const file = relative(root, filePath);
    if (!isProductCode(file)) return;
    const source = readFileSync(filePath, 'utf8');

    if (!isColourDefinition(file)) {
      theme += (source.match(themePattern) ?? []).length;
      primitives += (source.match(primitivePattern) ?? []).length;
      [...source.matchAll(themeNamePattern)].forEach(([, name]) =>
        themeNamesUsed.add(name),
      );
      if (!isArtwork(file)) {
        const found = (source.match(hardcodedPattern) ?? []).length;
        if (found) count(hardcodedByFile, file, found);
        hardcoded += found;
      }
    }

    const deprecations = messages.filter(
      (message) => message.ruleId === 'import/no-deprecated',
    );
    if (deprecations.length === 0) return;
    const lines = source.split('\n');
    details.push('', file);
    deprecations.forEach(({ line, column, message }) => {
      const name =
        (lines[line - 1] ?? '').slice(column - 1).match(/^\w+/)?.[0] ?? '?';
      const status = statusOf(message);
      details.push(
        `  ${`${line}:${column}`.padEnd(8)} ${name.padEnd(16)} ${message}`,
      );
      count(oldByName, name);
      oldStatus.set(name, status);
      count(oldByStatus, status);
      count(oldByFile, file);
      old += 1;
    });
  });

  const total = theme + primitives + old + hardcoded;
  const out = process.env.DETAILS ? [...details, ''] : [];
  out.push(
    '─'.repeat(64),
    'Colour usage in product code',
    '─'.repeat(64),
    row('Role names (colour.foreground/background/border)', theme, total),
    row('Palette names (colour.neutral, colour.brand...)', primitives, total),
    row('Old names (deprecated)', old, total),
    row('Hard-coded values (hex, rgb)', hardcoded, total),
    '',
    `  Role names in use: ${themeNamesUsed.size}`,
  );

  if (old > 0) {
    out.push(
      '',
      `Old names: ${number(old)} uses in ${number(oldByFile.size)} files`,
      ...['ready', 'shift', 'design'].map((status) =>
        row(statusLabels[status], oldByStatus.get(status) ?? 0, old),
      ),
      '',
      '  Most used',
      ...top(oldByName, 8).map(
        ([name, uses]) =>
          `    ${name.padEnd(16)} ${number(uses).padStart(5)}  ${
            statusLabels[oldStatus.get(name)]
          }`,
      ),
      '',
      '  Files with the most',
      ...top(oldByFile, 5).map(
        ([file, uses]) => `    ${file.padEnd(62)} ${number(uses).padStart(4)}`,
      ),
    );
  }

  if (hardcoded > 0) {
    out.push(
      '',
      `Hard-coded values: ${number(hardcoded)} in ${number(
        hardcodedByFile.size,
      )} files (icons and images excluded)`,
      ...top(hardcodedByFile, 5).map(
        ([file, uses]) => `    ${file.padEnd(62)} ${number(uses).padStart(4)}`,
      ),
    );
  }

  if (!process.env.DETAILS && old > 0) {
    out.push('', 'Run with DETAILS=1 to list every old name by file and line.');
  }
  out.push('');
  return out.join('\n');
};
