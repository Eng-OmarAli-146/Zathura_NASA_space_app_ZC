/* ============================================================================
   screens_return.js — مرحلة العودة للأرض
   إقلاع من السطح → عبور (تصحيح مسار + خطرين بخيارات) → دخول جوي (تحكم الميل)
   → مظلة (توقيت الهبوط) → رشاش → result موسّعة
   ==========================================================================*/

registerScreen('return', {
  mount() {
    const m = MISSIONS.find(x => x.id === Game.mission);
    if (!m) { go('destinations'); return; }
    const root = $('screen-return');
    root.innerHTML = `
      <div id="return-canvas" style="position:absolute;inset:0"></div>
      <div class="quest-panel" id="return-quests"></div>

      <div class="ret-hud" id="ret-hud">
        <div class="card tight" style="padding:6px 12px;width:132px">
          <div style="font-size:8px;color:var(--dim);letter-spacing:1.4px;font-weight:800">🛡 سلامة المركبة</div>
          <div class="row gap8" style="margin-top:2px">
            <div class="mono" id="ret-int" style="font-size:15px;font-weight:900">100</div>
            <div class="bar" style="flex:1"><i id="ret-int-bar" style="width:100%;background:linear-gradient(90deg,#2fa064,#45e08a)"></i></div>
          </div>
        </div>
        <div class="card tight" style="padding:6px 12px;min-width:118px">
          <div style="font-size:8px;color:var(--dim);letter-spacing:1.4px;font-weight:800" id="ret-phase-label">ASCENT</div>
          <div class="mono" id="ret-alt" style="font-size:15px;font-weight:900;color:var(--cyan)">—</div>
        </div>
      </div>

      <!-- مرحلة العبور: تصحيح المسار -->
      <div class="course-wrap hidden" id="course-wrap">
        <div class="pill" style="font-size:11px">🧭 أصِب داخل المنطقة الخضراء — <b id="course-count">0/3</b></div>
        <div class="course-bar">
          <div class="course-zone" id="course-zone"></div>
          <div class="course-needle" id="course-needle"></div>
        </div>
        <button class="btn" id="course-lock">🔒 اقفل المسار</button>
      </div>

      <!-- لاقطات اللمس للدخول الجوي -->
      <button class="entry-pad entry-left" id="entry-left" aria-label="ميل لليسار">◀</button>
      <button class="entry-pad entry-right" id="entry-right" aria-label="ميل لليمين">▶</button>

      <!-- زر المظلة + قراءة الارتفاع -->
      <div class="chute-alt mono hidden" id="land-alt">15.2 km</div>
      <button class="chute-btn hidden" id="chute-btn"><span id="chute-alt-in">15.2</span> كم<small>افتح المظلة</small></button>

      <!-- أحداث العبور -->
      <div class="ret-ev hidden" id="ret-ev">
        <div class="ret-card">
          <div class="eyebrow" style="font-size:8.5px;color:#ffb347">حدث أثناء العبور</div>
          <h4 id="ret-ev-title" style="margin-top:6px">—</h4>
          <p id="ret-ev-text">—</p>
          <div class="ret-choices" id="ret-choices"></div>
        </div>
      </div>
    `;

    /* ---------- قائمة مهام العودة ---------- */
    Quest.reset([
      { id: 'course', t: 'صحّح مسار العودة نحو الأرض', max: 3 },
      { id: 'hazard', t: 'تجاوز خطرَي العبور (قراراتك)', max: 2 },
      { id: 'entry',  t: 'دخول الغلاف الجوي — حافظ على زاوية القوس' },
      { id: 'land',   t: 'افتح المظلة داخل النطاق (2.2 – 4.5 كم)' }
    ]);
    Quest.mount(root.querySelector('#return-quests'), 'العودة إلى الأرض');

    const cvs = makeCanvas($('return-canvas'));
    const { ctx } = cvs;
    let stop = false, raf = 0, t = 0, phaseT = 0, lastT = performance.now();
    let phase = 'ascent'; // ascent → transit → entry → land → splash

    const R = {
      integrity: 100,
      courseLocks: 0,
      hazards: 0,
      maxHeat: 0, burnHard: 0,
      entryQuality: 'clean',
      landing: null,
      alt: 121,          // كم أثناء الدخول
      landAlt: 15.2,     // كم أثناء الهبوط
      tilt: 0, tiltVel: 0, drift: 0, driftT: 0, heat: 12,
      needle: 0, needleDir: 1, zoneL: 0.36, zoneW: 0.26,
      eventsFired: [],
      evOpen: false,
      chuteDeployed: false,
      chuteAlt: null
    };

    /* ====================================================================
       أحداث العبور (قراران صعبان — وكل قرار ليه ثمن)
       ==================================================================== */
    const RETURN_EVENTS = [
      { id: 'flare', t: 'نتوء شمسية أثناء العبور',
        d: 'دفعة بروتونات سريعة تعبر منطقة الكبسولة — الدروع تحميك، لكن الجرعة هتكمل تراكمها.',
        good: { t: 'وضع الملجأ — استهلاك ١٢ دقيقة', i: -4, dose: 1.8 },
        bad:  { t: 'تجاهل — النافذة ضيقة جدًا',     i: -16, dose: 8.4 } },
      { id: 'co2', t: 'ارتفاع CO₂ في المقصورة',
        d: 'المازات تعمل فوق طاقتها ونسبة ثاني أكسيد الكربون بتعلّي تدريجيًا.',
        good: { t: 'فعّل الدورة الاحتياطية للتنقية', i: -4, dose: 0.5 },
        bad:  { t: 'افتح تهوية يدوية (فقد O₂)',      i: -13, dose: 4.0 } },
      { id: 'rattle', t: 'ارتجاج في هيكل الكبسولة',
        d: 'تدد حراري غير متوقع في وصلة الجناح — صوت معدني عالي ومتكرر.',
        good: { t: 'أحكم كل الوصلات فورًا',          i: -5, dose: 0 },
        bad:  { t: 'سجله وانتظره يوصل الأرض',        i: -17, dose: 2.2 } },
      { id: 'comms', t: 'انقطاع اتصالات — ٤ دقائق',
        d: 'لا توجد إشارة من محطة التتبع — التأخير دلوقتي طبيعي لأن الأرض بعيدة.',
        good: { t: 'انتقل للهوائي الاحتياطي',        i: -4, dose: 0 },
        bad:  { t: 'انتظر — ممكن ترجع أي لحظة',      i: -9, dose: 3.1 } }
    ];

    function fireEvent() {
      if (R.eventsFired.length >= 2) return;
      const pool = RETURN_EVENTS.filter(e => !R.eventsFired.includes(e.id));
      const ev = pool[(Math.random() * pool.length) | 0];
      R.eventsFired.push(ev.id);
      R.evOpen = true;
      const layer = $('ret-ev');
      $('ret-ev-title').textContent = ev.t;
      $('ret-ev-text').textContent = ev.d;
      const box = $('ret-choices');
      box.innerHTML = '';
      [['good', ev.good], ['bad', ev.bad]].forEach(([kind, ch]) => {
        const b = document.createElement('button');
        b.className = 'ret-choice';
        b.innerHTML = escHtml(ch.t) + (kind === 'good' ? '' : ' <span style="color:#ffb0b0;font-size:9.5px">— محفوف بالمخاطرة</span>');
        b.addEventListener('click', () => {
          R.integrity = clamp(R.integrity + ch.i, 0, 100);
          Out.dose = Out.dose.map((d, i) => d + ch.dose);
          R.hazards++;
          Audio[kind === 'good' ? 'ok' : 'fail']();
          layer.classList.add('hidden');
          R.evOpen = false;
          Quest.setProgress('hazard', R.hazards);
          updateIntegrity();
          toast(kind === 'good'
            ? 'قرار سليم — المركبة بخير'
            : 'غالي الكلفة… لكن الجميع ما زال بخير', kind === 'good' ? 'good' : 'warn');
          maybeStartEntry();
        });
        box.appendChild(b);
      });
      layer.classList.remove('hidden');
      Audio.alarm();
    }
    const escHtml = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

    /* ====================================================================
       تصحيح المسار (مرحلة العبور)
       ==================================================================== */
    const courseWrap = $('course-wrap');
    const needleEl = $('course-needle');
    const zoneEl = $('course-zone');
    const countEl = $('course-count');

    function newZone() {
      // منطقة خضراء عرض 26% في موضع عشوائي
      R.zoneL = 0.08 + Math.random() * 0.60;
      zoneEl.style.left = (R.zoneL * 100).toFixed(1) + '%';
      zoneEl.style.width = '26%';
    }
    newZone();

    function tryLockCourse() {
      if (phase !== 'transit' || R.evOpen || !courseWrap) return;
      const p = R.needle;
      const inZone = p >= R.zoneL && p <= R.zoneL + 0.26;
      if (inZone) {
        R.courseLocks++;
        Audio.ok();
        countEl.textContent = R.courseLocks + '/3';
        Quest.setProgress('course', R.courseLocks);
        newZone();
        if (R.courseLocks >= 3) {
          courseWrap.classList.add('hidden');
          toast('<b>المسار مصحح.</b> الأرض في نطاق الكبسولة — استعد للدخول.', 'good');
        }
      } else {
        R.integrity = clamp(R.integrity - 6, 0, 100);
        Audio.fail();
        updateIntegrity();
        toast('خارج المنطقة — راقب الإبرة وحاول تاني', 'warn');
      }
      maybeStartEntry();
    }
    $('course-lock').addEventListener('click', tryLockCourse);

    function maybeStartEntry() {
      if (phase === 'transit' && R.courseLocks >= 3 && R.hazards >= 2) {
        phase = 'entry';
        phaseT = 0;
        R.alt = 121;
        Quest.setProgress('entry', 0); // تتفعّل فقط (تظهر كمهمة حالية)
        setPhaseLabel('ATMOSPHERIC ENTRY');
        courseWrap.classList.add('hidden');
        showEntryPads(true);
        toast('بدأ الدخول الجوي — حافظ على الإبرة داخل الشريط الأخضر', 'warn', 6000);
      }
    }

    /* ====================================================================
       دخول الغلاف الجوي (تحكم في الميل)
       ==================================================================== */
    const entryPads = [$('entry-left'), $('entry-right')];
    const entryDir = { left: false, right: false };
    function showEntryPads(v) {
      const coarse = matchMedia('(pointer: coarse)').matches || window.innerWidth < 820;
      entryPads.forEach(p => p && p.classList.toggle('on', v && coarse));
    }
    entryPads.forEach((p, i) => {
      if (!p) return;
      const key = i === 0 ? 'left' : 'right';
      const on = e => { e.preventDefault(); entryDir[key] = true; };
      const off = e => { e.preventDefault(); entryDir[key] = false; };
      p.addEventListener('pointerdown', on);
      p.addEventListener('pointerup', off);
      p.addEventListener('pointercancel', off);
      p.addEventListener('pointerleave', off);
    });
    const keyMap = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right' };
    const kd = e => {
      const k = keyMap[e.code] || keyMap[e.key];
      if (k && phase === 'entry') { entryDir[k] = true; e.preventDefault(); }
      if ((e.code === 'KeyE' || e.code === 'Space') && phase === 'transit') { e.preventDefault(); tryLockCourse(); }
      if ((e.code === 'KeyE' || e.code === 'Space') && phase === 'land') { e.preventDefault(); deployChute(); }
    };
    const ku = e => {
      const k = keyMap[e.code] || keyMap[e.key];
      if (k) entryDir[k] = false;
    };
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);

    function updateEntry(dt) {
      // انجراف تجاهي متغير
      R.driftT -= dt;
      if (R.driftT <= 0) {
        R.driftT = 1.4 + Math.random() * 1.6;
        R.drift = (Math.random() * 2 - 1) * 0.62;
      }
      let steer = 0;
      if (entryDir.left) steer -= 1;
      if (entryDir.right) steer += 1;
      R.tiltVel += steer * 3.4 * dt;
      R.tiltVel += (R.drift - R.tilt) * 1.15 * dt;    // انجراف نحو زاوية عشوائية
      R.tiltVel *= Math.max(0, 1 - 2.6 * dt);          // احتكاك
      R.tilt += R.tiltVel * dt;
      R.tilt += Math.sin(t * 2.3) * 0.06 * dt;
      R.tilt = clamp(R.tilt, -1, 1);

      const inBand = Math.abs(R.tilt) <= 0.34;
      R.heat = clamp(R.heat + (inBand ? -8 : 13.5) * dt, 8, 100);
      R.maxHeat = Math.max(R.maxHeat, R.heat);
      if (R.heat >= 99.5) R.burnHard += dt;

      R.alt = Math.max(0, 121 - (phaseT / 15) * 121);
      if (R.alt <= 0) finishEntry();
    }
    function finishEntry() {
      R.entryQuality = R.burnHard > 2.5 ? 'hard' : R.maxHeat > 62 ? 'warm' : 'clean';
      if (R.entryQuality === 'hard') R.integrity = clamp(R.integrity - 22, 0, 100);
      else if (R.entryQuality === 'warm') R.integrity = clamp(R.integrity - 9, 0, 100);
      updateIntegrity();
      Quest.complete('entry');
      showEntryPads(false);
      phase = 'land';
      phaseT = 0;
      R.landAlt = 15.2;
      setPhaseLabel('LANDING');
      $('land-alt').classList.remove('hidden');
      $('chute-btn').classList.remove('hidden');
      Audio.go();
    }

    /* ====================================================================
       الهبوط بالمظلة
       ==================================================================== */
    const chuteBtn = $('chute-btn');
    const chuteAltEl = $('chute-alt-in');
    const landAltEl = $('land-alt');

    function deployChute() {
      if (phase !== 'land' || R.chuteDeployed) return;
      R.chuteDeployed = true;
      R.chuteAlt = R.landAlt;
      const perfectLo = (window.UPG && UPG.perfectLo) ? UPG.perfectLo() : 2.2;
      if (R.landAlt >= 4.5) R.landing = 'good';          // مبكر جدًا — هبوط طويل لكن آمن
      else if (R.landAlt >= perfectLo) R.landing = 'perfect';
      else R.landing = 'good';
      chuteBtn.classList.add('hidden');
      Quest.complete('land');
      Audio.splash();
      toast(R.landing === 'perfect'
        ? '<b>هبوط مثالي.</b> المظلة فتحت في التوقيت المثالي.'
        : 'المظلة مفتوحة — استعد للرشاش', 'good');
      if (R.landing !== 'perfect') R.integrity = clamp(R.integrity - 6, 0, 100);
      updateIntegrity();
    }
    chuteBtn.addEventListener('click', deployChute);

    function updateLand(dt) {
      R.landAlt = Math.max(0, 15.2 - (phaseT / 11) * 15.2);
      const a = R.landAlt;
      chuteAltEl.textContent = a.toFixed(1);
      landAltEl.textContent = a.toFixed(1) + ' km';
      if (!R.chuteDeployed && a <= 0.7) {
        R.chuteDeployed = true; R.chuteAlt = a; R.landing = 'hard';
        R.integrity = clamp(R.integrity - 16, 0, 100);
        updateIntegrity();
        chuteBtn.classList.add('hidden');
        Quest.complete('land');
        toast('المظلة فتحت تحت الحد — هبوط قاسٍ', 'warn');
      }
      if (a <= 0) splashdown();
    }
    function splashdown() {
      phase = 'splash';
      phaseT = 0;
      setPhaseLabel('SPLASHDOWN');
      $('land-alt').classList.add('hidden');
      Audio.splash();
      setTimeout(() => {
        stop = true; cancelAnimationFrame(raf); cvs.destroy();
        // دمج نتيجة العودة في Game.result
        const prev = Game.result || {};
        Game.result = {
          mission: prev.mission || m.id,
          sols: prev.sols != null ? prev.sols : m.duration_days,
          samples: prev.samples != null ? prev.samples : Out.samples,
          science: prev.science != null ? prev.science : Out.science,
          dose: prev.dose || Out.dose,
          o2: prev.o2 != null ? prev.o2 : Out.o2,
          h2o: prev.h2o != null ? prev.h2o : Out.h2o,
          food: prev.food != null ? prev.food : Out.food,
          target: prev.target || m.duration_days,
          reason: 'complete',
          return: {
            entry: R.entryQuality,
            landing: R.landing || 'hard',
            integrity: Math.round(R.integrity)
          }
        };
        go('result');
      }, 4200);
    }

    /* ====================================================================
       HUD helpers
       ==================================================================== */
    function updateIntegrity() {
      const el = $('ret-int'); const bar = $('ret-int-bar');
      if (el) {
        el.textContent = Math.round(R.integrity);
        el.style.color = R.integrity > 60 ? '#45e08a' : R.integrity > 30 ? '#ffb347' : '#ff5f6d';
      }
      if (bar) {
        bar.style.width = R.integrity + '%';
        bar.style.background = R.integrity > 60
          ? 'linear-gradient(90deg,#2fa064,#45e08a)'
          : R.integrity > 30 ? 'linear-gradient(90deg,#c8862e,#ffb347)'
          : 'linear-gradient(90deg,#b8323e,#ff5f6d)';
      }
    }
    function setPhaseLabel(txt) { const e = $('ret-phase-label'); if (e) e.textContent = txt; }

    /* ====================================================================
       إطار الرسم
       ==================================================================== */
    function frame(now) {
      if (stop) return;
      const dt = Math.min(0.05, (now - lastT) / 1000);
      lastT = now;
      t += dt;
      if (!R.evOpen) phaseT += dt;

      const W = cvs.w, H = cvs.h;
      ctx.clearRect(0, 0, W, H);

      if (phase === 'ascent') {
        const k = clamp(phaseT / 6.5, 0, 1);
        // السماء تغمق نحو الفضاء
        const r0 = Math.round(lerp(20, 2, k)), g0 = Math.round(lerp(44, 3, k)), b0 = Math.round(lerp(92, 8, k));
        skyGradient(ctx, W, H, `rgb(${r0},${g0},${b0})`, `rgb(${Math.round(lerp(96, 2, k))},${Math.round(lerp(150, 3, k))},${Math.round(lerp(190, 6, k))})`);
        starField(ctx, W, H, Math.floor(40 + k * 120), 42, 0.4 + k * 0.6);
        drawPlanetSphere(ctx, W * 0.5, H + H * lerp(0.75, 1.5, k), H * 0.95,
          ['#bfe6ff', '#2f86bd', '#6fc4e8', '#071c30'], { bands: 0, terminator: 0.8 });
        drawCapsule(ctx, W * 0.5, H * 0.62 - k * H * 0.06, 1.05 - k * 0.25, true, m);
        setPhaseLabel('ASCENT');
        const alt = Math.round(k * 400);
        const altEl = $('ret-alt'); if (altEl) altEl.textContent = 'ALT ' + alt + ' km';
        if (k >= 1) {
          phase = 'transit'; phaseT = 0;
          setPhaseLabel('TRANSIT');
          courseWrap.classList.remove('hidden');
          toast('وصلنا للفضاء — كبسولة العودة انفصلت بنجاح', 'good');
        }
      } else if (phase === 'transit') {
        skyGradient(ctx, W, H, '#01030c', '#050914');
        starField(ctx, W, H, 220, 7, 0.95);
        // الشمس
        const sun = ctx.createRadialGradient(W * 0.14, H * 0.14, 2, W * 0.14, H * 0.14, 180);
        sun.addColorStop(0, 'rgba(255,250,230,.95)');
        sun.addColorStop(0.12, 'rgba(255,240,200,.7)');
        sun.addColorStop(1, 'rgba(255,240,200,0)');
        ctx.fillStyle = sun; ctx.fillRect(0, 0, W * 0.4, H * 0.4);
        // الأرض تكبر تدريجيًا
        const g = clamp(phaseT / 26, 0, 1);
        const R0 = H * lerp(0.055, 0.52, easeInOut(g));
        drawPlanetSphere(ctx, W * 0.82, H * 0.62, R0,
          ['#bfe6ff', '#2f86bd', '#6fc4e8', '#050f1e'], { bands: 0, terminator: 0.78 });
        drawWindowFrame(ctx, W, H);
        // حركة الإبرة
        if (!R.evOpen) {
          R.needle += R.needleDir * dt * 0.72;
          if (R.needle > 1) { R.needle = 1; R.needleDir = -1; }
          if (R.needle < 0) { R.needle = 0; R.needleDir = 1; }
          if (Math.random() < dt * 0.35) R.needleDir *= -1; // تخبطات
        }
        needleEl.style.left = `calc(${(R.needle * 100).toFixed(1)}% - 2px)`;
        const altEl = $('ret-alt');
        if (altEl) altEl.textContent = 'EARTH ' + Math.round(lerp(190000, 400, g) / 1000) + 'k km';

        // انفجار حدثين أثناء العبور
        if (phaseT > 2 && R.eventsFired.length === 0 && !R.evOpen) fireEvent();
        else if (phaseT > 11 && R.eventsFired.length === 1 && !R.evOpen) fireEvent();
      } else if (phase === 'entry') {
        updateEntry(dt);
        const heatK = R.heat / 100;
        // الغلاف الجوي يشتعل
        const r = Math.round(lerp(2, 60, heatK)), g2 = Math.round(lerp(4, 22, heatK)), b = Math.round(lerp(14, 10, heatK));
        skyGradient(ctx, W, H, `rgb(${r},${g2},${b})`, `rgb(${Math.round(lerp(20, 120, heatK))},${Math.round(lerp(70, 40, heatK))},${Math.round(lerp(120, 20, heatK))})`);
        // الأرض تقترب بسرعة
        drawPlanetSphere(ctx, W * 0.5, H + H * 0.52 - (1 - R.alt / 121) * H * 0.34,
          H * 1.65, ['#bfe6ff', '#2f86bd', '#6fc4e8', '#050f1e'], { bands: 0, terminator: 0.82 });
        // وهج الحرارة من الحواف
        const hg = ctx.createRadialGradient(W / 2, H * 0.25, H * 0.25, W / 2, H * 0.25, H * 0.95);
        hg.addColorStop(0, 'rgba(255,120,40,0)');
        hg.addColorStop(0.72, `rgba(255,${Math.round(120 + heatK * 80)},40,${0.25 + heatK * 0.55})`);
        hg.addColorStop(1, `rgba(255,230,160,${0.15 + heatK * 0.5})`);
        ctx.fillStyle = hg; ctx.fillRect(0, 0, W, H);
        // خطوط السرعة
        ctx.strokeStyle = `rgba(255,255,255,${0.12 + heatK * 0.3})`;
        ctx.lineWidth = 2;
        for (let i = 0; i < 22; i++) {
          const a = (i / 22) * Math.PI * 2 + t * 0.6;
          const r1 = H * (0.18 + (i % 5) * 0.05), r2 = r1 + 60 + heatK * 90;
          ctx.beginPath();
          ctx.moveTo(W / 2 + Math.cos(a) * r1, H * 0.34 + Math.sin(a) * r1);
          ctx.lineTo(W / 2 + Math.cos(a) * r2, H * 0.34 + Math.sin(a) * r2);
          ctx.stroke();
        }
        drawWindowFrame(ctx, W, H);
        drawTiltGauge(ctx, W, H, R.tilt);
        const altEl = $('ret-alt');
        if (altEl) altEl.textContent = R.alt.toFixed(0) + ' km · ' + Math.round(R.heat) + '°';
      } else if (phase === 'land' || phase === 'splash') {
        if (phase === 'land') updateLand(dt);
        // شمس منخفضة + بحر
        const sky = ctx.createLinearGradient(0, 0, 0, H * 0.62);
        sky.addColorStop(0, '#2b2a55');
        sky.addColorStop(0.55, '#b1533a');
        sky.addColorStop(1, '#ffcf8a');
        ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H * 0.62);
        // شمس
        const sg = ctx.createRadialGradient(W * 0.5, H * 0.55, 4, W * 0.5, H * 0.55, 200);
        sg.addColorStop(0, '#fff6da');
        sg.addColorStop(0.35, 'rgba(255,220,150,.9)');
        sg.addColorStop(1, 'rgba(255,200,120,0)');
        ctx.fillStyle = sg; ctx.fillRect(0, 0, W, H * 0.66);
        // البحر
        const sea = ctx.createLinearGradient(0, H * 0.6, 0, H);
        sea.addColorStop(0, '#e8a668');
        sea.addColorStop(0.12, '#7a5a50');
        sea.addColorStop(0.3, '#16324a');
        sea.addColorStop(1, '#050e1c');
        ctx.fillStyle = sea; ctx.fillRect(0, H * 0.6, W, H * 0.4);
        // انعكاس الشمس على الماء
        const refl = ctx.createLinearGradient(W * 0.5 - 40, 0, W * 0.5 + 40, 0);
        refl.addColorStop(0, 'rgba(255,230,160,0)');
        refl.addColorStop(0.5, 'rgba(255,230,160,.5)');
        refl.addColorStop(1, 'rgba(255,230,160,0)');
        ctx.fillStyle = refl; ctx.fillRect(W * 0.5 - 40, H * 0.6, 80, H * 0.4);
        // موج متموج
        ctx.strokeStyle = 'rgba(255,255,255,.14)';
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 9; i++) {
          const yy = H * (0.63 + i * 0.045);
          ctx.beginPath();
          for (let x = 0; x <= W; x += 24) {
            const yo = Math.sin(x * 0.02 + t * (1.4 + i * 0.22) + i * 2) * (2 + i * 1.1);
            x === 0 ? ctx.moveTo(x, yy + yo) : ctx.lineTo(x, yy + yo);
          }
          ctx.stroke();
        }
        // الكبسولة
        let capY;
        if (phase === 'land') capY = lerp(H * 0.18, H * 0.62, 1 - R.landAlt / 15.2);
        else capY = H * 0.62 + Math.sin(t * 2.2) * 4;
        // المظلة
        if (R.chuteDeployed) {
          const swing = Math.sin(t * 1.6) * 0.09;
          ctx.save();
          ctx.translate(W * 0.5 + swing * 120, capY);
          ctx.rotate(swing);
          ctx.fillStyle = '#ff8a5c';
          ctx.beginPath(); ctx.arc(0, -118, 52, Math.PI + 0.3, -0.3); ctx.closePath(); ctx.fill();
          ctx.fillStyle = '#ffd479';
          ctx.beginPath(); ctx.arc(0, -118, 52, Math.PI + 0.62, Math.PI + 1.12); ctx.closePath(); ctx.fill();
          ctx.beginPath(); ctx.arc(0, -118, 52, -1.12, -0.62); ctx.closePath(); ctx.fill();
          ctx.strokeStyle = 'rgba(30,20,10,.6)'; ctx.lineWidth = 1.4;
          ctx.beginPath(); ctx.moveTo(-38, -78); ctx.lineTo(-10, -12); ctx.moveTo(38, -78); ctx.lineTo(10, -12); ctx.moveTo(0, -70); ctx.lineTo(0, -12); ctx.stroke();
          ctx.restore();
        }
        drawCapsule(ctx, W * 0.5, capY, 1.0, false, m);
        const altEl = $('ret-alt');
        if (altEl) altEl.textContent = phase === 'splash' ? 'SPLASHDOWN' : R.landAlt.toFixed(1) + ' km';
        if (phase === 'splash') {
          ctx.fillStyle = 'rgba(4,10,18,.45)';
          ctx.fillRect(0, H * 0.72, W, H * 0.28);
          ctx.fillStyle = '#ffe9b8';
          ctx.font = '800 15px "Segoe UI",sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('فِرق الاسترداد في الطريق إليكم…', W * 0.5, H * 0.82);
        }
      }

      vignette(ctx, W, H, 0.55);
      raf = requestAnimationFrame(frame);
    }

    /* ---------- رسومات مساعدة ---------- */
    function drawCapsule(c, x, y, sc, firing, mm) {
      c.save();
      c.translate(x, y);
      c.scale(sc, sc);
      if (firing) {
        const fl = c.createLinearGradient(0, 22, 0, 96);
        fl.addColorStop(0, 'rgba(255,255,240,.95)');
        fl.addColorStop(0.35, 'rgba(255,190,90,.85)');
        fl.addColorStop(1, 'rgba(255,90,20,0)');
        c.fillStyle = fl;
        const wig = Math.sin(t * 36) * 5;
        c.beginPath();
        c.moveTo(-13, 20);
        c.quadraticCurveTo(-16 + wig, 52, 0, 78 + Math.abs(wig));
        c.quadraticCurveTo(16 + wig, 52, 13, 20);
        c.closePath(); c.fill();
      }
      // هيكل الكبسولة (جرس)
      const bg = c.createLinearGradient(-30, -34, 30, 24);
      bg.addColorStop(0, '#ffffff'); bg.addColorStop(0.5, '#c9d2de'); bg.addColorStop(1, '#5d6875');
      c.fillStyle = bg;
      c.beginPath();
      c.moveTo(0, -34);
      c.quadraticCurveTo(26, -26, 30, 6);
      c.lineTo(24, 22);
      c.quadraticCurveTo(0, 28, -24, 22);
      c.lineTo(-30, 6);
      c.quadraticCurveTo(-26, -26, 0, -34);
      c.closePath(); c.fill();
      c.strokeStyle = 'rgba(255,255,255,.5)'; c.lineWidth = 1.6; c.stroke();
      // الشعار
      c.fillStyle = mm.color;
      c.beginPath(); c.arc(0, -6, 10.5, 0, 7); c.fill();
      c.fillStyle = '#0a1420';
      c.font = '900 10px "Segoe UI",sans-serif';
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(mm.num, 0, -6);
      c.textBaseline = 'alphabetic';
      // درع حراري سفلي
      c.fillStyle = '#39414c';
      c.beginPath(); c.moveTo(-24, 22); c.quadraticCurveTo(0, 28, 24, 22); c.lineTo(20, 28); c.quadraticCurveTo(0, 33, -20, 28); c.closePath(); c.fill();
      c.restore();
    }
    function drawWindowFrame(c, W, H) {
      // إطار نافذة الكبسولة (جوانب سوداء)
      c.fillStyle = '#04070d';
      c.beginPath();
      c.moveTo(0, 0); c.lineTo(W * 0.09, 0); c.quadraticCurveTo(W * 0.16, H * 0.5, W * 0.22, H);
      c.lineTo(0, H); c.closePath(); c.fill();
      c.beginPath();
      c.moveTo(W, 0); c.lineTo(W * 0.91, 0); c.quadraticCurveTo(W * 0.84, H * 0.5, W * 0.78, H);
      c.lineTo(W, H); c.closePath(); c.fill();
      c.beginPath();
      c.moveTo(0, 0); c.lineTo(W, 0); c.lineTo(W, H * 0.075);
      c.quadraticCurveTo(W * 0.5, H * 0.13, 0, H * 0.075); c.closePath(); c.fill();
      c.beginPath();
      c.moveTo(0, H); c.lineTo(W, H); c.lineTo(W, H * 0.93);
      c.quadraticCurveTo(W * 0.5, H * 0.88, 0, H * 0.93); c.closePath(); c.fill();
      // براغي
      c.fillStyle = 'rgba(150,180,210,.35)';
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        c.beginPath(); c.arc(W / 2 + Math.cos(a) * W * 0.47, H / 2 + Math.sin(a) * H * 0.47, 2.4, 0, 7); c.fill();
      }
    }
    function drawTiltGauge(c, W, H, tilt) {
      const gw = Math.min(360, W * 0.6), gh = 26;
      const x = W / 2 - gw / 2, y = H - 66;
      c.fillStyle = 'rgba(4,10,18,.78)';
      rr(c, x - 12, y - 12, gw + 24, gh + 46, 14); c.fill();
      c.fillStyle = 'rgba(255,255,255,.06)';
      rr(c, x, y, gw, gh, 8); c.fill();
      // الشريط الأخضر
      const bandW = gw * 0.34;
      c.fillStyle = 'rgba(69,224,138,.4)';
      rr(c, W / 2 - bandW / 2, y, bandW, gh, 7); c.fill();
      c.strokeStyle = 'rgba(69,224,138,.85)'; c.lineWidth = 1.5;
      rr(c, W / 2 - bandW / 2, y, bandW, gh, 7); c.stroke();
      // الإبرة
      const nx = W / 2 + clamp(tilt, -1, 1) * (gw / 2 - 6);
      const inBand = Math.abs(tilt) <= 0.34;
      c.fillStyle = inBand ? '#4dd9ff' : '#ff8a5c';
      c.save();
      c.shadowColor = c.fillStyle; c.shadowBlur = 12;
      rr(c, nx - 3.2, y - 5, 6.4, gh + 10, 3); c.fill();
      c.restore();
      c.fillStyle = '#9fdcff';
      c.font = '700 10px "Segoe UI",sans-serif';
      c.textAlign = 'center';
      c.fillText('TILT — حافظ على الإبرة داخل الأخضر', W / 2, y + gh + 26);
    }
    function easeInOut(k) { return k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; }

    frame(performance.now());

    /* @QA */ window.Return = {
      get phase() { return phase; },
      get integrity() { return R.integrity; },
      get needle() { return R.needle; },
      get zone() { return [R.zoneL, R.zoneL + 0.26]; },
      get alt() { return phase === 'land' || phase === 'splash' ? R.landAlt : R.alt; },
      get heat() { return R.heat; },
      get tilt() { return R.tilt; }, // @QA
      get landing() { return R.landing; },
      skipTo(name) {   // @QA
        phase = name; phaseT = 0;
        if (name === 'entry') { courseWrap.classList.add('hidden'); showEntryPads(true); R.alt = 121; setPhaseLabel('ATMOSPHERIC ENTRY'); }
        if (name === 'land') { R.landAlt = 15.2; showEntryPads(false); $('land-alt').classList.remove('hidden'); $('chute-btn').classList.remove('hidden'); setPhaseLabel('LANDING'); }
      },
      lockCourse() { for (let i = 0; i < 3 - R.courseLocks; i++) tryLockCourse(); }, // @QA
      resolveEvents() {   // @QA
        while (R.eventsFired.length < 2) {
          fireEvent();
          const firstGood = $('ret-choices') && $('ret-choices').children[0];
          if (firstGood) firstGood.click(); else break;
        }
      },
      deploy() { deployChute(); } // @QA
    };

    this._stop = () => {
      stop = true; cancelAnimationFrame(raf); cvs.destroy();
      window.removeEventListener('keydown', kd);
      window.removeEventListener('keyup', ku);
    };
  },
  unmount() { if (this._stop) this._stop(); }
});
