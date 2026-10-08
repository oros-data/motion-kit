import { existsSync, readFileSync, readdirSync, mkdirSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { build } from './build.mjs';
import { contrastReport, loadIdentity, textRoles, validateIdentity } from './identity.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const HF = `hyperframes@${pkg.devDependencies.hyperframes}`;
const EXAMPLE = 'examples/primeiro-commit';
process.env.HYPERFRAMES_NO_TELEMETRY = '1';
process.env.HYPERFRAMES_NO_UPDATE_CHECK = '1';

const [command, ...rest] = process.argv.slice(2);
const flags = {};
const args = [];
for (let i = 0; i < rest.length; i++) {
  const a = rest[i];
  if (a.startsWith('--')) {
    const [key, inline] = a.slice(2).split('=');
    flags[key] = inline ?? (rest[i + 1] && !rest[i + 1].startsWith('--') ? rest[++i] : true);
  } else args.push(a);
}

function sh(cmd, cmdArgs, options = {}) {
  const result = spawnSync(cmd, cmdArgs, { stdio: 'inherit', cwd: root, shell: process.platform === 'win32', ...options });
  if (result.error) throw result.error;
  return result.status ?? 1;
}

function hf(hfArgs, options) {
  return sh('npx', ['--yes', HF, ...hfArgs], options);
}

function must(status, what) {
  if (status !== 0) {
    console.error(`\nfalhou: ${what} (código ${status})`);
    process.exit(status);
  }
}

function videoDir() {
  const dir = args[0];
  if (!dir) {
    const candidates = existsSync(join(root, 'videos')) ? readdirSync(join(root, 'videos')).filter((d) => existsSync(join(root, 'videos', d, 'video.json'))) : [];
    if (candidates.length === 1) return join('videos', candidates[0]);
    console.error(`informe a pasta do vídeo, por exemplo: npm run ${command} -- ${candidates[0] ? `videos/${candidates[0]}` : EXAMPLE}`);
    process.exit(2);
  }
  if (!existsSync(resolve(root, dir, 'video.json'))) {
    console.error(`não achei ${dir}/video.json`);
    process.exit(2);
  }
  return dir;
}

function buildDir(dir) {
  return join('build', basename(dir) + (flags.theme ? `-${flags.theme}` : ''));
}

function doBuild(dir, extra = {}) {
  return build(root, dir, { theme: flags.theme, preview: !!flags.preview, limit: flags.limit ? Number(flags.limit) : undefined, out: buildDir(dir), ...extra });
}

function snapshotTimes(result) {
  const times = [];
  for (const id of result.order) {
    const item = result.items[id];
    if (item.scene === 'terminal') {
      for (const step of item.steps) times.push(item.start + step.start + Math.min(step.wait * 0.6, step.wait - 0.5));
    } else {
      times.push(item.start + Math.min(1.2, item.seconds / 2));
      if (item.seconds > 4) times.push(item.start + item.seconds - 0.6);
    }
  }
  return times.filter((t) => t < result.total).map((t) => Math.round(t * 10) / 10).slice(0, 15);
}

function phoneSheet(dir) {
  const snaps = join(root, dir, 'snapshots');
  const frames = readdirSync(snaps).filter((f) => /^frame-.*\.png$/.test(f)).sort();
  if (!frames.length) return;
  const cols = 3;
  const rows = Math.ceil(frames.length / cols);
  const inputs = frames.flatMap((f) => ['-i', join(snaps, f)]);
  const filter = `${frames.map((_, i) => `[${i}:v]scale=360:-1[s${i}]`).join(';')};${frames.map((_, i) => `[s${i}]`).join('')}xstack=inputs=${frames.length}:fill=black:layout=${frames.map((_, i) => `${(i % cols) * 360}_${Math.floor(i / cols) * 203}`).join('|')}[out]`;
  const status = sh('ffmpeg', ['-v', 'error', '-y', ...inputs, '-filter_complex', filter, '-map', '[out]', join(snaps, 'phone-sheet-360.png')]);
  if (status === 0) console.log(`phone sheet (360 px, ${rows} linhas): ${join(dir, 'snapshots', 'phone-sheet-360.png')}`);
}

function renderArgs(dir, outFile) {
  const a = ['render', dir, '--fps', String(pkg.kit?.fps || 30), '--output', outFile];
  if (!process.env.KIT_GPU) a.push('--no-browser-gpu', '--workers', String(flags.workers || 2));
  return a;
}

const commands = {
  doctor() {
    const line = (ok, label, detail) => console.log(`${ok ? 'OK   ' : 'FALHA'} ${label}${detail ? `: ${detail}` : ''}`);
    const ver = (cmd, cmdArgs) => {
      const r = spawnSync(cmd, cmdArgs, { encoding: 'utf8', shell: process.platform === 'win32' });
      return r.status === 0 ? (r.stdout || r.stderr).trim().split('\n')[0] : null;
    };
    const major = Number(process.versions.node.split('.')[0]);
    line(major >= 22, 'node 22+', process.version);
    const ffmpeg = ver('ffmpeg', ['-version']);
    line(!!ffmpeg, 'ffmpeg', ffmpeg || 'instale o ffmpeg e deixe no PATH');
    const py = ver('python3', ['--version']);
    line(!!py, 'python3 (runner de captura)', py || 'instale o python3; no Windows use WSL2');
    const bash = ver('bash', ['--version']);
    line(!!bash, 'bash (runner de captura)', bash || 'no Windows use WSL2');
    const git = ver('git', ['--version']);
    line(!!git, 'git', git || 'instale o git');
    const browser = spawnSync('npx', ['--yes', HF, 'browser', 'path'], { encoding: 'utf8', cwd: root, shell: process.platform === 'win32' });
    const browserPath = (browser.stdout || '').trim().split('\n').pop();
    line(browser.status === 0 && existsSync(browserPath), 'navegador de render (chrome-headless-shell)', browser.status === 0 ? browserPath : `rode: npx ${HF} browser ensure`);
    let identityOk = true;
    try {
      const identity = JSON.parse(readFileSync(join(root, 'brand', 'identity.json'), 'utf8'));
      const errors = validateIdentity(root, identity);
      identityOk = errors.length === 0;
      line(identityOk, 'brand/identity.json e arquivos de fonte/logo', errors.join('; '));
    } catch (error) {
      identityOk = false;
      line(false, 'brand/identity.json', error.message);
    }
    line(true, 'telemetria do hyperframes', 'desligada pelos scripts (HYPERFRAMES_NO_TELEMETRY=1)');
    const ok = major >= 22 && ffmpeg && py && bash && git && browser.status === 0 && identityOk;
    console.log(ok ? '\ntudo pronto.' : '\nresolva os itens FALHA antes da aula.');
    process.exit(ok ? 0 : 1);
  },

  'identity:check'() {
    const identity = JSON.parse(readFileSync(join(root, 'brand', 'identity.json'), 'utf8'));
    const errors = validateIdentity(root, identity);
    if (errors.length) {
      console.error(`brand/identity.json inválido:\n  ${errors.join('\n  ')}`);
      process.exit(1);
    }
    const { theme } = loadIdentity(root, flags.theme);
    const text = textRoles(identity, theme);
    console.log(`identidade "${identity.name}" (${identity.slug}), tema ${theme.name}, modo ${theme.mode}`);
    console.log(`papéis: ${Object.entries(theme.roles).map(([k, v]) => `${k}=${v}`).join(' ')}`);
    console.log(`texto por papel: ${Object.entries(text).map(([k, v]) => `${k}=${v}`).join(' ')}`);
    let failed = false;
    for (const r of contrastReport(theme, text)) {
      console.log(`${r.status.toUpperCase().padEnd(5)} ${r.label}: ${r.ratio}:1 (mínimo ${r.min}:1) ${r.fg} sobre ${r.bg}`);
      if (r.status === 'fail') failed = true;
    }
    console.log(failed ? '\najuste as cores: um FAIL deixa texto ilegível no celular.' : '\ncontraste ok. Próximo: npm run snapshot -- ' + EXAMPLE);
    process.exit(failed ? 1 : 0);
  },

  capture() {
    const dir = videoDir();
    const work = resolve(root, dir, '.work');
    mkdirSync(work, { recursive: true });
    must(sh('python3', [join(root, 'runner', 'capture.py'), resolve(root, dir, 'steps.json'), resolve(root, dir, 'transcript.json'), '--work-root', work]), 'captura (precisa de python3 e bash; no Windows use WSL2)');
  },

  build() {
    doBuild(videoDir());
  },

  dev() {
    const dir = videoDir();
    doBuild(dir);
    console.log('\nStudio local (somente leitura: edite src/scenes e o video.json, não a pasta build/). Ctrl+C para sair.');
    must(hf(['preview', buildDir(dir), '--foreground']), 'preview');
  },

  check() {
    const dir = videoDir();
    doBuild(dir);
    must(hf(['lint', buildDir(dir)]), 'lint');
    must(hf(['check', buildDir(dir), '--no-browser-gpu']), 'check');
  },

  snapshot() {
    const dir = videoDir();
    const result = doBuild(dir);
    const at = flags.at || snapshotTimes(result).join(',');
    must(hf(['snapshot', buildDir(dir), '--at', at, '--no-browser-gpu', '--no-end', '--describe', String(flags.describe || false)]), 'snapshot');
    phoneSheet(buildDir(dir));
  },

  render() {
    const dir = videoDir();
    doBuild(dir);
    const outFile = flags.out || join(buildDir(dir), 'renders', `${basename(dir)}.mp4`);
    must(hf(renderArgs(buildDir(dir), outFile)), 'render');
    console.log(`\nvídeo: ${outFile}`);
  },

  preview() {
    const dir = videoDir();
    doBuild(dir, { preview: true });
    const outFile = flags.out || join(buildDir(dir), 'renders', `${basename(dir)}-preview-960x540.mp4`);
    must(hf(renderArgs(buildDir(dir), outFile)), 'preview render');
    console.log(`\nprévia 960x540: ${outFile}`);
  },

  smoke() {
    args[0] = EXAMPLE;
    console.log('1/5 captura');
    commands.capture();
    console.log('2/5 build + lint + check');
    commands.check();
    console.log('3/5 snapshot');
    commands.snapshot();
    console.log('4/5 build de 3 segundos');
    const result = doBuild(EXAMPLE, { limit: 3 });
    console.log('5/5 render de 3 segundos');
    const outFile = join(buildDir(EXAMPLE), 'renders', 'smoke-3s.mp4');
    must(hf(renderArgs(buildDir(EXAMPLE), outFile)), 'render');
    doBuild(EXAMPLE);
    console.log(`\nsmoke ok: ${outFile} (${result.total}s)`);
  },
};

if (!commands[command]) {
  console.error(`comandos: ${Object.keys(commands).join(', ')}`);
  process.exit(2);
}
try {
  commands[command]();
} catch (error) {
  console.error(`\n${error.message}`);
  process.exit(1);
}
