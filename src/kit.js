gsap.registerPlugin(CustomEase);
CustomEase.create("kitOut", "0.16,1,0.3,1");

window.K = {
  fps: window.KIT.fps,

  f(frames) {
    return frames / window.KIT.fps;
  },

  el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  },

  fade(tl, target, seconds, edge, outToo = true) {
    tl.fromTo(target, { opacity: 0 }, { opacity: 1, duration: edge, ease: "power1.inOut", immediateRender: true }, 0);
    if (outToo) tl.to(target, { opacity: 0, duration: edge, ease: "power1.inOut" }, seconds - edge);
  },

  logo(height) {
    const box = this.el("div", "logo");
    box.innerHTML = window.KIT.identity.logo.svg;
    const svg = box.querySelector("svg");
    if (svg) { svg.style.height = `${height}px`; svg.style.width = "auto"; svg.removeAttribute("width"); }
    return box;
  },

  plain(value) {
    return value.replace(/\x1b\[[0-9;]*m/g, "");
  },

  ansi(line) {
    const map = window.KIT.theme.terminal.ansi;
    const pieces = [];
    const regex = /\x1b\[([0-9;]*)m/g;
    let cursor = 0;
    let color;
    let bold = false;
    for (let match = regex.exec(line); match; match = regex.exec(line)) {
      if (match.index > cursor) pieces.push({ text: line.slice(cursor, match.index), color, bold });
      for (const code of (match[1] || "0").split(";").map(Number)) {
        if (code === 0) { color = undefined; bold = false; }
        else if (code === 1) bold = true;
        else if (code === 22) bold = false;
        else if (code === 39) color = undefined;
        else if (map[code]) color = map[code];
      }
      cursor = regex.lastIndex;
    }
    if (cursor < line.length) pieces.push({ text: line.slice(cursor), color, bold });
    return pieces;
  },

  lines(step) {
    const split = (text, error) => text.replace(/\n$/, "").split("\n").filter((l) => l.length).map((line) => ({ line, error }));
    return [...split(step.stdout, false), ...split(step.stderr, true)];
  },
};
