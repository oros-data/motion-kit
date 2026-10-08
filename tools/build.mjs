import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { contrastReport, cssVariables, fontFaces, loadIdentity } from './identity.mjs';

const SCENE_DIR = 'src/scenes';

function fail(message) {
  throw new Error(message);
}

function resolveTerminal(root, videoDir, item) {
  const file = join(videoDir, item.props.transcript || 'transcript.json');
  if (!existsSync(file)) fail(`cena "${item.id}": falta ${file}. Rode: npm run capture -- ${videoDir}`);
  const transcript = JSON.parse(readFileSync(file, 'utf8'));
  let steps = transcript.steps;
  if (item.props.steps) {
    steps = item.props.steps.map((id) => steps.find((s) => s.id === id) || fail(`cena "${item.id}": passo "${id}" não existe em ${file}`));
  }
  if (!steps.length) fail(`cena "${item.id}": nenhum passo`);
  let cursor = 0;
  const resolved = steps.map((step) => {
    if (typeof step.wait !== 'number' || step.wait <= 0) fail(`passo "${step.id}": "wait" (segundos) obrigatório`);
    const out = { ...step, start: cursor };
    cursor += step.wait;
    return out;
  });
  return { steps: resolved, seconds: cursor, repo: transcript.repo_name, columns: transcript.terminal.columns };
}

export function build(root, videoDir, options = {}) {
  videoDir = resolve(root, videoDir);
  const videoFile = join(videoDir, 'video.json');
  if (!existsSync(videoFile)) fail(`não achei ${videoFile}`);
  const video = JSON.parse(readFileSync(videoFile, 'utf8'));
  const slug = basename(videoDir);
  const { identity, theme } = loadIdentity(root, options.theme);
  const report = contrastReport(theme);
  const failures = report.filter((r) => r.status === 'fail');
  for (const r of report.filter((r) => r.status !== 'pass')) {
    console.log(`  contraste ${r.status.toUpperCase()}: ${r.label} ${r.ratio}:1 (mínimo ${r.min}:1) ${r.fg} sobre ${r.bg}`);
  }
  if (failures.length) fail(`tema "${theme.name}": contraste insuficiente em ${failures.length} par(es); ajuste colors em brand/identity.json ou themes/${theme.name}/theme.toml`);

  const out = resolve(root, options.out || join('build', slug));
  rmSync(out, { recursive: true, force: true });
  for (const dir of ['compositions', 'lib', 'fonts', 'audio']) mkdirSync(join(out, dir), { recursive: true });

  if (!Array.isArray(video.scenes) || !video.scenes.length) fail('video.json: "scenes" precisa de pelo menos uma cena');
  const items = {};
  const order = [];
  let cursor = 0;
  for (const scene of video.scenes) {
    if (!scene.id || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(scene.id)) fail(`cena sem "id" válido (minúsculas e hífens): ${JSON.stringify(scene)}`);
    if (items[scene.id]) fail(`id de cena repetido: ${scene.id}`);
    const source = join(root, SCENE_DIR, `${scene.scene}.html`);
    if (!existsSync(source)) fail(`cena "${scene.id}": tipo "${scene.scene}" não existe em ${SCENE_DIR}/`);
    const item = { id: scene.id, scene: scene.scene, props: scene.props || {}, seconds: scene.seconds };
    if (scene.scene === 'terminal') Object.assign(item, resolveTerminal(root, videoDir, item));
    if (typeof item.seconds !== 'number' || item.seconds <= 0) fail(`cena "${scene.id}": "seconds" obrigatório`);
    item.start = cursor;
    cursor += item.seconds;
    items[scene.id] = item;
    order.push(scene.id);
  }
  const total = options.limit ? Math.min(cursor, options.limit) : cursor;
  const fps = identity.canvas.fps;

  const fontPrefix = 'fonts/';
  const faces = fontFaces(identity, '').replaceAll(/url\("([^"]+)"\)/g, (_, path) => {
    copyFileSync(join(root, path), join(out, 'fonts', basename(path)));
    return `url("${fontPrefix}${basename(path)}")`;
  });
  writeFileSync(join(out, 'theme.css'), `${faces}\n${cssVariables(identity, theme)}`);

  const logoSvg = readFileSync(join(root, identity.logo.file), 'utf8').replace(/<\?xml[^>]*>/, '').trim();
  const data = {
    fps, total, width: identity.canvas.width, height: identity.canvas.height,
    identity: { name: identity.name, slug: identity.slug, language: identity.language, voice: identity.voice, mode: theme.mode, logo: { ...identity.logo, svg: logoSvg } },
    theme, video: { slug, title: video.title || slug }, items, order,
  };
  writeFileSync(join(out, 'data.js'), `window.KIT = ${JSON.stringify(data)};\n`);

  for (const id of order) {
    const item = items[id];
    const html = readFileSync(join(root, SCENE_DIR, `${item.scene}.html`), 'utf8').replaceAll('__ID__', id).replace('/*__FONTS__*/', faces);
    writeFileSync(join(out, 'compositions', `${id}.html`), html);
  }
  for (const file of ['gsap.min.js', 'CustomEase.min.js', 'GSAP-NOTICE.txt']) copyFileSync(join(root, 'src', 'vendor', file), join(out, 'lib', file));
  copyFileSync(join(root, 'src', 'kit.js'), join(out, 'lib', 'kit.js'));
  copyFileSync(join(root, 'src', 'audio', 'silence.m4a'), join(out, 'audio', 'silence.m4a'));
  writeFileSync(join(out, 'hyperframes.json'), JSON.stringify({ paths: { blocks: 'compositions', components: 'compositions/components', assets: 'assets' }, media: { autoProxy: false } }, null, 2) + '\n');

  const preview = options.preview;
  const width = preview ? 960 : identity.canvas.width;
  const height = preview ? 540 : identity.canvas.height;
  const slots = order.map((id, i) => {
    const item = items[id];
    return `        <div id="el-${id}" class="clip" data-composition-id="${id}" data-composition-src="compositions/${id}.html" data-start="${item.start}" data-duration="${item.seconds}" data-track-index="${i + 1}" data-width="1920" data-height="1080"></div>`;
  }).join('\n');
  const hud = video.hud || {};
  const html = readFileSync(join(root, 'src', 'index.template.html'), 'utf8')
    .replaceAll('{{TOTAL}}', String(total))
    .replaceAll('{{AUDIO}}', String(Math.min(total, 600)))
    .replaceAll('{{WIDTH}}', String(width))
    .replaceAll('{{HEIGHT}}', String(height))
    .replaceAll('{{ZOOM}}', preview ? '0.5' : '1')
    .replaceAll('{{FPS}}', String(fps))
    .replaceAll('{{LANG}}', identity.language)
    .replaceAll('{{MODE}}', theme.mode)
    .replace('{{SLOTS}}', slots)
    .replace('{{HUD_LEFT}}', escapeHtml(hud.left ?? `${identity.name} // ${data.video.title}`.toUpperCase()))
    .replace('{{HUD_RIGHT}}', escapeHtml(hud.right ?? identity.voice.tagline));
  writeFileSync(join(out, 'index.html'), html);

  const schedule = order.map((id) => `${id}@${items[id].start}+${items[id].seconds}s`).join(' ');
  console.log(`build ${out}: tema ${theme.name}, ${width}x${height} ${fps}fps, ${total}s: ${schedule}`);
  return { out, total, items, order, fps, theme };
}

function escapeHtml(text) {
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
