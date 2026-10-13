import { createServer } from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';

const RULES = {
  overflow: 'error',
  empty: 'error',
  'small-text': 'warn',
  presenter: 'error',
  'long-word': 'error',
};
const DEFAULTS = { emptySeconds: 1.0, minFontPx: 18, errorFontPx: 14, step: 0.25 };
const FRAME = { width: 1920, height: 1080 };
const PRESENTER = { x1: 1492, y1: 830, x2: 1848, y2: 1030 };
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.otf': 'font/otf' };

const HARNESS = `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<script src="lib/gsap.min.js"></script><script src="lib/CustomEase.min.js"></script>
<script src="data.js"></script><script src="lib/kit.js"></script>
<link rel="stylesheet" href="theme.css">
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { width: 1920px; height: 1080px; overflow: hidden; background: var(--bg); }
#stage { position: relative; width: 1920px; height: 1080px; overflow: hidden; color: var(--text); font-family: var(--font-display); }
.clip { position: absolute; inset: 0; display: none; }
</style></head>
<body><div id="stage"></div>
<script>
window.__timelines = {};
window.__ready = (async () => {
  const stage = document.getElementById("stage");
  for (const id of window.KIT.order) {
    const slot = document.createElement("div");
    slot.className = "clip";
    slot.id = "el-" + id;
    stage.appendChild(slot);
    const holder = document.createElement("div");
    holder.innerHTML = await (await fetch("compositions/" + id + ".html")).text();
    const content = holder.querySelector("template").content;
    const scripts = [...content.querySelectorAll("script")];
    for (const s of scripts) s.remove();
    slot.appendChild(document.importNode(content, true));
    for (const s of scripts) {
      const copy = document.createElement("script");
      copy.textContent = s.textContent;
      slot.appendChild(copy);
    }
  }
  await document.fonts.ready;
})();
</script></body></html>`;

function serve(buildDir) {
  const server = createServer((req, res) => {
    const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (path === '/__gates.html') {
      res.writeHead(200, { 'content-type': 'text/html' });
      return res.end(HARNESS);
    }
    const file = normalize(join(buildDir, path));
    if (!file.startsWith(buildDir) || !existsSync(file)) {
      res.writeHead(404);
      return res.end();
    }
    res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' });
    res.end(readFileSync(file));
  });
  return new Promise((ok) => server.listen(0, '127.0.0.1', () => ok(server)));
}

function measure(sceneId, local, cfg) {
  const slots = document.querySelectorAll('.clip');
  for (const slot of slots) slot.style.display = slot.id === 'el-' + sceneId ? 'block' : 'none';
  window.__timelines[sceneId]?.time(local, false);
  const root = document.querySelector(`#el-${sceneId} [data-composition-id]`);
  const num = (v) => Math.round(v * 10) / 10;
  const alpha = (c) => {
    if (!c || c === 'transparent') return 0;
    const m = c.match(/rgba?\(([^)]+)\)/);
    if (m) {
      const parts = m[1].split(/[ ,/]+/).filter(Boolean);
      return parts.length > 3 ? Number(parts[3]) : 1;
    }
    const m2 = c.match(/\/\s*([\d.]+%?)\s*\)/);
    if (m2) return m2[1].endsWith('%') ? parseFloat(m2[1]) / 100 : Number(m2[1]);
    return 1;
  };
  const effOpacity = (el) => {
    let o = 1;
    for (let n = el; n && n !== root.parentElement; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.display === 'none' || cs.visibility === 'hidden') return 0;
      o *= Number(cs.opacity);
    }
    return o;
  };
  const path = (el) => {
    const parts = [];
    for (let n = el; n && n !== root; n = n.parentElement) parts.unshift(n.tagName.toLowerCase() + ':' + [...n.parentElement.children].indexOf(n));
    return parts.join('>');
  };
  const label = (el, text) => {
    const cls = typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/)[0] : '';
    const clip = text.replace(/\s+/g, ' ').trim();
    const tagged = `<${el.tagName.toLowerCase()}${cls}>`;
    return clip ? `${tagged} "${clip.length > 28 ? clip.slice(0, 27) + '…' : clip}"` : tagged;
  };
  const textRect = (el) => {
    const range = document.createRange();
    range.selectNodeContents(el);
    const rects = [...range.getClientRects()].filter((r) => r.width > 0 && r.height > 0);
    if (!rects.length) return null;
    return {
      left: Math.min(...rects.map((r) => r.left)), top: Math.min(...rects.map((r) => r.top)),
      right: Math.max(...rects.map((r) => r.right)), bottom: Math.max(...rects.map((r) => r.bottom)),
    };
  };
  const frameArea = 1920 * 1080;
  const hasPaint = (cs) => alpha(cs.backgroundColor) > 0.05 || cs.backgroundImage !== 'none'
    || (['Top', 'Right', 'Bottom', 'Left'].some((s) => parseFloat(cs['border' + s + 'Width']) > 0 && cs['border' + s + 'Style'] !== 'none' && alpha(cs['border' + s + 'Color']) > 0.05));
  const out = { visible: 0, findings: [] };
  const add = (rule, el, text, detail, extra = {}) => out.findings.push({ rule, key: path(el), what: label(el, text), detail, ...extra });
  const intersects = (r) => Math.min(r.right, cfg.presenter.x2) - Math.max(r.left, cfg.presenter.x1) > 4 && Math.min(r.bottom, cfg.presenter.y2) - Math.max(r.top, cfg.presenter.y1) > 4;
  const frame = cfg.frame;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
  const frames = [];
  for (let el = walker.nextNode(); el; el = walker.nextNode()) {
    const tag = el.tagName.toLowerCase();
    const cs = getComputedStyle(el);
    const isSvgShape = el instanceof SVGGraphicsElement && !(el instanceof SVGSVGElement) && tag !== 'g' && tag !== 'text' && tag !== 'tspan';
    const op = effOpacity(el);
    if (op <= 0.05) continue;
    const own = [...el.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim()).map((n) => n.textContent).join(' ');

    if (isSvgShape) {
      const strokes = cs.stroke !== 'none' && parseFloat(cs.strokeWidth) > 0 && alpha(cs.stroke) > 0.05;
      const fills = cs.fill !== 'none' && alpha(cs.fill) > 0.05;
      if (!strokes && !fills) continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;
      out.visible++;
      if (op > 0.3 && intersects(r)) add('presenter', el, tag, 'forma gráfica entra na região do apresentador', { amount: 0 });
      if (tag === 'rect' && strokes && !fills && r.width < (frame.right - frame.left) * 0.95) frames.push({ r, el });
      continue;
    }
    if (el instanceof SVGElement && !own) continue;

    if (tag === 'img' || tag === 'canvas' || tag === 'video') {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) {
        out.visible++;
        if (op > 0.3 && intersects(r)) add('presenter', el, tag, 'imagem entra na região do apresentador');
      }
      continue;
    }

    if (own) {
      const tr = textRect(el);
      if (!tr) continue;
      out.visible++;
      const settled = op >= 0.95;
      const fontPx = parseFloat(cs.fontSize);
      const box = el.getBoundingClientRect();
      const scale = el.offsetWidth > 0 ? box.width / el.offsetWidth : 1;
      const px = fontPx * (Number.isFinite(scale) && scale > 0 ? scale : 1);
      if (op > 0.3 && px < cfg.minFontPx) {
        add('small-text', el, own, `fonte de ${num(px)} px`, { amount: px, severity: px < cfg.errorFontPx ? 'error' : 'warn' });
      }
      if (op > 0.3 && intersects(tr)) add('presenter', el, own, 'texto entra na região do apresentador');
      if (!settled) continue;

      let longWord = false;
      const wraps = cs.whiteSpace !== 'nowrap' && cs.whiteSpace !== 'pre' && cs.overflowWrap === 'normal' && cs.wordBreak === 'normal';
      if (wraps) {
        let block = el;
        while (block.parentElement && block !== root && getComputedStyle(block).display.startsWith('inline')) block = block.parentElement;
        const avail = block.clientWidth - parseFloat(getComputedStyle(block).paddingLeft) - parseFloat(getComputedStyle(block).paddingRight);
        const range = document.createRange();
        for (const node of [...el.childNodes].filter((n) => n.nodeType === 3)) {
          for (const m of node.textContent.matchAll(/\S+/g)) {
            range.setStart(node, m.index);
            range.setEnd(node, m.index + m[0].length);
            const w = range.getBoundingClientRect().width / (scale || 1);
            if (avail > 0 && w > avail + 1) {
              longWord = true;
              add('long-word', el, '', `"${m[0].length > 30 ? m[0].slice(0, 29) + '…' : m[0]}" mede ${Math.round(w)} px e não quebra (contêiner de ${Math.round(avail)} px)`, { amount: w - avail });
            } else if (avail > 0 && w > avail * 0.85 && m[0].length > 12) {
              longWord = true;
              add('long-word', el, '', `"${m[0]}" ocupa ${Math.round((w / avail) * 100)}% da largura do contêiner e não quebra`, { amount: w - avail, severity: 'warn' });
            }
          }
        }
      }
      if (longWord) continue;

      const sides = [['esquerda', frame.left - tr.left], ['direita', tr.right - frame.right], ['topo', frame.top - tr.top], ['base', tr.bottom - frame.bottom]];
      const worst = sides.sort((a, b) => b[1] - a[1])[0];
      if (worst[1] > 2) {
        add('overflow', el, own, `texto passa ${Math.round(worst[1])} px da borda ${worst[0]} do quadro`, { amount: worst[1] });
        continue;
      }
      for (let a = el.parentElement; a && a !== root.parentElement; a = a.parentElement) {
        const acs = getComputedStyle(a);
        const clips = [acs.overflowX, acs.overflowY].some((v) => v !== 'visible');
        if (!clips && !(a !== root && hasPaint(acs))) continue;
        const ar = a.getBoundingClientRect();
        const over = Math.max(ar.left - tr.left, tr.right - ar.right, ar.top - tr.top, tr.bottom - ar.bottom);
        if (over > 2) {
          add('overflow', el, own, `texto passa ${Math.round(over)} px do contêiner ${label(a, '')}${clips ? ' (cortado)' : ''}`, { amount: over });
          break;
        }
      }
      continue;
    }

    if (el !== root && hasPaint(cs)) {
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1 || r.width * r.height >= frameArea * 0.9) continue;
      out.visible++;
      if (op >= 0.95) {
        const over = Math.max(frame.left - r.left, r.right - frame.right, frame.top - r.top, r.bottom - frame.bottom);
        if (over > 2) add('overflow', el, '', `caixa passa ${Math.round(over)} px da borda do quadro`, { amount: over });
      }
      if (op > 0.3 && intersects(r)) add('presenter', el, '', 'caixa entra na região do apresentador');
    }
  }

  for (const t of root.querySelectorAll('*')) {
    if (effOpacity(t) < 0.95) continue;
    const own = [...t.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim()).map((n) => n.textContent).join(' ');
    if (!own) continue;
    const tr = textRect(t);
    if (!tr) continue;
    const cx = (tr.left + tr.right) / 2;
    const cy = (tr.top + tr.bottom) / 2;
    for (const { r, el } of frames) {
      if (cx < r.left || cx > r.right || cy < r.top || cy > r.bottom) continue;
      const over = Math.max(r.left - tr.left, tr.right - r.right, r.top - tr.top, tr.bottom - r.bottom);
      if (over > 2) {
        add('overflow', t, own, `texto passa ${Math.round(over)} px da moldura desenhada (${path(el).split('>').pop()})`, { amount: over });
        break;
      }
    }
  }
  return out;
}

function formatTime(t) {
  return `${(Math.round(t * 100) / 100).toFixed(2)} s`;
}

const TIPS = {
  overflow: 'Encurte o texto, reduza a fonte ou largura no HTML da cena, ou use quebra de linha.',
  empty: 'Preencha o trecho (cena mais curta, elemento que entra antes) ou ajuste "seconds".',
  'small-text': 'Aumente a fonte para o mínimo ou remova o texto; o celular mostra o vídeo com 360 px de largura.',
  presenter: 'Mova o elemento para fora de x 1492–1848, y 830–1030 (veja --variables \'{"debugSafe":true}\').',
  'long-word': 'Troque a palavra, encurte-a ou aumente o contêiner; strings sem espaço não quebram.',
};

export async function runGates({ buildDir, videoFile, browserPath }) {
  const video = JSON.parse(readFileSync(videoFile, 'utf8'));
  const cfg = { ...DEFAULTS, ...(video.gates || {}) };
  const problems = [];
  const sceneCfg = new Map();
  for (const scene of video.scenes) {
    const ignore = new Map();
    for (const entry of scene.ignore || []) {
      if (!RULES[entry.rule]) problems.push(`cena "${scene.id}": regra "${entry.rule}" em "ignore" não existe (use: ${Object.keys(RULES).join(', ')})`);
      else if (typeof entry.reason !== 'string' || entry.reason.trim().length < 8) problems.push(`cena "${scene.id}": "ignore" da regra "${entry.rule}" precisa de "reason" com a justificativa`);
      else ignore.set(entry.rule, entry.reason.trim());
    }
    sceneCfg.set(scene.id, ignore);
  }
  if (problems.length) {
    for (const p of problems) console.error(`ERRO   video.json: ${p}`);
    return false;
  }

  let puppeteer;
  try {
    puppeteer = (await import('puppeteer-core')).default;
  } catch {
    console.error('ERRO   gates: puppeteer-core não encontrado; rode npm ci.');
    return false;
  }
  const data = JSON.parse(readFileSync(join(buildDir, 'data.js'), 'utf8').replace(/^window\.KIT = /, '').replace(/;\s*$/, ''));
  const server = await serve(resolve(buildDir));
  const browser = await puppeteer.launch({ executablePath: browserPath, headless: true, args: ['--no-sandbox', '--disable-gpu', '--font-render-hinting=none'] });
  const started = Date.now();
  const grouped = new Map();
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: FRAME.width, height: FRAME.height });
    const pageErrors = [];
    page.on('pageerror', (e) => pageErrors.push(e.message));
    await page.goto(`http://127.0.0.1:${server.address().port}/__gates.html`, { waitUntil: 'load' });
    await page.evaluate(() => window.__ready);
    if (pageErrors.length) throw new Error(`erro de script nas cenas: ${pageErrors[0]}`);
    const pageCfg = { presenter: PRESENTER, minFontPx: cfg.minFontPx, errorFontPx: cfg.errorFontPx, frame: { left: 0, top: 0, right: FRAME.width, bottom: FRAME.height } };

    for (const id of data.order) {
      const item = data.items[id];
      const ignore = sceneCfg.get(id);
      const emptyRuns = [];
      let run = null;
      const times = [];
      for (let t = 0.02; t < item.seconds - 0.02; t += cfg.step) times.push(t);
      times.push(item.seconds - 0.02);
      for (const local of times) {
        const result = await page.evaluate(measure, id, local, pageCfg);
        const at = item.start + local;
        if (result.visible === 0) {
          run = run || { from: local, to: local };
          run.to = local;
        } else if (run) {
          emptyRuns.push(run);
          run = null;
        }
        for (const f of result.findings) {
          const key = `${id}|${f.rule}|${f.key}`;
          const g = grouped.get(key) || { scene: id, ...f, first: at, last: at, amount: 0 };
          g.last = at;
          if ((f.amount ?? 0) >= g.amount) { g.amount = f.amount ?? 0; g.detail = f.detail; if (f.severity) g.severity = f.severity; }
          grouped.set(key, g);
        }
      }
      if (run) emptyRuns.push(run);
      for (const r of emptyRuns) {
        const length = r.to - r.from + cfg.step;
        if (length > cfg.emptySeconds) {
          const at = item.start + r.from;
          grouped.set(`${id}|empty|${r.from}`, { scene: id, rule: 'empty', what: 'trecho vazio:', detail: `nenhum texto ou elemento gráfico visível por ${length.toFixed(2)} s (limite ${cfg.emptySeconds} s)`, first: at, last: at + length });
        }
      }
    }
  } finally {
    await browser.close();
    server.close();
  }

  let errors = 0;
  let warnings = 0;
  const shown = new Map();
  for (const g of [...grouped.values()].sort((a, b) => a.first - b.first)) {
    const reason = sceneCfg.get(g.scene).get(g.rule);
    const severity = g.severity || RULES[g.rule];
    if (reason) {
      console.log(`SILENCIADO [${g.rule}] cena "${g.scene}": ${g.what} ${g.detail} (motivo: ${reason})`);
      continue;
    }
    const count = (shown.get(`${g.scene}|${g.rule}`) || 0) + 1;
    shown.set(`${g.scene}|${g.rule}`, count);
    if (severity === 'error') errors++; else warnings++;
    if (count > 4) continue;
    const when = g.last - g.first > 0.3 ? `${formatTime(g.first)} a ${formatTime(g.last)}` : formatTime(g.first);
    console.log(`${severity === 'error' ? 'ERRO  ' : 'AVISO '} [${g.rule}] cena "${g.scene}" em ${when}: ${g.what} ${g.detail}.`);
  }
  for (const [key, count] of shown) if (count > 4) console.log(`       … e mais ${count - 4} em ${key.replace('|', ' / ')}`);
  for (const rule of new Set([...grouped.values()].filter((g) => !sceneCfg.get(g.scene).get(g.rule)).map((g) => g.rule))) console.log(`       como corrigir [${rule}]: ${TIPS[rule]} Para aceitar de propósito: "ignore": [{"rule": "${rule}", "reason": "..."}] na cena, em video.json.`);
  console.log(`gates: ${errors} erro(s), ${warnings} aviso(s) em ${((Date.now() - started) / 1000).toFixed(1)} s`);
  return errors === 0;
}

if (process.argv[1] && resolve(process.argv[1]) === new URL(import.meta.url).pathname) {
  const [buildDir, videoFile, browserPath] = process.argv.slice(2);
  runGates({ buildDir: resolve(buildDir), videoFile: resolve(videoFile), browserPath }).then((ok) => process.exit(ok ? 0 : 1), (e) => {
    console.error(`ERRO   gates: ${e.message}`);
    process.exit(1);
  });
}
