import { chmodSync, existsSync, lstatSync, mkdirSync, readFileSync, realpathSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { gunzipSync } from 'node:zlib';

const REPO = 'oros-data/motion-kit';
const API = `https://api.github.com/repos/${REPO}/releases`;
const TARBALL = `https://codeload.github.com/${REPO}/tar.gz/refs/tags/`;
const TAG = /^v\d+\.\d+\.\d+$/;
const MAX_BYTES = 64 * 1024 * 1024;
const DIRS = ['src/', 'tools/', 'schemas/', 'themes/', 'docs/', 'runner/'];
const FILES = ['package.json', 'package-lock.json', 'AGENTS.md', 'NOTICES.md', 'LICENSE'];
const VERSION_FILE = 'kit.version';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const realRoot = realpathSync(root);
const argv = process.argv.slice(2);
const apply = argv.includes('--apply');
const tagIndex = argv.indexOf('--tag');
const wanted = tagIndex >= 0 ? argv[tagIndex + 1] : null;

function fail(message) {
  console.error(message);
  process.exit(1);
}

const allowed = (path) => FILES.includes(path) || DIRS.some((d) => path.startsWith(d));

function inside(target) {
  let dir = dirname(target);
  while (!existsSync(dir)) dir = dirname(dir);
  const real = realpathSync(dir);
  return (real === realRoot || real.startsWith(realRoot + sep)) && !(existsSync(target) && lstatSync(target).isSymbolicLink());
}

function git(args) {
  const r = spawnSync('git', args, { cwd: root, encoding: 'utf8' });
  if (r.status !== 0) fail(`git ${args.join(' ')} falhou: ${(r.stderr || '').trim()}`);
  return r.stdout;
}

async function get(url, accept) {
  const res = await fetch(url, { redirect: 'error', headers: { accept, 'user-agent': 'motion-kit-update' } });
  if (res.url !== url) fail(`resposta veio de ${res.url}, esperado ${url}`);
  if (res.status === 404) fail(`${url}: não encontrado (a release existe e está publicada em ${REPO}?)`);
  if (!res.ok) fail(`${url}: HTTP ${res.status}`);
  const length = Number(res.headers.get('content-length') || 0);
  if (length > MAX_BYTES) fail(`${url}: arquivo grande demais (${length} bytes)`);
  const body = Buffer.from(await res.arrayBuffer());
  if (body.length > MAX_BYTES) fail(`${url}: arquivo grande demais (${body.length} bytes)`);
  return body;
}

function readTar(buffer) {
  const files = new Map();
  let pending = {};
  let top = null;
  for (let at = 0; at + 512 <= buffer.length;) {
    const header = buffer.subarray(at, at + 512);
    if (header.every((b) => b === 0)) break;
    const field = (start, length) => header.subarray(start, start + length).toString('utf8').replace(/\0.*$/s, '');
    const size = parseInt(field(124, 12).trim() || '0', 8);
    const type = field(156, 1) || '0';
    const mode = parseInt(field(100, 8).trim() || '0', 8);
    const prefix = field(345, 155);
    const body = buffer.subarray(at + 512, at + 512 + size);
    at += 512 + Math.ceil(size / 512) * 512;
    if (type === 'g') continue;
    if (type === 'L') {
      pending.path = body.toString('utf8').replace(/\0.*$/s, '');
      continue;
    }
    if (type === 'x') {
      for (const m of body.toString('utf8').matchAll(/^\d+ (\w+)=(.*)$/gm)) pending[m[1]] = m[2];
      continue;
    }
    const name = pending.path || (prefix ? `${prefix}/${field(0, 100)}` : field(0, 100));
    pending = {};
    const parts = name.split('/').filter(Boolean);
    if (!parts.length || parts.some((p) => p === '..' || p === '.') || name.startsWith('/') || name.includes('\\')) fail(`caminho inválido no pacote: ${name}`);
    top ??= parts[0];
    if (parts[0] !== top) fail(`pacote com mais de uma pasta raiz: ${name}`);
    const path = parts.slice(1).join('/');
    if (type === '5' || !path) continue;
    if (type !== '0') {
      if (allowed(path)) fail(`entrada não é arquivo comum (tipo ${type}): ${path}`);
      continue;
    }
    files.set(path, { data: Buffer.from(body), executable: (mode & 0o111) !== 0 });
  }
  return files;
}

function lineSummary(before, after) {
  if (before.includes(0) || after.includes(0)) return 'binário';
  const count = (text) => {
    const m = new Map();
    for (const line of text.toString('utf8').split('\n')) m.set(line, (m.get(line) || 0) + 1);
    return m;
  };
  const a = count(before), b = count(after);
  let added = 0, removed = 0;
  for (const [line, n] of b) added += Math.max(0, n - (a.get(line) || 0));
  for (const [line, n] of a) removed += Math.max(0, n - (b.get(line) || 0));
  return `+${added} -${removed}`;
}

if (wanted !== null && !TAG.test(wanted || '')) fail(`--tag precisa ser vMAIOR.MENOR.CORREÇÃO, por exemplo v0.2.0`);
if (realpathSync(git(['rev-parse', '--show-toplevel']).trim()) !== realRoot) fail(`rode dentro da sua cópia do kit (${root})`);
const dirty = git(['status', '--porcelain', '--', ...DIRS, ...FILES, VERSION_FILE]).trim();
if (dirty) fail(`há mudanças não commitadas em arquivos do kit:\n${dirty}\ncommite ou descarte antes de atualizar.`);

const current = existsSync(join(root, VERSION_FILE)) ? readFileSync(join(root, VERSION_FILE), 'utf8').trim() : '(sem kit.version)';
const release = JSON.parse((await get(wanted ? `${API}/tags/${wanted}` : `${API}/latest`, 'application/vnd.github+json')).toString('utf8'));
const tag = release.tag_name;
if (!TAG.test(tag || '') || (wanted && tag !== wanted) || release.draft) fail(`release inválida em ${REPO}: ${tag}`);
const files = readTar(gunzipSync(await get(`${TARBALL}${tag}`, 'application/gzip'), { maxOutputLength: MAX_BYTES * 4 }));
const shipped = files.get(VERSION_FILE)?.data.toString('utf8').trim();
if (shipped && shipped !== tag) fail(`o pacote ${tag} declara ${VERSION_FILE} = ${shipped}; não aplico uma release inconsistente`);

const changes = [];
for (const [path, file] of [...files].sort(([a], [b]) => a.localeCompare(b))) {
  if (!allowed(path)) continue;
  const target = resolve(root, path);
  if (!target.startsWith(root + sep) || !inside(target)) fail(`caminho fora do repositório ou link simbólico: ${path}`);
  if (!existsSync(target)) changes.push({ path, target, file, status: 'A', summary: lineSummary(Buffer.alloc(0), file.data) });
  else {
    const before = readFileSync(target);
    const modeChanged = file.executable !== ((statSync(target).mode & 0o111) !== 0);
    if (!before.equals(file.data) || modeChanged) changes.push({ path, target, file, status: 'M', summary: before.equals(file.data) ? 'modo' : lineSummary(before, file.data) });
  }
}
const tracked = git(['ls-files', '-z', '--', ...DIRS, ...FILES]).split('\0').filter(Boolean);
const extra = tracked.filter((path) => !files.has(path));

console.log(`kit ${current} -> ${tag} (${REPO})`);
for (const c of changes) console.log(`  ${c.status} ${c.path} (${c.summary})`);
if (!changes.length) console.log('  nenhum arquivo do kit muda.');
if (extra.length) console.log(`mantidos (existem só na sua cópia, não estão em ${tag}):\n${extra.map((p) => `  ${p}`).join('\n')}`);
console.log('brand/, videos/, examples/ e build/ nunca são tocados.');

if (!apply) {
  console.log(`\nnada foi escrito. Para aplicar: npm run update -- ${wanted ? `--tag ${tag} ` : ''}--apply`);
  process.exit(0);
}
for (const c of changes) {
  mkdirSync(dirname(c.target), { recursive: true });
  writeFileSync(c.target, c.file.data);
  chmodSync(c.target, c.file.executable ? 0o755 : 0o644);
}
writeFileSync(join(root, VERSION_FILE), `${tag}\n`);
const lockChanged = changes.some((c) => c.path === 'package-lock.json' || c.path === 'package.json');
const specs = [...DIRS, ...FILES, VERSION_FILE].filter((spec) => existsSync(join(root, spec)));
console.log(`\n${changes.length} arquivo(s) atualizados; ${VERSION_FILE} = ${tag}. Revise e commite:
  git diff --stat
  git diff${lockChanged ? '\n  npm ci' : ''}
  npm run doctor
  npm run check -- examples/primeiro-commit
  git add -A -- ${specs.join(' ')}
  git commit -m "Atualiza o kit para ${tag}"
para desfazer antes do commit: git restore -- ${specs.join(' ')} && git clean -fd -- ${specs.join(' ')}`);
