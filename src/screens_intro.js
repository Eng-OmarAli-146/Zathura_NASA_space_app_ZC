/* ============================================================================
   screens_intro.js — ① شاشة الافتتاح: وكالة ZATHURA على الأرض (اقتراب جوي)
   ==========================================================================*/

registerScreen('intro', {
  mount() {
    const root = $('screen-intro');
    root.innerHTML = `
      <div id="intro-canvas" style="position:absolute;inset:0"></div>
      <div id="intro-overlay" style="position:absolute;inset:0;display:grid;grid-template-rows:1fr auto;
        padding:0 0 42px;pointer-events:none">
        <div></div>
        <div style="text-align:center;pointer-events:auto;padding:0 22px">
          <img src="data:image/jpeg;base64,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" alt="شعار ZATHURA" id="in-logo"
            width="120" height="120" style="border-radius:26%;margin:0 auto 6px;display:block;opacity:0;
              box-shadow:0 14px 60px rgba(77,217,255,.35),0 0 0 1px rgba(140,240,255,.25)">
          <div class="eyebrow" style="opacity:0;letter-spacing:5px" id="in-eye">ZATHURA · NASA SPACE APPS 2026 · THE NEXT FRONTIER</div>
          <div class="h1" style="margin:12px 0 10px;opacity:0;font-size:clamp(34px,5.4vw,64px)" id="in-title">
            ZAT<span style="color:var(--cyan)">H</span>URA
          </div>
          <div class="sub" id="in-sub" style="max-width:680px;margin:0 auto 26px;opacity:0">
            ستة عوالم تنتظرك! عيش في قاعدتك الفضائية بموارد محدودة… وانجح بالرجوع للأرض.
            حوّل ثلج الكوكب لماء وأكسجين للتنفس — مش هتشحن حاجتك من الأرض!
          </div>
          <div id="in-menu" style="display:flex;flex-direction:column;gap:9px;width:min(400px,100%);margin:0 auto;opacity:0">
            <button class="btn menu-cta" id="m-start">🚀 ابدأ المهمة<span class="menu-en" style="font-size:9px;letter-spacing:4px;opacity:.85;font-weight:800">START GAME</span></button>
            <div style="display:flex;gap:9px">
              <button class="btn ghost menu-btn" id="m-missions">📋 المهام<small>MISSIONS</small></button>
              <button class="btn ghost menu-btn" id="m-planets">🪐 استكشف الكواكب<small>PLANET EXPLORATION</small></button>
            </div>
            <div style="display:flex;gap:9px">
              <button class="btn ghost menu-btn" id="m-howto">❓ كيف تلعب<small>HOW TO PLAY</small></button>
              <button class="btn ghost menu-btn" id="m-ach">🏆 الإنجازات<small>PROGRESS</small></button>
            </div>
            <div style="display:flex;gap:9px">
              <button class="btn ghost menu-btn" id="m-settings">⚙️ الإعدادات<small>SETTINGS</small></button>
              <button class="btn ghost menu-btn" id="m-sources">📡 مصادر NASA<small>DATA SOURCES</small></button>
            </div>
            <div style="display:flex;gap:9px">
              <button class="btn ghost menu-btn" id="m-exit" style="color:#ffb3bb;border-color:rgba(255,95,109,.35)">👋 إنهاء اللعبة<small>EXIT GAME</small></button>
            </div>
          </div>
          <div class="sub" id="in-crew" style="margin-top:14px;font-size:11.5px;opacity:0;color:#ffd75e;letter-spacing:.2px">👨‍🚀 القائد <b>مُؤمن</b> — رائد فضاء مصري 🇪🇬</div>
          <div class="sub" style="margin-top:10px;font-size:10.5px;opacity:0" id="in-legal">
            مشروع تعليمي غير رسمي · لا يمثل NASA أو أي وكالة حكومية · بيانات NASA الحقيقية موثّقة داخل اللعبة · تحدي NASA Space Apps 2026 — «The Next Frontier»
          </div>
        </div>
      </div>
    `;

    const cvs = makeCanvas($('intro-canvas'));
    const { ctx } = cvs;

    /* ---- نجوم + سحاب أمامي ---- */
    let t = 0, raf = 0, stopped = false;
    const stars = Array.from({ length: 260 }, () => ({
      x: Math.random(), y: Math.random() * 0.55,
      r: Math.random() * 1.5 + 0.3, a: Math.random() * 0.8 + 0.2,
      v: Math.random() * 0.00015 + 0.00004
    }));
    /* كواكب الخلفية تنجرف ببطء + شهب + عمق بالفأرة */
    const planets = [
      { x: 0.85, y: 0.150, r: 0.052, stops: ['#f4e3b6', '#cbb277', '#55452a'], ring: true,  ph: 0.4, par: 1.7 },
      { x: 0.125, y: 0.290, r: 0.029, stops: ['#dfe6ef', '#9aa3b5', '#3c4254'], ring: false, ph: 2.3, par: 2.5 },
    ];
    const shooting = [];
    let nextShot = 1.8, mx = 0;
    function drawSphere(x, y, r, stops, opts) {
      const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.14, x, y, r);
      g.addColorStop(0, stops[0]); g.addColorStop(0.45, stops[1]); g.addColorStop(1, stops[2]);
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
      const sh = ctx.createRadialGradient(x + r * 0.6, y + r * 0.22, r * 0.3, x + r * 0.3, y + r * 0.1, r * 1.3);
      sh.addColorStop(0, 'rgba(0,0,0,.55)'); sh.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = sh; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
      if (opts && opts.ring) {
        ctx.save(); ctx.translate(x, y); ctx.rotate(-0.32); ctx.scale(1, 0.30);
        ctx.strokeStyle = 'rgba(234,218,164,.55)'; ctx.lineWidth = r * 0.30;
        ctx.beginPath(); ctx.arc(0, 0, r * 1.62, 0, 7); ctx.stroke();
        ctx.strokeStyle = 'rgba(234,218,164,.3)'; ctx.lineWidth = r * 0.15;
        ctx.beginPath(); ctx.arc(0, 0, r * 2.12, 0, 7); ctx.stroke();
        ctx.restore();
      }
    }

    const clouds = Array.from({ length: 14 }, () => ({
      x: Math.random(), y: Math.random() * 0.5 + 0.28,
      s: 70 + Math.random() * 150,
      o: Math.random() * 0.12 + 0.04
    }));

    function drawEarth(cx, cy, R) { /* unused — kept for compatibility */ }

    /* ---------- منشأة ZATHURA: منصّة إطلاق ليلاً ---------- */
    function drawFacility(t, W, H) {
      const hz = H * 0.735;
      const RM = Game.settings.reduceMotion ? 0.25 : 1;

      skyGradient(ctx, W, H, '#03060d', '#0d1a2c');

      // نجوم
      for (const s2 of stars) {
        s2.x -= s2.v * RM * 0.35;
        if (s2.x < 0) s2.x = 1;
        ctx.globalAlpha = s2.a * 0.9;
        ctx.fillStyle = '#e2ecff';
        ctx.beginPath(); ctx.arc(s2.x * W, s2.y * H * 0.8, s2.r * 0.85, 0, 7); ctx.fill();
      }
      ctx.globalAlpha = 1;

      // القمر
      const mx = W * 0.155, my = H * 0.135, mr = 26;
      ctx.save();
      ctx.shadowColor = 'rgba(190,215,255,.55)'; ctx.shadowBlur = 60;
      const mg = ctx.createRadialGradient(mx - 8, my - 8, 2, mx, my, mr);
      mg.addColorStop(0, '#fbfdff'); mg.addColorStop(0.62, '#d6dded'); mg.addColorStop(1, '#939eb1');
      ctx.fillStyle = mg; ctx.beginPath(); ctx.arc(mx, my, mr, 0, 7); ctx.fill();
      ctx.restore();
      ctx.fillStyle = 'rgba(150,158,176,.26)';
      [[-8,-5,6],[7,4,4.5],[-3,10,3.4],[9,-9,2.8],[-11,3,2.2]].forEach(([dx,dy,r]) => {
        ctx.beginPath(); ctx.arc(mx+dx, my+dy, r, 0, 7); ctx.fill();
      });

      // هالة الأفق
      const hg = ctx.createLinearGradient(0, hz - 300, 0, hz + 60);
      hg.addColorStop(0, 'rgba(18,40,74,0)');
      hg.addColorStop(0.6, 'rgba(30,66,116,.26)');
      hg.addColorStop(1, 'rgba(64,116,176,.52)');
      ctx.fillStyle = hg; ctx.fillRect(0, hz - 300, W, 360);

      // جبال بعيدة
      ctx.fillStyle = '#080f1a';
      ctx.beginPath();
      ctx.moveTo(0, hz);
      let px = 0, py = hz - 26;
      ctx.lineTo(0, py);
      while (px < W) {
        px += 70 + ((px * 37) % 90);
        py = hz - 16 - ((px * 53) % 60);
        ctx.lineTo(px, py);
      }
      ctx.lineTo(W, hz); ctx.closePath(); ctx.fill();

      // الأرضية
      const gg = ctx.createLinearGradient(0, hz, 0, H);
      gg.addColorStop(0, '#0a1119'); gg.addColorStop(0.5, '#070c14'); gg.addColorStop(1, '#03060a');
      ctx.fillStyle = gg; ctx.fillRect(0, hz, W, H - hz);

      /* ============ مبنى التحكم (يسار) ============ */
      const bh = H * 0.185, bw = W * 0.20, bx = W * 0.055;
      const bgy = hz + H * 0.055;
      const bg2 = ctx.createLinearGradient(bx, bgy - bh, bx, bgy);
      bg2.addColorStop(0, '#12202f'); bg2.addColorStop(1, '#060c14');
      ctx.fillStyle = bg2; rr(ctx, bx, bgy - bh, bw, bh, 3); ctx.fill();
      ctx.strokeStyle = 'rgba(96,158,210,.28)'; ctx.lineWidth = 1.2; ctx.stroke();
      // شبابيك مضاءة (صف واحد + بعض المطفأ)
      const cols = 9;
      for (let c = 0; c < cols; c++) {
        const wx = bx + 8 + c * ((bw - 16) / cols);
        const lit = Math.sin(t * 0.5 + c * 2.7) > -0.45;
        ctx.fillStyle = lit ? 'rgba(168,224,255,.80)' : 'rgba(24,40,56,.5)';
        ctx.fillRect(wx, bgy - bh + 14, (bw - 16) / cols - 4, bh * 0.30);
      }
      // شريط أخف أسفل
      ctx.fillStyle = 'rgba(60,130,190,.18)';
      ctx.fillRect(bx, bgy - bh * 0.44, bw, 3);
      // سقف تقني
      ctx.fillStyle = '#0d1826';
      rr(ctx, bx + bw * 0.15, bgy - bh - 14, bw * 0.34, 14, 2); ctx.fill();
      ctx.fillStyle = '#0d1826';
      rr(ctx, bx + bw * 0.60, bgy - bh - 9, bw * 0.22, 9, 2); ctx.fill();
      // لافتة ZATHURA
      ctx.fillStyle = 'rgba(150,222,255,.9)';
      ctx.font = '900 11px "Segoe UI",Tahoma,sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('A E R O   Δ   ·  L C - 1', bx + 10, bgy - bh + 8);

      /* ============ برج الإطلاق + الصاروخ (يمين) ============ */
      const rx = W * 0.775;             // مركز الصاروخ
      const rBase = hz + H * 0.115;      // قاعدة الصاروخ
      const rH = H * 0.50;               // طول الصاروخ
      const rW = rH * 0.082;             // نصف العرض

      // منصة الإطلاق
      ctx.fillStyle = '#0a121c';
      rr(ctx, rx - rW * 1.9, rBase - 6, rW * 3.8, H * 0.075, 3); ctx.fill();
      ctx.fillStyle = 'rgba(120,170,215,.16)';
      ctx.fillRect(rx - rW * 1.9, rBase - 6, rW * 3.8, 2);
      // دعائم
      ctx.fillStyle = '#0b1420';
      for (const dx of [-1.55, -0.55, 0.55, 1.55]) {
        ctx.fillRect(rx + dx * rW - 2, rBase + 8, 4, H * 0.045);
      }

      // برج الخدمة (شبكة)
      const twX = rx - rW * 2.55, twW = rW * 0.85, twTop = rBase - rH * 0.94;
      ctx.strokeStyle = 'rgba(86,124,160,.35)'; ctx.lineWidth = 1.3;
      for (let y = twTop; y < rBase; y += 15) {
        ctx.beginPath(); ctx.moveTo(twX, y); ctx.lineTo(twX + twW, y); ctx.stroke();
      }
      for (let x = twX; x <= twX + twW; x += 12) {
        ctx.beginPath(); ctx.moveTo(x, twTop); ctx.lineTo(x, rBase); ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(120,164,204,.5)'; ctx.lineWidth = 2;
      ctx.strokeRect(twX, twTop, twW, rBase - twTop);
      // ذراع توصيل
      ctx.strokeStyle = 'rgba(120,164,204,.45)'; ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.moveTo(twX + twW, rBase - rH * 0.72); ctx.lineTo(rx - rW, rBase - rH * 0.72); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(twX + twW, rBase - rH * 0.52); ctx.lineTo(rx - rW, rBase - rH * 0.52); ctx.stroke();
      // ضوء أحمر أعلى البرج
      ctx.save();
      ctx.shadowColor = 'rgba(255,70,60,.95)'; ctx.shadowBlur = 14;
      ctx.fillStyle = `rgba(255,90,70,${0.55 + Math.sin(t * 2.2) * 0.35})`;
      ctx.beginPath(); ctx.arc(twX + twW / 2, twTop - 4, 2.6, 0, 7); ctx.fill();
      ctx.restore();

      // ---- جسم الصاروخ ----
      const topY = rBase - rH;
      const bodyG = ctx.createLinearGradient(rx - rW, 0, rx + rW, 0);
      bodyG.addColorStop(0, '#5d6a79');
      bodyG.addColorStop(0.22, '#c9d3de');
      bodyG.addColorStop(0.48, '#f4f7fb');
      bodyG.addColorStop(0.78, '#c2ccd8');
      bodyG.addColorStop(1, '#697586');
      ctx.fillStyle = bodyG;
      ctx.beginPath();
      ctx.moveTo(rx - rW, rBase);
      ctx.lineTo(rx - rW, topY + rH * 0.20);
      ctx.quadraticCurveTo(rx - rW * 0.72, topY + rH * 0.035, rx, topY);
      ctx.quadraticCurveTo(rx + rW * 0.72, topY + rH * 0.035, rx + rW, topY + rH * 0.20);
      ctx.lineTo(rx + rW, rBase);
      ctx.closePath();
      ctx.fill();

      // شرائط
      ctx.fillStyle = m => m; // noop
      const bandY = topY + rH * 0.30;
      ctx.fillStyle = 'rgba(77,217,255,.85)';
      ctx.fillRect(rx - rW, bandY, rW * 2, rH * 0.035);
      ctx.fillStyle = 'rgba(255,255,255,.5)';
      ctx.fillRect(rx - rW, bandY + rH * 0.075, rW * 2, rH * 0.012);
      // شعار
      ctx.fillStyle = 'rgba(10,22,34,.75)';
      ctx.font = `900 ${Math.round(rH * 0.035)}px "Segoe UI",sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('ZATHURA', rx, bandY + rH * 0.145);
      // فواصل الموديولات
      ctx.strokeStyle = 'rgba(70,88,106,.35)'; ctx.lineWidth = 1;
      for (let i = 1; i <= 3; i++) {
        const yy = rBase - rH * (0.10 + i * 0.14);
        ctx.beginPath(); ctx.moveTo(rx - rW, yy); ctx.lineTo(rx + rW, yy); ctx.stroke();
      }
      // زعانف
      ctx.fillStyle = '#2c3846';
      for (const sgn of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(rx + sgn * rW, rBase - rH * 0.13);
        ctx.lineTo(rx + sgn * rW * 1.72, rBase);
        ctx.lineTo(rx + sgn * rW, rBase);
        ctx.closePath(); ctx.fill();
      }
      // محركات
      ctx.fillStyle = '#1a222c';
      ctx.fillRect(rx - rW * 0.9, rBase - 2, rW * 1.8, 7);
      for (const dx of [-0.48, 0, 0.48]) {
        ctx.beginPath();
        ctx.moveTo(rx + dx * rW - rW * 0.22, rBase + 5);
        ctx.lineTo(rx + dx * rW + rW * 0.22, rBase + 5);
        ctx.lineTo(rx + dx * rW + rW * 0.30, rBase + 14);
        ctx.lineTo(rx + dx * rW - rW * 0.30, rBase + 14);
        ctx.closePath(); ctx.fillStyle = '#0e151d'; ctx.fill();
      }

      /* ============ بخار التبريد ============ */
      for (let i = 0; i < 16; i++) {
        const ph = (t * 0.16 + i * 0.09) % 1;
        const px2 = rx + (i % 2 ? 1 : -1) * (rW * 1.2 + ph * 90);
        const py2 = rBase - 2 - ph * 26 - (i % 3) * 7;
        const rr2 = 12 + ph * 34;
        ctx.fillStyle = `rgba(196,216,236,${(1 - ph) * 0.10})`;
        ctx.beginPath(); ctx.ellipse(px2, py2, rr2, rr2 * 0.62, 0, 0, 7); ctx.fill();
      }

      /* ============ أبراج الإضاءة الكاشفة ============ */
      const lamps = [
        { x: W * 0.545, s: 0.92 },
        { x: W * 0.94, s: 0.80 }
      ];
      for (const L of lamps) {
        const ly = rBase + H * 0.02;
        const lh = H * 0.28;
        ctx.strokeStyle = 'rgba(60,80,100,.75)'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(L.x, ly); ctx.lineTo(L.x, ly - lh); ctx.stroke();
        // رأس الإضاءة
        ctx.fillStyle = '#16202c';
        rr(ctx, L.x - 12 * L.s, ly - lh - 12 * L.s, 24 * L.s, 12 * L.s, 2); ctx.fill();
        // هالة اللمبات
        for (let i = 0; i < 3; i++) {
          const lx = L.x - 8 * L.s + i * 8 * L.s;
          ctx.save();
          ctx.shadowColor = 'rgba(255,244,214,.95)'; ctx.shadowBlur = 16;
          ctx.fillStyle = 'rgba(255,248,228,.92)';
          ctx.beginPath(); ctx.arc(lx, ly - lh - 6 * L.s, 2.2 * L.s, 0, 7); ctx.fill();
          ctx.restore();
        }
        // مخروط الضوء نحو الصاروخ
        const dx = rx - L.x, dy = rBase - rH * 0.3 - (ly - lh);
        const len = Math.hypot(dx, dy);
        const ang = Math.atan2(dy, dx);
        ctx.save();
        ctx.translate(L.x, ly - lh - 4);
        ctx.rotate(ang);
        const coneG = ctx.createLinearGradient(0, 0, len, 0);
        coneG.addColorStop(0, 'rgba(255,246,220,.14)');
        coneG.addColorStop(0.55, 'rgba(255,246,220,.055)');
        coneG.addColorStop(1, 'rgba(255,246,220,0)');
        ctx.fillStyle = coneG;
        ctx.beginPath();
        ctx.moveTo(0, -3);
        ctx.lineTo(len, -rH * 0.30);
        ctx.lineTo(len, rH * 0.30);
        ctx.lineTo(0, 3);
        ctx.closePath(); ctx.fill();
        ctx.restore();
      }

      /* ============ سياج أمامي ============ */
      const fy = H * 0.972;
      ctx.strokeStyle = 'rgba(6,11,18,.92)'; ctx.lineWidth = 3.5;
      ctx.beginPath(); ctx.moveTo(0, fy); ctx.lineTo(W, fy); ctx.stroke();
      ctx.strokeStyle = 'rgba(10,17,26,.95)'; ctx.lineWidth = 2;
      for (let x = 0; x < W; x += 30) {
        ctx.beginPath(); ctx.moveTo(x, fy); ctx.lineTo(x, fy - H * 0.042); ctx.stroke();
      }
      // أضواء السياج
      for (let x = 20; x < W; x += 120) {
        const a = 0.25 + Math.sin(t * 1.8 + x) * 0.12;
        ctx.fillStyle = `rgba(255,190,110,${Math.max(.06, a)})`;
        ctx.beginPath(); ctx.arc(x, fy - H * 0.044, 1.8, 0, 7); ctx.fill();
      }

      /* ============ سكاف مركزي لقراءة العنوان ============ */
      ctx.save();
      ctx.translate(W / 2, H * 0.665);
      ctx.scale(1, 0.66);
      const scrim = ctx.createRadialGradient(0, 0, W * 0.02, 0, 0, W * 0.42);
      scrim.addColorStop(0, 'rgba(2,5,10,.88)');
      scrim.addColorStop(0.5, 'rgba(2,5,10,.60)');
      scrim.addColorStop(1, 'rgba(2,5,10,0)');
      ctx.fillStyle = scrim;
      ctx.fillRect(-W, -H / 0.66, W * 2, (H * 2) / 0.66);
      ctx.restore();

      const bt = ctx.createLinearGradient(0, H * 0.90, 0, H);
      bt.addColorStop(0, 'rgba(2,5,10,0)'); bt.addColorStop(1, 'rgba(2,5,10,.95)');
      ctx.fillStyle = bt; ctx.fillRect(0, H * 0.90, W, H * 0.10);
    }

    function drawTerminal() {
      // خريطة العالم المبسطة كخطوط
      ctx.save();
      ctx.globalAlpha = 0.16;
      ctx.strokeStyle = '#9fd9ff';
      ctx.lineWidth = 1;
      for (let i = 1; i < 8; i++) {
        ctx.beginPath();
        ctx.moveTo(cvs.w * i / 8, cvs.h * 0.18);
        ctx.lineTo(cvs.w * i / 8, cvs.h * 0.62);
        ctx.stroke();
      }
      for (let i = 1; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(cvs.w * 0.1, cvs.h * (0.18 + i * 0.11));
        ctx.lineTo(cvs.w * 0.9, cvs.h * (0.18 + i * 0.11));
        ctx.stroke();
      }
      ctx.restore();
      // مسار المهمة
      ctx.strokeStyle = 'rgba(77,217,255,.45)';
      ctx.lineWidth = 1.6;
      ctx.setLineDash([6, 8]);
      ctx.beginPath();
      ctx.moveTo(cvs.w * 0.22, cvs.h * 0.46);
      ctx.bezierCurveTo(cvs.w * 0.42, cvs.h * 0.28, cvs.w * 0.62, cvs.h * 0.34, cvs.w * 0.78, cvs.h * 0.22);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    function frame() {
      if (stopped) return;
      t += 0.016;
      const W = cvs.w, H = cvs.h;

      // خلفية
      skyGradient(ctx, W, H, '#01030a', '#0a1428');

      // نجوم (مع عمق بالفأرة)
      for (const s of stars) {
        s.x -= s.v * (Game.settings.reduceMotion ? 0.2 : 1);
        if (s.x < 0) s.x = 1;
        ctx.globalAlpha = s.a;
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(s.x * W + mx * 6, s.y * H, s.r, 0, 7); ctx.fill();
      }
      ctx.globalAlpha = 1;

      // كواكب تنجرف ببطء
      for (const p of planets) {
        const px = (p.x + Math.sin(t * 0.1 + p.ph) * 0.010) * W + mx * p.par * 9;
        const py = (p.y + Math.cos(t * 0.083 + p.ph) * 0.012) * H;
        drawSphere(px, py, p.r * H, p.stops, p);
      }

      // شهب تعبر السماء كل بضع ثوانٍ
      if (t > nextShot && !Game.settings.reduceMotion) {
        nextShot = t + 5 + Math.random() * 7.5;
        shooting.push({ x: Math.random() * W * 0.7 + W * 0.2, y: Math.random() * H * 0.2 + H * 0.05,
                        vx: -(480 + Math.random() * 280), vy: 170 + Math.random() * 140, life: 0.9, max: 0.9 });
      }
      for (let i = shooting.length - 1; i >= 0; i--) {
        const sh = shooting[i]; sh.x += sh.vx * 0.016; sh.y += sh.vy * 0.016; sh.life -= 0.016;
        if (sh.life <= 0) { shooting.splice(i, 1); continue; }
        const k = sh.life / sh.max;
        const tx = sh.x - sh.vx * 0.17, ty = sh.y - sh.vy * 0.17;
        const g = ctx.createLinearGradient(sh.x, sh.y, tx, ty);
        g.addColorStop(0, 'rgba(255,255,255,' + (0.95 * k).toFixed(3) + ')');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.strokeStyle = g; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(sh.x, sh.y); ctx.lineTo(tx, ty); ctx.stroke();
      }

      // منظر المنشأة
      drawFacility(t, W, H);

      // سحب خفيفة في الأفق
      for (const c of clouds) {
        c.x -= 0.00022 * (Game.settings.reduceMotion ? 0.3 : 1);
        if (c.x < -0.2) c.x = 1.2;
        ctx.globalAlpha = c.o * 0.35;
        ctx.fillStyle = '#9fb6d4';
        ctx.beginPath();
        ctx.ellipse(c.x * W, H * 0.16 + c.y * H * 0.22, c.s * 0.8, c.s * 0.14, 0, 0, 7);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      vignette(ctx, W, H, 0.66);
      scanlines(ctx, W, H, 0.02);

      raf = requestAnimationFrame(frame);
    }

    cvs.resize();
    frame();

    /* --- دخول متدرّج للنصوص --- */
    const reveal = (id, delay) => setTimeout(() => {
      const e = $(id); if (!e) return;
      e.style.transition = 'opacity .9s ease, transform .9s ease';
      e.style.transform = 'translateY(10px)';
      requestAnimationFrame(() => { e.style.opacity = '1'; e.style.transform = 'none'; });
    }, delay);
    reveal('in-logo', 60);
    reveal('in-eye', 240);
    reveal('in-title', 520);
    reveal('in-sub', 900);
    reveal('in-menu', 1200);
    reveal('in-crew', 1380);
    reveal('in-legal', 1500);
    setTimeout(() => Audio.boot(), 300);

    /* عمق تفاعلي بالفأرة — يُركّب مرة واحدة فقط */
    if (!root._pxWired) {
      root._pxWired = 1;
      root.addEventListener('pointermove', e => {
        const r = root.getBoundingClientRect();
        mx = ((e.clientX - r.left) / Math.max(1, r.width) - 0.5) * 2;
      });
    }

    /* القائمة — كل زر يشتغل فعلًا */
    const startGame = () => { Audio.ok(); stopped = true; cancelAnimationFrame(raf); cvs.destroy(); go('hq'); };
    $('m-start').addEventListener('click', startGame);
    $('m-missions').addEventListener('click', () => { Audio.ok(); stopped = true; cancelAnimationFrame(raf); cvs.destroy(); go('destinations'); });
    $('m-planets').addEventListener('click', () => { Audio.ok(); stopped = true; cancelAnimationFrame(raf); cvs.destroy(); go('destinations'); });
    $('m-howto').addEventListener('click', () => { Audio.click(); const m = $('modal-howto'); if (m) m.classList.add('open'); });
    $('m-ach').addEventListener('click', () => { if (typeof openAchModal === 'function') openAchModal(); });
    $('m-settings').addEventListener('click', () => { if (typeof openSettingsModal === 'function') openSettingsModal(); });
    $('m-sources').addEventListener('click', () => { if (typeof openSourcesModal === 'function') openSourcesModal(); });
    $('m-exit').addEventListener('click', () => { Audio.click(); const o = $('exit-overlay'); if (o) { o.style.display = 'grid'; } });

    this._stop = () => { stopped = true; cancelAnimationFrame(raf); cvs.destroy(); };
  },
  unmount() { if (this._stop) this._stop(); }
});
