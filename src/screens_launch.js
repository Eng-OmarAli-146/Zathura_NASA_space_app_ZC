/* ============================================================================
   screens_launch.js — ⑤ الصعود إلى المركبة (boarding) + ⑥ الإقلاع (launch)
   كل الحركة بأنيميشن حقيقية على canvas — مفيش teleport ولا شاشات سوداء
   ==========================================================================*/

/* ======================================================================
   BOARDING — مشهد جانبي: الرائد يمشي → السلم يفتح → يطلع → يختفي
   ====================================================================== */
registerScreen('boarding', {
  mount() {
    const m = MISSIONS.find(x => x.id === Game.mission);
    if (!m) { go('destinations'); return; }
    const root = $('screen-boarding');
    root.innerHTML = `
      <div id="board-canvas" style="position:absolute;inset:0"></div>
      <div class="quest-panel" id="board-quests"></div>
      <div style="position:absolute;top:12px;left:50%;transform:translateX(-50%);z-index:24;pointer-events:none;text-align:center">
        <div class="eyebrow" style="font-size:9px;opacity:.75">${m.craft} · ${m.nameEn} · PRE-FLIGHT CHECK</div>
      </div>
      <div id="board-tip" style="position:absolute;bottom:36px;left:0;right:0;display:flex;gap:6px;justify-content:center;z-index:20;pointer-events:none">
        <span class="pill" style="font-size:10px">← → للمشي</span>
        <span class="pill" style="font-size:10px">أو اضغط مكان على الأرض</span>
        <span class="pill" style="font-size:10px">الفحص تلقائي بالوصول</span>
      </div>
    `;

    /* ---------- قائمة المهام ---------- */
    Quest.reset([
      { id: 'fuel',   t: 'افحص خزان المؤكسد' },
      { id: 'shield', t: 'افحص الدرع الحراري' },
      { id: 'telem',  t: 'افحص حلقة الاتصال الأرضي' },
      { id: 'enter',  t: 'اصعد إلى المركبة واستقر في مقعدك' }
    ]);
    Quest.mount(root.querySelector('#board-quests'), 'تجهيز ' + m.craft);

    const CHECKPOINTS = [
      { id: 'fuel',   x: 0.24, label: 'LOX',  fact: 'مؤكسد سائل يغلي عند −183°م — الضغط لازم يطابق درجة الغليان قبل الإشعال.' },
      { id: 'shield', x: 0.42, label: 'TPS',  fact: 'درع كربون/فينوليك يتحمل 1600°م وقت دخول الغلاف الجوي.' },
      { id: 'telem',  x: 0.585, label: 'S-Band', fact: 'قناة S-Band — الثواني الأولى بعد الإقلاع هي أخطر مرحلة في الاتصال.' }
    ];
    /* موضع السلّم يُحسب ديناميكيًا حسب مقاس الشاشة (يُضبط بعد الرسم الأول) */
    function hatchFrac(geom, W) { return (geom.cx + geom.rampTip.x * geom.sc) / W; }
    let hatchFracNow = 0.60;

    const cvs = makeCanvas($('board-canvas'));
    const { ctx } = cvs;
    let stop = false, raf = 0;
    let t = 0, phase = 'prep';       // prep → seq → done
    let seqT = 0;
    let doneTimer = null;

    const player = { x: 0.09, tx: null, facing: 1, walkPhase: 0 };
    const SPEED = 0.30;
    const input = { left: false, right: false };

    /* ---------------- عناصر المشهد ---------------- */
    const rockBumps = Array.from({ length: 26 }, (_, i) => ({
      x: i / 26 + (i % 3) * 0.01, w: 24 + (i * 17) % 60, h: 6 + (i * 11) % 16
    }));

    function drawSurface(W, H) {
      const gy = H * 0.72;
      const skyTop = m.id === 'mars' ? '#3a1b0e' : m.id === 'venus' ? '#7a4a12' : '#04070f';
      const skyBot = m.id === 'mars' ? '#c07a4a' : m.id === 'venus' ? '#ffcf6b' : '#1b2c44';
      skyGradient(ctx, W, H, skyTop, skyBot);
      if (m.id === 'moon' || m.id === 'mercury' || m.id === 'saturn') starField(ctx, W, H * 0.7, 150, 5, 0.7);
      // شفق فجر
      const dawn = ctx.createLinearGradient(0, H * 0.34, 0, gy);
      dawn.addColorStop(0, 'rgba(255,170,110,0)');
      dawn.addColorStop(1, 'rgba(255,170,110,.22)');
      ctx.fillStyle = dawn; ctx.fillRect(0, H * 0.34, W, gy - H * 0.34);

      ctx.fillStyle = m.id === 'mars' ? '#4a2317' : m.id === 'venus' ? '#a87a2a' : '#0e1522';
      ctx.beginPath();
      ctx.moveTo(0, gy);
      for (let x = 0; x <= W; x += 60) {
        ctx.quadraticCurveTo(x + 30, gy - 40 - Math.sin(x * 0.006) * 55, x + 60, gy - 10);
      }
      ctx.lineTo(W, gy); ctx.lineTo(0, gy); ctx.fill();

      const gg = ctx.createLinearGradient(0, gy, 0, H);
      if (m.id === 'mars') { gg.addColorStop(0, '#7a4327'); gg.addColorStop(1, '#2b1510'); }
      else if (m.id === 'venus') { gg.addColorStop(0, '#c9a24a'); gg.addColorStop(1, '#5d4517'); }
      else if (m.id === 'moon') { gg.addColorStop(0, '#8b8f99'); gg.addColorStop(1, '#2a2d34'); }
      else { gg.addColorStop(0, '#3d434e'); gg.addColorStop(1, '#11141a'); }
      ctx.fillStyle = gg;
      ctx.fillRect(0, gy, W, H - gy);

      for (const r of rockBumps) {
        ctx.fillStyle = 'rgba(0,0,0,.22)';
        ctx.beginPath();
        ctx.ellipse(r.x * W, gy + 16 + r.h, r.w, r.h * 0.55, 0, 0, 7);
        ctx.fill();
      }
      // منصّة
      ctx.strokeStyle = 'rgba(200,225,240,.13)';
      ctx.lineWidth = 3; ctx.setLineDash([14, 12]);
      ctx.beginPath(); ctx.ellipse(W * 0.72, gy + 40, W * 0.28, H * 0.07, 0, 0, 7); ctx.stroke();
      ctx.setLineDash([]);
      // خطوط الهبوط الأرضي (road to pad)
      ctx.fillStyle = 'rgba(214,228,240,.06)';
      ctx.beginPath();
      ctx.moveTo(0, gy + 54); ctx.lineTo(W * 0.72 - 130, gy + 18); ctx.lineTo(W * 0.72 - 60, gy + 18); ctx.lineTo(80, gy + 72);
      ctx.closePath(); ctx.fill();
    }

    function drawCraftSide(W, H, rampAngle) {
      const gy = H * 0.72;
      const cx = W * 0.76;
      const baseY = gy + 20;
      const sc = Math.min(W / 1200, H / 700) * 1.05;

      ctx.save();
      ctx.translate(cx, baseY);
      ctx.scale(sc, sc);

      ctx.fillStyle = 'rgba(0,0,0,.4)';
      ctx.beginPath(); ctx.ellipse(0, 18, 190, 26, 0, 0, 7); ctx.fill();

      ctx.strokeStyle = '#4b5765'; ctx.lineWidth = 11; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-120, -10); ctx.lineTo(-152, 16); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(120, -10); ctx.lineTo(152, 16); ctx.stroke();

      const bodyGrad = ctx.createLinearGradient(-150, -320, 150, 10);
      bodyGrad.addColorStop(0, '#f3f6fa'); bodyGrad.addColorStop(0.35, '#d3dae4');
      bodyGrad.addColorStop(0.68, '#9aa6b6'); bodyGrad.addColorStop(1, '#5c6877');
      ctx.fillStyle = bodyGrad;
      ctx.beginPath();
      ctx.moveTo(-150, -6);
      ctx.quadraticCurveTo(-150, -46, -110, -58);
      ctx.lineTo(110, -58); ctx.quadraticCurveTo(150, -46, 150, -6);
      ctx.quadraticCurveTo(0, 16, -150, -6);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.42)'; ctx.lineWidth = 2.2; ctx.stroke();

      const modGrad = ctx.createLinearGradient(-110, -220, 110, -60);
      modGrad.addColorStop(0, '#ffffff'); modGrad.addColorStop(0.42, '#e2e8f0');
      modGrad.addColorStop(0.8, '#9fabb9'); modGrad.addColorStop(1, '#6b7887');
      ctx.fillStyle = modGrad;
      rr(ctx, -108, -224, 216, 172, 16); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 2; ctx.stroke();

      ctx.strokeStyle = 'rgba(60,74,90,.24)'; ctx.lineWidth = 1.8;
      for (let i = 1; i < 4; i++) {
        const yy = -224 + i * 43;
        ctx.beginPath(); ctx.moveTo(-108, yy); ctx.lineTo(108, yy); ctx.stroke();
      }
      ctx.fillStyle = 'rgba(40,54,70,.22)';
      ctx.fillRect(-108, -110, 216, 6);
      ctx.fillRect(-108, -180, 216, 4);

      const capGrad = ctx.createLinearGradient(-78, -320, 78, -224);
      capGrad.addColorStop(0, '#ffffff'); capGrad.addColorStop(0.6, '#c3ccd8'); capGrad.addColorStop(1, '#7f8b9a');
      ctx.fillStyle = capGrad;
      ctx.beginPath();
      ctx.moveTo(-78, -224);
      ctx.quadraticCurveTo(-72, -308, 0, -322);
      ctx.quadraticCurveTo(72, -308, 78, -224);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = 2; ctx.stroke();

      ctx.fillStyle = m.color;
      ctx.beginPath(); ctx.arc(-46, -130, 26, 0, 7); ctx.fill();
      ctx.fillStyle = '#0a1420';
      ctx.font = '900 20px "Segoe UI",sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(m.num, -46, -128);
      ctx.textBaseline = 'alphabetic';

      ctx.fillStyle = '#183348';
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(6 + i * 30, -196, 7.5, 0, 7); ctx.fill(); }
      ctx.fillStyle = 'rgba(140,220,255,.4)';
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(4 + i * 30, -198, 3.2, 0, 7); ctx.fill(); }
      ctx.fillStyle = '#12293a';
      for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.arc(i * 22, -268, 7, 0, 7); ctx.fill(); }
      ctx.fillStyle = '#39414c';
      ctx.beginPath();
      ctx.moveTo(-150, -6); ctx.quadraticCurveTo(0, 16, 150, -6);
      ctx.lineTo(146, -20); ctx.quadraticCurveTo(0, 0, -146, -20);
      ctx.closePath(); ctx.fill();

      // ------- البوابة + السلم -------
      const doorW = 46, doorH = 58;
      const doorX = -108 - 6, doorY = -150;
      ctx.fillStyle = '#0c1420';
      rr(ctx, doorX - 4, doorY - 4, doorW + 8, doorH + 8, 7); ctx.fill();
      ctx.fillStyle = '#05090f';
      rr(ctx, doorX, doorY, doorW, doorH, 6); ctx.fill();
      const inG = ctx.createRadialGradient(doorX + doorW * 0.5, doorY + doorH * 0.72, 2,
        doorX + doorW * 0.5, doorY + doorH * 0.72, doorH * 0.95);
      inG.addColorStop(0, 'rgba(150,220,255,.55)');
      inG.addColorStop(0.55, 'rgba(90,170,240,.2)');
      inG.addColorStop(1, 'rgba(60,120,190,0)');
      ctx.fillStyle = inG;
      rr(ctx, doorX, doorY, doorW, doorH, 6); ctx.fill();
      ctx.strokeStyle = 'rgba(196,214,232,.55)'; ctx.lineWidth = 2;
      rr(ctx, doorX, doorY, doorW, doorH, 6); ctx.stroke();
      ctx.save();
      ctx.shadowColor = 'rgba(255,180,80,.9)'; ctx.shadowBlur = 10;
      ctx.fillStyle = 'rgba(255,205,130,.9)';
      ctx.beginPath(); ctx.arc(doorX + doorW / 2, doorY - 9, 2.6, 0, 7); ctx.fill();
      ctx.restore();

      const pivX = doorX + 6, pivY = doorY + doorH;
      const tipLY = ((H * 0.72 + 10) - baseY) / sc;
      const tipLX = -236;
      const RAMP_L = Math.hypot(tipLX - pivX, tipLY - pivY);
      const openAng = Math.atan2(tipLY - pivY, tipLX - pivX);
      const ang = rampAngle === null ? openAng : lerp(Math.PI / 2, openAng, rampAngle);
      if (rampAngle !== null) {
      ctx.save();
      ctx.translate(pivX, pivY);
      ctx.rotate(ang);
      const rampG = ctx.createLinearGradient(0, -12, 0, 4);
      rampG.addColorStop(0, '#b9c4d2'); rampG.addColorStop(1, '#6d7a89');
      ctx.fillStyle = rampG;
      rr(ctx, 0, -11, RAMP_L, 13, 3); ctx.fill();
      ctx.strokeStyle = 'rgba(28,38,50,.55)'; ctx.lineWidth = 1.4;
      for (let i = 1; i < 14; i++) {
        const xx = i * (RAMP_L / 14);
        ctx.beginPath(); ctx.moveTo(xx, -11); ctx.lineTo(xx, 2); ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(214,228,244,.7)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(4, -22); ctx.lineTo(RAMP_L, -22); ctx.stroke();
      ctx.lineWidth = 1.6;
      for (let i = 1; i <= 5; i++) {
        const xx = i * (RAMP_L / 5.4);
        ctx.beginPath(); ctx.moveTo(xx, -22); ctx.lineTo(xx, -11); ctx.stroke();
      }
      ctx.restore();
      }

      if (rampAngle !== null && rampAngle > 0.92) {
        const tipX = pivX + Math.cos(ang) * RAMP_L;
        ctx.fillStyle = 'rgba(0,0,0,.28)';
        ctx.beginPath(); ctx.ellipse(tipX + 10, -2, 22, 5, 0, 0, 7); ctx.fill();
      }
      ctx.restore();

      return {
        sc, cx, baseY, gy,
        rampTip: { x: pivX + Math.cos(openAng) * RAMP_L, y: pivY + Math.sin(openAng) * RAMP_L },
        rampPivot: { x: pivX, y: pivY }
      };
    }

    /* ---- فحص اللاعب ---- */
    function currentCheckpoint() {
      const id = Quest.activeId();
      return CHECKPOINTS.find(c => c.id === id) || null;
    }
    function nearestInspectable() {
      const c = currentCheckpoint();
      if (!c) return null;
      return Math.abs(player.x - c.x) < 0.055 ? c : null;
    }
    function doInspect() {
      const c = nearestInspectable();
      if (!c) return;
      Quest.complete(c.id);
      Audio.ok();
      toast(`<b>${c.label}:</b> ${c.fact}`, 'good', 6000);
    }

    /* ---- لوحة اللمس/الماوس: اضغط مكان على الأرض ---- */
    cvs.cv.addEventListener('pointerdown', (e) => {
      if (phase !== 'prep') return;
      const rect = cvs.cv.getBoundingClientRect();
      const rx = rect.width ? (e.clientX - rect.left) / rect.width : 0.5;
      player.tx = clamp(rx, 0.06, 0.82);
    }, { passive: true });

    /* ---- لوحة المفاتيح ---- */
    const keyMap = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right' };
    const onKey = (e, down) => {
      const k = keyMap[e.code] || keyMap[e.key];
      if (k) { input[k] = down; e.preventDefault(); }
      if (down && (e.code === 'KeyE' || e.key === 'e' || e.key === 'E' || e.code === 'Space')) doInspect();
    };
    const kd = e => onKey(e, true), ku = e => onKey(e, false);
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);

    /* ---- قصّة قصيرة: اصعد للسلّم ---- */
    const TL2 = { rampOpen: 1.3, rampEnd: 2.6, climb: 4.6, enter: 5.2, door: 6.6, ready: 7.1 };
    function startSeq() {
      phase = 'seq'; seqT = 0;
      Quest.complete('enter');
      $('board-tip').style.opacity = '0';
      Audio.boot();
    }

    let lastTime = performance.now();
    function frame(now) {
      if (stop) return;
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      t += dt;

      const W = cvs.w, H = cvs.h;
      ctx.clearRect(0, 0, W, H);
      drawSurface(W, H);

      const groundY = H * 0.72 + 10;
      let rampAngle = null;
      if (phase === 'seq' || phase === 'done') {
        seqT += dt;
        const rampK = clamp((seqT - TL2.rampOpen * 0.4) / (TL2.rampEnd - TL2.rampOpen * 0.4), 0, 1);
        const closeK = clamp((seqT - (TL2.door - 1.3)) / 1.3, 0, 1);
        rampAngle = easeOut(rampK) * (1 - easeIn(closeK));
      }
      const geom = drawCraftSide(W, H, rampAngle);
      hatchFracNow = hatchFrac(geom, W);
      const tipX = geom.cx + geom.rampTip.x * geom.sc;
      const tipY = geom.baseY + geom.rampTip.y * geom.sc;
      const doorBX = geom.cx + geom.rampPivot.x * geom.sc;
      const doorBY = geom.baseY + geom.rampPivot.y * geom.sc;

      /* ---------- تحديث اللاعب ---------- */
      if (phase === 'prep') {
        let mv = 0;
        if (input.left) mv -= 1;
        if (input.right) mv += 1;
        if (mv !== 0) { player.tx = null; player.x += mv * SPEED * dt; player.facing = mv; player.walkPhase += dt * 11; }
        else if (player.tx != null) {
          const dx = player.tx - player.x;
          if (Math.abs(dx) < 0.008) { player.tx = null; }
          else { const s = Math.sign(dx); player.x += s * SPEED * dt; player.facing = s; player.walkPhase += dt * 11; }
        }
        player.x = clamp(player.x, 0.05, Math.min(0.84, hatchFracNow + 0.03));
        // هل وصل للسلّم؟ (يشترط إتمام مهام الفحص)
        const enterReady = Quest.activeId() === 'enter';
        if (enterReady && player.x > hatchFracNow - 0.012) startSeq();

        // الفحص تلقائي: امشِ لأي نقطة تفتيش نشطة وهي تتفحص لوحدها
        const auto = nearestInspectable();
        if (auto && !input.left && !input.right && player.tx == null) doInspect();
      }

      /* ---------- موضع الرائد ---------- */
      let px = player.x * W, py = groundY, pScale = 1, alpha = 1, tilt = 0, facing = player.facing, walkPhase = player.walkPhase, mode = 'idle';
      if (mvActive()) mode = 'walk';
      function mvActive() { return input.left || input.right || player.tx != null ||
        (phase === 'prep' && false); }

      if (phase === 'seq' || phase === 'done') {
        const k1 = clamp(seqT / TL2.climb, 0, 1);
        if (seqT < TL2.rampEnd * 0.55) {
          px = clamp(player.x * W, 0.05 * W, (hatchFracNow + 0.03) * W);
          py = groundY; walkPhase = seqT * 13; mode = 'walk'; facing = 1;
        } else if (seqT < TL2.climb) {
          const kk = easeInOut(clamp((seqT - TL2.rampEnd * 0.55) / (TL2.climb - TL2.rampEnd * 0.55), 0, 1));
          px = lerp(tipX - 10, doorBX, kk);
          py = lerp(groundY, doorBY, kk);
          pScale = lerp(1, 0.86, kk); tilt = -0.2 * kk;
          walkPhase = seqT * 13; mode = 'walk'; facing = 1;
        } else {
          const kk = clamp((seqT - TL2.climb) / (TL2.enter - TL2.climb), 0, 1);
          px = doorBX; py = doorBY;
          pScale = lerp(0.86, 0.64, kk); alpha = 1 - kk; tilt = -0.12;
          walkPhase = seqT * 14; mode = 'walk'; facing = 1;
        }
      }

      if (px > -200) {
        ctx.globalAlpha = alpha;
        drawAstronaut(ctx, px, py, {
          scale: pScale * Math.min(W / 1100, 1.15),
          facing, walkPhase, mode: (phase === 'prep' ? (mode) : 'walk'),
          tilt, accent: m.accent, suit: '#eef3f9'
        });
        ctx.globalAlpha = 1;
      }

      /* ---------- معالم الفحص ---------- */
      const gy2 = groundY;
      for (const c of CHECKPOINTS) {
        const done = Quest.isDone(c.id);
        const active = Quest.activeId() === c.id;
        const cx2 = c.x * W;
        // قاعدة
        ctx.save();
        if (c.id === 'fuel') {
          ctx.fillStyle = 'rgba(10,18,28,.95)';
          rr(ctx, cx2 - 34, gy2 - 52, 68, 46, 9); ctx.fill();
          ctx.fillStyle = done ? '#2f9e63' : active ? '#3aa0d8' : '#22303f';
          rr(ctx, cx2 - 26, gy2 - 46, 52, 34, 7); ctx.fill();
          ctx.fillStyle = 'rgba(5,10,18,.9)';
          ctx.font = '900 11px "Segoe UI",sans-serif'; ctx.textAlign = 'center';
          ctx.fillText(c.label, cx2, gy2 - 24);
        } else if (c.id === 'shield') {
          ctx.translate(cx2, gy2 - 4); ctx.rotate(-0.32);
          ctx.fillStyle = 'rgba(10,18,28,.95)'; rr(ctx, -36, -26, 72, 46, 8); ctx.fill();
          ctx.fillStyle = done ? '#2f9e63' : active ? '#c8862e' : '#2b2b33';
          for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) {
            rr(ctx, -30 + i * 16, -19 + j * 13, 12, 9, 2); ctx.fill();
          }
        } else {
          ctx.strokeStyle = '#39465a'; ctx.lineWidth = 5;
          ctx.beginPath(); ctx.moveTo(cx2, gy2); ctx.lineTo(cx2, gy2 - 88); ctx.stroke();
          ctx.fillStyle = 'rgba(10,18,28,.95)';
          ctx.beginPath(); ctx.ellipse(cx2, gy2 - 92, 17, 9, 0, 0, 7); ctx.fill();
          ctx.fillStyle = done ? '#45e08a' : (Math.sin(t * 4) > 0 ? '#ffb347' : '#5a3d18');
          ctx.beginPath(); ctx.arc(cx2, gy2 - 100, 3.4, 0, 7); ctx.fill();
        }
        ctx.restore();
        // هالة + علامة المهمة النشطة
        if (active) {
          const pulse = 0.55 + Math.sin(t * 5) * 0.3;
          const gg = ctx.createRadialGradient(cx2, gy2 - 40, 4, cx2, gy2 - 40, 74);
          gg.addColorStop(0, `rgba(255,214,120,${0.34 * pulse})`);
          gg.addColorStop(1, 'rgba(255,214,120,0)');
          ctx.fillStyle = gg;
          ctx.beginPath(); ctx.arc(cx2, gy2 - 40, 74, 0, 7); ctx.fill();
          // سهم قافز
          const bob = Math.sin(t * 6) * 6;
          ctx.fillStyle = '#ffd479';
          ctx.beginPath();
          ctx.moveTo(cx2, gy2 - 128 + bob);
          ctx.lineTo(cx2 - 9, gy2 - 146 + bob);
          ctx.lineTo(cx2 + 9, gy2 - 146 + bob);
          ctx.closePath(); ctx.fill();
        } else if (done) {
          ctx.fillStyle = '#45e08a';
          ctx.beginPath(); ctx.arc(cx2, gy2 - 100, 9, 0, 7); ctx.fill();
          ctx.strokeStyle = '#052012'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(cx2 - 4.5, gy2 - 100); ctx.lineTo(cx2 - 1, gy2 - 96.5); ctx.lineTo(cx2 + 5, gy2 - 104); ctx.stroke();
        }
      }

      // غبار أثناء المشي
      if (phase === 'prep' && mvActive()) {
        const dustC = m.id === 'mars' ? '210,150,110' : m.id === 'venus' ? '235,210,150' : '200,205,215';
        for (let i = 0; i < 3; i++) {
          const gx = px - facing * (14 + i * 12);
          ctx.fillStyle = `rgba(${dustC},${0.24 - i * 0.06})`;
          ctx.beginPath(); ctx.arc(gx, groundY + 4, 2.4 + i * 1.4, 0, 7); ctx.fill();
        }
      }

      /* ---------- جاهز ---------- */
      if (phase === 'seq' && seqT > TL2.ready && phase !== 'done') {
        phase = 'done';
        toast('الطاقم على متن <b>' + m.craft + '</b> — كل الأنظمة خضراء.', 'good');
        doneTimer = setTimeout(() => {
          stop = true; cancelAnimationFrame(raf); cvs.destroy();
          go('launch');
        }, 1400);
      }

      vignette(ctx, W, H, 0.55);
      raf = requestAnimationFrame(frame);
    }

    function easeOut(k) { return 1 - Math.pow(1 - k, 3); }
    function easeIn(k) { return k * k; }
    function easeInOut(k) { return k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; }

    frame(performance.now());

    /* @QA — أدوات اختبار */
    window.Board = {
      get state() { return { phase, x: player.x, active: Quest.activeId() }; }, // @QA
      teleport(v) { player.x = v; } // @QA
    };

    this._stop = () => {
      stop = true; cancelAnimationFrame(raf); cvs.destroy();
      if (doneTimer) clearTimeout(doneTimer);
      window.removeEventListener('keydown', kd);
      window.removeEventListener('keyup', ku);
    };
  },
  unmount() { if (this._stop) this._stop(); }
});


/* ======================================================================
   LAUNCH — عد تنازلي → إشعال → صعود → الغلاف الجوي → الفضاء → المدار
   ====================================================================== */
registerScreen('launch', {
  mount() {
    const m = MISSIONS.find(x => x.id === Game.mission);
    if (!m) { go('destinations'); return; }
    const root = $('screen-launch');
    root.innerHTML = `
      <div id="launch-canvas" style="position:absolute;inset:0"></div>

      <!-- كابينة القيادة -->
      <div id="cockpit" style="position:absolute;inset:0;pointer-events:none;opacity:0;transition:opacity .8s">
        <div style="position:absolute;inset:0;
          background:radial-gradient(ellipse 70% 60% at 50% 50%,transparent 40%,rgba(2,5,10,.85) 100%)"></div>
        <!-- زجاج الكابينة: عمودا A + انعكاس + لوحة قيادة منحنية -->
        <svg style="position:absolute;top:0;left:0;width:100%;height:36%;pointer-events:none"
             viewBox="0 0 1440 280" preserveAspectRatio="none">
          <polygon points="0,0 320,0 110,280 0,280" fill="#04070c" opacity="0.92"/>
          <polygon points="1440,0 1120,0 1330,280 1440,280" fill="#04070c" opacity="0.92"/>
          <line x1="318" y1="2" x2="109" y2="278" stroke="rgba(130,205,255,.22)" stroke-width="2"/>
          <line x1="1122" y1="2" x2="1331" y2="278" stroke="rgba(130,205,255,.22)" stroke-width="2"/>
          <polygon points="980,0 1180,0 700,280 560,280" fill="#ffffff" opacity="0.028"/>
        </svg>
        <svg style="position:absolute;bottom:0;left:0;width:100%;height:30%;pointer-events:none"
             viewBox="0 0 1440 240" preserveAspectRatio="none">
          <path d="M0,152 C 250,95 480,70 720,70 C 960,70 1190,95 1440,152 L1440,240 L0,240 Z"
                fill="#05080d" opacity="0.95"/>
          <path d="M0,152 C 250,95 480,70 720,70 C 960,70 1190,95 1440,152"
                fill="none" stroke="rgba(130,205,255,.42)" stroke-width="1.6"/>
          <path d="M0,161 C 250,104 480,79 720,79 C 960,79 1190,104 1440,161"
                fill="none" stroke="rgba(130,205,255,.13)" stroke-width="6"/>
          <g fill="rgba(150,220,255,.5)">
            <circle cx="180" cy="124" r="1.7"/><circle cx="360" cy="96" r="1.7"/>
            <circle cx="540" cy="80" r="1.7"/><circle cx="720" cy="74" r="1.7"/>
            <circle cx="900" cy="80" r="1.7"/><circle cx="1080" cy="96" r="1.7"/>
            <circle cx="1260" cy="124" r="1.7"/>
          </g>
        </svg>

        <div class="mono" style="position:absolute;left:30px;bottom:32px;font-size:11px;color:#7fd9ff;line-height:1.9">
          <div>ZATHURA · MISSION ${m.num}</div>
          <div id="ck-alt">ALT 000.00 km</div>
          <div id="ck-vel">VEL 0.00 km/s</div>
        </div>
        <div class="mono" style="position:absolute;right:30px;bottom:32px;font-size:11px;color:#7fd9ff;line-height:1.9;text-align:right">
          <div id="ck-stage">STAGE 1</div>
          <div id="ck-thr">THRUST 0%</div>
          <div id="ck-stab" style="color:#45e08a">STABILIZED</div>
        </div>
      </div>

      <!-- العد التنازلي -->
      <div id="countdown" style="position:absolute;inset:0;display:grid;place-items:center;pointer-events:none;opacity:0;transition:opacity .4s">
        <div style="text-align:center">
          <div class="eyebrow" style="font-size:10px;color:#ff9aa4">MISSION ${m.num} · ${m.nameEn}</div>
          <div class="mono" id="cd-num" style="font-size:clamp(70px,16vw,170px);font-weight:900;
            line-height:1;color:#fff;text-shadow:0 0 70px rgba(255,180,90,.7),0 0 140px rgba(255,120,60,.4)">3</div>
          <div class="eyebrow" style="font-size:11px;letter-spacing:5px;color:#ffb347" id="cd-txt">HOLD DOWN · IGNITION SEQUENCE</div>
        </div>
      </div>

      <!-- عنوان الكوكب بعد الوصول للمدار -->
      <div id="dest-reveal" style="position:absolute;inset:0;display:grid;place-items:center;
        pointer-events:none;opacity:0;transition:opacity 1.2s">
        <div style="text-align:center;padding:0 24px">
          <div class="eyebrow" style="font-size:10px;color:${m.color};letter-spacing:3px">EARTH → ${m.nameEn} · TRANSIT BURN</div>
          <div class="h1" style="margin:12px 0 10px;color:#fff;text-shadow:0 0 50px ${m.color}88">${m.name}</div>
          <div class="sub" style="max-width:520px;margin:0 auto;font-size:13px">${m.site}</div>
          <div class="eyebrow" style="margin-top:18px;font-size:9px;color:#9fdcff;opacity:.85">جارِ التحضير للهبوط على السطح…</div>
        </div>
      </div>

      <!-- الإشعال التفاعلي: اضغط مطولًا -->
      <div id="ign">
        <button id="ign-hold" aria-label="START — ابدأ الإطلاق">
          <span id="ign-ring" aria-hidden="true"></span>
          <span class="ign-word">START</span>
          <small>HOLD TO IGNITE · اضغط مطوّلًا</small>
        </button>
        <div id="ign-track"><div id="ign-fill"></div></div>
        <div id="ign-txt">اضغط START مطوّلًا حتى الضغط الكامل</div>
      </div>
    `;

    const cvs = makeCanvas($('launch-canvas'));
    const { ctx } = cvs;

    /* ---------- جدول الإقلاع ---------- */
    /* أدوات تهدئة الحركة — محلية لهذا المشهد (لا تعتمد على شاشة التجهيز) */
    const easeOut = k => 1 - Math.pow(1 - k, 3);
    const easeInOut = k => k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    const T = {
      cockpitIn: 0.3,
      countdownStart: 1.4, countdownEnd: 5.4,
      ignite: 5.4,
      liftOff: 6.6,
      atmoStart: 7.6, atmoEnd: 12.0,
      cloudsStart: 8.4, cloudsEnd: 10.4,
      spaceStart: 11.0, spaceEnd: 15.0,
      orbit: 15.5,
      reveal: 17.0
    };
    let t = 0, stop = false, raf = 0, lastNum = -1, nextShown = false;
    let shake = 0;
    const UPG_MUL = (window.UPG && UPG.thrustMul) ? UPG.thrustMul() : 1;
    /* ---- الإشعال التفاعلي ---- */
    let lit = false, pressure = 0, holding = false, ignRaf = 0, autoStart = false;
    const ignEl = $('ign'), ignFill = $('ign-fill'), ignHold = $('ign-hold'), ignTxt = $('ign-txt'), ignRing = $('ign-ring');
    function setHold(v) {
      holding = v;
      if (ignHold) ignHold.classList.toggle('holding', v);
    }
    const down = e => { e.preventDefault(); setHold(true); };
    const up = () => { if (!autoStart) setHold(false); };
    if (ignHold) {
      ignHold.addEventListener('pointerdown', down);
      ignHold.addEventListener('click', () => {
        if (lit || autoStart) return;
        autoStart = true; setHold(true);
        if (ignTxt) ignTxt.textContent = 'START — المحركات تشتعل…';
      });
      window.addEventListener('pointerup', up);
      ignHold.addEventListener('keydown', e => { if (e.code === 'Space' || e.code === 'Enter') down(e); });
      window.addEventListener('keyup', e => { if (e.code === 'Space' || e.code === 'Enter') up(); });
    }
    const kdSpace = e => { if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); setHold(true); } };
    const kuSpace = e => { if (e.code === 'Space' || e.code === 'Enter') setHold(false); };
    window.addEventListener('keydown', kdSpace);
    window.addEventListener('keyup', kuSpace);
    function ignite() {
      lit = true; autoStart = false; holding = false;
      try { if (window.ACH) ACH.event({ launches: 1 }); } catch (e) {}
      t = T.countdownStart - 0.01;
      Audio.boot(); Audio.rumble();
      if (ignEl) ignEl.style.display = 'none';
      toast('<b>IGNITION!</b> المحركات اشتعلت — الإقلاع الآن.', 'good');
    }

    function setCount(n) {
      if (n === lastNum) return;
      lastNum = n;
      const e = $('cd-num');
      if (e) {
        e.textContent = n > 0 ? String(n) : 'GO';
        e.style.transform = 'scale(1.35)';
        e.style.transition = 'transform .35s cubic-bezier(.2,.9,.3,1)';
        requestAnimationFrame(() => { e.style.transform = 'scale(1)'; });
      }
      n > 0 ? Audio.countdown() : Audio.go();
    }

    /* ---------- طبقات المشهد ---------- */
    const cloudBands = Array.from({ length: 26 }, () => ({
      x: Math.random(), y: Math.random(),
      r: 60 + Math.random() * 240, a: 0.1 + Math.random() * 0.4,
      sp: 0.4 + Math.random() * 1.4
    }));
    const starCache = Array.from({ length: 340 }, () => ({
      x: Math.random(), y: Math.random(), r: Math.random() * 1.6 + 0.2, a: Math.random() * 0.9 + 0.1
    }));
    /* ---------- جسم الوجهة — مشهد العبور الفضائي ---------- */
    const DEST_BODY = {
      moon:    { r: 1.00, stops: ['#ffffff', '#d8d8d8', '#9a9a9a', '#3a3a3a'], craters: 11, glow: 'rgba(240,240,240,.55)' },
      mars:    { r: 0.92, stops: ['#f4a468', '#c05a34', '#8b3a1e', '#26090a'], craters: 5, cap: true, glow: 'rgba(255,150,90,.5)' },
      mercury: { r: 0.78, stops: ['#ddd0c2', '#a89a8c', '#66584e', '#221c17'], craters: 13, glow: 'rgba(222,206,186,.45)' },
      venus:   { r: 1.06, stops: ['#ffedaf', '#e8c060', '#a8842a', '#2e2408'], bands: 5, glow: 'rgba(255,226,150,.55)' },
      saturn:  { r: 1.32, stops: ['#f5e9c0', '#cbb98a', '#93805a', '#221d12'], bands: 7, ring: true, glow: 'rgba(233,218,163,.5)' },
      zewail:  { r: 0.88, stops: ['#e2fdff', '#4dd9ff', '#12708c', '#031d26'], bands: 2, aurora: true, glow: 'rgba(90,230,255,.6)' }
    };
    /* سحب بطيئة تنجرف في مشهد ما قبل الإشعال */
    const preClouds = Array.from({ length: 6 }, (_, i) => ({
      x: (i * 0.23 + 0.08) % 1.1, y: 0.10 + (i % 3) * 0.09, r: 90 + (i * 67) % 150, a: 0.35 + (i % 3) * 0.2, sp: 0.011 + (i % 3) * 0.006
    }));
    const embers = [];
    let lastT = performance.now();

    /* ---------- رسم الصاروخ الجانبي ---------- */
    function drawRocket(W, H, alt, flame) {
      const cx = W * 0.5;
      const baseY = H * 0.88 + alt * H * 0.06;
      const sc = Math.min(W / 1200, H / 800) * 1.15;

      ctx.save();
      ctx.translate(cx, baseY);
      ctx.scale(sc, sc);

      // اللهب — برتقالي بالجو، أزرق شاحب في الفراغ
      const vacuum = t > T.spaceStart;
      if (flame > 0.01) {
        const fl = ctx.createLinearGradient(0, 60, 0, 60 + 240 * flame);
        if (vacuum) {
          fl.addColorStop(0, 'rgba(235,250,255,.95)');
          fl.addColorStop(0.25, 'rgba(150,215,255,.85)');
          fl.addColorStop(0.62, 'rgba(80,150,255,.45)');
          fl.addColorStop(1, 'rgba(60,110,255,0)');
        } else {
          fl.addColorStop(0, 'rgba(255,255,235,.95)');
          fl.addColorStop(0.22, 'rgba(255,205,110,.9)');
          fl.addColorStop(0.6, 'rgba(255,120,40,.55)');
          fl.addColorStop(1, 'rgba(255,60,20,0)');
        }
        ctx.fillStyle = fl;
        const wig = Math.sin(t * 40) * 6 * flame;
        ctx.beginPath();
        ctx.moveTo(-24, 56);
        ctx.quadraticCurveTo(-30 + wig, 120 + 90 * flame, 0, 130 + 200 * flame);
        ctx.quadraticCurveTo(30 + wig, 120 + 90 * flame, 24, 56);
        ctx.closePath();
        ctx.fill();

        // قلب اللهب
        ctx.fillStyle = vacuum ? 'rgba(220,240,255,.9)' : 'rgba(255,255,255,.85)';
        ctx.beginPath();
        ctx.moveTo(-11, 56);
        ctx.quadraticCurveTo(-6, 90 + 40 * flame, 0, 96 + 60 * flame);
        ctx.quadraticCurveTo(6, 90 + 40 * flame, 11, 56);
        ctx.closePath();
        ctx.fill();
      }

      // أجنحة
      ctx.fillStyle = '#8e99a8';
      ctx.beginPath();
      ctx.moveTo(-30, -40); ctx.lineTo(-66, 40); ctx.lineTo(-30, 40); ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(30, -40); ctx.lineTo(66, 40); ctx.lineTo(30, 40); ctx.closePath(); ctx.fill();

      // جسم
      const bg = ctx.createLinearGradient(-34, -300, 34, 60);
      bg.addColorStop(0, '#ffffff');
      bg.addColorStop(0.35, '#dfe6ef');
      bg.addColorStop(0.7, '#a3aebd');
      bg.addColorStop(1, '#6a7583');
      ctx.fillStyle = bg;
      ctx.beginPath();
      ctx.moveTo(0, -300);
      ctx.quadraticCurveTo(34, -230, 34, -100);
      ctx.lineTo(34, 52);
      ctx.quadraticCurveTo(0, 62, -34, 52);
      ctx.lineTo(-34, -100);
      ctx.quadraticCurveTo(-34, -230, 0, -300);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = 2; ctx.stroke();

      // شعار
      ctx.fillStyle = m.color;
      ctx.beginPath(); ctx.arc(0, -140, 22, 0, 7); ctx.fill();
      ctx.fillStyle = '#0a1420';
      ctx.font = '900 17px "Segoe UI",sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(m.num, 0, -138);
      ctx.textBaseline = 'alphabetic';

      // شرائط
      ctx.fillStyle = 'rgba(30,42,56,.35)';
      ctx.fillRect(-34, -60, 68, 7);
      ctx.fillRect(-34, -40, 68, 4);

      // كابينة
      ctx.fillStyle = '#1b3a52';
      ctx.beginPath(); ctx.arc(0, -196, 15, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(140,220,255,.5)';
      ctx.beginPath(); ctx.arc(-4, -200, 6, 0, 7); ctx.fill();

      ctx.restore();
    }

    function frame(now) {
      if (stop) return;
      const dt = Math.min(0.05, (now - lastT) / 1000);
      lastT = now;
      t += dt;

      const W = cvs.w, H = cvs.h;
      ctx.clearRect(0, 0, W, H);

      /* ============ طور ما قبل الإشعال ============ */
      if (!lit) {
        // ضغط الإشعال
        pressure = clamp(pressure + (holding ? 0.62 * UPG_MUL * dt : -0.34 * dt), 0, 1);
        if (ignFill) ignFill.style.width = (pressure * 100).toFixed(1) + '%';
        if (ignRing) ignRing.style.setProperty('--p', pressure.toFixed(3));
        if (pressure >= 1) ignite();
        else if (holding && ignTxt) ignTxt.textContent = 'حافظ على الضغط… المحركات ترتفع حرارتها';

        skyGradient(ctx, W, H, '#0a2440', '#6fa8cc');
        // هالة أفقية عند خط الغروب
        const hz = ctx.createLinearGradient(0, H * 0.52, 0, H * 0.82);
        hz.addColorStop(0, 'rgba(255,196,130,0)');
        hz.addColorStop(0.62, 'rgba(255,186,120,.28)');
        hz.addColorStop(1, 'rgba(255,170,110,0)');
        ctx.fillStyle = hz; ctx.fillRect(0, H * 0.52, W, H * 0.32);

        // سحب بطيئة تنجرف
        const nowS = performance.now() * 0.001;
        for (const c of preClouds) {
          c.x += c.sp * 0.016;
          if (c.x > 1.25) c.x = -0.25;
          ctx.globalAlpha = c.a * 0.55;
          ctx.fillStyle = '#f4f8ff';
          ctx.beginPath();
          ctx.ellipse(c.x * W, c.y * H, c.r, c.r * 0.30, 0, 0, 7);
          ctx.ellipse((c.x + 0.055) * W, (c.y + 0.012) * H, c.r * 0.7, c.r * 0.22, 0, 0, 7);
          ctx.fill();
        }
        ctx.globalAlpha = 1;

        // أرض
        const gg = ctx.createLinearGradient(0, H * 0.78, 0, H);
        gg.addColorStop(0, '#3f6b3d'); gg.addColorStop(1, '#16240f');
        ctx.fillStyle = gg; ctx.fillRect(0, H * 0.78, W, H * 0.3);

        // طبقات جبال بعيدة وراء المنصة
        ctx.fillStyle = '#25364a';
        ctx.beginPath(); ctx.moveTo(0, H * 0.785);
        for (let x = 0; x <= W; x += 46) {
          const y = H * 0.775 - 20 - Math.abs(Math.sin(x * 0.011 + 2.1)) * 40 - Math.sin(x * 0.033 + 0.7) * 10;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(W, H * 0.785); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#182635';
        ctx.beginPath(); ctx.moveTo(0, H * 0.79);
        for (let x = 0; x <= W; x += 34) {
          const y = H * 0.785 - 8 - Math.abs(Math.sin(x * 0.017 + 4.4)) * 19;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(W, H * 0.79); ctx.closePath(); ctx.fill();

        // مخروطا إضاءة من البرجين نحو الصاروخ
        for (const [tx, dir] of [[W * 0.265, 1], [W * 0.735, -1]]) {
          ctx.save();
          ctx.globalAlpha = 0.16 + (holding ? 0.07 : 0);
          const fg = ctx.createLinearGradient(tx, H * 0.42, tx + dir * W * 0.24, H * 0.52);
          fg.addColorStop(0, 'rgba(255,255,235,.9)');
          fg.addColorStop(1, 'rgba(255,255,235,0)');
          ctx.fillStyle = fg;
          ctx.beginPath();
          ctx.moveTo(tx, H * 0.40);
          ctx.lineTo(tx + dir * W * 0.30, H * 0.30);
          ctx.lineTo(tx + dir * W * 0.30, H * 0.78);
          ctx.lineTo(tx, H * 0.46);
          ctx.closePath(); ctx.fill();
          ctx.restore();
          // برج الكشاف
          ctx.fillStyle = '#1a2230';
          ctx.fillRect(tx - 4, H * 0.40, 8, H * 0.38);
        }

        // صاري الخدمة
        ctx.fillStyle = '#232c38';
        ctx.fillRect(W * 0.36, H * 0.30, W * 0.022, H * 0.5);
        ctx.fillStyle = '#2e3947';
        for (let i = 0; i < 6; i++) ctx.fillRect(W * 0.335, H * (0.33 + i * 0.085), W * 0.075, 5);

        // أضواء المدرج الكهرمانية المتتابعة
        for (let i = 0; i < 16; i++) {
          const on = (Math.floor(nowS * 4.5) + i) % 8 < 3;
          ctx.fillStyle = on ? '#ffc35e' : 'rgba(120,90,50,.5)';
          ctx.beginPath(); ctx.arc(W * (0.30 + i * 0.0267), H * 0.885, 2.4, 0, 7); ctx.fill();
        }

        // لمبة حمراء وامضة فوق الصاري
        const blink = Math.sin(nowS * 6.2) > 0;
        if (blink) {
          const bg2 = ctx.createRadialGradient(W * 0.371, H * 0.29, 1, W * 0.371, H * 0.29, 16);
          bg2.addColorStop(0, 'rgba(255,95,74,.95)'); bg2.addColorStop(1, 'rgba(255,95,74,0)');
          ctx.fillStyle = bg2; ctx.beginPath(); ctx.arc(W * 0.371, H * 0.29, 16, 0, 7); ctx.fill();
          ctx.fillStyle = '#ff5f4a'; ctx.beginPath(); ctx.arc(W * 0.371, H * 0.29, 5, 0, 7); ctx.fill();
        }

        // بخار ساكن يتموج عند القاعدة
        ctx.globalAlpha = 0.18 + (holding ? 0.1 : 0);
        ctx.fillStyle = '#cfd8e2';
        for (let i = 0; i < 5; i++) {
          const bx2 = W * 0.5 + Math.sin(nowS * 0.7 + i * 1.6) * (26 + i * 12);
          ctx.beginPath();
          ctx.ellipse(bx2, H * 0.895, 34 + Math.sin(nowS * 0.9 + i) * 7, 7, 0, 0, 7);
          ctx.fill();
        }
        ctx.globalAlpha = 1;

        // صبغة زمنية حسب ساعة الأرض الحقيقية (المنصة تشهد كوكبَنا)
        const eh = DayClock.localH('earth');
        const eNight = eh < 5.6 || eh >= 18.4;
        const eDusk = (eh >= 17.0 && eh < 18.4) || (eh >= 5.6 && eh < 7.3);
        if (eNight) { ctx.fillStyle = 'rgba(2,6,17,.42)'; ctx.fillRect(0, 0, W, H); }
        else if (eDusk) { ctx.fillStyle = 'rgba(255,166,88,.12)'; ctx.fillRect(0, 0, W, H); }
        else { ctx.fillStyle = 'rgba(150,200,235,.08)'; ctx.fillRect(0, 0, W, H); }

        // الصاروخ على المنصّة
        drawRocket(W, H, 0, holding ? 0.12 + Math.sin(nowS * 30) * 0.06 : 0);
        // ظل
        ctx.fillStyle = 'rgba(0,0,0,.4)';
        ctx.beginPath(); ctx.ellipse(W * 0.5, H * 0.905, W * 0.16, H * 0.02, 0, 0, 7); ctx.fill();
        vignette(ctx, W, H, 0.5);
        raf = requestAnimationFrame(frame);
        return;
      }

      /* ============ أطوار المشهد ============ */
      if (t < T.atmoStart) {
        /* ---- على الأرض: سماء ---- */
        const k = clamp((t - T.liftOff) / (T.atmoStart - T.liftOff), 0, 1);
        skyGradient(ctx, W, H,
          `rgb(${lerp(12, 24, k)},${lerp(42, 74, k)},${lerp(96, 140, k)})`,
          `rgb(${lerp(96, 130, k)},${lerp(168, 180, k)},${lerp(214, 200, k)})`);
        // سحب بعيدة
        for (const c of cloudBands.slice(0, 12)) {
          ctx.globalAlpha = c.a * 0.5;
          ctx.fillStyle = '#fff';
          ctx.beginPath();
          ctx.ellipse(c.x * W, c.y * H * 0.7 + k * 200, c.r, c.r * 0.28, 0, 0, 7);
          ctx.fill();
        }
        ctx.globalAlpha = 1;

        // أرض تبتعد
        const gy = H * 0.88 + k * H * 0.5;
        const gg = ctx.createLinearGradient(0, gy - 80, 0, H + 100);
        gg.addColorStop(0, '#3f6b3d');
        gg.addColorStop(1, '#1c2f1c');
        ctx.fillStyle = gg;
        ctx.fillRect(0, gy, W, H - gy + 200);
      } else {
        /* ---- الغلاف الجوي ثم الفضاء ---- */
        const kk = clamp((t - T.atmoStart) / (T.spaceEnd - T.atmoStart), 0, 1);
        // من أزرق فاتح → أزرق غامق → أسود
        const r = lerp(130, 2, kk), g = lerp(180, 4, kk), b = lerp(200, 10, kk);
        skyGradient(ctx, W, H, `rgb(${r * 0.35 | 0},${g * 0.45 | 0},${b * 0.6 | 0})`, `rgb(${r | 0},${g | 0},${b | 0})`);

        // توهج الأفق — حزام متوهج ناعم يتلاشى من الطرفين (أفق منحنٍ لا حافة مستقيمة)
        const horizonK = clamp((t - T.atmoStart) / (T.atmoEnd - T.atmoStart), 0, 1);
        if (horizonK < 1) {
          const hy = H * (0.88 - horizonK * 0.44);
          const hh = H * 0.2;
          const a = 1 - horizonK;
          const hg = ctx.createLinearGradient(0, hy - hh * 1.7, 0, hy + hh);
          hg.addColorStop(0, 'rgba(120,190,255,0)');
          hg.addColorStop(0.6, `rgba(140,205,255,${0.32 * a})`);
          hg.addColorStop(0.8, `rgba(196,230,255,${0.5 * a})`);
          hg.addColorStop(1, 'rgba(40,100,180,0)');
          ctx.fillStyle = hg;
          ctx.fillRect(0, hy - hh * 1.7, W, hh * 2.7);
        }

        // سحب تتسارع
        if (t > T.cloudsStart && t < T.cloudsEnd) {
          const ck = clamp((t - T.cloudsStart) / (T.cloudsEnd - T.cloudsStart), 0, 1);
          for (const c of cloudBands) {
            c.y += dt * c.sp * (0.4 + ck * 2.4);
            if (c.y > 1.2) c.y = -0.2;
            ctx.globalAlpha = c.a * (1 - ck * 0.8);
            ctx.fillStyle = '#eaf4ff';
            ctx.beginPath();
            ctx.ellipse(c.x * W, c.y * H, c.r, c.r * 0.26, 0, 0, 7);
            ctx.fill();
          }
          ctx.globalAlpha = 1;
        }

        // نجوم
        const starK = clamp((t - T.spaceStart) / 2.0, 0, 1);
        if (starK > 0) {
          // درب التبانة — شريط ضبابي قطري خفيف بعرض الشاشة
          const mw = ctx.createLinearGradient(0, H * 0.78, W, H * 0.08);
          mw.addColorStop(0, 'rgba(150,175,225,0)');
          mw.addColorStop(0.42, `rgba(150,175,225,${0.09 * starK})`);
          mw.addColorStop(0.5, `rgba(205,215,245,${0.13 * starK})`);
          mw.addColorStop(0.58, `rgba(150,175,225,${0.09 * starK})`);
          mw.addColorStop(1, 'rgba(150,175,225,0)');
          ctx.fillStyle = mw; ctx.fillRect(0, 0, W, H);
          // سُحب كونية ملونة خافتة لإضفاء عمق
          for (const [nx, ny, nr, col] of [[0.2, 0.34, 0.26, 'rgba(158,116,235,'], [0.66, 0.62, 0.3, 'rgba(64,196,214,'], [0.47, 0.13, 0.2, 'rgba(226,142,206,']]) {
            const ng = ctx.createRadialGradient(W * nx, H * ny, 2, W * nx, H * ny, H * nr);
            ng.addColorStop(0, col + (0.11 * starK) + ')');
            ng.addColorStop(1, col + '0)');
            ctx.fillStyle = ng; ctx.beginPath(); ctx.arc(W * nx, H * ny, H * nr, 0, 7); ctx.fill();
          }
          // النجوم مع وميض خفيف
          for (const s of starCache) {
            ctx.globalAlpha = s.a * starK * (0.68 + 0.32 * Math.sin(t * 2.1 + s.x * 47 + s.y * 31));
            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.arc(s.x * W, s.y * H, s.r, 0, 7); ctx.fill();
          }
          ctx.globalAlpha = 1;
        }

        /* ============ العبور — مشهد سينمائي كامل ============ */
        if (t > T.spaceStart) {
          const p = clamp((t - T.spaceStart) / (T.reveal - T.spaceStart), 0, 1);   // 0→1 العبور كله
          const pe = easeOut(clamp((t - T.spaceStart) / 3.4, 0, 1));               // نمو الوجهة
          const easeInOutP = easeInOut(p);

          /* ── الشمس + توهج صليبي ── */
          const sunX = W * 0.12, sunY = H * 0.17;
          const sg = ctx.createRadialGradient(sunX, sunY, 2, sunX, sunY, H * 0.6);
          sg.addColorStop(0, 'rgba(255,255,242,.95)');
          sg.addColorStop(0.10, 'rgba(255,244,205,.4)');
          sg.addColorStop(0.35, 'rgba(255,240,200,.08)');
          sg.addColorStop(1, 'rgba(255,240,200,0)');
          ctx.fillStyle = sg; ctx.fillRect(0, 0, W, H);
          ctx.save();
          ctx.globalAlpha = 0.55;
          ctx.strokeStyle = 'rgba(255,252,230,.85)';
          ctx.lineWidth = 1.3;
          const fl2 = H * 0.13;
          ctx.beginPath();
          ctx.moveTo(sunX - fl2, sunY); ctx.lineTo(sunX + fl2, sunY);
          ctx.moveTo(sunX, sunY - fl2); ctx.lineTo(sunX, sunY + fl2);
          ctx.stroke();
          ctx.globalAlpha = 0.3;
          const fl3 = H * 0.055;
          ctx.beginPath();
          ctx.moveTo(sunX - fl3 * 1.42, sunY - fl3 * 1.42); ctx.lineTo(sunX + fl3 * 1.42, sunY + fl3 * 1.42);
          ctx.moveTo(sunX + fl3 * 1.42, sunY - fl3 * 1.42); ctx.lineTo(sunX - fl3 * 1.42, sunY + fl3 * 1.42);
          ctx.stroke();
          ctx.restore();

          /* ── خطوط السرعة تُشع من اتجاه الهدف ── */
          const slK = clamp((t - T.spaceStart - 0.4) / 2.2, 0, 1);
          if (slK > 0 && slK < 0.96) {
            const cx2 = W * 0.78, cy2 = H * 0.2;
            ctx.save();
            ctx.globalAlpha = 0.42 * slK;
            ctx.strokeStyle = 'rgba(190,220,255,.6)';
            for (let i = 0; i < 30; i++) {
              const a = (i / 30) * Math.PI * 2 + 0.23 + i * 0.61;
              const seed = (i * 167.31) % 100;
              const travel = (t * 130 + seed * 3.1) % 150;
              const r0 = 26 + travel;
              const len = 9 + seed * 0.34;
              ctx.lineWidth = (i % 4) * 0.45 + 0.4;
              ctx.beginPath();
              ctx.moveTo(cx2 + Math.cos(a) * r0, cy2 + Math.sin(a) * r0);
              ctx.lineTo(cx2 + Math.cos(a) * (r0 + len), cy2 + Math.sin(a) * (r0 + len));
              ctx.stroke();
            }
            ctx.restore();
          }

          /* ── الأرض: تنحسر وتهبط للأسفل مع جانب ليلي وأضواء مدن ── */
          const ek = clamp((t - T.spaceStart) / (T.orbit - T.spaceStart), 0, 1);
          const R = lerp(H * 0.9, H * 0.62, ek);
          const cy = H + R * lerp(0.42, 0.72, ek);
          // هالة الغلاف الجوي
          const halo = ctx.createRadialGradient(W * 0.5, cy, R * 0.86, W * 0.5, cy, R * 1.32);
          halo.addColorStop(0, 'rgba(110,195,255,.55)');
          halo.addColorStop(0.35, 'rgba(110,195,255,.18)');
          halo.addColorStop(1, 'rgba(110,195,255,0)');
          ctx.fillStyle = halo;
          ctx.beginPath(); ctx.arc(W * 0.5, cy, R * 1.32, 0, 7); ctx.fill();
          // جسم الأرض
          const eg = ctx.createRadialGradient(W * 0.35, cy - R * 0.3, R * 0.1, W * 0.5, cy, R);
          eg.addColorStop(0, '#7ccbee');
          eg.addColorStop(0.35, '#2f86bd');
          eg.addColorStop(0.72, '#164a74');
          eg.addColorStop(0.92, '#082238');
          eg.addColorStop(1, '#04101f');
          ctx.fillStyle = eg;
          ctx.beginPath(); ctx.arc(W * 0.5, cy, R, 0, 7); ctx.fill();
          // سحاب + terminator + أضواء مدن — داخل القصّ
          ctx.save();
          ctx.beginPath(); ctx.arc(W * 0.5, cy, R, 0, 7); ctx.clip();
          ctx.globalAlpha = 0.2;
          ctx.fillStyle = '#fff';
          for (let i = 0; i < 16; i++) {
            const a = i * 2.4;
            const rr2 = R * (0.3 + (i % 6) * 0.12);
            ctx.beginPath();
            ctx.ellipse(W * 0.5 + Math.cos(a) * rr2, cy + Math.sin(a) * rr2 * 0.8,
              38 + (i % 5) * 24, 11 + (i % 4) * 8, a * 0.6, 0, 7);
            ctx.fill();
          }
          ctx.globalAlpha = 1;
          const night = ctx.createRadialGradient(W * 0.85, cy - R * 0.15, R * 0.15, W * 0.68, cy, R * 1.15);
          night.addColorStop(0, 'rgba(2,6,14,0)');
          night.addColorStop(0.52, 'rgba(2,6,14,.42)');
          night.addColorStop(1, 'rgba(1,3,9,.88)');
          ctx.fillStyle = night; ctx.fillRect(W * 0.5 - R, cy - R, R * 2, R * 2);
          // أضواء المدن على الجانب المظلم
          for (let i = 0; i < 40; i++) {
            const a = i * 2.39996 + 0.9;
            const rr2 = R * (0.3 + ((i * 41) % 62) / 100);
            const lx = W * 0.5 + Math.cos(a) * rr2, ly = cy + Math.sin(a) * rr2 * 0.9;
            if (lx > W * 0.5 + R * 0.12) {
              ctx.globalAlpha = 0.25 + (i % 6) * 0.12;
              ctx.fillStyle = '#ffd88f';
              ctx.beginPath(); ctx.arc(lx, ly, 0.9 + (i % 3) * 0.55, 0, 7); ctx.fill();
            }
          }
          ctx.globalAlpha = 1;
          ctx.restore();
          // خط terminator رقيق (حد الليل)
          ctx.save();
          ctx.globalAlpha = 0.5;
          ctx.strokeStyle = 'rgba(160,215,255,.35)';
          ctx.lineWidth = 1.1;
          ctx.beginPath(); ctx.arc(W * 0.5, cy, R * 0.995, -1.15, 1.15); ctx.stroke();
          ctx.restore();

          /* ── الوجهة: تظهر كنقطة وتكبر ── */
          const DB = DEST_BODY[m.id] || DEST_BODY.moon;
          const dR = Math.max(2.5, lerp(3, Math.min(W, H) * 0.148 * DB.r, pe));
          const dX = W * lerp(0.90, 0.74, pe), dY = H * lerp(0.09, 0.22, pe);
          // هالة الوجهة
          const dg = ctx.createRadialGradient(dX, dY, dR * 0.6, dX, dY, dR * (DB.glow ? 2.15 : 1.6));
          dg.addColorStop(0, DB.glow || 'rgba(255,255,255,.4)');
          dg.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = dg;
          ctx.beginPath(); ctx.arc(dX, dY, dR * 2.15, 0, 7); ctx.fill();
          // حلقات زحل (خلف الجسم)
          if (DB.ring) {
            ctx.save();
            ctx.translate(dX, dY); ctx.scale(1, 0.34);
            for (const [rr3, ww, aa] of [[1.62, 0.16, 0.75], [1.95, 0.10, 0.5], [2.28, 0.05, 0.3]]) {
              ctx.globalAlpha = aa;
              ctx.strokeStyle = '#d8c89c';
              ctx.lineWidth = dR * ww;
              ctx.beginPath(); ctx.arc(0, 0, dR * rr3, 0, 7); ctx.stroke();
            }
            ctx.restore();
            ctx.globalAlpha = 1;
          }
          // جسم الوجهة
          const dbg = ctx.createRadialGradient(dX - dR * 0.35, dY - dR * 0.35, dR * 0.12, dX, dY, dR);
          dbg.addColorStop(0, DB.stops[0]);
          dbg.addColorStop(0.38, DB.stops[1]);
          dbg.addColorStop(0.78, DB.stops[2]);
          dbg.addColorStop(1, DB.stops[3]);
          ctx.fillStyle = dbg;
          ctx.beginPath(); ctx.arc(dX, dY, dR, 0, 7); ctx.fill();
          // تفاصيل السطح — داخل القصّ
          ctx.save();
          ctx.beginPath(); ctx.arc(dX, dY, dR, 0, 7); ctx.clip();
          if (DB.bands) {
            for (let i = 1; i <= DB.bands; i++) {
              const by = dY - dR + (i / (DB.bands + 1)) * dR * 2;
              ctx.globalAlpha = 0.24;
              ctx.fillStyle = i % 2 ? 'rgba(60,40,10,.55)' : 'rgba(255,255,255,.4)';
              ctx.fillRect(dX - dR, by - dR * 0.055, dR * 2, dR * 0.11);
            }
            ctx.globalAlpha = 1;
          }
          if (DB.craters) {
            for (let i = 0; i < DB.craters; i++) {
              const a = i * 2.4 + 0.7, rr2 = dR * (0.18 + ((i * 29) % 58) / 100);
              const px = dX + Math.cos(a) * rr2, py = dY + Math.sin(a) * rr2 * 0.9;
              const pr = dR * (0.045 + (i % 4) * 0.028);
              ctx.globalAlpha = 0.5;
              ctx.fillStyle = 'rgba(0,0,0,.38)';
              ctx.beginPath(); ctx.arc(px, py, pr, 0, 7); ctx.fill();
              ctx.globalAlpha = 0.35;
              ctx.fillStyle = 'rgba(255,255,255,.5)';
              ctx.beginPath(); ctx.arc(px - pr * 0.4, py - pr * 0.4, pr * 0.55, 0, 7); ctx.fill();
            }
            ctx.globalAlpha = 1;
          }
          if (DB.cap) {
            ctx.globalAlpha = 0.9;
            ctx.fillStyle = '#f6ece2';
            ctx.beginPath(); ctx.ellipse(dX, dY - dR * 0.88, dR * 0.42, dR * 0.14, 0, 0, 7); ctx.fill();
            ctx.globalAlpha = 1;
          }
          if (DB.aurora) {
            /* شرائط شفق زويل المصغرة على القطبين */
            for (const [yy, col] of [[-0.52, 'rgba(120,255,215,.8)'], [0.42, 'rgba(190,135,255,.8)']]) {
              ctx.globalAlpha = 0.75;
              ctx.strokeStyle = col;
              ctx.lineWidth = Math.max(1.2, dR * 0.05);
              ctx.beginPath();
              for (let x = dX - dR * 0.62; x <= dX + dR * 0.62; x += 6) {
                const y = dY + dR * yy + Math.sin(x * 0.09 + t * 2.2) * dR * 0.05;
                if (x === dX - dR * 0.62) ctx.moveTo(x, y); else ctx.lineTo(x, y);
              }
              ctx.stroke();
            }
            ctx.globalAlpha = 1;
          }
          ctx.restore();
          // حد الليل على الوجهة
          ctx.save();
          ctx.globalAlpha = 0.55;
          ctx.strokeStyle = 'rgba(0,0,0,.5)';
          ctx.lineWidth = Math.max(1.4, dR * 0.045);
          ctx.beginPath(); ctx.arc(dX, dY, dR * 0.97, 0.5, 2.4); ctx.stroke();
          ctx.restore();

          /* ── قوس المسار المنقط + مركبة تمشي عليه ── */
          if (p > 0.015 && p < 0.985) {
            const p0 = { x: W * 0.5, y: H * 0.9 };
            const p1 = { x: W * 0.60, y: H * 0.34 };
            const p2 = { x: dX, y: dY };
            ctx.save();
            ctx.setLineDash([5, 9]);
            ctx.strokeStyle = 'rgba(140,220,255,.45)';
            ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.quadraticCurveTo(p1.x, p1.y, p2.x, p2.y); ctx.stroke();
            ctx.setLineDash([]);
            const inv = 1 - easeInOutP;
            const bx = inv * inv * p0.x + 2 * inv * easeInOutP * p1.x + easeInOutP * easeInOutP * p2.x;
            const by = inv * inv * p0.y + 2 * inv * easeInOutP * p1.y + easeInOutP * easeInOutP * p2.y;
            // توهج المركبة
            const vg = ctx.createRadialGradient(bx, by, 0.5, bx, by, 12);
            vg.addColorStop(0, 'rgba(255,255,255,.95)');
            vg.addColorStop(0.4, 'rgba(160,225,255,.55)');
            vg.addColorStop(1, 'rgba(160,225,255,0)');
            ctx.fillStyle = vg;
            ctx.beginPath(); ctx.arc(bx, by, 12, 0, 7); ctx.fill();
            ctx.fillStyle = '#eafcff';
            ctx.beginPath(); ctx.arc(bx, by, 1.9, 0, 7); ctx.fill();
            ctx.restore();
          }
        }
      }

      /* ============ اهتزاز الإقلاع ============ */
      if (t > T.liftOff && t < T.spaceEnd) {
        const amp = (t < T.atmoStart) ? 7 : clamp(7 - (t - T.atmoStart) * 1.6, 0.6, 7);
        shake = amp;
      } else {
        shake = Math.max(0, shake - dt * 12);
      }
      if (shake > 0.1) {
        ctx.save();
        ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
      }

      /* ============ الصاروخ ============ */
      const flame = t > T.ignite ? clamp((t - T.ignite) / 1.0, 0, 1) * (t < T.orbit ? 1 : clamp(1 - (t - T.orbit) / 1.4, 0, 1)) : 0;
      if (t < T.orbit) {
        const altK = clamp((t - T.liftOff) / (T.orbit - T.liftOff), 0, 1);
        drawRocket(W, H, altK, flame);

        // جزيئات الدخان
        if (flame > 0.2) {
          for (let i = 0; i < 3; i++) {
            embers.push({
              x: W * 0.5 + (Math.random() - 0.5) * 40,
              y: H * 0.88 + Math.random() * 16,
              vx: (Math.random() - 0.5) * 90,
              vy: 110 + Math.random() * 150,
              life: 1, s: 2 + Math.random() * 5
            });
          }
        }
      }

      for (let i = embers.length - 1; i >= 0; i--) {
        const e = embers[i];
        e.x += e.vx * dt; e.y += e.vy * dt;
        e.life -= dt * 0.85; e.s += dt * 14;
        if (e.life <= 0) { embers.splice(i, 1); continue; }
        ctx.globalAlpha = e.life * 0.35;
        ctx.fillStyle = 'rgba(210,215,225,1)';
        ctx.beginPath(); ctx.arc(e.x, e.y, e.s, 0, 7); ctx.fill();
      }
      ctx.globalAlpha = 1;

      if (shake > 0.1) ctx.restore();

      /* ============ واجهات ============ */
      // كابينة
      const ck = $('cockpit');
      if (ck) ck.style.opacity = (t > T.cockpitIn && t < T.spaceStart) ? '1' : '0';

      // عد تنازلي
      const cd = $('countdown');
      if (cd) cd.style.opacity = (t > T.countdownStart && t < T.countdownEnd + 0.7) ? '1' : '0';
      if (t > T.countdownStart && t < T.countdownEnd) {
        const n = Math.ceil(T.countdownEnd - t);
        setCount(n);
      } else if (t >= T.countdownEnd && lastNum !== 0 && t < T.countdownEnd + 1.2) {
        setCount(0);
        const ct = $('cd-txt'); if (ct) ct.textContent = 'IGNITION · LIFTOFF';
      }

      // بيانات الكابينة
      const altK = clamp((t - T.liftOff) / (T.orbit - T.liftOff), 0, 1);
      const alt = altK * 408;
      const el1 = $('ck-alt'); if (el1) el1.textContent = 'ALT ' + alt.toFixed(2).padStart(7, '0') + ' km';
      const el2 = $('ck-vel'); if (el2) el2.textContent = 'VEL ' + (altK * 7.66).toFixed(2) + ' km/s';
      const el3 = $('ck-thr'); if (el3) el3.textContent = 'THRUST ' + Math.round(flame * 100) + '%';
      const el4 = $('ck-stage'); if (el4) el4.textContent = alt > 120 ? 'STAGE 2' : 'STAGE 1';

      // ظهور الوجهة
      if (t > T.reveal) {
        const dr = $('dest-reveal');
        if (dr) dr.style.opacity = '1';
        if (!nextShown) {
          nextShown = true;
          Audio.go();
          setTimeout(() => {
            stop = true; cancelAnimationFrame(raf); cvs.destroy();
            Game.freshRun = true;                    // إقلاع جديد = استبدال أي حفظ سابق
            go('outpost');
          }, 2700);
        }
      }

      vignette(ctx, W, H, 0.5);
      raf = requestAnimationFrame(frame);
    }

    frame(performance.now());

    /* @QA */ window.Launch = { get lit() { return lit; }, get pressure() { return pressure; }, ignite };

    this._stop = () => {
      stop = true; cancelAnimationFrame(raf); cvs.destroy();
      window.removeEventListener('keydown', kdSpace);
      window.removeEventListener('keyup', kuSpace);
      window.removeEventListener('pointerup', up);
    };
  },
  unmount() { if (this._stop) this._stop(); }
});
