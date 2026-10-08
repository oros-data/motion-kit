import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export const ROLE_NAMES = ['background', 'surface', 'primary', 'secondary', 'muted', 'text', 'danger'];
const ANSI_NAMES = ['black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white'];

export function parseToml(text) {
  const data = {};
  let section = data;
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    const head = line.match(/^\[([a-z_]+)\]/);
    if (head) { section = data[head[1]] = data[head[1]] || {}; continue; }
    const kv = line.match(/^([a-z_]+)\s*=\s*"([^"]*)"/);
    if (kv) section[kv[1]] = kv[2];
  }
  return data;
}

const hexToRgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const rgbToHex = (rgb) => '#' + rgb.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');

export function mix(a, b, weightOfA) {
  const ra = hexToRgb(a), rb = hexToRgb(b);
  return rgbToHex(ra.map((v, i) => v * weightOfA + rb[i] * (1 - weightOfA)));
}

function luminance(hex) {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a, b) {
  const la = luminance(a), lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

export function readableMuted(foreground, background, surface) {
  for (let weight = 0.7; weight <= 1.0001; weight += 0.05) {
    const candidate = mix(foreground, background, weight);
    if (contrast(candidate, background) >= 4.5 && contrast(candidate, surface) >= 4.5) return candidate;
  }
  return foreground;
}

export const TEXT_MIN = 5.5;

export function readableText(color, text, background, surface) {
  for (let weight = 0; weight <= 1.0001; weight += 0.05) {
    const candidate = mix(text, color, weight);
    if (contrast(candidate, background) >= TEXT_MIN && contrast(candidate, surface) >= 4.5) return candidate;
  }
  return text;
}

export function textRoles(identity, theme) {
  const r = theme.roles;
  const out = {};
  for (const [role, color] of Object.entries(identity.roles)) out[role] = readableText(r[color], r.text, r.background, r.surface);
  return out;
}

export function loadTheme(root, name) {
  const dir = join(root, 'themes', name);
  const colorsFile = join(dir, 'colors.toml');
  if (!existsSync(colorsFile)) throw new Error(`tema "${name}" não encontrado: falta ${colorsFile}`);
  const c = parseToml(readFileSync(colorsFile, 'utf8'));
  const overrides = existsSync(join(dir, 'theme.toml')) ? parseToml(readFileSync(join(dir, 'theme.toml'), 'utf8')) : {};
  for (const key of ['background', 'lighter_background', 'dark_background', 'accent', 'magenta', 'foreground', 'bright_foreground', 'red', 'muted', 'selection']) {
    if (!c[key]) throw new Error(`tema "${name}": colors.toml sem a chave "${key}"`);
  }
  const ansi = {};
  ANSI_NAMES.forEach((n, i) => {
    ansi[30 + i] = n === 'black' ? c.background : n === 'white' ? c.foreground : c[n];
    ansi[90 + i] = n === 'black' ? c.muted : n === 'white' ? c.bright_foreground : c[`bright_${n}`];
  });
  const roles = {
    background: c.background,
    surface: c.lighter_background,
    primary: c.accent,
    secondary: c.magenta,
    muted: readableMuted(c.foreground, c.background, c.lighter_background),
    text: c.bright_foreground,
    danger: c.red,
    ...(overrides.roles || {}),
  };
  return {
    name,
    mode: c.mode || 'dark',
    roles,
    line: c.muted,
    terminal: {
      background: c.dark_background,
      foreground: c.foreground,
      cursor: c.bright_foreground,
      selection: c.selection,
      ansi,
      ...(overrides.terminal || {}),
    },
  };
}

export function contrastReport(theme, text = {}) {
  const r = theme.roles, t = theme.terminal;
  const rows = [
    ...Object.entries(text).map(([role, color]) => [`${role} (texto) on background`, color, r.background, TEXT_MIN, 'fail']),
    ['text on background', r.text, r.background, 4.5, 'fail'],
    ['text on surface', r.text, r.surface, 4.5, 'fail'],
    ['terminal foreground on terminal background', t.foreground, t.background, 4.5, 'fail'],
    ['muted on background', r.muted, r.background, 4.5, 'fail'],
    ['muted on surface', r.muted, r.surface, 4.5, 'warn'],
    ['primary on background', r.primary, r.background, 3, 'warn'],
    ['secondary on background', r.secondary, r.background, 3, 'warn'],
    ['danger on surface', r.danger, r.surface, 3, 'warn'],
    ['ansi red on terminal background', t.ansi[31], t.background, 3, 'warn'],
    ['ansi green on terminal background', t.ansi[32], t.background, 3, 'warn'],
    ['ansi yellow on terminal background', t.ansi[33], t.background, 3, 'warn'],
  ];
  return rows.map(([label, fg, bg, min, level]) => {
    const ratio = contrast(fg, bg);
    return { label, fg, bg, min, ratio: Math.round(ratio * 100) / 100, status: ratio >= min ? 'pass' : level };
  });
}

function validate(schema, value, path, defs, errors) {
  if (schema.$ref) schema = defs[schema.$ref.replace('#/$defs/', '')];
  const type = schema.type;
  const actual = Array.isArray(value) ? 'array' : value === null ? 'null' : typeof value;
  if (type && !(type === 'integer' ? Number.isInteger(value) : actual === type)) {
    errors.push(`${path}: esperado ${type}, veio ${actual}`);
    return;
  }
  if (schema.enum && !schema.enum.includes(value)) errors.push(`${path}: valor "${value}" fora de ${schema.enum.join(', ')}`);
  if (schema.pattern && !new RegExp(schema.pattern).test(value)) errors.push(`${path}: "${value}" não casa com ${schema.pattern}`);
  if (schema.minLength !== undefined && value.length < schema.minLength) errors.push(`${path}: vazio`);
  if (schema.minimum !== undefined && value < schema.minimum) errors.push(`${path}: mínimo ${schema.minimum}`);
  if (type === 'array') {
    if (schema.minItems !== undefined && value.length < schema.minItems) errors.push(`${path}: mínimo ${schema.minItems} itens`);
    if (schema.maxItems !== undefined && value.length > schema.maxItems) errors.push(`${path}: máximo ${schema.maxItems} itens`);
    value.forEach((item, i) => validate(schema.items, item, `${path}[${i}]`, defs, errors));
  }
  if (type === 'object') {
    for (const key of schema.required || []) if (!(key in value)) errors.push(`${path}: falta "${key}"`);
    for (const [key, child] of Object.entries(value)) {
      if (schema.properties && schema.properties[key]) validate(schema.properties[key], child, `${path}.${key}`, defs, errors);
      else if (schema.additionalProperties === false) errors.push(`${path}: campo desconhecido "${key}"`);
    }
  }
}

export function validateIdentity(root, identity) {
  const schema = JSON.parse(readFileSync(join(root, 'schemas', 'identity.schema.json'), 'utf8'));
  const errors = [];
  validate(schema, identity, 'identity', schema.$defs, errors);
  if (errors.length) return errors;
  for (const kind of ['display', 'mono']) {
    for (const file of identity.fonts[kind].files) {
      if (!existsSync(join(root, file.path))) errors.push(`fonts.${kind}: arquivo não encontrado: ${file.path}`);
    }
  }
  if (!existsSync(join(root, identity.logo.file))) errors.push(`logo.file: arquivo não encontrado: ${identity.logo.file}`);
  if (!existsSync(join(root, 'themes', identity.theme, 'colors.toml'))) errors.push(`theme: pasta themes/${identity.theme}/ sem colors.toml`);
  return errors;
}

export function loadIdentity(root, themeOverride) {
  const identity = JSON.parse(readFileSync(join(root, 'brand', 'identity.json'), 'utf8'));
  const errors = validateIdentity(root, identity);
  if (errors.length) throw new Error(`brand/identity.json inválido:\n  ${errors.join('\n  ')}`);
  const theme = loadTheme(root, themeOverride || identity.theme);
  theme.roles = { ...theme.roles, ...identity.colors };
  theme.mode = identity.colors.background ? identity.mode : theme.mode;
  return { identity, theme };
}

export function cssVariables(identity, theme) {
  const r = theme.roles, t = theme.terminal;
  const vars = {
    bg: r.background, surface: r.surface, primary: r.primary, secondary: r.secondary, muted: r.muted, text: r.text, danger: r.danger,
    line: theme.line, 'term-bg': t.background, 'term-fg': t.foreground, 'term-cursor': t.cursor, 'term-selection': t.selection,
    ...textRoles(identity, theme),
    'font-display': `"${identity.fonts.display.family}", sans-serif`,
    'font-mono': `"${identity.fonts.mono.family}", monospace`,
  };
  for (const [code, hex] of Object.entries(t.ansi)) vars[`ansi-${code}`] = hex;
  return `:root{${Object.entries(vars).map(([k, v]) => `--${k}:${v};`).join('')}}\n`;
}

export function fontFaces(identity, prefix = '') {
  const faces = [];
  for (const kind of ['display', 'mono']) {
    const font = identity.fonts[kind];
    for (const file of font.files) {
      faces.push(`@font-face { font-family: "${font.family}"; src: url("${prefix}${file.path}"); font-weight: ${file.weight}; }`);
    }
  }
  return faces.join('\n');
}
