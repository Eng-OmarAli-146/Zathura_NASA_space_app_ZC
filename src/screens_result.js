/* ============================================================================
   screens_result.js — ⑨ تقرير المهمة
   ==========================================================================*/

registerScreen('result', {
  mount() {
    const m = MISSIONS.find(x => x.id === (Game.result && Game.result.mission));
    const r = Game.result || { reason: 'complete', sols: 0, samples: 0, science: 0, dose: [0, 0, 0], o2: 100, h2o: 100, food: 100, target: 53 };
    if (!m) { go('destinations'); return; }

    const REASONS = {
      complete: { t: 'المهمة اكتملت ✓', c: 'var(--green)', d: 'وصلت لنهاية المدة المخططة بفريق حيّ.' },
      o2: { t: 'المهمة انتهت — نفاد أوكسجين', c: 'var(--red)', d: 'مخزون الأوكسجين وصل صفر. دعم الحياة أولوية قصوى.' },
      water: { t: 'المهمة انتهت — نفاد مياه', c: 'var(--red)', d: 'كفاءة التدوير نزلت ومخزون المياه خلص.' },
      food: { t: 'المهمة انتهت — نفاد غذاء', c: 'var(--red)', d: 'الدفيئة مش كافية لوحدها، والمخزون وصل للنهاية.' },
      dose: { t: 'المهمة أُلغيت — حد الإشعاع', c: 'var(--red)', d: 'أحد الرواد وصل 600 mSv — السقف المهني.' }
    };
    const R = REASONS[r.reason] || REASONS.complete;
    const maxDose = Math.max(...r.dose);
    const isWin = r.reason === 'complete';
    // كفاءة الموارد — الجوهر: قدّ إيه حفتظت بمواردك عبر المهمة
    const resGrade = (() => {
      const avgRem = (r.o2 + r.h2o + r.food) / 3;
      const doseFrac = Math.min(1, maxDose / 600);
      const solsFrac = Math.min(1, (r.sols || 0) / Math.max(1, r.target || 1));
      const score = avgRem * 0.5 + (1 - doseFrac) * 35 + solsFrac * 15;
      if (score >= 60) return { t: 'ممتازة', c: 'var(--green)' };
      if (score >= 32) return { t: 'جيدة', c: 'var(--amber)' };
      return { t: 'ضعيفة', c: 'var(--red)' };
    })();
    const stars = (() => {
      let s = 0;
      if (isWin) s++;
      if (maxDose < 300) s++;
      if (r.samples >= (m.id === 'mars' ? 5 : 2)) s++;
      return s;
    })();

    // احفظ أفضل نتيجة لكل مهمة وامسح حفظ المهمة الجارية — المهمة انتهت
    try { BestSave.set(m.id, stars); RunSave.clear(); } catch (e) { console.error('[best]', e); }
    try {
      if (window.ACH) ACH.event({
        completes: isWin ? 1 : 0,
        scienceTotal: Math.round(r.science || 0),
        bestStars: stars,
        perfectLandings: (Game.result && Game.result.return && Game.result.return.landing === 'perfect') ? 1 : 0
      });
    } catch (e) { console.error('[ach]', e); }
    try {
      if (window.UPG) {
        const earned = UPG.award(Math.round(r.science || 0), isWin);
        if (earned > 0) toast('+' + earned + ' ⚛ رصيد ترقية — أنفقه من «🚀 ترقية المركبة» في مركز التحكم', 'good');
      }
    } catch (e) { console.error('[upg]', e); }

    const root = $('screen-result');
    root.innerHTML = `
      <div style="position:absolute;inset:0;overflow-y:auto;padding:88px 22px 40px">
        <div style="max-width:1080px;margin:0 auto">

          <div style="text-align:center;margin-bottom:26px">
            <div class="eyebrow" style="color:${R.c}">MISSION ${m.num} · ${m.nameEn} · DEBRIEF</div>
            <div class="h1" style="font-size:clamp(22px,3.4vw,40px);margin:10px 0 6px;color:${R.c}">${R.t}</div>
            <div class="sub" style="max-width:600px;margin:0 auto;font-size:13px">${R.d}</div>
            <div id="res-stars" data-stars="${stars}" aria-label="${stars} من 3 نجوم"
              style="font-size:30px;letter-spacing:8px;color:var(--amber);margin-top:14px">
              ${[0, 1, 2].map(i => `<span class="star${i < stars ? ' on' : ''}"
                style="color:${i < stars ? 'var(--amber)' : 'rgba(255,255,255,.15)'}">★</span>`).join('')}
            </div>
            <div class="sub" style="font-size:11px;margin-top:2px">
              ${isWin ? 'مهمة مكتملة' : 'مهمة غير مكتملة'} · ${maxDose < 300 ? 'جرعة آمنة' : 'جرعة عالية'} ·
              ${r.samples >= (m.id === 'mars' ? 5 : 2) ? 'عينات كافية' : 'عينات ناقصة'}
            </div>
          </div>

          ${Game.result.isru ? (() => {
            const I = Game.result.isru;
            const unitsIce = (I.ice || 0) * 4;
            const kgSaved = unitsIce + (I.electrolysis || 0) * 6 + (I.sinter || 0) * 8 + (I.moxie || 0) * 2;
            const score = (I.ice || 0) + (I.electrolysis || 0) * 2 + (I.sinter || 0) * 2 + (I.moxie || 0);
            const grade = score >= 12 ? { t: 'ممتازة — اكتفاء ذاتي', c: 'var(--green)' }
                        : score >= 6  ? { t: 'جيدة — خطوات محلية حقيقية', c: 'var(--amber)' }
                                      : { t: 'محدودة — اعتمدت على شحن الأرض', c: 'var(--red)' };
            return `<div class="card" style="margin-bottom:14px;border-color:rgba(150,225,255,.35);background:linear-gradient(170deg,rgba(16,34,46,.6),rgba(6,10,14,.6))">
            <div class="h3" style="color:#8ad8ff;font-size:13px;letter-spacing:1px;margin-bottom:12px">⛏ استغلال الموارد المحلية — ISRU <span style="font-size:9px;color:var(--dim2)">(الموارد اللي مش محتاج تشحنها من الأرض)</span></div>
            <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px">
              <div class="stat" style="flex-direction:column;align-items:flex-start;gap:4px">
                <span class="k">🧊 ثلج مُستخرج</span>
                <span class="v mono" style="font-size:17px">${unitsIce} <span style="font-size:10px;color:var(--dim)">وحدة</span></span>
              </div>
              <div class="stat" style="flex-direction:column;align-items:flex-start;gap:4px">
                <span class="k">💧 تحاليل كهربائية</span>
                <span class="v mono" style="font-size:17px">${I.electrolysis || 0}</span>
              </div>
              <div class="stat" style="flex-direction:column;align-items:flex-start;gap:4px">
                <span class="k">🧱 كتل درع مصهورة</span>
                <span class="v mono" style="font-size:17px">${I.sinter || 0} <span style="font-size:10px;color:var(--dim)">+${Math.round((I.sinterShield || 0) * 100)}%</span></span>
              </div>
              <div class="stat" style="flex-direction:column;align-items:flex-start;gap:4px">
                <span class="k">⚡ تشغيلات MOXIE</span>
                <span class="v mono" style="font-size:17px">${I.moxie || 0}</span>
              </div>
            </div>
            <div class="row" style="justify-content:space-between;align-items:center;margin-top:12px;gap:10px;flex-wrap:wrap">
              <div style="font-size:11px;color:#a8c6e0;line-height:1.8">≈ <b class="mono" style="color:#8ad8ff">${kgSaved}</b> كجم مواد لم تُشحن من الأرض<br>
                <span style="color:var(--dim2);font-size:9.5px">Ice→O₂ · الريجوليث→درع · ISRU = الفارق بين قاعدة تدوم وقاعدة تجف (NASA Moon-to-Mars)</span></div>
              <div class="v" style="color:${grade.c};font-weight:900;font-size:12px;text-align:center;max-width:150px">${grade.t}</div>
            </div>
            ${I.resupply ? `<div class="card tight" style="margin-top:10px;border-color:rgba(255,179,71,.35);font-size:10.5px;line-height:1.7;color:#ffd9a8">⚠ استُخدم إمداد أرضي (DSN) مرة واحدة — كل كيلو من الأرض بيخصم من قيمة «الاعتماد على الذات».</div>` : ''}
          </div>`; })() : ''}

          ${Game.result.return ? `
          <div class="card" style="margin-bottom:14px;border-color:rgba(69,224,138,.3);background:linear-gradient(170deg,rgba(20,40,30,.55),rgba(8,14,12,.6))">
            <div class="h3" style="color:#7ff0b0;font-size:13px;letter-spacing:1px;margin-bottom:12px">🌊 رحلة العودة — تقرير الاسترداد</div>
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px" class="ret-sum">
              <div class="stat" style="flex-direction:column;align-items:flex-start;gap:4px">
                <span class="k">دخول الغلاف الجوي</span>
                <span class="v" style="font-size:15px">${({clean:'🟢 نظيف — حرارة متزنة', warm:'🟠 حار — تجاوز حدود', hard:'🔴 عنيف — تلف حراري'})[Game.result.return.entry] || Game.result.return.entry}</span>
              </div>
              <div class="stat" style="flex-direction:column;align-items:flex-start;gap:4px">
                <span class="k">الهبوط في المحيط</span>
                <span class="v" style="font-size:15px">${({perfect:'🟢 مثالي (2.2–4.5 كم)', good:'🟠 خارج النطاق — آمن', hard:'🔴 قاسٍ — تحذير'})[Game.result.return.landing] || Game.result.return.landing}</span>
              </div>
              <div class="stat" style="flex-direction:column;align-items:flex-start;gap:4px">
                <span class="k">سلامة المركبة</span>
                <span class="v" style="font-size:15px">${Game.result.return.integrity}%</span>
              </div>
            </div>
          </div>
          <style>@media(max-width:760px){.ret-sum{grid-template-columns:1fr !important}}</style>` : ''}
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px" class="res-grid">
            <div class="card">
              <div class="h3" style="color:var(--cyan);font-size:13px;letter-spacing:1px;margin-bottom:12px">📊 النتائج النهائية</div>
              <div class="stat"><span class="k">أيام على الموقع</span><span class="v">${r.sols} / ${m.duration_days}</span></div>
              <div class="stat"><span class="k">كفاءة إدارة الموارد</span><span class="v" style="color:${resGrade.c};font-weight:900">${resGrade.t}</span></div>
              <div class="stat"><span class="k">العينات المجمّعة</span><span class="v">${r.samples} / ${m.id === 'mars' ? 6 : 3}</span></div>
              <div class="stat"><span class="k">نقاط العلم</span><span class="v">${r.science}</span></div>
              <div class="stat"><span class="k">الجرعة القصوى</span><span class="v" style="color:${maxDose > 400 ? 'var(--red)' : maxDose > 200 ? 'var(--amber)' : 'var(--green)'}">${Math.round(maxDose)} / 600 mSv</span></div>
              <div class="stat"><span class="k">الأوكسجين</span><span class="v">${Math.round(r.o2)}%</span></div>
              <div class="stat"><span class="k">المياه</span><span class="v">${Math.round(r.h2o)}%</span></div>
              <div class="stat"><span class="k">الغذاء</span><span class="v">${Math.round(r.food)}%</span></div>
            </div>

            <div class="card">
              <div class="h3" style="color:var(--amber);font-size:13px;letter-spacing:1px;margin-bottom:12px">🎓 إيه اللي اتعلمته فعليًا</div>
              ${renderLesson(m, r, maxDose)}
            </div>
          </div>

          <div class="card" style="margin-top:14px">
            <div class="h3" style="color:var(--cyan);font-size:13px;letter-spacing:1px;margin-bottom:10px">
              📚 المصادر الحقيقية المستخدمة في هذه المهمة
            </div>
            ${(() => {
              const ids = new Set();
              m.scenarios.forEach(sid => { const sc = SCENARIOS[sid]; if (sc && sc.source) ids.add(sc.source); });
              ids.add('rad_surface'); ids.add('rad_cruise'); ids.add('crew_limit');
              if (m.id === 'mars') { ids.add('rems'); ids.add('moxie'); }
              return [...ids].map(id => {
                const s = SOURCES[id];
                if (!s) return '';
                return `<div class="row" style="justify-content:space-between;padding:8px 0;
                  border-bottom:1px solid rgba(255,255,255,.06);gap:10px;flex-wrap:wrap">
                  <a href="${s.url}" target="_blank" rel="noopener"
                     style="color:var(--cyan);font-size:12px;font-weight:800;text-decoration:none">${s.label}</a>
                  <span class="mono" style="font-size:10.5px;color:var(--amber)">${s.value}</span>
                </div>`;
              }).join('');
            })()}
          </div>

          <div style="display:flex;gap:10px;justify-content:center;margin-top:22px;flex-wrap:wrap">
            <button class="btn" id="res-restart" onclick="Out.__restart&&Out.__restart()">↻ أعد المحاولة بخطة مختلفة</button>
            <button class="btn ghost" id="res-other" onclick="go('destinations')">${svgIcon('arrow', 14)} وجهة أخرى</button>
            <button class="btn ghost" id="res-home" onclick="go('hq')">⌂ مركز التحكّم</button>
            <button class="btn ghost" id="res-share" onclick="shareResult()" aria-label="شارك نتيجتك">${svgIcon('data', 14)} شارك نتيجتك</button>
          </div>
        </div>
      </div>
      <style>@media(max-width:820px){.res-grid{grid-template-columns:1fr !important}}</style>
    `;

    window.Out = Out;
    Out.__restart = () => {
      outReset();
      go('outpost');
    };

    Audio.ok();
  }
});

function renderLesson(m, r, maxDose) {
  const rows = [];
  if (r.reason === 'o2') {
    rows.push(['☠', 'الأوكسجين خلص لأن دعم الحياة كان تحت الحد. 0.84 كجم/رائد/يوم رقم ثابت — مش قياس اختياري.']);
  }
  if (r.reason === 'water') {
    rows.push(['💧', 'الماء أثقل مورد بصريا: 3.2 كجم يوميًا. كفاءة التدوير نزلت، الاستهلاك زاد.']);
  }
  if (r.reason === 'food') {
    rows.push(['🥫', 'الدفيئة لوحدها لا تكفي — معادلة NASA: 1.56 كجم غذاء جاف يوميًا للرائد.']);
  }
  if (r.reason === 'dose' || maxDose > 400) {
    rows.push(['☢', `الجرعة وصلت ${Math.round(maxDose)} mSv. السقف 600 مدى الحياة. العاصفة الواحدة حدها 250.`]);
  }
  if (r.science > 0 && r.reason !== 'complete') {
    rows.push(['🔬', 'العلم اللي أنتجته جزء من نتيجة المهمة — حتى لو الطاقم ما رجعش بالكامل.']);
  }
  if (r.samples === 0) {
    rows.push(['⛏', 'مفيش عينة اتجمعت — الخروج (EVA) بيكلّف 8 ساعات ويرفع الجرعة.']);
  }
  if (r.reason === 'complete') {
    rows.push(['✓', 'إدارة الموارد بالتوازن: مفيش مورد استُهلك تحت حد الأمان.']);
    rows.push(['✓', 'الدرع + الملجأ قلّلا الجرعة — مقابل طاقة اتعوّضت بصيانة.']);
  }
  if (!rows.length) rows.push(['→', 'جرّب استراتيجية مختلفة: قلل العلم في الأيام اللي فيها تحذير عاصفة.']);

  return rows.map(([ic, txt]) => `
    <div class="row gap8" style="align-items:flex-start;padding:9px 0;border-bottom:1px solid rgba(255,255,255,.05)">
      <span style="font-size:15px;flex:0 0 auto">${ic}</span>
      <span style="font-size:12px;line-height:1.75;color:#c8d8ea">${txt}</span>
    </div>`).join('');
}
