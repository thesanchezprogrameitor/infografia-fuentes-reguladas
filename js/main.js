/* Fuentes de alimentación reguladas · Infografía
   Animaciones: GSAP + ScrollTrigger (scroll), Lenis (scroll suave), SVG generado a mano.
   Todas las formas de onda salen de un modelo físico simple de la fuente. */
(function () {
  'use strict';

  const doc = document.documentElement;
  const mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const REDUCE = mqReduce.matches || /[?&]reducido/.test(location.search);
  const G = window.gsap;
  const ST = window.ScrollTrigger;
  const HAS_GSAP = !!(G && ST);
  if (HAS_GSAP) G.registerPlugin(ST);
  if (!HAS_GSAP) doc.classList.add('reduced');
  if (mqReduce.addEventListener) mqReduce.addEventListener('change', () => location.reload());

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const NS = 'http://www.w3.org/2000/svg';
  function el(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    if (attrs) for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function txt(parent, x, y, s, cls, anchor, extra) {
    const t = el('text', Object.assign({ x, y, class: cls || '' }, anchor ? { 'text-anchor': anchor } : {}, extra || {}), parent);
    t.textContent = s;
    return t;
  }
  // Escribe un atributo solo si cambió (menos trabajo para el navegador).
  function setA(e, k, v) {
    const key = '_' + k;
    if (e[key] !== v) { e[key] = v; e.setAttribute(k, v); }
  }

  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (t) => { t = clamp(t); return t * t * (3 - 2 * t); };
  const ease = (t) => { t = clamp(t); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  const fmt = (v, d = 1) => v.toFixed(d);
  const minus = (s) => String(s).replace('-', '−');

  const COL = {
    ac: '#7fb0ff', rect: '#ffb547', filt: '#33d6c8', reg: '#74e39a', load: '#f4f6fb', heat: '#ff6b4a',
    text: '#e9eef6', text2: '#c3ccda', muted: '#8d9ab0', dim: '#5b6880', base: '#c7d0de', bg: '#090d14', bg2: '#0d131d'
  };
  function rgb(h) { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
  function mix(a, b, t) {
    const A = rgb(a), B = rgb(b);
    return 'rgb(' + Math.round(lerp(A[0], B[0], t)) + ',' + Math.round(lerp(A[1], B[1], t)) + ',' + Math.round(lerp(A[2], B[2], t)) + ')';
  }

  // ---------- Ticker único ----------
  const tickers = new Set();
  if (HAS_GSAP) {
    G.ticker.add((time, delta) => { const dt = Math.min(0.05, delta / 1000); tickers.forEach((f) => f(dt, time)); });
  } else {
    let last = performance.now();
    const loop = (now) => { const dt = Math.min(0.05, (now - last) / 1000); last = now; tickers.forEach((f) => f(dt, now / 1000)); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  }

  // ---------- Modelo físico ----------
  const F = 60;                         // Hz, red en Colombia
  const OMEGA = 2 * Math.PI * F;
  const VP_RED = 120 * Math.SQRT2;      // ≈ 169.7 V
  const VP_SEC = 12 * Math.SQRT2;       // ≈ 16.97 V
  const VD = 0.7;                       // caída por diodo
  const VOUT = 10;                      // salida de ejemplo del LM317
  const WIN = 3 / F;                    // ventana del osciloscopio: 3 ciclos = 50 ms
  const TR = 1 / (2 * F);               // periodo del rizo
  const TPK = 1 / (4 * F);              // primer pico
  const DESIGN = { I: 0.1, C: 0.1 / (2 * F * 0.33) }; // 100 mA, 0.33 Vpp → C ≈ 2525 µF

  // Filtro con capacitor: descarga a corriente constante entre picos.
  // La pendiente se ajusta para que el rizo dibujado sea exactamente Vr = I / (2·f·C).
  function makeFilter(I, C, amp) {
    amp = amp || 1;
    const Vs = VP_SEC * amp;
    const Vp = Vs - 2 * VD;
    const Vr = I / (2 * F * C);
    const rr = (tau) => Math.max(Vs * Math.abs(Math.cos(OMEGA * tau)) - 2 * VD, 0);
    const crossing = (s) => {
      let a = TR / 2, b = TR;
      for (let i = 0; i < 32; i++) { const m = (a + b) / 2; if (Vp - s * m - rr(m) > 0) a = m; else b = m; }
      return (a + b) / 2;
    };
    let lo = Vr / TR, hi = 2.2 * Vr / TR;
    for (let i = 0; i < 32; i++) { const m = (lo + hi) / 2; if (m * crossing(m) < Vr) lo = m; else hi = m; }
    const s = (lo + hi) / 2;
    const tc = crossing(s);
    const rect = (t) => Math.max(Vs * Math.abs(Math.sin(OMEGA * t)) - 2 * VD, 0);
    const vc = (t) => { const tau = (((t - TPK) % TR) + TR) % TR; return Vp - s * tau; };
    return {
      Vp, Vr, Vmin: Vp - Vr, Vavg: Vp - Vr / 2, tc, Vs,
      rect,
      v: (t) => Math.max(rect(t), vc(t)),
      charging: (t) => rect(t) >= vc(t) - 1e-9
    };
  }

  // =====================================================================
  //  HERO · una sola línea que resume la fuente
  // =====================================================================
  function hero() {
    const svg = $('#hero-svg');
    if (!svg) return;
    const W = 1200, Y0 = 112, seg = 240;
    const defs = el('defs', {}, svg);
    const grad = el('linearGradient', { id: 'hg', gradientUnits: 'userSpaceOnUse', x1: 0, y1: 0, x2: W, y2: 0 }, defs);
    [[0, COL.ac], [0.395, COL.ac], [0.405, COL.rect], [0.595, COL.rect], [0.605, COL.filt], [0.795, COL.filt], [0.805, COL.reg], [1, COL.reg]]
      .forEach(([o, c]) => el('stop', { offset: o, 'stop-color': c }, grad));
    const blur = el('filter', { id: 'hglow', x: '-10%', y: '-50%', width: '120%', height: '200%' }, defs);
    el('feGaussianBlur', { stdDeviation: 5 }, blur);

    const grid = el('g', { class: 'hw-grid' }, svg);
    el('line', { x1: 0, x2: W, y1: Y0, y2: Y0 }, grid);
    for (let i = 1; i < 5; i++) el('line', { class: 'hw-div', x1: i * seg, x2: i * seg, y1: 18, y2: 182 }, svg);

    const pts = [];
    let h = 0;
    for (let x = 0; x <= W; x += 2) {
      let y;
      if (x < seg) y = Y0 - 70 * Math.sin(2 * Math.PI * 2 * x / seg);
      else if (x < 2 * seg) y = Y0 - 24 * Math.sin(2 * Math.PI * 2 * (x - seg) / seg);
      else if (x < 3 * seg) y = Y0 - 24 * Math.abs(Math.sin(2 * Math.PI * 2 * (x - 2 * seg) / seg));
      else if (x < 4 * seg) {
        const r = 24 * Math.abs(Math.sin(2 * Math.PI * 2 * (x - 3 * seg) / seg));
        h = Math.max(r, h - 4.5 / 60 * 2);
        y = Y0 - h;
      } else {
        const k = smooth((x - 4 * seg) / 22);
        y = Y0 - lerp(h, 16, k);
      }
      pts.push([x, y]);
    }
    const d = 'M' + pts.map((p) => p[0] + ' ' + p[1].toFixed(2)).join('L');
    const glow = el('path', { d, fill: 'none', stroke: 'url(#hg)', 'stroke-width': 7, opacity: 0.35, filter: 'url(#hglow)' }, svg);
    const line = el('path', { d, fill: 'none', stroke: 'url(#hg)', 'stroke-width': 2.6, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, svg);
    const dot = el('circle', { r: 5, fill: '#fff', opacity: 0 }, svg);
    const halo = el('circle', { r: 13, fill: '#fff', opacity: 0 }, svg);

    if (REDUCE || !HAS_GSAP) return;
    const len = line.getTotalLength();
    [line, glow].forEach((p) => { p.style.strokeDasharray = len; p.style.strokeDashoffset = len; });
    G.to([line, glow], { strokeDashoffset: 0, duration: 2.2, ease: 'power2.inOut', delay: 0.25 });
    const colorAt = (x) => x < 2 * seg ? COL.ac : x < 3 * seg ? COL.rect : x < 4 * seg ? COL.filt : COL.reg;
    let p = 0, started = false, visible = true;
    G.delayedCall(2.4, () => { started = true; G.to([dot], { opacity: 1, duration: 0.4 }); G.to(halo, { opacity: 0.18, duration: 0.4 }); });
    if ('IntersectionObserver' in window) new IntersectionObserver((e) => { visible = e[0].isIntersecting; }).observe(svg);
    tickers.add((dt) => {
      if (!started || !visible) return;
      p = (p + dt / 7) % 1;
      const i = Math.floor(p * (pts.length - 1));
      const [x, y] = pts[i];
      setA(dot, 'cx', x); setA(dot, 'cy', y.toFixed(1));
      setA(halo, 'cx', x); setA(halo, 'cy', y.toFixed(1));
      const c = colorAt(x);
      setA(halo, 'fill', c);
    });
  }

  // =====================================================================
  //  TEORÍA · esquema + osciloscopio ligados al scroll
  // =====================================================================
  function theory() {
    const sch = $('#schematic');
    const scope = $('#scope');
    const scopeBody = $('#scope-body');
    const stage = $('#stage');
    if (!sch || !scope) return;
    const steps = $$('#steps .step');
    const cards = steps.map((s) => s.querySelector('.step-card'));
    const chips = $$('#blocks .chip');
    const pointEl = $('#scope-point');
    const readEl = $('#scope-read');
    const mqMobile = window.matchMedia('(max-width: 959px)');

    const lab = { I: DESIGN.I, C: 2525e-6 };

    // ---------------- Esquema ----------------
    const sdefs = el('defs', {}, sch);
    const fb = el('filter', { id: 'sblur', x: '-60%', y: '-60%', width: '220%', height: '220%' }, sdefs);
    el('feGaussianBlur', { stdDeviation: 6 }, fb);

    const ORDER = ['src', 'trafo', 'rect', 'filt', 'reg', 'load'];
    const GCOL = [COL.ac, COL.ac, COL.rect, COL.filt, COL.reg, COL.load];
    const grp = {};
    ORDER.forEach((k, i) => { grp[k] = el('g', { class: 'g' }, sch); grp[k]._i = i; });
    const W_ = (g, d, cls) => el('path', { d, class: cls || 'w' }, g);
    const jdot = (g, x, y) => el('circle', { cx: x, cy: y, r: 3.2, class: 'dot' }, g);
    const coil = (x, y, n, r, sweep) => { let d = 'M' + x + ' ' + y; for (let i = 0; i < n; i++) d += 'a' + r + ' ' + r + ' 0 0 ' + sweep + ' 0 ' + (2 * r); return d; };
    const zig = (x, y1, y2, lead, n, amp) => {
      lead = lead || 14; n = n || 6; amp = amp || 8;
      const y = y1 + lead, hh = (y2 - y1 - 2 * lead) / n;
      let d = 'M' + x + ' ' + y1 + 'V' + y + 'L' + (x - amp) + ' ' + (y + hh / 2);
      for (let i = 1; i < n; i++) d += 'L' + (x + (i % 2 ? amp : -amp)) + ' ' + (y + hh / 2 + i * hh);
      return d + 'L' + x + ' ' + (y2 - lead) + 'V' + y2;
    };

    // Fuente AC
    el('circle', { cx: 38, cy: 146, r: 22, class: 'w' }, grp.src);
    W_(grp.src, 'M27 146c3.6-9 7.4-9 11 0s7.4 9 11 0');
    W_(grp.src, 'M38 124V90H104');
    W_(grp.src, 'M38 168V202H104');
    txt(grp.src, 38, 238, '120 V', 'lbl-s', 'middle');

    // Transformador
    W_(grp.trafo, coil(104, 90, 4, 14, 1));
    W_(grp.trafo, coil(154, 90, 4, 14, 0));
    el('path', { d: 'M126 94V198M132 94V198', class: 'w', 'stroke-width': 1.6 }, grp.trafo);
    const flux = el('path', { d: 'M126 94V198M132 94V198', fill: 'none', stroke: COL.ac, 'stroke-width': 3, opacity: 0 }, grp.trafo);
    const acTop = W_(grp.trafo, 'M154 90H252', 'w acwire');
    const acBot = W_(grp.trafo, 'M154 202H170a6 6 0 0 1 12 0H252', 'w acwire');
    txt(grp.trafo, 129, 78, 'T', 'lbl', 'middle');
    txt(grp.trafo, 129, 238, '12 V', 'lbl-s', 'middle');

    // Puente rectificador
    const C0 = { x: 252, y: 146 };
    const NT = { x: 252, y: 90 }, NB = { x: 252, y: 202 }, NL = { x: 196, y: 146 }, NR = { x: 308, y: 146 };
    function diode(g, a, c, label) {
      const dg = el('g', { class: 'diode' }, g);
      const dx = c.x - a.x, dy = c.y - a.y, L = Math.hypot(dx, dy);
      const ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
      const mx = (a.x + c.x) / 2, my = (a.y + c.y) / 2, s = 7;
      const bx = mx - ux * s, by = my - uy * s, tx = mx + ux * s, ty = my + uy * s;
      el('circle', { cx: mx, cy: my, r: 11, class: 'glow', filter: 'url(#sblur)' }, dg);
      W_(dg, 'M' + a.x + ' ' + a.y + 'L' + bx + ' ' + by + 'M' + tx + ' ' + ty + 'L' + c.x + ' ' + c.y);
      el('path', { d: 'M' + (bx + nx * s) + ' ' + (by + ny * s) + 'L' + (bx - nx * s) + ' ' + (by - ny * s) + 'L' + tx + ' ' + ty + 'Z', class: 'tri' }, dg);
      W_(dg, 'M' + (tx + nx * s) + ' ' + (ty + ny * s) + 'L' + (tx - nx * s) + ' ' + (ty - ny * s), 'w bar');
      const ox = mx - C0.x, oy = my - C0.y, ol = Math.hypot(ox, oy);
      txt(dg, mx + ox / ol * 19, my + oy / ol * 19 + 4, label, 'lbl-s', 'middle');
      return dg;
    }
    const D1 = diode(grp.rect, NT, NR, 'D1');
    const D2 = diode(grp.rect, NB, NR, 'D2');
    const D3 = diode(grp.rect, NL, NT, 'D3');
    const D4 = diode(grp.rect, NL, NB, 'D4');
    [NT, NB, NL, NR].forEach((n) => jdot(grp.rect, n.x, n.y));
    W_(grp.rect, 'M308 146H330V56');
    W_(grp.rect, 'M196 146H176V236');

    // Filtro
    W_(grp.filt, 'M330 56H420');
    W_(grp.filt, 'M176 236H372');
    W_(grp.filt, 'M372 56V139');
    W_(grp.filt, 'M355 139H389');
    W_(grp.filt, 'M355 152Q372 145 389 152');
    W_(grp.filt, 'M372 148.5V236');
    jdot(grp.filt, 372, 56); jdot(grp.filt, 372, 236);
    txt(grp.filt, 352, 133, '+', 'lbl-s', 'middle');
    el('rect', { x: 398, y: 112, width: 9, height: 62, rx: 2.5, class: 'w', 'stroke-width': 1.4 }, grp.filt);
    const gauge = el('rect', { x: 400.5, y: 114, width: 4, height: 58, rx: 1.2, fill: COL.filt }, grp.filt);
    txt(grp.filt, 402.5, 104, 'C', 'lbl', 'middle');
    const capState = txt(grp.filt, 372, 256, '', 'lbl-s', 'middle');
    const flowIn = el('path', { d: 'M330 56H420', class: 'flow', stroke: COL.filt, opacity: 0 }, grp.filt);

    // Regulador LM317
    const heat = el('rect', { x: 412, y: 26, width: 106, height: 60, rx: 12, fill: COL.heat, opacity: 0, filter: 'url(#sblur)' }, grp.reg);
    el('rect', { x: 420, y: 34, width: 90, height: 44, rx: 6, class: 'w', style: 'fill:#0d131d' }, grp.reg);
    txt(grp.reg, 465, 62, 'LM317', 'lbl-b', 'middle');
    txt(grp.reg, 426, 48, 'IN', 'lbl-s pin');
    txt(grp.reg, 504, 48, 'OUT', 'lbl-s pin', 'end');
    txt(grp.reg, 465, 75, 'ADJ', 'lbl-s pin', 'middle');
    W_(grp.reg, 'M465 78V150H560');
    W_(grp.reg, 'M510 56H560');
    W_(grp.reg, zig(560, 56, 150));
    W_(grp.reg, zig(560, 150, 236));
    W_(grp.reg, 'M372 236H560');
    (function arrow() {
      const ax = 543, ay = 224, bx = 577, by = 164;
      const L = Math.hypot(bx - ax, by - ay), ux = (bx - ax) / L, uy = (by - ay) / L;
      const rot = (a) => [ux * Math.cos(a) - uy * Math.sin(a), ux * Math.sin(a) + uy * Math.cos(a)];
      const r1 = rot(0.45), r2 = rot(-0.45);
      W_(grp.reg, 'M' + ax + ' ' + ay + 'L' + bx + ' ' + by + 'M' + bx + ' ' + by + 'l' + (-r1[0] * 9).toFixed(2) + ' ' + (-r1[1] * 9).toFixed(2) + 'M' + bx + ' ' + by + 'l' + (-r2[0] * 9).toFixed(2) + ' ' + (-r2[1] * 9).toFixed(2));
    })();
    jdot(grp.reg, 560, 56); jdot(grp.reg, 560, 150); jdot(grp.reg, 560, 236);
    txt(grp.reg, 578, 108, 'R1', 'lbl');
    txt(grp.reg, 584, 204, 'R2', 'lbl');
    const vref = el('g', { opacity: 0 }, grp.reg);
    el('path', { d: 'M546 62h-5V144h5', fill: 'none', stroke: COL.reg, 'stroke-width': 1.4 }, vref);
    txt(vref, 535, 108, '1.25 V', 'lbl-s', 'end', { style: 'fill:' + COL.reg });

    // Carga
    const rlGlow = el('rect', { x: 674, y: 92, width: 32, height: 104, rx: 10, fill: COL.load, opacity: 0, filter: 'url(#sblur)' }, grp.load);
    W_(grp.load, 'M560 56H690');
    W_(grp.load, zig(690, 56, 236, 40));
    W_(grp.load, 'M690 236H560');
    txt(grp.load, 708, 142, 'RL', 'lbl');
    txt(grp.load, 708, 160, '100 Ω', 'lbl-s');
    const flowOut = el('path', { d: 'M510 56H690M690 236H372', class: 'flow', stroke: COL.reg, opacity: 0 }, grp.load);

    // Punta del osciloscopio
    const probe = el('g', {}, sch);
    el('circle', { r: 7, class: 'probe-pulse' }, probe);
    const probeRing = el('circle', { r: 7, class: 'probe-ring' }, probe);
    el('circle', { r: 2.6, fill: COL.text }, probe);
    const PROBE = [[70, 90], [206, 90], [330, 104], [350, 56], [535, 56], [690, 74]];

    // ---------------- Osciloscopio ----------------
    const sdefs2 = el('defs', {}, scope);
    const clip = el('clipPath', { id: 'plotclip' }, sdefs2);
    const clipR = el('rect', {}, clip);
    const iclip = el('clipPath', { id: 'insetclip' }, sdefs2);
    const iclipR = el('rect', {}, iclip);

    const gGrid = el('g', {}, scope);
    const gTime = el('g', {}, scope);
    const TICKS = [[-170, 0, 170], [-17, 0, 17], [0, 5, 10, 15]];
    const tickEls = TICKS.map((set) => set.map((v) => {
      const line = el('line', { class: v === 0 ? 'tick-z' : 'tick-l' }, gGrid);
      const lab = txt(gGrid, 0, 0, v === 0 ? '0 V' : minus(v) + ' V', '', 'end');
      return { v, line, lab };
    }));

    const gPlot = el('g', { 'clip-path': 'url(#plotclip)' }, scope);
    const pBand = el('path', { fill: COL.heat, opacity: 0 }, gPlot);
    const pGhostSine = el('path', { class: 'trace', stroke: COL.ac, 'stroke-width': 1.4, 'stroke-dasharray': '3 5', opacity: 0 }, gPlot);
    const pGhostRect = el('path', { class: 'trace', stroke: COL.rect, 'stroke-width': 1.4, 'stroke-dasharray': '3 5', opacity: 0 }, gPlot);
    const pMain = el('path', { class: 'trace' }, gPlot);
    const pOut = el('path', { class: 'trace', stroke: COL.reg, 'stroke-width': 2.8, pathLength: 1, 'stroke-dasharray': '1 1', 'stroke-dashoffset': 1, opacity: 0 }, gPlot);
    const pTrail = el('path', { class: 'trace', 'stroke-width': 5, opacity: 0.28 }, gPlot);
    const halo = el('circle', { r: 11, opacity: 0.22 }, gPlot);
    const dot = el('circle', { r: 4.2, fill: '#fff' }, gPlot);
    const halo2 = el('circle', { r: 11, fill: COL.reg, opacity: 0 }, gPlot);
    const dot2 = el('circle', { r: 4.2, fill: '#fff', opacity: 0 }, gPlot);

    const gAnn = el('g', {}, scope);
    // escala ×10
    const zoom = el('g', { opacity: 0 }, gAnn);
    const zoomR = el('rect', { rx: 6, height: 22, width: 86, fill: COL.bg, stroke: COL.ac, 'stroke-opacity': 0.5 }, zoom);
    const zoomT = txt(zoom, 0, 0, 'escala ×10', 'ann', 'middle', { style: 'fill:' + COL.ac + ';stroke:none' });
    // caída de los diodos
    const drop = el('g', { opacity: 0 }, gAnn);
    const dropP = el('path', { class: 'brk', stroke: COL.rect }, drop);
    const dropT = txt(drop, 0, 0, '−2 · 0.7 V', 'ann', 'start');
    // pulsos a 120 Hz
    const pulseT = txt(gAnn, 0, 0, 'un pulso cada 8.3 ms → 120 Hz', 'ann', 'start', { opacity: 0 });
    // vista ampliada del rizo
    const inset = el('g', { opacity: 0 }, gAnn);
    const insetBg = el('rect', { class: 'inset-bg', rx: 8 }, inset);
    const insetTitle = txt(inset, 0, 0, 'vista ampliada', 'ann', 'start', { style: 'fill:' + COL.muted + ';stroke:none;font-size:11px' });
    const gIn = el('g', { 'clip-path': 'url(#insetclip)' }, inset);
    const inVp = el('line', { stroke: COL.dim, 'stroke-dasharray': '2 4' }, gIn);
    const inRect = el('path', { class: 'trace', stroke: COL.rect, 'stroke-width': 1.3, 'stroke-dasharray': '3 4', opacity: 0.55 }, gIn);
    const inPath = el('path', { class: 'trace', stroke: COL.filt, 'stroke-width': 2.2 }, gIn);
    const inBrk = el('path', { class: 'brk', stroke: COL.filt }, inset);
    const inLab1 = txt(inset, 0, 0, 'rizo', 'ann', 'start', { style: 'stroke:none;fill:' + COL.text2 });
    const inLab2 = txt(inset, 0, 0, '0.33 Vpp', 'ann-b', 'start', { style: 'stroke:none;fill:' + COL.filt });
    // regulador
    const regG = el('g', { opacity: 0 }, gAnn);
    const inLabel = txt(regG, 0, 0, '', 'ann', 'start', { style: 'fill:' + COL.filt });
    const outLabel = txt(regG, 0, 0, 'salida 10 V', 'ann-b', 'start', { style: 'fill:' + COL.reg });
    const heatLabel = txt(regG, 0, 0, 'Vin − Vout → calor', 'ann', 'start', { style: 'fill:#ff9b85' });
    const mBrk = el('path', { class: 'brk', stroke: COL.text2 }, regG);
    const mLabel = txt(regG, 0, 0, '', 'ann', 'end');
    // carga
    const loadG = el('g', { opacity: 0 }, gAnn);
    const loadOut = txt(loadG, 0, 0, '10 V constantes', 'ann-b', 'start', { style: 'fill:' + COL.reg });
    const loadIn = txt(loadG, 0, 0, 'la entrada varía, la salida no', 'ann', 'start', { style: 'fill:' + COL.filt });

    // ---- layout ----
    const L = { w: 600, h: 300, pl: 50, pr: 12, pt: 14, pb: 22, pw: 0, ph: 0 };
    const AX = [[-230, 230], [-21, 21], [-1.5, 18.5]];
    let axis = AX[0];
    const X = (t) => L.pl + (t / WIN) * L.pw;
    const Y = (v) => L.pt + (axis[1] - v) / (axis[1] - axis[0]) * L.ph;
    const YC = (v) => L.pt + (AX[2][1] - v) / (AX[2][1] - AX[2][0]) * L.ph;
    const IN = { x: 0, y: 0, w: 0, h: 0, cw: 0, t0: TPK - 0.0016, tw: 2.25 / 120, y0: 0, y1: 0 };

    function layout() {
      const w = Math.max(240, Math.round(scopeBody.clientWidth));
      const h = Math.max(140, Math.round(scopeBody.clientHeight));
      L.w = w; L.h = h;
      L.pl = w < 420 ? 44 : 52; L.pr = 12; L.pt = 14; L.pb = 22;
      L.pw = w - L.pl - L.pr; L.ph = h - L.pt - L.pb;
      scope.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
      setA(clipR, 'x', L.pl); setA(clipR, 'y', L.pt - 6); setA(clipR, 'width', L.pw); setA(clipR, 'height', L.ph + 12);

      gTime.textContent = '';
      for (let i = 0; i <= 6; i++) {
        const x = L.pl + (i / 6) * L.pw;
        el('line', { x1: x, x2: x, y1: L.pt, y2: L.pt + L.ph, class: i % 2 === 0 ? 'tick-l' : 'vgrid' }, gTime);
      }
      const tl = ['0', '16.7 ms', '33.3 ms', '50 ms'];
      tl.forEach((s, i) => txt(gTime, L.pl + (i / 3) * L.pw, h - 6, s, '', i === 0 ? 'start' : i === 3 ? 'end' : 'middle'));

      // vista ampliada
      IN.x = L.pl + L.pw * (w < 420 ? 0.36 : 0.47);
      IN.w = L.pl + L.pw - 8 - IN.x;
      IN.y = YC(12.6);
      IN.h = YC(1.2) - IN.y;
      IN.cw = IN.w - (w < 420 ? 66 : 78);
      setA(insetBg, 'x', IN.x); setA(insetBg, 'y', IN.y); setA(insetBg, 'width', IN.w); setA(insetBg, 'height', IN.h);
      setA(iclipR, 'x', IN.x + 1); setA(iclipR, 'y', IN.y + 18); setA(iclipR, 'width', IN.cw); setA(iclipR, 'height', IN.h - 22);
      setA(insetTitle, 'x', IN.x + 10); setA(insetTitle, 'y', IN.y + 15);
      lastKey = '';
    }

    // ---- estado ----
    let S = 0, target = 0, active = -1, lastKey = '', running = true, sweep = 0;
    let filt = makeFilter(lab.I, lab.C, 1);
    let filtKey = '';
    let readFilt = null;

    function filterFor(Sv, ampMod) {
      const k = clamp(Sv - 3);
      const I = lerp(lab.I, DESIGN.I, smooth(k));
      const C = lerp(lab.C, DESIGN.C, smooth(k));
      const key = I.toFixed(5) + '|' + C.toExponential(5) + '|' + ampMod.toFixed(4);
      if (key !== filtKey) { filt = makeFilter(I, C, ampMod); filtKey = key; }
      return filt;
    }

    function vMain(t, Sv, f) {
      if (Sv <= 1) return lerp(VP_RED, VP_SEC, ease(Sv * 2)) * Math.sin(OMEGA * t);
      if (Sv <= 2) { const a = VP_SEC * Math.sin(OMEGA * t); return lerp(a, f.rect(t), ease(Sv - 1)); }
      if (Sv <= 3) return lerp(f.rect(t), f.v(t), ease(Sv - 2));
      return f.v(t);
    }
    function axisFor(Sv) {
      let k;
      if (Sv < 1) { k = ease((Sv - 0.5) * 2); return { r: [lerp(AX[0][0], AX[1][0], k), lerp(AX[0][1], AX[1][1], k)], w: [1 - k, k, 0] }; }
      if (Sv < 2) return { r: AX[1], w: [0, 1, 0] };
      if (Sv < 3) { k = ease(Sv - 2); return { r: [lerp(AX[1][0], AX[2][0], k), lerp(AX[1][1], AX[2][1], k)], w: [0, 1 - k, k] }; }
      return { r: AX[2], w: [0, 0, 1] };
    }
    const STAGE_COL = [COL.ac, COL.ac, COL.rect, COL.filt, COL.filt, COL.filt];
    function colorAt(Sv) {
      const i = Math.min(4, Math.floor(Sv));
      return mix(STAGE_COL[i], STAGE_COL[i + 1], ease(Sv - i));
    }
    function pathOf(fn, t0, t1, n, xf, yf) {
      let d = '';
      for (let i = 0; i <= n; i++) {
        const t = t0 + (t1 - t0) * i / n;
        d += (i ? 'L' : 'M') + xf(t).toFixed(1) + ' ' + yf(fn(t)).toFixed(1);
      }
      return d;
    }

    // ---- puntos de medida y lecturas ----
    const POINT = ['Tomacorriente', 'Secundario del transformador', 'Salida del rectificador', 'Salida del filtro', 'Salida del regulador', 'Sobre la carga'];
    function readFor(i) {
      if (i === 0) return '120 V rms · 60 Hz · Vp ≈ 170 V';
      if (i === 1) return '12 V rms · 60 Hz · Vp ≈ 17 V';
      if (i === 2) return '120 Hz · Vp ≈ 15.6 V';
      if (i === 3) { const f = makeFilter(lab.I, lab.C, 1); return '≈ ' + fmt(f.Vavg) + ' V · rizo ≈ ' + fmt(f.Vr, 2) + ' Vpp'; }
      if (i === 4) return '10 V constantes';
      return '10 V · 100 mA';
    }
    function setActive(i) {
      if (i === active) return;
      active = i;
      steps.forEach((s, k) => s.classList.toggle('is-active', k === i));
      const b = [0, 0, 1, 2, 3, 4][i];
      chips.forEach((c, k) => { c.classList.toggle('is-active', k === b); c.classList.toggle('is-done', k < b); });
      pointEl.textContent = POINT[i];
      pointEl.style.setProperty('--c', GCOL[i]);
      readEl.textContent = readFor(i);
    }

    // ---- dibujo ----
    function draw(dt, time) {
      const ampMod = 1 + 0.065 * Math.sin(time * 2 * Math.PI * 0.32) * smooth((S - 4.3) / 0.7);
      const f = filterFor(S, ampMod);
      const ax = axisFor(S);
      axis = ax.r;
      const key = S.toFixed(4) + '|' + filtKey + '|' + L.w + 'x' + L.h;
      const n = Math.min(520, Math.max(160, Math.round(L.pw / 1.4)));

      if (key !== lastKey) {
        lastKey = key;
        // ticks
        tickEls.forEach((set, si) => set.forEach((tk) => {
          const y = Y(tk.v);
          const inside = y >= L.pt - 1 && y <= L.pt + L.ph + 1;
          const o = inside ? ax.w[si] : 0;
          setA(tk.line, 'x1', L.pl); setA(tk.line, 'x2', L.pl + L.pw);
          setA(tk.line, 'y1', y.toFixed(1)); setA(tk.line, 'y2', y.toFixed(1));
          setA(tk.line, 'opacity', o.toFixed(3));
          setA(tk.lab, 'x', L.pl - 8); setA(tk.lab, 'y', (y + 4).toFixed(1));
          setA(tk.lab, 'opacity', o.toFixed(3));
        }));

        const col = colorAt(S);
        setA(pMain, 'd', pathOf((t) => vMain(t, S, f), 0, WIN, n, X, Y));
        setA(pMain, 'stroke', col);
        setA(pMain, 'opacity', (S < 3 ? 1 : lerp(1, 0.62, smooth(S - 3))).toFixed(3));
        setA(pTrail, 'stroke', col);
        setA(halo, 'fill', col);

        // fantasmas
        const gs = 0.5 * smooth((S - 1.15) / 0.5) * (1 - smooth((S - 2.35) / 0.4));
        setA(pGhostSine, 'opacity', gs.toFixed(3));
        if (gs > 0.001) setA(pGhostSine, 'd', pathOf((t) => VP_SEC * Math.sin(OMEGA * t), 0, WIN, n, X, Y));
        const gr = 0.5 * smooth((S - 2.15) / 0.5) * (1 - smooth((S - 3.25) / 0.5));
        setA(pGhostRect, 'opacity', gr.toFixed(3));
        if (gr > 0.001) setA(pGhostRect, 'd', pathOf((t) => f.rect(t), 0, WIN, n, X, Y));

        // salida regulada
        const op = smooth((S - 3.25) / 0.7);
        setA(pOut, 'opacity', op > 0.001 ? 1 : 0);
        setA(pOut, 'd', 'M' + L.pl + ' ' + Y(VOUT).toFixed(1) + 'H' + (L.pl + L.pw));
        setA(pOut, 'stroke-dashoffset', (1 - op).toFixed(4));

        // banda de calor
        const bo = smooth((S - 3.45) / 0.55) * (1 - 0.75 * smooth((S - 4.35) / 0.6));
        setA(pBand, 'opacity', (0.15 * bo).toFixed(3));
        if (bo > 0.001) {
          const top = pathOf((t) => f.v(t), 0, WIN, n, X, Y);
          setA(pBand, 'd', top + 'L' + (L.pl + L.pw) + ' ' + Y(VOUT).toFixed(1) + 'L' + L.pl + ' ' + Y(VOUT).toFixed(1) + 'Z');
        }

        // escala ×10
        const zo = smooth((S - 0.55) / 0.3) * (1 - smooth((S - 1.45) / 0.3));
        setA(zoom, 'opacity', zo.toFixed(3));
        const zx = L.pl + L.pw - 96, zy = L.pt + 8;
        setA(zoomR, 'x', zx); setA(zoomR, 'y', zy);
        setA(zoomT, 'x', zx + 43); setA(zoomT, 'y', zy + 15);

        // caída en los diodos y pulsos
        const dro = smooth((S - 1.6) / 0.3) * (1 - smooth((S - 2.35) / 0.3));
        setA(drop, 'opacity', L.w < 460 ? 0 : dro.toFixed(3));
        setA(pulseT, 'opacity', dro.toFixed(3));
        if (dro > 0.001) {
          const tx = X(TPK + 1 / F) + 7;
          const y1 = Y(VP_SEC), y2 = Y(VP_SEC - 2 * VD);
          setA(dropP, 'd', 'M' + (tx - 4) + ' ' + y1.toFixed(1) + 'h6V' + y2.toFixed(1) + 'h-6');
          setA(dropT, 'x', tx + 8); setA(dropT, 'y', ((y1 + y2) / 2 + 4).toFixed(1));
          setA(pulseT, 'x', L.pl + 8); setA(pulseT, 'y', (Y(-17) + 4).toFixed(1));
        }

        // vista ampliada del rizo
        const io = smooth((S - 2.6) / 0.3) * (1 - smooth((S - 3.4) / 0.3));
        setA(inset, 'opacity', io.toFixed(3));
        if (io > 0.001) {
          IN.y0 = f.Vp + 0.22; IN.y1 = f.Vp - 1.05;
          const ix = (t) => IN.x + 1 + (t - IN.t0) / IN.tw * IN.cw;
          const iy = (v) => IN.y + 20 + (IN.y0 - v) / (IN.y0 - IN.y1) * (IN.h - 26);
          setA(inPath, 'd', pathOf((t) => f.v(t), IN.t0, IN.t0 + IN.tw, 160, ix, iy));
          setA(inRect, 'd', pathOf((t) => f.rect(t), IN.t0, IN.t0 + IN.tw, 160, ix, iy));
          const yp = iy(f.Vp), ym = iy(f.Vmin);
          setA(inVp, 'x1', IN.x); setA(inVp, 'x2', IN.x + IN.cw); setA(inVp, 'y1', yp.toFixed(1)); setA(inVp, 'y2', yp.toFixed(1));
          const bx = IN.x + IN.cw + 8;
          setA(inBrk, 'd', 'M' + (bx - 4) + ' ' + yp.toFixed(1) + 'h5V' + ym.toFixed(1) + 'h-5');
          setA(inLab1, 'x', bx + 8); setA(inLab1, 'y', ((yp + ym) / 2 - 3).toFixed(1));
          setA(inLab2, 'x', bx + 8); setA(inLab2, 'y', ((yp + ym) / 2 + 12).toFixed(1));
          inLab2.textContent = fmt(f.Vr, 2) + ' Vpp';
        }

        // regulador
        const ro = smooth((S - 3.55) / 0.4) * (1 - smooth((S - 4.45) / 0.35));
        setA(regG, 'opacity', ro.toFixed(3));
        if (ro > 0.001) {
          inLabel.textContent = 'entrada ≈ ' + fmt(f.Vavg) + ' V, con rizo';
          setA(inLabel, 'x', L.pl + 8); setA(inLabel, 'y', (Y(f.Vp) - 9).toFixed(1));
          setA(outLabel, 'x', L.pl + 8); setA(outLabel, 'y', (Y(VOUT) + 19).toFixed(1));
          setA(heatLabel, 'x', L.pl + 8); setA(heatLabel, 'y', (Y(VOUT) - 10).toFixed(1));
          let tm = TPK + f.tc; while (X(tm + TR) < L.pl + L.pw * 0.86) tm += TR;
          const mx = X(tm), y1 = Y(VOUT), y2 = Y(f.Vmin);
          setA(mBrk, 'd', 'M' + (mx - 4) + ' ' + y2.toFixed(1) + 'h8M' + mx + ' ' + y2.toFixed(1) + 'V' + y1.toFixed(1) + 'M' + (mx - 4) + ' ' + y1.toFixed(1) + 'h8');
          mLabel.textContent = 'margen ≈ ' + fmt(f.Vmin - VOUT) + ' V';
          setA(mLabel, 'x', mx - 8); setA(mLabel, 'y', (y2 + 17).toFixed(1));
        }
        const lo = smooth((S - 4.5) / 0.35);
        setA(loadG, 'opacity', lo.toFixed(3));
        if (lo > 0.001) {
          setA(loadOut, 'x', L.pl + 8); setA(loadOut, 'y', (Y(VOUT) + 19).toFixed(1));
          setA(loadIn, 'x', L.pl + 8); setA(loadIn, 'y', (Y(VOUT) - 10).toFixed(1));
        }
      }

      // barrido (punto que recorre la traza)
      const ts = REDUCE ? TPK : sweep;
      const vy = vMain(ts, S, f);
      setA(dot, 'cx', X(ts).toFixed(1)); setA(dot, 'cy', Y(vy).toFixed(1));
      setA(halo, 'cx', X(ts).toFixed(1)); setA(halo, 'cy', Y(vy).toFixed(1));
      const showDot = REDUCE ? 0 : 1;
      setA(dot, 'opacity', showDot); setA(halo, 'opacity', showDot ? 0.22 : 0);
      if (!REDUCE) {
        const t0 = Math.max(0, ts - WIN * 0.14);
        setA(pTrail, 'd', pathOf((t) => vMain(t, S, f), t0, ts, 28, X, Y));
      } else setA(pTrail, 'd', '');
      const o2 = REDUCE ? 0 : smooth((S - 3.7) / 0.3);
      setA(dot2, 'opacity', o2.toFixed(3)); setA(halo2, 'opacity', (o2 * 0.22).toFixed(3));
      setA(dot2, 'cx', X(ts).toFixed(1)); setA(dot2, 'cy', Y(VOUT).toFixed(1));
      setA(halo2, 'cx', X(ts).toFixed(1)); setA(halo2, 'cy', Y(VOUT).toFixed(1));

      drawSchematic(ts, f);
    }

    function drawSchematic(ts, f) {
      ORDER.forEach((k, i) => {
        const g = grp[k];
        const vis = smooth(S - i + 1);
        setA(g, 'opacity', (0.13 + 0.87 * vis).toFixed(3));
        const a = clamp(1 - Math.abs(S - i) * 1.5);
        g.style.color = a > 0.001 ? mix(COL.base, GCOL[i], a) : '';
      });
      const sv = Math.sin(OMEGA * ts);
      const pos = sv > 0;
      let conducting;
      if (S < 2.5) conducting = VP_SEC * Math.abs(sv) > 2 * VD;
      else conducting = f.charging(ts);
      const live = S > 1.6;
      D1.classList.toggle('on', live && conducting && pos);
      D4.classList.toggle('on', live && conducting && pos);
      D2.classList.toggle('on', live && conducting && !pos);
      D3.classList.toggle('on', live && conducting && !pos);
      acTop.classList.toggle('on', live && conducting);
      acBot.classList.toggle('on', live && conducting);
      setA(flux, 'opacity', (Math.abs(sv) * 0.85 * smooth(S)).toFixed(3));

      // capacitor
      const v = f.v(ts);
      const level = S < 2.6 ? 0 : clamp((v - (f.Vp - 1.0)) / 1.0);
      const hh = 6 + 52 * level;
      setA(gauge, 'y', (172 - hh).toFixed(1)); setA(gauge, 'height', hh.toFixed(1));
      const cs = smooth((S - 2.6) / 0.3) * (1 - smooth((S - 3.45) / 0.3));
      setA(capState, 'opacity', cs.toFixed(3));
      const label = f.charging(ts) ? 'se carga' : 'se descarga';
      if (capState.textContent !== label) capState.textContent = label;
      capState.style.fill = f.charging(ts) ? COL.filt : COL.muted;
      setA(flowIn, 'opacity', smooth((S - 2.7) / 0.3).toFixed(3));

      setA(heat, 'opacity', (0.5 * smooth((S - 3.55) / 0.4) * (1 - 0.6 * smooth((S - 4.5) / 0.4))).toFixed(3));
      setA(vref, 'opacity', (smooth((S - 3.55) / 0.4) * (1 - smooth((S - 4.5) / 0.4))).toFixed(3));
      setA(rlGlow, 'opacity', (0.35 * smooth((S - 4.45) / 0.45)).toFixed(3));
      setA(flowOut, 'opacity', smooth((S - 4.4) / 0.4).toFixed(3));

      // punta
      const i = Math.min(4, Math.floor(S)), fr = ease(S - i);
      const px = lerp(PROBE[i][0], PROBE[i + 1][0], fr), py = lerp(PROBE[i][1], PROBE[i + 1][1], fr);
      setA(probe, 'transform', 'translate(' + px.toFixed(1) + ' ' + py.toFixed(1) + ')');
      probeRing.style.stroke = colorAt(S);
    }

    // ---- scroll → etapa ----
    function computeTarget() {
      const vh = window.innerHeight;
      let line;
      if (mqMobile.matches) {
        const b = stage.getBoundingClientRect().bottom;
        line = b + (vh - b) * 0.42;
      } else line = vh * 0.5;
      const c = cards.map((cd) => { const r = cd.getBoundingClientRect(); return r.top + r.height / 2; });
      if (line <= c[0]) return 0;
      if (line >= c[c.length - 1]) return c.length - 1;
      for (let i = 0; i < c.length - 1; i++) {
        if (line < c[i + 1]) {
          const fpos = (line - c[i]) / (c[i + 1] - c[i]);
          return i + smooth((fpos - 0.3) / 0.4);
        }
      }
      return c.length - 1;
    }

    // ---- controles del filtro ----
    const inI = $('#in-i'), inC = $('#in-c'), outI = $('#out-i'), outC = $('#out-c'), outR = $('#out-r');
    function syncLab() {
      lab.I = (+inI.value) / 1000;
      lab.C = (+inC.value) * 1e-6;
      outI.textContent = inI.value + ' mA';
      outC.textContent = inC.value + ' µF';
      outR.textContent = fmt(lab.I / (2 * F * lab.C), 2) + ' Vpp';
      [inI, inC].forEach((r) => r.style.setProperty('--p', ((r.value - r.min) / (r.max - r.min) * 100) + '%'));
      lastKey = '';
      if (active === 3) readEl.textContent = readFor(3);
    }
    inI.addEventListener('input', syncLab);
    inC.addEventListener('input', syncLab);
    $('#lab-reset').addEventListener('click', () => {
      if (HAS_GSAP && !REDUCE) {
        const o = { i: +inI.value, c: +inC.value };
        G.to(o, { i: 100, c: 2525, duration: 0.7, ease: 'power2.out', onUpdate: () => { inI.value = Math.round(o.i); inC.value = Math.round(o.c / 25) * 25; syncLab(); } });
      } else { inI.value = 100; inC.value = 2525; syncLab(); }
    });
    syncLab();

    // ---- ciclo ----
    let inView = true;
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((e) => { inView = e[0].isIntersecting; }, { rootMargin: '200px 0px' }).observe($('#scrolly'));
    }
    layout();
    setActive(0);
    let ro;
    window.addEventListener('resize', () => { cancelAnimationFrame(ro); ro = requestAnimationFrame(() => { layout(); }); });

    tickers.add((dt, time) => {
      if (!inView) return;
      target = computeTarget();
      if (REDUCE) S = Math.round(target);
      else S += (target - S) * (1 - Math.exp(-dt * 7));
      if (Math.abs(target - S) < 0.0004) S = target;
      setActive(Math.round(target));
      if (!REDUCE) sweep = (sweep + dt * (WIN / 3.0)) % WIN;
      draw(dt, time);
    });
  }

  // =====================================================================
  //  IMPORTANCIA · sin regular frente a regulada
  // =====================================================================
  function compare() {
    const body = $('#compare-body'), svg = $('#compare');
    if (!body || !svg) return;
    const W1 = [0.27, 0.47], W2 = [0.62, 0.84];
    const win = (x, w) => smooth((x - w[0]) / 0.04) - smooth((x - w[1]) / 0.04);
    let cycles = 60;
    function unreg(x) {
      const w1 = win(x, W1), w2 = win(x, W2);
      const Vp = 15.57 - 1.70 * w1 - 0.45 * w2;
      const Vr = 0.165 + 0.165 * w2;
      const p = (x * cycles) % 1;
      const s = p < 0.82 ? p / 0.82 : 1 - (p - 0.82) / 0.18;
      return Vp - Vr * s;
    }
    const R = [8.6, 16.6];
    let L = {}, refs = {}, cp = REDUCE || !HAS_GSAP ? 1 : 0, target = cp;

    function build() {
      const w = Math.max(260, Math.round(body.clientWidth)), h = Math.max(200, Math.round(body.clientHeight));
      const narrow = w < 560;
      L = { w, h, pl: narrow ? 42 : 50, pr: 14, pt: narrow ? 50 : 40, pb: 16 };
      L.pw = w - L.pl - L.pr; L.ph = h - L.pt - L.pb;
      cycles = narrow ? 34 : 64;
      const X = (x) => L.pl + x * L.pw;
      const Y = (v) => L.pt + (R[1] - v) / (R[1] - R[0]) * L.ph;
      svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
      svg.textContent = '';
      const defs = el('defs', {}, svg);
      const cpth = el('clipPath', { id: 'cmpclip' }, defs);
      const cr = el('rect', { x: L.pl, y: 0, width: 0, height: h }, cpth);

      [10, 12, 14, 16].forEach((v) => {
        el('line', { x1: L.pl, x2: L.pl + L.pw, y1: Y(v), y2: Y(v), class: 'tick-l', stroke: '#172235' }, svg);
        txt(svg, L.pl - 8, Y(v) + 4, v + ' V', '', 'end');
      });

      const ev = [[W1, narrow ? ['La red baja', 'un 10 %'] : ['La red baja un 10 %']], [W2, narrow ? ['La carga pide', 'más corriente'] : ['La carga pide más corriente']]];
      const evG = ev.map(([wv, lines]) => {
        const g = el('g', { opacity: 0 }, svg);
        el('rect', { x: X(wv[0]), y: L.pt - 6, width: X(wv[1]) - X(wv[0]) + L.pw * 0.04, height: L.ph + 6, fill: '#ffffff', opacity: 0.035, rx: 6 }, g);
        el('line', { x1: X(wv[0]), x2: X(wv[0]), y1: L.pt - 6, y2: L.pt + L.ph, stroke: '#2d3d5a', 'stroke-dasharray': '3 4' }, g);
        lines.forEach((s, i) => txt(g, X(wv[0]) + 6, L.pt - (lines.length - i) * 15 + 1, s, 'ann', 'start'));
        g._x = wv[0];
        return g;
      });

      const plot = el('g', { 'clip-path': 'url(#cmpclip)' }, svg);
      let d = '';
      const n = cycles * 12;
      for (let i = 0; i <= n; i++) { const x = i / n; d += (i ? 'L' : 'M') + X(x).toFixed(1) + ' ' + Y(unreg(x)).toFixed(1); }
      el('path', { d, class: 'trace', fill: 'none', stroke: COL.rect, 'stroke-width': 1.8, 'stroke-linejoin': 'round' }, plot);
      el('path', { d: 'M' + L.pl + ' ' + Y(10) + 'H' + (L.pl + L.pw), fill: 'none', stroke: COL.reg, 'stroke-width': 2.8, 'stroke-linecap': 'round' }, plot);
      const lab1 = txt(plot, X(0.012), Y(15.57) - 16, 'rizo del filtro', 'ann', 'start');
      const lab2 = txt(plot, X(0.012), Y(10) - 10, 'regulada · 10 V constantes', 'ann-b', 'start', { style: 'fill:' + COL.reg });

      const hA = el('circle', { r: 4, fill: COL.rect }, svg);
      const hB = el('circle', { r: 4, fill: COL.reg }, svg);
      refs = { cr, evG, hA, hB, X, Y, lab1, lab2 };
      render(true);
    }
    function render(force) {
      if (!refs.cr) return;
      const wv = L.pw * cp;
      setA(refs.cr, 'width', (L.pl - 1 + wv).toFixed(1));
      refs.evG.forEach((g) => setA(g, 'opacity', smooth((cp - g._x) / 0.05).toFixed(3)));
      const x = clamp(cp, 0, 1);
      setA(refs.hA, 'cx', refs.X(x).toFixed(1)); setA(refs.hA, 'cy', refs.Y(unreg(x)).toFixed(1));
      setA(refs.hB, 'cx', refs.X(x).toFixed(1)); setA(refs.hB, 'cy', refs.Y(10).toFixed(1));
      const ho = cp > 0.002 && cp < 0.998 ? 1 : 0;
      setA(refs.hA, 'opacity', ho); setA(refs.hB, 'opacity', ho);
    }
    build();
    let rz;
    window.addEventListener('resize', () => { cancelAnimationFrame(rz); rz = requestAnimationFrame(build); });
    if (REDUCE || !HAS_GSAP) return;
    ST.create({ trigger: body, start: 'top 85%', end: 'bottom 40%', onUpdate: (s) => { target = s.progress; } });
    tickers.add((dt) => {
      if (Math.abs(target - cp) < 0.0005) { if (cp !== target) { cp = target; render(); } return; }
      cp += (target - cp) * (1 - Math.exp(-dt * 6));
      render();
    });
  }

  // =====================================================================
  //  FUENTE VARIABLE · perilla y pantalla
  // =====================================================================
  function bench() {
    const knob = $('#bench-knob'), vEl = $('#bench-v'), rEl = $('#bench-r'), cap = $('#bench-caption');
    const ticks = $('#bench-ticks');
    const btns = $$('#vchips button');
    if (!knob) return;
    for (let i = 0; i <= 10; i++) {
      const a = (-135 + 27 * i) * Math.PI / 180;
      el('line', { x1: Math.sin(a) * 39, y1: -Math.cos(a) * 39, x2: Math.sin(a) * (i % 5 === 0 ? 45 : 43), y2: -Math.cos(a) * (i % 5 === 0 ? 45 : 43) }, ticks);
    }
    const USE = { '3.3': 'microcontroladores', '5': 'lógica digital', '9': 'circuitos que usan batería de 9 V', '12': 'relés y motores pequeños', '15': 'amplificadores operacionales' };
    const st = { v: 5 };
    function paint() {
      const v = st.v;
      vEl.textContent = v.toFixed(2);
      rEl.textContent = 'R2/R1 = ' + (v / 1.25 - 1).toFixed(2);
      const ang = -135 + 270 * clamp((v - 1.25) / (15 - 1.25));
      knob.setAttribute('transform', 'rotate(' + ang.toFixed(2) + ')');
    }
    let idx = 1, user = false, timer = null;
    function select(i, fromUser) {
      idx = i;
      const v = +btns[i].dataset.v;
      btns.forEach((b, k) => b.setAttribute('aria-pressed', k === i ? 'true' : 'false'));
      cap.innerHTML = '<strong>' + btns[i].textContent + '</strong> · ' + USE[btns[i].dataset.v];
      if (HAS_GSAP && !REDUCE) G.to(st, { v, duration: 0.9, ease: 'power3.inOut', onUpdate: paint, overwrite: true });
      else { st.v = v; paint(); }
      if (fromUser) { user = true; clearInterval(timer); }
    }
    btns.forEach((b, i) => b.addEventListener('click', () => select(i, true)));
    select(1, false);
    st.v = 5; paint();
    if (REDUCE || !('IntersectionObserver' in window)) return;
    new IntersectionObserver((e) => {
      clearInterval(timer);
      if (e[0].isIntersecting && !user) timer = setInterval(() => select((idx + 1) % btns.length, false), 2600);
    }, { threshold: 0.4 }).observe(knob.closest('.variable'));
  }

  // =====================================================================
  //  Detalles generales: scroll suave, barra, apariciones
  // =====================================================================
  function chrome() {
    let lenis = null;
    if (HAS_GSAP && !REDUCE && window.Lenis) {
      lenis = new window.Lenis({ lerp: 0.12, smoothWheel: true });
      lenis.on('scroll', ST.update);
      G.ticker.add((time) => lenis.raf(time * 1000));
      G.ticker.lagSmoothing(0);
    }
    $$('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      const target = id.length > 1 ? document.querySelector(id) : null;
      if (!target) return;
      e.preventDefault();
      const off = -(parseInt(getComputedStyle(doc).getPropertyValue('--topbar'), 10) || 52) + 1;
      if (lenis) lenis.scrollTo(target, { offset: off, duration: 1.2 });
      else window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY + off, behavior: REDUCE ? 'auto' : 'smooth' });
      if (history.replaceState) history.replaceState(null, '', id);
    }));

    const bar = $('#progress'), top = $('#topbar');
    const navs = $$('.topnav a');
    const secs = ['teoria', 'importancia', 'aplicaciones'].map((id) => document.getElementById(id));
    tickers.add(() => {
      const y = window.scrollY, max = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.transform = 'scaleX(' + (max > 0 ? clamp(y / max) : 0).toFixed(4) + ')';
      top.classList.toggle('is-scrolled', y > 8);
      const mid = window.innerHeight * 0.4;
      let cur = -1;
      secs.forEach((s, i) => { const r = s.getBoundingClientRect(); if (r.top < mid && r.bottom > mid) cur = i; });
      navs.forEach((n, i) => n.classList.toggle('is-active', i === cur));
    });

    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((es) => es.forEach((e) => e.target.classList.toggle('in-view', e.isIntersecting)), { threshold: 0.3 });
      $$('.effect').forEach((e) => io.observe(e));
    }

    if (!HAS_GSAP || REDUCE) { $$('[data-reveal]').forEach((e) => { e.style.opacity = 1; e.style.transform = 'none'; }); return; }
    $$('[data-reveal]').forEach((e) => {
      G.to(e, { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: e, start: 'top 90%', once: true } });
    });
    $$('.tiles').forEach((t) => {
      const items = t.querySelectorAll('.tile');
      G.set(items, { opacity: 0, y: 14 });
      ST.create({ trigger: t, start: 'top 88%', once: true, onEnter: () => G.to(items, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out', stagger: 0.07 }) });
    });
  }

  function init() {
    hero();
    theory();
    compare();
    bench();
    chrome();
    if (HAS_GSAP) {
      window.addEventListener('load', () => ST.refresh());
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ST.refresh());
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
