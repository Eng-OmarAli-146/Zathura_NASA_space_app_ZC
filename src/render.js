/* ============================================================================
   render.js — محرك رسم 2D مشترك: سماء، أجرام، تيرين، شخصية، تأثيرات
   كل الدوال هنا بتشتغل على canvas واحد. مفيش مكتبات خارجية.
   ==========================================================================*/

/* ------------------------------------------------------ CANVAS HELPER */
function makeCanvas(parent) {
  const cv = document.createElement('canvas');
  cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block';
  parent.appendChild(cv);
  const ctx = cv.getContext('2d', { alpha: false });
  const api = { cv, ctx, w: 0, h: 0, dpr: 1 };
  api.resize = function () {
    api.dpr = Math.min(window.devicePixelRatio || 1, (typeof Game !== 'undefined' && Game.settings && Game.settings.lowGfx) ? 1 : 1.6);
    api.w = cv.clientWidth || parent.clientWidth;
    api.h = cv.clientHeight || parent.clientHeight;
    cv.width = Math.round(api.w * api.dpr);
    cv.height = Math.round(api.h * api.dpr);
    ctx.setTransform(api.dpr, 0, 0, api.dpr, 0, 0);
  };
  api.resize();
  const ro = new ResizeObserver(() => api.resize());
  ro.observe(parent);
  api.destroy = () => ro.disconnect();
  return api;
}

/* ---------------------------------------------------------- UTILITIES */
function rr(ctx, x, y, w, h, r) {
  r = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function skyGradient(ctx, w, h, top, bottom) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}
function starField(ctx, w, h, count, seed = 1, alpha = 1) {
  let s = seed;
  const rand = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  for (let i = 0; i < count; i++) {
    const x = rand() * w, y = rand() * h;
    const r = rand() * 1.5 + 0.2;
    const a = (0.25 + rand() * 0.75) * alpha;
    ctx.fillStyle = `rgba(255,255,255,${a})`;
    ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
    if (r > 1.2) {
      ctx.fillStyle = `rgba(160,210,255,${a * 0.35})`;
      ctx.beginPath(); ctx.arc(x, y, r * 3.2, 0, 7); ctx.fill();
    }
  }
}

/* ------------------------------------------------------------- PLANETS */
function drawPlanetSphere(ctx, x, y, r, palette, opts = {}) {
  const { lightFrom = { x: -0.55, y: -0.6 }, bands = 0, ring = false, terminator = 0.72 } = opts;

  // limb glow
  if (opts.glow !== false) {
    const g0 = ctx.createRadialGradient(x, y, r * 0.85, x, y, r * 1.5);
    g0.addColorStop(0, palette[2] + '55');
    g0.addColorStop(1, palette[2] + '00');
    ctx.fillStyle = g0;
    ctx.beginPath(); ctx.arc(x, y, r * 1.5, 0, 7); ctx.fill();
  }

  // body
  const g = ctx.createRadialGradient(
    x + lightFrom.x * r * 0.7, y + lightFrom.y * r * 0.7, r * 0.08,
    x, y, r * 1.02
  );
  g.addColorStop(0, palette[0]);
  g.addColorStop(0.5, palette[1]);
  g.addColorStop(terminator, palette[1]);
  g.addColorStop(1, palette[3] || '#0a0d14');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();

  // bands
  if (bands > 0) {
    ctx.save();
    ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.clip();
    for (let i = 0; i < bands; i++) {
      const yy = y - r + (i + 0.5) * (2 * r / bands);
      const hh = (2 * r / bands) * (0.42 + (i % 3) * 0.16);
      ctx.fillStyle = i % 2 ? 'rgba(255,255,255,.07)' : 'rgba(0,0,0,.12)';
      ctx.beginPath();
      ctx.ellipse(x, yy, r * 1.1, hh, 0, 0, 7);
      ctx.fill();
    }
    ctx.restore();
  }

  // rings
  if (ring) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-0.42);
    for (let i = 0; i < 4; i++) {
      ctx.strokeStyle = `rgba(220,205,170,${0.5 - i * 0.1})`;
      ctx.lineWidth = 3 + i * 2.2;
      ctx.beginPath();
      ctx.ellipse(0, 0, r * (1.5 + i * 0.16), r * (0.32 + i * 0.035), 0, 0, 7);
      ctx.stroke();
    }
    ctx.restore();
  }
}

/* ------------------------------------------------------------ SURFACE */
/* خريطة نويز ثابتة للتصاريس — نفس النتيجة كل مرة */
function buildNoiseTexture(w, h, seed = 7) {
  let s = seed;
  const rand = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  return { rand, seed };
}

/* --------------------------------------------------------- ASTRONAUT */
/* رسم رائد فضاء — وضع: idle / walk / climb / float */
function drawAstronaut(ctx, x, y, opt = {}) {
  const {
    scale = 1, facing = 1, walkPhase = 0, mode = 'idle',
    suit = '#eef3f9', shade = '#a9b6c6', accent = '#4dd9ff', visor = '#5aa6cf', tilt = 0
  } = opt;

  const bob = mode === 'walk' ? Math.sin(walkPhase) * 2.2 : Math.sin(walkPhase * 0.35) * 0.9;
  const legSwing = mode === 'walk' ? Math.sin(walkPhase) * 5.2 : 0;
  const armSwing = mode === 'walk' ? Math.sin(walkPhase + Math.PI) * 4.2 : 0;

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(facing * scale, scale);
  if (tilt) ctx.rotate(tilt);

  // backpack
  ctx.fillStyle = '#8b95a4';
  rr(ctx, -19, -20 + bob, 15, 24, 6); ctx.fill();
  ctx.fillStyle = '#68727f';
  rr(ctx, -17, -16 + bob, 11, 8, 3); ctx.fill();

  // legs
  ctx.fillStyle = suit;
  rr(ctx, -9, 2 + Math.max(0, legSwing), 7.5, 17, 3); ctx.fill();
  rr(ctx, 1.5, 2 + Math.max(0, -legSwing), 7.5, 17, 3); ctx.fill();
  // boots
  ctx.fillStyle = shade;
  rr(ctx, -9.5, 16 + Math.max(0, legSwing), 8.5, 6, 2); ctx.fill();
  rr(ctx, 1, 16 + Math.max(0, -legSwing), 8.5, 6, 2); ctx.fill();

  // torso
  const tg = ctx.createLinearGradient(-14, -16 + bob, 14, 14 + bob);
  tg.addColorStop(0, '#ffffff'); tg.addColorStop(0.55, suit); tg.addColorStop(1, shade);
  ctx.fillStyle = tg;
  rr(ctx, -13, -16 + bob, 26, 30, 11); ctx.fill();

  // chest pack
  ctx.fillStyle = '#3b4757';
  rr(ctx, -7, -9 + bob, 14, 11, 3); ctx.fill();
  ctx.fillStyle = accent;
  ctx.globalAlpha = 0.55 + Math.sin(walkPhase * 2) * 0.3;
  ctx.beginPath(); ctx.arc(2.5, -3.5 + bob, 2.4, 0, 7); ctx.fill();
  ctx.globalAlpha = 1;

  // hose
  ctx.strokeStyle = 'rgba(120,140,165,.75)';
  ctx.lineWidth = 2.2; ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-10, -12 + bob);
  ctx.quadraticCurveTo(-20, -4 + bob, -16, 6 + bob);
  ctx.stroke();

  // arm
  ctx.fillStyle = suit;
  rr(ctx, 10, -12 + bob + armSwing * 0.5, 7.5, 17, 3.5); ctx.fill();
  ctx.fillStyle = shade;
  rr(ctx, 10, -12 + bob + armSwing * 0.5, 7.5, 5, 2.5); ctx.fill();

  // helmet
  const hg = ctx.createRadialGradient(-4, -29 + bob, 2, 0, -24 + bob, 17);
  hg.addColorStop(0, '#eaf9ff');
  hg.addColorStop(0.44, visor);
  hg.addColorStop(0.82, '#3a6685');
  hg.addColorStop(1, '#243f55');
  ctx.fillStyle = hg;
  ctx.beginPath(); ctx.arc(0, -24 + bob, 14.5, 0, 7); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.72)'; ctx.lineWidth = 1.8; ctx.stroke();

  // visor glints
  ctx.save();
  ctx.beginPath(); ctx.arc(0, -24 + bob, 14.2, 0, 7); ctx.clip();
  ctx.fillStyle = 'rgba(255,255,255,.5)';
  ctx.beginPath(); ctx.ellipse(-5, -30 + bob, 6, 4.4, -0.7, 0, 7); ctx.fill();
  ctx.fillStyle = 'rgba(160,220,255,.2)';
  ctx.beginPath(); ctx.ellipse(5, -18 + bob, 8, 5.6, 0.5, 0, 7); ctx.fill();
  ctx.restore();

  ctx.restore();
}

/* ---------------------------------------------------------- PARTICLES */
class ParticleField {
  constructor(w, h, n, opt = {}) {
    this.w = w; this.h = h;
    this.opt = Object.assign({ speed: 12, size: [0.5, 2], alpha: 0.15, color: '#e9b98d', drift: 0 }, opt);
    this.items = [];
    for (let i = 0; i < n; i++) {
      this.items.push({
        x: Math.random() * w, y: Math.random() * h,
        s: lerp(this.opt.size[0], this.opt.size[1], Math.random()),
        v: this.opt.speed * (0.5 + Math.random()),
        a: this.opt.alpha * (0.4 + Math.random() * 0.9)
      });
    }
  }
  reset(w, h) { this.w = w; this.h = h; }
  draw(ctx, dt, colorOverride) {
    const c = colorOverride || this.opt.color;
    for (const p of this.items) {
      p.x += p.v * dt;
      p.y += this.opt.drift * dt;
      if (p.x > this.w + 8) { p.x = -8; p.y = Math.random() * this.h; }
      if (p.y > this.h + 8) p.y = -8;
      if (p.y < -10) p.y = this.h + 8;
      ctx.globalAlpha = p.a;
      ctx.fillStyle = c;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}

/* --------------------------------------------------- VIGNETTE / GRADE */
function vignette(ctx, w, h, strength = 0.6) {
  const g = ctx.createRadialGradient(w / 2, h * 0.46, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.78);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, `rgba(0,0,0,${strength})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}
function scanlines(ctx, w, h, alpha = 0.035) {
  ctx.fillStyle = `rgba(0,0,0,${alpha})`;
  for (let y = 0; y < h; y += 3) ctx.fillRect(0, y, w, 1);
}

/* --------------------------------------------------------- THEMES */
/* كل كوكب ليه بالِت خاص بيستخدمه التيرين والسماء */
const PLANET_STYLE = {
  moon: {
    skyTop: '#02030a', skyBot: '#080b16', ground: ['#8b8f99', '#5e626c', '#3b3e47'],
    horizon: '#b9bdc7', dust: '#cfd3dc', dustAlpha: 0.08, gravity: 1.9,
    stars: 320, sunTint: 'rgba(220,230,255,.10)'
  },
  mars: {
    skyTop: '#3a1b0e', skyBot: '#c07a4a', ground: ['#7a4327', '#63341f', '#37190f'],
    horizon: '#e0a578', dust: '#e9b98d', dustAlpha: 0.16, gravity: 1.0,
    stars: 0, sunTint: 'rgba(255,200,140,.14)'
  },
  mercury: {
    skyTop: '#010104', skyBot: '#0b0a10', ground: ['#6f6259', '#4a4038', '#241f1b'],
    horizon: '#8d8176', dust: '#9e9084', dustAlpha: 0.07, gravity: 1.05,
    stars: 260, sunTint: 'rgba(255,230,180,.16)'
  },
  venus: {
    skyTop: '#7a4a12', skyBot: '#ffcf6b', ground: ['#c9a24a', '#9c7a2c', '#6a511c'],
    horizon: '#ffe6a8', dust: '#ffe1a0', dustAlpha: 0.2, gravity: 0.95,
    stars: 0, sunTint: 'rgba(255,220,150,.3)'
  },
  saturn: {
    skyTop: '#04061a', skyBot: '#0c1230', ground: ['#9a8d6e', '#6d6349', '#3a3427'],
    horizon: '#c9b98a', dust: '#cbb98a', dustAlpha: 0.08, gravity: 0.6,
    stars: 400, sunTint: 'rgba(200,190,255,.10)'
  },
  zewail: {
    skyTop: '#01151a', skyBot: '#0b3540', ground: ['#9fd0d4', '#5f929c', '#274852'],
    horizon: '#c9efef', dust: '#bfe8ec', dustAlpha: 0.05, gravity: 0.95,
    stars: 380, sunTint: 'rgba(160,255,240,.14)'
  }
};
