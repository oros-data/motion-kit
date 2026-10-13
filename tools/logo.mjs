import { existsSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { isAbsolute, relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { contrast } from './identity.mjs';

export const LOGO_EXTENSIONS = ['svg', 'png', 'webp', 'jpg', 'jpeg'];
const MAX_SVG_BYTES = 512 * 1024;
const MAX_RASTER_BYTES = 4 * 1024 * 1024;
const MAX_RASTER_SIDE = 4096;
const SAMPLE = 96;
const MIME = { png: 'image/png', webp: 'image/webp', jpeg: 'image/jpeg' };

function sniff(buf) {
  if (buf.length > 24 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buf.length > 4 && buf[0] === 0xff && buf[1] === 0xd8) return 'jpeg';
  if (buf.length > 30 && buf.toString('latin1', 0, 4) === 'RIFF' && buf.toString('latin1', 8, 12) === 'WEBP') return 'webp';
  const head = buf.subarray(0, 4096).toString('utf8');
  if (/<svg[\s>]/i.test(head)) return 'svg';
  return null;
}

function dimensions(buf, kind) {
  if (kind === 'png') return [buf.readUInt32BE(16), buf.readUInt32BE(20)];
  if (kind === 'webp') {
    const chunk = buf.toString('latin1', 12, 16);
    if (chunk === 'VP8X') return [1 + buf.readUIntLE(24, 3), 1 + buf.readUIntLE(27, 3)];
    if (chunk === 'VP8L') return [1 + (((buf[22] & 0x3f) << 8) | buf[21]), 1 + (((buf[24] & 0x0f) << 10) | (buf[23] << 2) | ((buf[22] & 0xc0) >> 6))];
    if (chunk === 'VP8 ') return [buf.readUInt16LE(26) & 0x3fff, buf.readUInt16LE(28) & 0x3fff];
    return null;
  }
  let at = 2;
  while (at + 9 < buf.length) {
    if (buf[at] !== 0xff) { at += 1; continue; }
    const marker = buf[at + 1];
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) return [buf.readUInt16BE(at + 7), buf.readUInt16BE(at + 5)];
    at += 2 + buf.readUInt16BE(at + 2);
  }
  return null;
}

const SAFE_REF = /^(#[\w.:-]+|data:image\/(png|jpe?g|webp);base64,[A-Za-z0-9+/=\s]+)$/i;

export function svgProblems(text) {
  const problems = [];
  const bad = (re, message) => { if (re.test(text)) problems.push(message); };
  bad(/<!DOCTYPE|<!ENTITY/i, 'contém DOCTYPE/ENTITY');
  bad(/<\s*(script|foreignObject|iframe|embed|object|audio|video|link|meta)\b/i, 'contém elemento ativo (script, foreignObject, iframe, embed, object, link...)');
  bad(/\son[a-z]+\s*=/i, 'contém atributo de evento (onclick, onload...)');
  bad(/javascript\s*:/i, 'contém "javascript:"');
  bad(/@import/i, 'contém @import');
  bad(/attributeName\s*=\s*["']?(xlink:)?href/i, 'anima o atributo href');
  for (const match of text.matchAll(/(?:xlink:)?\bhref\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)) {
    if (!SAFE_REF.test((match[1] ?? match[2]).trim())) problems.push('referência externa em href (só "#id" e imagens data: png/jpeg/webp são aceitas)');
  }
  for (const match of text.matchAll(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*))\s*\)/gi)) {
    if (!SAFE_REF.test((match[1] ?? match[2] ?? match[3]).trim())) problems.push('url(...) apontando para fora do arquivo');
  }
  if (!/<svg[^>]*\sviewBox\s*=/i.test(text)) problems.push('o <svg> raiz precisa de viewBox (ex.: viewBox="0 0 320 96")');
  return [...new Set(problems)];
}

export function readLogo(root, file) {
  const fail = (message) => ({ errors: [`logo.file: ${message}`] });
  if (isAbsolute(file)) return fail(`use um caminho relativo à raiz do repositório, não "${file}"`);
  const path = resolve(root, file);
  if (!existsSync(path)) return fail(`arquivo não encontrado: ${file}`);
  const inside = relative(realpathSync(root), realpathSync(path));
  if (inside.startsWith('..') || isAbsolute(inside)) return fail(`"${file}" está fora do repositório; copie o logo para brand/`);
  const extension = file.split('.').pop().toLowerCase();
  if (!LOGO_EXTENSIONS.includes(extension)) return fail(`formato ".${extension}" não suportado; use ${LOGO_EXTENSIONS.map((e) => `.${e}`).join(', ')}`);
  if (!statSync(path).isFile()) return fail(`"${file}" não é um arquivo`);
  const buf = readFileSync(path);
  const kind = sniff(buf);
  const expected = extension === 'jpg' ? 'jpeg' : extension;
  if (kind !== expected) return fail(`o conteúdo de ${file} não é ${expected.toUpperCase()} de verdade${kind ? ` (parece ${kind.toUpperCase()})` : ''}; exporte o arquivo de novo`);
  if (kind === 'svg') {
    if (buf.length > MAX_SVG_BYTES) return fail(`SVG com ${Math.round(buf.length / 1024)} KB; o limite é ${MAX_SVG_BYTES / 1024} KB (otimize com svgo ou exporte sem imagens embutidas)`);
    const text = buf.toString('utf8');
    const problems = svgProblems(text);
    if (problems.length) return { errors: problems.map((p) => `logo.file: SVG rejeitado: ${p}`) };
    return { errors: [], kind, path, svg: text.replace(/<\?xml[^>]*\?>/, '').replace(/<!--[\s\S]*?-->/g, '').trim() };
  }
  if (buf.length > MAX_RASTER_BYTES) return fail(`imagem com ${(buf.length / 1048576).toFixed(1)} MB; o limite é ${MAX_RASTER_BYTES / 1048576} MB (reduza para uns 1000 px de altura)`);
  const size = dimensions(buf, kind);
  if (!size || !size[0] || !size[1]) return fail(`não consegui ler as dimensões de ${file}; exporte como PNG ou WebP estático`);
  const [width, height] = size;
  if (width > MAX_RASTER_SIDE || height > MAX_RASTER_SIDE) return fail(`imagem de ${width}x${height}; o limite é ${MAX_RASTER_SIDE} px por lado (reduza para uns 1000 px de altura)`);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet"><image width="${width}" height="${height}" href="data:${MIME[kind]};base64,${buf.toString('base64')}"/></svg>`;
  return { errors: [], kind, path, svg, width, height };
}

const toHex = (r, g, b) => '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');

function sample(path) {
  const run = spawnSync('ffmpeg', ['-v', 'error', '-i', path, '-frames:v', '1', '-vf', `scale=${SAMPLE}:${SAMPLE}`, '-f', 'rawvideo', '-pix_fmt', 'rgba', '-'], { maxBuffer: 1 << 20 });
  return run.status === 0 && run.stdout.length === SAMPLE * SAMPLE * 4 ? run.stdout : null;
}

export function loadLogo(root, identity, theme) {
  const logo = readLogo(root, identity.logo.file);
  if (logo.errors.length) throw new Error(logo.errors.join('\n'));
  const warnings = [];
  if (identity.logo.on !== theme.mode) warnings.push(`logo.on é "${identity.logo.on}" mas a identidade está em modo "${theme.mode}": confira se o logo aparece no fundo ${theme.mode === 'dark' ? 'escuro' : 'claro'}`);
  if (logo.kind === 'svg') return { svg: logo.svg, warnings };
  if (logo.height < identity.logo.min_height_px * 2) warnings.push(`logo com ${logo.height} px de altura fica serrilhado quando ampliado; use pelo menos ${identity.logo.min_height_px * 2} px`);
  const pixels = sample(logo.path);
  if (!pixels) {
    warnings.push('não consegui ler os pixels do logo (ffmpeg); o contraste do logo não foi medido');
    return { svg: logo.svg, warnings };
  }
  const bg = theme.roles.background;
  let clear = 0, visible = 0, weak = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i + 3] < 250) clear += 1;
    if (pixels[i + 3] > 128) {
      visible += 1;
      if (contrast(toHex(pixels[i], pixels[i + 1], pixels[i + 2]), bg) < 3) weak += 1;
    }
  }
  if (clear < SAMPLE * SAMPLE * 0.005) {
    let r = 0, g = 0, b = 0, n = 0;
    for (let i = 0; i < SAMPLE; i += 1) for (const [x, y] of [[i, 0], [i, SAMPLE - 1], [0, i], [SAMPLE - 1, i]]) {
      const at = (y * SAMPLE + x) * 4;
      r += pixels[at]; g += pixels[at + 1]; b += pixels[at + 2]; n += 1;
    }
    const edge = toHex(r / n, g / n, b / n);
    const ratio = Math.round(contrast(edge, bg) * 100) / 100;
    if (ratio >= 1.5) warnings.push(`logo com fundo opaco (${logo.kind.toUpperCase()}): aparece como um retângulo de cor ${edge}, ${ratio}:1 contra o fundo do vídeo; prefira PNG ou WebP com transparência`);
  } else if (visible && weak / visible > 0.5) {
    warnings.push(`${Math.round((weak / visible) * 100)}% do logo tem contraste abaixo de 3:1 contra o fundo ${bg}; use uma versão do logo para fundo ${theme.mode === 'dark' ? 'escuro' : 'claro'}`);
  }
  return { svg: logo.svg, warnings };
}
