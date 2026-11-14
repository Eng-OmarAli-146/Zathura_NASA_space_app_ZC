/* ============================================================================
   screens_hq.js — ② مركز التحكم الأرضي (غرفة عمليات NASA-style)
   + ③ خريطة الوجهات + ④ اختيار المركبة
   ==========================================================================*/

/* ======================================================================
   ① HQ — غرفة التحكم
   ====================================================================== */
registerScreen('hq', {
  mount() {
    const root = $('screen-hq');
    root.innerHTML = `
      <div id="hq-canvas" style="position:absolute;inset:0"></div>

      <!-- شاشة كبيرة معلقة -->
      <div id="hq-big" style="position:absolute;left:50%;top:5.5%;transform:translateX(-50%);
        width:min(700px,66vw);aspect-ratio:16/6.4;border-radius:10px;
        border:1px solid rgba(90,170,225,.35);overflow:hidden;
        box-shadow:0 0 60px rgba(40,120,190,.28),inset 0 0 60px rgba(20,80,140,.35);
        background:#02070e">
        <canvas id="hq-screen-cv" style="width:100%;height:100%;display:block"></canvas>
        <div style="position:absolute;inset:0;display:flex;flex-direction:column;
          justify-content:space-between;padding:12px 16px;pointer-events:none">
          <div class="row" style="justify-content:space-between">
            <span class="pill live" style="font-size:9.5px"><span class="dot pulse"></span> LIVE FEED</span>
            <span class="mono" style="font-size:10px;color:#7fd9ff" id="hq-clock">T-00:00:00</span>
          </div>
          <div class="row" style="justify-content:space-between;align-items:flex-end">
            <div>
              <div class="eyebrow" style="font-size:8.5px">مركز عمليات ZATHURA</div>
              <div style="font-size:13px;font-weight:900;letter-spacing:1px;color:#bfe4ff">
                MISSION CONTROL · HOUSTON ANALOG
              </div>
            </div>
            <div style="text-align:left">
              <div class="mono" style="font-size:9px;color:#6f9dc4">TRACKING</div>
              <div class="mono" style="font-size:12px;color:#7fd9ff" id="hq-track">—</div>
            </div>
          </div>
        </div>
      </div>

      <!-- بطاقة الدخول -->
      <div style="position:absolute;inset:0;display:flex;align-items:flex-end;justify-content:flex-start;
        padding:22px;pointer-events:none">
        <div class="card glass" id="hq-card" style="width:min(455px,94vw);text-align:right;padding:22px 22px 20px;
          border-color:rgba(90,170,225,.4);box-shadow:0 26px 70px rgba(0,0,0,.7);
          pointer-events:auto;animation:cardUp .6s cubic-bezier(.16,.84,.3,1)">
          <div class="eyebrow" style="opacity:.7;font-size:9.5px">ZATHURA SPACE AGENCY · EARTH</div>
          <div class="h2" style="margin:9px 0 7px;font-size:clamp(19px,3vw,25px)">مركز التحكّم الأرضي</div>
          <div class="sub" style="font-size:12px;line-height:1.85">
            أنت الآن في غرفة العمليات. فريق التحكّم جاهز.<br>
            <b style="color:var(--txt)">اختر الوجهة الأولى</b> — ولا يمكنك تغييرها بعد الإقلاع.
          </div>
          <div style="margin-top:10px;display:flex;align-items:center;gap:9px;border:1px solid rgba(255,209,102,.4);background:rgba(66,44,8,.35);border-radius:12px;padding:7px 11px">
            <span style="font-size:22px;line-height:1">👨‍🚀</span>
            <div style="font-size:11.5px;line-height:1.6">
              <b style="color:#ffd75e;letter-spacing:.3px">القائد: مُؤمن</b><br>
              <span style="color:var(--dim)">رائد فضاء مصري 🇪🇬 — NASA Space Apps 2026</span>
            </div>
          </div>

          <div class="row wrap gap8" style="justify-content:flex-start;margin:16px 0 4px">
            <span class="pill"><b>6</b> وجهات متاحة</span>
            <span class="pill"><b>3</b> رواد</span>
            <span class="pill ok" id="hq-funds"><b>4.2B</b> ميزانية</span>
          </div>

          <div style="margin:14px 0 0">
            <div id="hq-resume-slot"></div>
            <button class="btn" id="hq-go" style="width:100%">
              ${svgIcon('arrow', 17, '#05101f')} انتقل إلى خريطة الوجهات
            </button>
            <button class="btn ghost sm wide" id="hq-ach" style="margin-top:8px">🏆 الإنجازات وتقدّمي</button>
            <button class="btn ghost sm wide" id="hq-upg" style="margin-top:8px;border-color:rgba(122,240,192,.4);color:#8af0c4">🚀 ترقية المركبة <span class="mono" id="hq-upg-cr" style="color:#ffe066"></span></button>
            <div class="sub" style="margin-top:10px;font-size:10.5px;color:var(--dim2)">
              التقدّم داخل المهمة يُحفظ تلقائيًا في هذا المتصفح
            </div>
            <div class="sub" id="hq-best" style="margin-top:4px;font-size:10.5px;color:#ffd75e;letter-spacing:.3px"></div>
          </div>
        </div>
      </div>
    `;

    /* زر استئناف المهمة المحفوظة — لو موجود */
    const resumeSlot = $('hq-resume-slot');
    const savedRun = RunSave.read();
    if (resumeSlot && savedRun && savedRun.mission) {
      const mm = MISSIONS.find(x => x.id === savedRun.mission);
      if (mm) {
        const b = document.createElement('button');
        b.className = 'btn ghost'; b.id = 'hq-resume';
        b.style.cssText = 'width:100%;margin-bottom:10px;border-color:rgba(77,217,255,.55);color:#8fe4ff;box-shadow:0 0 22px rgba(77,217,255,.22)';
        b.innerHTML = `⏵ استئناف مهمتك: ${mm.name} · SOL ${String(savedRun.sol || 1).padStart(2, '0')}`;
        b.addEventListener('click', () => { Audio.ok(); go('outpost'); });
        resumeSlot.appendChild(b);
      }
    }
    /* رصيد الترقية الحالي */
    const upgCr = $('hq-upg-cr');
    if (upgCr && window.UPG) upgCr.textContent = '· ' + UPG.state().credits + ' ⚛';
    const upgBtn = $('hq-upg');
    if (upgBtn) upgBtn.addEventListener('click', () => openUpgModal());

    /* أفضل أداء مجمّع */
    const bestEl = $('hq-best');
    if (bestEl) {
      const n = BestSave.count(), total = BestSave.total();
      bestEl.textContent = n ? `أفضل أداء: ${total}★ عبر ${n} ${n === 1 ? 'مهمة' : n === 2 ? 'مهمتين' : 'مهام'} مكتملة السجل` : '';
    }

    const cvs = makeCanvas($('hq-canvas'));
    const { ctx } = cvs;
    const HQ = { player: { fade: 1 }, keys: {} };

    /* ---------- شاشة كبيرة: رسم الأرض + المسار ---------- */
    const scv = $('hq-screen-cv');
    const sctx = scv.getContext('2d');
    let stop = false, t = 0, raf = 0;

    function drawScreen() {
      const w = scv.clientWidth, h = scv.clientHeight;
      scv.width = Math.round(w * 1.4); scv.height = Math.round(h * 1.4);
      sctx.setTransform(1.4, 0, 0, 1.4, 0, 0);

      skyGradient(sctx, w, h, '#01050c', '#04101e');
      // شبكة
      sctx.strokeStyle = 'rgba(80,150,200,.12)';
      sctx.lineWidth = 1;
      for (let i = 1; i < 10; i++) {
        sctx.beginPath(); sctx.moveTo(w * i / 10, 0); sctx.lineTo(w * i / 10, h); sctx.stroke();
      }
      for (let i = 1; i < 5; i++) {
        sctx.beginPath(); sctx.moveTo(0, h * i / 5); sctx.lineTo(w, h * i / 5); sctx.stroke();
      }
      // أرض
      const R = w * 0.20;
      const cx = w * 0.24, cy = h * 0.72;
      const g = sctx.createRadialGradient(cx - R * 0.4, cy - R * 0.4, R * 0.1, cx, cy, R);
      g.addColorStop(0, '#5bb0d8');
      g.addColorStop(0.6, '#1d5f92');
      g.addColorStop(1, '#0a2846');
      sctx.fillStyle = g;
      sctx.beginPath(); sctx.arc(cx, cy, R, 0, 7); sctx.fill();

      // مسار مدار
      sctx.strokeStyle = 'rgba(77,217,255,.5)';
      sctx.setLineDash([5, 7]);
      sctx.lineWidth = 1.4;
      sctx.beginPath();
      sctx.ellipse(cx, cy, R * 1.8, R * 1.8, 0, 0, 7);
      sctx.stroke();
      sctx.setLineDash([]);

      // قمر صغير
      const moonAngle = t * 0.18;
      const mx = cx + Math.cos(moonAngle) * R * 1.8;
      const my = cy + Math.sin(moonAngle) * R * 1.8;
      sctx.fillStyle = '#b0b5c0';
      sctx.beginPath(); sctx.arc(mx, my, 4.5, 0, 7); sctx.fill();

      // بيانات
      sctx.fillStyle = 'rgba(127,217,255,.85)';
      sctx.font = '600 8px "Segoe UI",sans-serif';
      const rows = [
        'EARTH PARKING · LEO 408 km',
        'PARTNER: ZATHURA SPACE AGENCY (TRAINING)',
        'STATUS: ALL SYSTEMS NOMINAL'
      ];
      rows.forEach((r, i) => sctx.fillText(r, w * 0.46, h * 0.28 + i * 13));

      // رسم بياني صغير
      sctx.strokeStyle = 'rgba(69,224,138,.6)';
      sctx.lineWidth = 1.6;
      sctx.beginPath();
      for (let i = 0; i < 40; i++) {
        const px = w * 0.46 + i * (w * 0.5 / 40);
        const py = h * 0.72 - Math.sin(i * 0.35 + t) * 7 - Math.cos(i * 0.18) * 4;
        i === 0 ? sctx.moveTo(px, py) : sctx.lineTo(px, py);
      }
      sctx.stroke();
      sctx.fillStyle = 'rgba(69,224,138,.75)';
      sctx.font = '600 7.5px "Segoe UI",sans-serif';
      sctx.fillText('SOLAR FLUX · NOMINAL', w * 0.46, h * 0.82);
    }

    /* ---------- خلفية HQ ---------- */
    const panelLights = [];
    for (let i = 0; i < 90; i++) {
      panelLights.push({
        x: Math.random(), y: Math.random() * 0.32,
        w: 4 + Math.random() * 16, h: 2 + Math.random() * 5,
        c: Math.random() > 0.75 ? '#ffb347' : Math.random() > 0.4 ? '#4dd9ff' : '#45e08a',
        ph: Math.random() * 7
      });
    }

    function frame() {
      if (stop) return;
      t += 0.016;
      const W = cvs.w, H = cvs.h;

      // خلفية الغرفة — تعريض ضبابي
      skyGradient(ctx, W, H, '#03070d', '#08111d');

      // سقف وأرض
      ctx.fillStyle = '#050a12';
      ctx.fillRect(0, 0, W, H * 0.16);
      ctx.fillStyle = '#060b13';
      ctx.fillRect(0, H * 0.86, W, H * 0.14);

      // ---- السقف: عوارض وأشرطة إضاءة ----
      for (let i = 0; i < 6; i++) {
        const cx0 = W * (0.08 + i * 0.17);
        ctx.fillStyle = 'rgba(10,18,28,.95)';
        rr(ctx, cx0, H * 0.055, W * 0.10, H * 0.018, 2); ctx.fill();
        ctx.fillStyle = `rgba(150,215,255,${0.14 + Math.sin(t * 1.2 + i) * 0.04})`;
        rr(ctx, cx0 + 4, H * 0.059, W * 0.10 - 8, H * 0.006, 2); ctx.fill();
      }
      // ---- أرضية بخطوط منظور ----
      const floorY = H * 0.545;
      const fg = ctx.createLinearGradient(0, floorY, 0, H);
      fg.addColorStop(0, 'rgba(8,16,26,0)');
      fg.addColorStop(0.35, 'rgba(9,17,27,.85)');
      fg.addColorStop(1, 'rgba(5,9,15,1)');
      ctx.fillStyle = fg;
      ctx.fillRect(0, floorY, W, H - floorY);
      ctx.strokeStyle = 'rgba(80,150,200,.07)';
      ctx.lineWidth = 1;
      for (let i = -8; i <= 8; i++) {
        ctx.beginPath();
        ctx.moveTo(W * 0.5 + i * W * 0.035, floorY);
        ctx.lineTo(W * 0.5 + i * W * 0.20, H);
        ctx.stroke();
      }
      for (let i = 1; i < 6; i++) {
        const yy = floorY + Math.pow(i / 6, 1.9) * (H - floorY);
        ctx.beginPath(); ctx.moveTo(0, yy); ctx.lineTo(W, yy); ctx.stroke();
      }

      // ---- طاولة الإحاطة الهولوغرافية ----
      drawHoloTable(W, H, t);

      // صفوف كونسول (الكتل)
      for (let row = 0; row < 3; row++) {
        const ry = H * (0.58 + row * 0.10);
        const rh = H * 0.075;
        ctx.fillStyle = `rgba(12,20,32,${0.9 - row * 0.15})`;
        rr(ctx, W * 0.04, ry, W * 0.92, rh, 8);
        ctx.fill();
        ctx.strokeStyle = 'rgba(70,130,175,.16)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // شاشات صغيرة داخل الكنسول
        const cols = 12;
        for (let c = 0; c < cols; c++) {
          const px = W * 0.04 + c * (W * 0.92 / cols) + 4;
          const py = ry + 5;
          const pw = W * 0.92 / cols - 8;
          const ph = rh - 10;
          ctx.fillStyle = `rgba(${10 + row * 4},${26 + row * 5},${40 + row * 6},.95)`;
          rr(ctx, px, py, pw, ph, 3);
          ctx.fill();
          // محتوى مموّه
          ctx.fillStyle = (c % 3 === 0) ? 'rgba(77,217,255,.3)' : 'rgba(69,224,138,.18)';
          for (let k = 0; k < 3; k++) {
            ctx.fillRect(px + 3, py + 4 + k * (ph / 3.4), pw * (0.4 + (c * k) % 5 / 8), 1.4);
          }
        }
      }

      // ضوء الشاشة الكبيرة
      const glow = ctx.createRadialGradient(W * 0.5, H * 0.30, 40, W * 0.5, H * 0.42, W * 0.55);
      glow.addColorStop(0, 'rgba(60,150,220,.16)');
      glow.addColorStop(1, 'rgba(60,150,220,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, W, H);

      // مؤشرات LEDs
      for (const p of panelLights) {
        const blink = 0.4 + Math.sin(t * 2.2 + p.ph) * 0.35;
        ctx.globalAlpha = clamp(blink, 0.1, 0.9);
        ctx.fillStyle = p.c;
        ctx.fillRect(p.x * W, p.y * H + H * 0.60, p.w, p.h);
      }
      ctx.globalAlpha = 1;

      // خريطة العالم على الحائط (يمين)
      drawWallMap(W, H, t);

      // طاقم في المشهد
      drawSilhouette(W * 0.12, H * 0.815, 1.05);
      drawSilhouette(W * 0.855, H * 0.80, 0.92);
      drawSilhouette(W * 0.245, H * 0.855, 0.80);

      // ---- اللاعب (ببزّة التدريب) ----
      const px = W * 0.585, py = H * 0.845;
      if (HQ.player.fade > 0) {
        ctx.save();
        ctx.globalAlpha = HQ.player.fade;
        ctx.fillStyle = 'rgba(0,0,0,.35)';
        ctx.beginPath();
        ctx.ellipse(px, py + 3, 24, 7, 0, 0, 7); ctx.fill();
        drawAstronaut(ctx, px, py, {
          scale: clamp(W / 1650, 0.62, 1.05),
          facing: 1,
          walkPhase: t * 0.6,
          mode: 'idle',
          accent: '#4dd9ff',
          suit: '#dfe8f2'
        });
        ctx.restore();
      }

      vignette(ctx, W, H, 0.7);
      scanlines(ctx, W, H, 0.025);

      drawScreen();
      raf = requestAnimationFrame(frame);
    }

    function drawHoloTable(W, H, t) {
      const cx = W * 0.40, cy = H * 0.635;
      const rw = Math.min(W * 0.135, H * 0.20);
      ctx.save();
      // ضوء الطاولة
      const gl = ctx.createRadialGradient(cx, cy, 4, cx, cy, rw * 2.6);
      gl.addColorStop(0, 'rgba(70,190,255,.20)');
      gl.addColorStop(0.5, 'rgba(60,160,230,.07)');
      gl.addColorStop(1, 'rgba(60,160,230,0)');
      ctx.fillStyle = gl;
      ctx.fillRect(cx - rw * 3, cy - rw * 2.2, rw * 6, rw * 4.4);

      // قاعدة الطاولة
      ctx.fillStyle = '#0a1420';
      ctx.beginPath(); ctx.ellipse(cx, cy + rw * 0.28, rw * 1.28, rw * 0.34, 0, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(24,44,64,.95)';
      ctx.beginPath(); ctx.ellipse(cx, cy + rw * 0.24, rw * 1.18, rw * 0.28, 0, 0, 7); ctx.fill();
      // سطح الطاولة المضيء
      const top = ctx.createLinearGradient(cx - rw, cy, cx + rw, cy + rw * 0.4);
      top.addColorStop(0, 'rgba(40,110,160,.55)');
      top.addColorStop(1, 'rgba(12,40,64,.9)');
      ctx.fillStyle = top;
      ctx.beginPath(); ctx.ellipse(cx, cy + rw * 0.20, rw, rw * 0.24, 0, 0, 7); ctx.fill();
      ctx.strokeStyle = 'rgba(120,215,255,.35)'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.ellipse(cx, cy + rw * 0.20, rw, rw * 0.24, 0, 0, 7); ctx.stroke();

      // 5 نقاط مهمات على الطاولة
      const cols = ['#4dd9ff', '#ff8a5c', '#c9b8ff', '#ffd479', '#9fe0b0'];
      for (let i = 0; i < 5; i++) {
        const a = t * 0.35 + i * (Math.PI * 2 / 5);
        const px = cx + Math.cos(a) * rw * 0.62;
        const py = cy + rw * 0.20 + Math.sin(a) * rw * 0.14;
        ctx.save();
        ctx.shadowColor = cols[i]; ctx.shadowBlur = 12;
        ctx.fillStyle = cols[i];
        ctx.beginPath(); ctx.arc(px, py - rw * 0.05, 2.4, 0, 7); ctx.fill();
        ctx.restore();
        // شعاع ضوئي صاعد
        ctx.strokeStyle = `rgba(130,215,255,.10)`;
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, py - rw * (0.5 + i * 0.05)); ctx.stroke();
      }

      // هولوغرام صاعد
      const hy = cy + rw * 0.20;
      for (let i = 0; i < 10; i++) {
        const q = ((t * 0.28 + i * 0.1) % 1);
        ctx.fillStyle = `rgba(110,210,255,${(1 - q) * 0.10})`;
        ctx.beginPath();
        ctx.ellipse(cx, hy - q * rw * 0.95, rw * (0.55 + q * 0.25), rw * (0.10 + q * 0.05), 0, 0, 7);
        ctx.fill();
      }
      ctx.restore();
    }

    function drawWallMap(W, H, t) {
      const x = W * 0.795, y = H * 0.185, w = W * 0.175, h = H * 0.20;
      ctx.save();
      ctx.fillStyle = 'rgba(4,12,20,.85)';
      rr(ctx, x, y, w, h, 4); ctx.fill();
      ctx.strokeStyle = 'rgba(90,170,225,.28)'; ctx.lineWidth = 1.2; ctx.stroke();
      // دوائر مدارية
      ctx.strokeStyle = 'rgba(77,217,255,.20)';
      const maxR = Math.min(w, h) * 0.44;
      for (let i = 1; i <= 3; i++) {
        ctx.beginPath();
        ctx.arc(x + w / 2, y + h / 2, (maxR / 3) * i, 0, 7);
        ctx.stroke();
      }
      // نقاط وجهات
      const dests = [[0.5, 0.5, '#4dd9ff'], [0.72, 0.34, '#ff8a5c'], [0.26, 0.62, '#c9b8ff'], [0.62, 0.72, '#ffd479'], [0.34, 0.28, '#9fe0b0']];
      dests.forEach(([dx, dy, c], i) => {
        const a = 0.5 + Math.sin(t * 1.6 + i) * 0.4;
        ctx.fillStyle = c;
        ctx.globalAlpha = a;
        ctx.beginPath(); ctx.arc(x + dx * w, y + dy * h, 2.6, 0, 7); ctx.fill();
        ctx.globalAlpha = 1;
      });
      ctx.fillStyle = 'rgba(127,217,255,.55)';
      ctx.font = '600 7.5px "Segoe UI",sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('MISSION MAP', x + 6, y + 12);
      ctx.restore();
    }

    function drawSilhouette(x, y, sc) {
      ctx.save();
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = '#04080e';
      ctx.beginPath(); ctx.ellipse(x, y, 20 * sc, 46 * sc, 0, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(x, y - 54 * sc, 13 * sc, 0, 7); ctx.fill();
      ctx.restore();
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = '#3d7fa8';
      ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.arc(x, y - 54 * sc, 13 * sc, 0, 7); ctx.stroke();
      ctx.restore();
    }

    /* digits من ساعة */
    let clockT = 0;
    const track = ['DSN-14 AOS', 'TDRS-175', 'DSN-26 MAS', 'TDRS-275', 'DSN-63 AOS'];
    let trackIdx = 0;
    setInterval(() => {
      clockT += 1;
      const c = $('hq-clock');
      if (c) c.textContent = 'T-' + String(Math.floor(clockT / 3600)).padStart(2, '0') + ':' +
        String(Math.floor((clockT % 3600) / 60)).padStart(2, '0') + ':' + String(clockT % 60).padStart(2, '0');
      const tr = $('hq-track');
      if (tr && clockT % 5 === 0) { trackIdx = (trackIdx + 1) % track.length; tr.textContent = track[trackIdx]; }
    }, 1000);

    frame();

    $('hq-go').addEventListener('click', () => {
      Audio.ok();
      stop = true; cancelAnimationFrame(raf); cvs.destroy();
      go('destinations');
    });

    this._stop = () => { stop = true; cancelAnimationFrame(raf); cvs.destroy(); };
  },
  unmount() { if (this._stop) this._stop(); }
});


/* ======================================================================
   ② DESTINATIONS — خريطة الوجهات
   ====================================================================== */
registerScreen('destinations', {
  mount() {
    const root = $('screen-destinations');
    root.innerHTML = `
      <div style="position:absolute;inset:0;overflow-y:auto;padding:88px 22px 40px">
        <div style="max-width:1180px;margin:0 auto">

          <div class="row" style="justify-content:space-between;align-items:flex-end;flex-wrap:wrap;gap:14px;margin-bottom:22px">
            <div>
              <div class="eyebrow">ZATHURA SPACE AGENCY · MISSION BOARD</div>
              <div class="h1" style="font-size:clamp(22px,3vw,38px);margin-top:8px">خريطة الوجهات</div>
              <div class="sub" style="margin-top:6px">ست رحلات. كل واحدة تحدٍّ مختلف. اختر واحدة فقط.</div>
            </div>
            <button class="btn ghost sm" onclick="go('hq')">${svgIcon('back', 14)} رجوع</button>
          </div>

          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:16px" id="dest-grid"></div>

          <div class="card tight" style="margin-top:20px;border-color:rgba(255,179,71,.3);background:rgba(255,179,71,.07)">
            <div style="font-size:12px;line-height:1.9;color:#ffd9a8">
              <b>ملاحظة علمية:</b> الزهرة ليس لها سطح قابل للحياة (464°C، ضغط 92 ضعفًا) — المهمة منصّة عائمة على ارتفاع 50 كم.
              زحل كوكب غازي بلا سطح — المهمة محطة مدارية مع هبوط اختياري على تايتان.
              المركبات في اللعبة <b>خيالية</b> مستوحاة من مهام NASA التاريخية، وليست هي نفسها.
              <b>كوكب زويل</b> وجهة <b>خيالية بالكامل</b> صُنعت للعبة (تكريمًا لأحمد زويل، نوبل الكيمياء 1999) — لا تمثل جسمًا فلكيًا حقيقيًا؛ فكرتها من بعثات NASA الحقيقية لجليد الكواكب.
            </div>
          </div>
        </div>
      </div>
    `;

    const grid = $('dest-grid');
    MISSIONS.forEach((m, i) => {
      const card = el('div');
      card.className = 'card glass';
      card.style.cssText = `
        position:relative;cursor:pointer;padding:0;overflow:hidden;
        border-color:rgba(255,255,255,.08);transition:transform .22s cubic-bezier(.16,.84,.3,1),border-color .22s,box-shadow .22s;
        animation:dUp .5s cubic-bezier(.16,.84,.3,1) ${i * 70}ms both`;
      card.innerHTML = `
        <style>@keyframes dUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:none}}</style>
        <div style="height:118px;position:relative;overflow:hidden;
          background:radial-gradient(circle at 32% 32%, ${m.color}40, ${m.color2}22 45%, #05080e 100%)">
          <canvas class="dest-cv" data-mid="${m.id}" style="position:absolute;inset:0;width:100%;height:100%"></canvas>
          <div style="position:absolute;inset:0;padding:12px 14px;display:flex;flex-direction:column;justify-content:space-between">
            <div class="row" style="justify-content:space-between">
              <span class="mono" style="font-size:10px;color:${m.color};letter-spacing:2px">MISSION ${m.num}</span>
              <span class="pill" style="font-size:9.5px;padding:2px 8px;border-color:${m.color}55;color:${m.color}">
                ${'●'.repeat(m.difficulty)}${'○'.repeat(5 - m.difficulty)} ${m.difficultyLabel}
              </span>
            </div>
            <div>
              <div style="font-size:20px;font-weight:900;letter-spacing:-.4px">${m.name}</div>
              <div class="mono" style="font-size:9.5px;color:${m.color};letter-spacing:2.4px;opacity:.85">${m.nameEn}</div>
            </div>
          </div>
        </div>

        <div style="padding:14px 16px 16px">
          <div class="sub" style="font-size:12px;min-height:52px;color:#b8c6dd">${m.blurb}</div>
          <div style="border-top:1px solid rgba(255,255,255,.07);margin:12px 0 10px"></div>
          <div class="row" style="justify-content:space-between;font-size:11px;color:var(--dim)">
            <span>🚀 ${m.craft}</span>
            <span>⏱ ${m.duration_days} يوم على الموقع</span>
          </div>
          <div class="row" style="justify-content:space-between;font-size:11px;color:var(--dim);margin-top:5px">
            <span>📡 تأخير ${m.delay_s < 10 ? m.delay_s + ' ث' : Math.round(m.delay_s / 60) + ' د'}</span>
            <span>☢ ${m.env.radiation_dose} mSv/يوم</span>
          </div>
          <button class="btn sm" style="width:100%;margin-top:12px;background:linear-gradient(100deg,${m.color},${m.accent});color:#06101f">
            اختر هذه الوجهة ${svgIcon('arrow', 13, '#06101f')}
          </button>
        </div>
      `;
      card.addEventListener('mouseenter', () => {
        if (Game.settings.reduceMotion) return;
        card.style.transform = 'translateY(-5px)';
        card.style.borderColor = m.color + '77';
        card.style.boxShadow = `0 18px 44px ${m.color}22`;
        Audio.hover();
      });
      card.addEventListener('mouseleave', () => {
        card.style.transform = 'none';
        card.style.borderColor = 'rgba(255,255,255,.08)';
        card.style.boxShadow = 'none';
      });
      card.querySelector('button').addEventListener('click', (e) => {
        e.stopPropagation();
        Game.mission = m.id;
        Audio.ok();
        go('craft');
      });
      const best = BestSave.get(m.id);
      if (best > 0) {
        const tag = document.createElement('div');
        tag.className = 'mono';
        tag.style.cssText = 'position:absolute;top:8px;left:10px;z-index:5;font-size:11px;color:#ffd75e;background:rgba(0,0,0,.5);padding:3px 9px;border-radius:999px;border:1px solid rgba(255,215,94,.45);letter-spacing:1.5px';
        tag.textContent = '★'.repeat(best);
        tag.title = 'أفضل نتيجة مسجلة على هذه الوجهة';
        card.appendChild(tag);
      }
      grid.appendChild(card);
    });

    /* رسوم مصغّرة على كل كارت */
    setTimeout(() => {
      qsa('.dest-cv').forEach(c => {
        const m = MISSIONS.find(x => x.id === c.dataset.mid);
        const s = c.getBoundingClientRect();
        c.width = s.width * 1.5; c.height = s.height * 1.5;
        const x = c.getContext('2d');
        x.scale(1.5, 1.5);
        const w = s.width, h = s.height;
        skyGradient(x, w, h, '#0000', '#0000');
        if (m.id === 'saturn') {
          drawPlanetSphere(x, w * 0.62, h * 0.46, h * 0.28, ['#f0e2bb', '#cbb98a', '#a89060', '#2a2417'], { bands: 7, ring: true, glow: false });
        } else if (m.id === 'mars') {
          drawPlanetSphere(x, w * 0.60, h * 0.5, h * 0.3, ['#e08a5a', '#c05a34', '#8b3a1e', '#2a0f07'], { glow: false });
        } else if (m.id === 'venus') {
          drawPlanetSphere(x, w * 0.60, h * 0.5, h * 0.3, ['#ffe9a8', '#e8c060', '#b08a2a', '#3a2c08'], { bands: 5, glow: false });
        } else if (m.id === 'mercury') {
          drawPlanetSphere(x, w * 0.62, h * 0.5, h * 0.28, ['#d6c8bb', '#a89a8c', '#6b5c50', '#241d18'], { glow: false });
        } else if (m.id === 'zewail') {
          drawPlanetSphere(x, w * 0.62, h * 0.5, h * 0.29, ['#d6fbff', '#4dd9ff', '#1786a0', '#04222b'], { bands: 3, glow: true });
        } else {
          drawPlanetSphere(x, w * 0.62, h * 0.5, h * 0.29, ['#e6eaf2', '#b8bfcc', '#7d8494', '#1a1d24'], { glow: false });
        }
      });
    }, 30);
  }
});


/* ======================================================================
   ③ CRAFT — اختيار المركبة + لوحة الهوية
   ====================================================================== */
registerScreen('craft', {
  mount() {
    const m = MISSIONS.find(x => x.id === Game.mission);
    if (!m) { go('destinations'); return; }
    const root = $('screen-craft');
    root.innerHTML = `
      <div style="position:absolute;inset:0;display:grid;grid-template-columns:1.1fr .9fr;
        gap:0;overflow:hidden">
        <div id="craft-canvas" style="position:relative;overflow:hidden"></div>

        <div style="overflow-y:auto;padding:88px 26px 30px;background:linear-gradient(200deg,#080d16,#05080e)">
          <div class="eyebrow">MISSION ${m.num} · ${m.nameEn}</div>
          <div class="h1" style="font-size:clamp(24px,3vw,36px);margin:8px 0 4px">${m.craft}</div>
          <div class="sub" style="font-size:13px">${m.craftFull}</div>

          <div class="card tight" style="margin-top:18px;border-color:${m.color}38">
            <div class="eyebrow" style="font-size:9px;color:${m.color}">المرجع التاريخي</div>
            <div style="font-size:12.5px;margin-top:6px;line-height:1.7">
              مستوحاة من <b>${m.heritage.replace('مستوحاة من ', '')}</b>
            </div>
            <div class="sub" style="font-size:11px;margin-top:8px;color:#8ba0c4">
              ⚠️ المركبة في اللعبة خيالية. المركبة التاريخية كانت روبوتية في معظم الحالات.
            </div>
            <a href="${m.heritageUrl}" target="_blank" rel="noopener"
               style="display:inline-flex;align-items:center;gap:6px;margin-top:10px;
                 color:var(--cyan);font-size:11.5px;font-weight:800;text-decoration:none">
              ${svgIcon('data', 13)} صفحة NASA الأصلية
            </a>
          </div>

          <div class="card tight" style="margin-top:12px">
            <div class="h3" style="font-size:12px;color:var(--cyan);letter-spacing:1px;margin-bottom:10px">ظروف الوجهة</div>
            <div class="stat"><span class="k">الموقع</span><span class="v" style="font-size:11.5px">${m.site}</span></div>
            <div class="stat"><span class="k">الجاذبية</span><span class="v">${m.env.gravity_g} g</span></div>
            <div class="stat"><span class="k">الحرارة</span><span class="v">${m.env.temp_day}° / ${m.env.temp_night}°</span></div>
            <div class="stat"><span class="k">الإشعاع اليومي</span><span class="v">${m.env.radiation_dose} mSv</span></div>
            <div class="stat"><span class="k">تأخير الاتصال</span><span class="v">${m.delay_s < 10 ? m.delay_s + ' ثانية' : Math.round(m.delay_s / 60) + ' دقيقة'}</span></div>
            <div class="sub" style="font-size:10.5px;margin-top:8px;color:#7d8fa8">${m.env.note}</div>
          </div>

          <div class="card tight" style="margin-top:12px">
            <div class="h3" style="font-size:12px;color:var(--amber);letter-spacing:1px;margin-bottom:10px">أهداف المهمة</div>
            ${m.objectives.map((o, i) => `
              <div class="row gap8" style="align-items:flex-start;margin-bottom:8px">
                <span style="font-size:9px;font-weight:900;color:#0a1420;background:var(--amber);
                  width:16px;height:16px;border-radius:50%;display:grid;place-items:center;flex:0 0 auto;margin-top:2px">${i + 1}</span>
                <span style="font-size:12px;line-height:1.6">${o}</span>
              </div>`).join('')}
          </div>

          <button class="btn" id="craft-board" style="width:100%;margin-top:18px;
            background:linear-gradient(100deg,${m.color},${m.accent});color:#06101f">
            ${svgIcon('arrow', 16, '#06101f')} اصعد إلى المركبة
          </button>
          <button class="btn ghost sm" style="width:100%;margin-top:8px" onclick="go('destinations')">
            ${svgIcon('back', 13)} غيّر الوجهة
          </button>
        </div>
      </div>
    `;

    const cvs = makeCanvas($('craft-canvas'));
    const { ctx } = cvs;
    let stop = false, t = 0, raf = 0;
    const parts = new ParticleField(2000, 1400, 140, { speed: 8, size: [.4, 1.6], alpha: .12, color: m.accent });

    function drawCraft(cx, cy, s) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(s, s);

      // هالة
      const g0 = ctx.createRadialGradient(0, 0, 20, 0, 0, 260);
      g0.addColorStop(0, m.color + '33');
      g0.addColorStop(1, m.color + '00');
      ctx.fillStyle = g0;
      ctx.beginPath(); ctx.arc(0, 0, 260, 0, 7); ctx.fill();

      // جسم المركبة — تصميم عام بسياق كوكبي
      if (m.id === 'saturn') {
        // محطة مدارية + مسبار
        ctx.strokeStyle = '#cbd5e6'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(-130, 0); ctx.lineTo(130, 0); ctx.stroke();
        // ألواح
        for (const dir of [-1, 1]) {
          ctx.fillStyle = '#1c3a56';
          rr(ctx, dir * 130 - (dir > 0 ? 0 : 68), -20, 68, 40, 4); ctx.fill();
          ctx.strokeStyle = 'rgba(140,200,255,.4)'; ctx.lineWidth = 1;
          for (let i = 1; i < 4; i++) {
            ctx.beginPath(); ctx.moveTo(dir * 130 - (dir > 0 ? 0 : 68) + i * 17, -20);
            ctx.lineTo(dir * 130 - (dir > 0 ? 0 : 68) + i * 17, 20); ctx.stroke();
          }
        }
        // مركز
        ctx.fillStyle = '#aeb9c9';
        rr(ctx, -30, -32, 60, 64, 8); ctx.fill();
        ctx.fillStyle = '#65707f';
        rr(ctx, -22, -24, 44, 20, 4); ctx.fill();
        // مسبار تايتان معلّق
        ctx.strokeStyle = 'rgba(200,210,230,.5)'; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(0, 32); ctx.lineTo(0, 78); ctx.stroke();
        ctx.fillStyle = '#e0e6f0';
        ctx.beginPath(); ctx.arc(0, 92, 14, 0, 7); ctx.fill();
      } else if (m.id === 'venus') {
        // منطاد
        ctx.fillStyle = '#e8dcc0';
        ctx.beginPath(); ctx.ellipse(0, -40, 84, 62, 0, 0, 7); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.25)';
        ctx.beginPath(); ctx.ellipse(-26, -58, 34, 24, -0.4, 0, 7); ctx.fill();
        ctx.strokeStyle = '#9a8d6e'; ctx.lineWidth = 2.4;
        for (const x of [-46, -18, 18, 46]) {
          ctx.beginPath(); ctx.moveTo(x, 8); ctx.lineTo(x * 0.5, 62); ctx.stroke();
        }
        ctx.fillStyle = '#c2b393';
        rr(ctx, -44, 62, 88, 46, 8); ctx.fill();
        ctx.fillStyle = '#3d4a5a';
        rr(ctx, -32, 72, 64, 22, 4); ctx.fill();
      } else {
        // مكوك/كبسولة عام
        ctx.fillStyle = '#d9e2ee';
        ctx.beginPath();
        ctx.moveTo(0, -96);
        ctx.quadraticCurveTo(58, -40, 52, 44);
        ctx.lineTo(52, 74);
        ctx.quadraticCurveTo(0, 96, -52, 74);
        ctx.lineTo(-52, 44);
        ctx.quadraticCurveTo(-58, -40, 0, -96);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 2; ctx.stroke();

        // نوافذ
        ctx.fillStyle = '#1b3d55';
        for (let i = 0; i < 3; i++) {
          ctx.beginPath(); ctx.arc(-24 + i * 24, -46, 8, 0, 7); ctx.fill();
        }
        // شعار
        ctx.fillStyle = m.color;
        ctx.beginPath(); ctx.arc(0, 8, 14, 0, 7); ctx.fill();
        ctx.fillStyle = '#0a1420';
        ctx.font = '900 12px "Segoe UI",sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(m.num, 0, 9);
        ctx.textBaseline = 'alphabetic';

        // فوهات
        ctx.fillStyle = '#7b8798';
        rr(ctx, -34, 74, 22, 20, 4); ctx.fill();
        rr(ctx, 12, 74, 22, 20, 4); ctx.fill();
      }
      ctx.restore();
    }

    function frame() {
      if (stop) return;
      t += 0.016;
      const W = cvs.w, H = cvs.h;

      skyGradient(ctx, W, H, '#02040a', '#0a1220');
      starField(ctx, W, H, 200, 11, 0.9);

      // حلقة مدارية خلفية
      ctx.strokeStyle = m.color + '22';
      ctx.lineWidth = 1.4;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.ellipse(W * 0.5, H * 0.52, W * (0.42 + i * 0.09), H * (0.16 + i * 0.03), -0.3, 0, 7);
        ctx.stroke();
      }

      const bob = Math.sin(t * 0.8) * 8;
      drawCraft(W * 0.5, H * 0.47 + bob, Math.min(W, H) / 620);

      parts.reset(W, H);
      parts.draw(ctx, 0.016);

      // ضوء من الأسفل
      const fl = ctx.createLinearGradient(0, H * 0.75, 0, H);
      fl.addColorStop(0, 'rgba(0,0,0,0)');
      fl.addColorStop(1, m.color + '18');
      ctx.fillStyle = fl;
      ctx.fillRect(0, 0, W, H);

      // بيانات متراكبة
      ctx.fillStyle = 'rgba(200,220,245,.5)';
      ctx.font = '600 10px "Segoe UI",sans-serif';
      ctx.fillText('ZATHURA MISSION VEHICLE · ' + m.craft, 20, H - 42);
      ctx.fillStyle = m.color;
      ctx.font = '900 11px "Segoe UI",sans-serif';
      ctx.fillText('STATUS: PRE-FLIGHT CHECK NOMINAL', 20, H - 26);

      // كروسمارك
      ctx.strokeStyle = m.color + '44';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(W / 2 - 40, H * 0.47); ctx.lineTo(W / 2 + 40, H * 0.47);
      ctx.moveTo(W / 2, H * 0.47 - 40); ctx.lineTo(W / 2, H * 0.47 + 40);
      ctx.stroke();

      vignette(ctx, W, H, 0.55);
      raf = requestAnimationFrame(frame);
    }

    frame();

    $('craft-board').addEventListener('click', () => {
      Audio.ok(); Audio.whoosh();
      stop = true; cancelAnimationFrame(raf); cvs.destroy();
      go('boarding');
    });

    this._stop = () => { stop = true; cancelAnimationFrame(raf); cvs.destroy(); };
  },
  unmount() { if (this._stop) this._stop(); }
});
