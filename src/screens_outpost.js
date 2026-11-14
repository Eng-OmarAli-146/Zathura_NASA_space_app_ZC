/* ============================================================================
   screens_outpost.js — ⑦ القاعدة + ⑧ الأحداث
   يحافظ على كل ميكانيكا النسخة السابقة: الطاقة، ساعات الطاقم، الإشعاع،
   الملجأ، الأوكسجين، الماء، الغذاء، جمع العينات، دورة اليوم.
   + أنيميشن مختلف لكل نوع حدث (مفيش قالب واحد).
   ==========================================================================*/

/* --------------------------------------------------------------- الحالة */
const Out = {
  m: null,
  sol: 1,
  phase: 'plan',       // plan | running | event | done
  hours: 24,
  alloc: { life: 4, green: 3, sci: 5, shield: 3, heat: 4 },
  tasks: { eva: 0, sample: 0, maint: 0, science: 0 },
  o2: 100, h2o: 100, food: 100,
  dose: [0, 0, 0],
  powerGen: 0, powerUse: 0,
  samples: 0,
  science: 0,
  shelter: false,
  dust: 0,
  storm: null,
  eventQueue: [],
  log: [],
  stars: 0,
  /* ---- اللاعب داخل العالم ---- */
  player: { x: 0.50, y: 0.78, vx: 0, vy: 0, facing: 1, walk: 0, moving: false },
  near: null,          // الموديول القريب
  nearSite: null,      // موقع عينة قريب
  sites: [],           // مواقع العينات على السطح
  drill: 0,            // تقدّم الحفر (0..1)
  simT: 0,             // ثواني انقضت داخل الـSol الحالي (زمن مستمر)
  simSpeed: 1,         // سرعة الزمن ×1/×2/×3
  solLength: 12,       // ثواني حقيقية لكل Sol
  solAccum: null,      // مجمّع استنزاف الـSol الحالي للتقرير التلقائي
  solarDamage: 0,      // ضرر ترابي للألواح (0..0.8) — بينقص 12% كل Sol
  harvests: 0,         // عدد مرات ريّ الدفيئة (لمهمة «الرعاية»)
  regolithTotal: 0,    // إجمالي ريجوليث اتجمع (لمهمة «الحقائب»)
  evHistory: [],       // آخر الأحداث التي ظهرت (لمنع التكرار الخلفي)
  flags: {},           // رايات قرارات متراكمة (صيانة مؤجلة maintDue)
  cascadeCd: {},       // تبريد كل نوع تداعية — ضد الملل
  goodCalls: 0,        // قرارات صحيحة اتخذت
  badCalls: 0,         // قرارات خاطئة اتخذت — تؤثر في الأحداث الجاية
  work: { id: '', p: 0 }, // عمل يدوي عند موديول (تقدّم 0..1)
  workTarget: null,    // تعريف العمل المتاح عند الموديول الحالي
  reviewedSol: 0,      // آخر Sol تمت فيه مراجعة أنظمة الطيران
  resupplyUsed: false, // هل استُخدم طلب إمداد DSN؟
  /* ---- أنظمة «العالم الحي» ---- */
  damage: { solar: 0, sci: 0, moxie: 0, green: 0, hab: 0, shield: 0, dish: 0 }, // 0 سليم · 2 معطل
  arcLeak: null,       // { stage: 1..3, sol } — تسريب خط الأوكسجين متعدد المراحل
  arcBattery: null,    // { stage: 1..3, sol } — بطاريات الألواح تحتضر
  crop: { stage: 2, thirst: 0 },  // مراحل الدفيئة 0..4 · أيام بلا ريّ
  carry: { sample: 0, ice: 0 },   // الظهرية — عينات/ثلج لسه مارجعتهاش القاعدة
  footprints: [],      // آثار مشي تتلاشى ببطء
  _wasEvening: false,  // عبور شروق/غروب لبطاقة المساء
  _fpT: 0,             // عداد بصمات
  /* ---- استغلال الموارد المحلية (ISRU) ---- */
  ice: 0,              // ثلج مستخرج من مواقع الحفر
  regolith: 0,         // تربة/ريجوليث (+1 مع كل عينة)
  sinterShield: 0,     // تقليل جرعة تراكمي من صهر الريجوليث (0..0.4)
  isruCount: 0,        // عداد مهام ISRU (هدف المهمة)
  isru: { ice: 0, electrolysis: 0, sinter: 0, moxie: 0 },
  iceSites: [],        // مواقع الجليد على السطح
  lastReport: null,    // تقرير آخر Sol للعرض
  _hWarn: 0,
  cam: { x: 0.5, y: 0 },
  keys: {},
  paused: false
};

const OUT_TARGETS = { o2max: 100, doseLimit: 600 };
const CARRY_MAX = 2;                                       // سعة الظهرية — حمولات EVA المحدودة
const carryUsed = () => (Out.carry.sample | 0) + (Out.carry.ice | 0);
const resCap = () => (window.UPG && UPG.cap) ? UPG.cap() : 100;  // حد الموارد القصوى بعد ترقية الخزان

function outReset() {
  Out.m = MISSIONS.find(x => x.id === Game.mission);
  DayClock.mount(5.67);                 // 05:40 فجرًا — يُثبَّت عند الاستئناف من الحفظ داخل applyRun
  Out.sol = 1;
  Out.phase = 'plan';
  Out.hours = 24;
  Out.alloc = { life: 4, green: 3, sci: 3, shield: 3, heat: 2 };  // 15 — فايض النهار الوفير يتحول ليلًا إلى قرار صعب (وحدة واحدة بس تفصلها)
  Out.tasks = { eva: 0, sample: 0, maint: 0, science: 0 };
  Out.o2 = 100; Out.h2o = 100; Out.food = 100;
  Out.dose = [12, 9, 8];
  Out.samples = 0; Out.science = 0;
  Out.shelter = false; Out.dust = 0; Out.storm = null;
  Out.eventQueue = [];
  Out.flags = {}; Out.cascadeCd = {}; Out._cascadeCause = null;
  Out.log = [];
  Out.stars = 0;
  Out.player = { x: 0.50, y: 0.78, vx: 0, vy: 0, facing: 1, walk: 0, moving: false };
  Out.near = null;
  Out.nearSite = null;
  Out.drill = 0;
  Out.work = { id: '', p: 0 };
  Out.workTarget = null;
  Out.simT = 0; Out.simSpeed = 1;
  Out.solAccum = { o2: 0, h2o: 0, food: 0, dose: 0, deficit: false };
  Out.reviewedSol = 0;
  Out.resupplyUsed = false;
  Out.lastReport = null;
  const siteN = sampleTargetOf(Out.m);                 // العدد = هدف المهمة بالضبط
  const pickIds = SAMPLE_PICK[siteN] || SAMPLE_PICK[3];
  Out.sites = pickIds.map(i => ({ x: SAMPLE_SPOTS[i][0], y: SAMPLE_SPOTS[i][1], taken: false, seed: i * 1.7 + 0.4 }));
  Out._sampleRevealed = false; Out._iceRevealed = false;
  // مواقع الجليد — حسب فيزياء كل وجهة (لا جليد على سطح الزهرة)
  Out.ice = 0; Out.regolith = 0; Out.sinterShield = 0; Out.isruCount = 0;
  Out.isru = { ice: 0, electrolysis: 0, sinter: 0, moxie: 0 };
  Out.solarDamage = 0; Out.harvests = 0; Out.regolithTotal = 0;
  Out.evHistory = []; Out.goodCalls = 0; Out.badCalls = 0;
  Out.aurora = null;          // ⚡ حدث الشفق النشط {site, tLeft} — لـ«كوكب زويل» فقط
  Out.auroraDoneNight = false; // منع تكرار الشفق أكثر من مرة كل ليلة
  Out._wasNight = false;
  Out.damage = { solar: 0, sci: 0, moxie: 0, green: 0, hab: 0, shield: 0, dish: 0 };
  Out.arcLeak = null; Out.arcBattery = null;
  Out.crop = { stage: 2, thirst: 0 };
  Out.carry = { sample: 0, ice: 0 };
  Out.footprints = [];
  Out._wasEvening = false; Out._fpT = 0;
  const iceN = Out.m.id === 'mars' ? 3 : Out.m.id === 'moon' ? 2 : Out.m.id === 'mercury' ? 1 : Out.m.id === 'saturn' ? 2 : Out.m.id === 'zewail' ? 4 : 0;
  const iceIdx = ICE_PICK[iceN] || ICE_PICK[4];
  Out.iceSites = iceIdx.map(i => ({ x: ICE_SPOTS[i][0], y: ICE_SPOTS[i][1], taken: false, seed: 3.1 + i * 2.3 }));
  Out.cam = { x: 0, y: 0 };
  Out.paused = false;
  Out.visited = {};
}
function outLog(html, kind = '') {
  Out.log.unshift({ html, kind, sol: Out.sol, t: Date.now() });
  if (Out.log.length > 40) Out.log.pop();
  try { saveRun(); } catch (e) { /* الحفظ لا يوقف اللعب */ }
  const host = $('out-log');
  if (!host) return;
  // كل رسالة تظهر ٤.٥ ثانية ثم تتلاشى — السجل الكامل بزر «📜 السجل»
  const d = document.createElement('div');
  d.className = 'toast ' + kind;
  d.style.cssText = 'animation:none;font-size:11.5px';
  d.innerHTML = `<span class="mono" style="color:var(--dim2);font-size:9.5px">SOL ${String(Out.sol).padStart(2, '0')}</span> ${html}`;
  host.appendChild(d);
  while (host.children.length > 3) host.removeChild(host.firstChild);
  setTimeout(() => d.classList.add('out'), 4200);
  setTimeout(() => d.remove(), 4750);
}

/* --------------------------------------------- تخطيط القاعدة (فضاء عالم) */
/*  x,y بإحداثيات عالم موحّدة (0..1 أفقياً، 0..1 رأسياً على الأرض)          */
const OUT_LAYOUT = [
  { id: 'hab',    x: 0.50, y: 0.60, label: 'HAB',    labelAr: 'المسكن',        r: 0.052 },
  { id: 'green',  x: 0.66, y: 0.68, label: 'GREEN',  labelAr: 'الدفيئة',       r: 0.044 },
  { id: 'sci',    x: 0.38, y: 0.70, label: 'LAB',    labelAr: 'المعمل',        r: 0.044 },
  { id: 'shield', x: 0.28, y: 0.54, label: 'SHIELD', labelAr: 'الدروع',        r: 0.036 },
  { id: 'solar',  x: 0.80, y: 0.52, label: 'SOLAR',  labelAr: 'الألواح',       r: 0.048 },
  { id: 'moxie',  x: 0.635, y: 0.44, label: 'O₂',     labelAr: 'مولّد الأوكسجين', r: 0.030 },
  { id: 'dish',   x: 0.88, y: 0.70, label: 'DSN',    labelAr: 'طبق الاتصال',   r: 0.038 }
];

/* هدف العينات حسب المهمة — مظبوط تمامًا: مريخ ٦ (جمع 6 عينات)، الباقي ٣ */
function sampleTargetOf(mm) { return (mm && mm.id === 'mars') ? 6 : 3; }
/* مواقع العينات موزعة على عرض العالم كله (1.9) — فواصل ~0.30، لا خلط ولا تداخل مع الموديولات */
const SAMPLE_SPOTS = [[0.12, 0.88], [0.42, 0.95], [0.72, 0.88], [1.02, 0.95], [1.32, 0.88], [1.68, 0.95]];
const SAMPLE_PICK = { 6: [0, 1, 2, 3, 4, 5], 3: [0, 3, 5] };
/* مواقع الجليد موزعة أيضًا — اختيار حسابي حسب العدد المطلوب في المهمة */
const ICE_SPOTS = [[0.28, 0.93], [0.84, 0.87], [1.26, 0.94], [1.74, 0.88]];
const ICE_PICK = { 1: [2], 2: [0, 3], 3: [0, 1, 3], 4: [0, 1, 2, 3] };
/* «مختفية لحد ما مهمتها تيجي»: مواقع العينات تظهر مع مهمة العينات، والجليد مع مهمة الموارد المحلية */
const samplesRevealed = () => Quest.isDone('samples') || Quest.activeId() === 'samples';
const iceRevealed = () => Quest.isDone('isru') || Quest.activeId() === 'isru';

/* --------------------------------------------------------- قوة نظام + دورة نهار/ليل */
function smoothstep(a, b, x) { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
/* الدورة البصرية تتبع الساعة الفلكية للكوكب (1 د واقعية = 1 س كوكبية) — منفصلة عن دورة SOL الاقتصادية */
function outDayFrac() { return DayClock.phase(); }
/* المحور: f=0 منتصف الليل · f=0.25 الشروق (~06:00) · f=0.5 ظهر الكوكب · f=0.75 الغروب (~18:00) */
function outDaylight() {
  const f = outDayFrac();
  const up = smoothstep(0.21, 0.29, f);
  const down = 1 - smoothstep(0.71, 0.79, f);
  return clamp(Math.min(up, down), 0, 1);
}
function outPowerAvailable() {
  const m = Out.m;
  const daylight = outDaylight();
  const isDusty = m.env.dust_storms;
  let solar = SIM.daily.power_gen_clear;
  if (isDusty) solar = lerp(SIM.daily.power_gen_clear, SIM.daily.power_gen_dust, Out.dust);
  solar *= daylight;                                       // الليل = لا شيء من الشمس
  if (m.id === 'moon') solar *= (Out.sol % 28 < 14 ? 1 : 0.15); // ليل قمري
  else if (m.id === 'saturn') solar *= 0.25;
  else if (m.id === 'mercury') solar *= 1.6;
  if (Out.storm) solar *= 0.3;
  if (Out.arcBattery && Out.arcBattery.stage >= 3) solar *= 0.5;  // بنك بطاريات منهك — التخزين مش بيقبل الشحن كامل
  solar *= (1 - (Out.solarDamage || 0));                    // ضرر الدوامات الغبارية
  return Math.round((SIM.daily.power_base + solar) * 10) / 10;
}
function outPowerAllocated() {
  return Object.values(Out.alloc).reduce((a, b) => a + b, 0);
}

/* ======================================================================
   OUTPOST SCREEN
   ====================================================================== */
registerScreen('outpost', {
  mount() {
    if (Game.freshRun) {                 // إقلاع جديد من الصفر — يستبدل أي حفظ
      Game.freshRun = false;
      Out.m = null;
      outReset();
      RunSave.clear();
    } else if (!Out.m) {                 // بعد تحديث الصفحة: حاول الاستئناف من الحفظ
      if (!tryResumeRun()) outReset();
    }
    const m = Out.m;

    const root = $('screen-outpost');
    root.innerHTML = `
      <div style="position:absolute;inset:0;overflow:hidden">

        <!-- ===================== العالم ===================== -->
        <div id="out-canvas" style="position:absolute;inset:0"></div>
        <div class="quest-panel" id="out-quests"></div>
        <div id="aurora-banner" class="hidden" role="status" style="position:absolute;top:158px;left:50%;transform:translateX(-50%);z-index:40;padding:9px 20px;border-radius:999px;background:linear-gradient(100deg,#1a1030,#241a4d);border:1px solid rgba(200,160,255,.65);color:#e2ccff;font-weight:800;font-size:12px;letter-spacing:.4px;box-shadow:0 0 26px rgba(170,120,255,.5);animation:aurPulse 1s ease-in-out infinite;white-space:nowrap;max-width:94vw;overflow:hidden;text-overflow:ellipsis">✨ الشفق نشط — موقع ثلج مضيء!</div>
        <div id="mc-card" class="hidden" role="status" style="position:absolute;top:120px;left:16px;z-index:41;width:min(340px,92vw);background:rgba(7,14,24,.94);border:1px solid rgba(77,217,255,.32);border-radius:14px;padding:11px 13px;backdrop-filter:blur(10px);box-shadow:0 14px 40px rgba(0,0,0,.5);cursor:pointer">
          <div class="row" style="justify-content:space-between;align-items:center;gap:8px">
            <span class="mono" style="font-size:9px;letter-spacing:1.8px;color:#4dd9ff;font-weight:800">📡 مركز التحكم — هيوستن</span>
            <span id="mc-sol" class="mono" style="font-size:9px;color:var(--dim2);letter-spacing:1px">SOL 01</span>
          </div>
          <div id="mc-body" style="margin-top:7px;font-size:11px;line-height:1.8;color:#d6e4f2"></div>
          <div id="mc-fact" style="margin-top:7px;padding-top:7px;border-top:1px solid rgba(255,255,255,.08);font-size:9.5px;line-height:1.7;color:#9fd7ff"></div>
        </div>

        <!-- شريط الموارد العلوي -->
        <div id="out-hud" style="position:absolute;top:66px;left:16px;right:16px;display:flex;gap:8px;
          flex-wrap:wrap;pointer-events:none;z-index:20;justify-content:flex-end">
          <div class="card tight" style="padding:7px 11px;border-color:rgba(77,217,255,.32)">
            <div style="font-size:8.5px;color:var(--dim);letter-spacing:1.4px;font-weight:800">SOL</div>
            <div class="row gap8" style="margin-top:2px;align-items:center">
              <div class="mono" id="out-sol" style="font-size:16px;font-weight:900;color:var(--cyan)">
                ${String(Out.sol).padStart(2, '0')}<span style="font-size:10px;color:var(--dim2)">/${m.duration_days}</span>
              </div>
              <div style="text-align:center;line-height:1.15" title="" id="g-tod-wrap">
                <div class="mono" id="g-clock" style="font-size:14px;font-weight:900;color:#ffd98a">05:40</div>
                <div class="mono" id="g-dayn" style="font-size:7px;color:var(--dim2);letter-spacing:1.4px">DAY 1</div>
              </div>
              <span id="g-tod" title="الساعة الكوكبية المحلية" style="font-size:14px">☀️</span>
            </div>
          </div>
          <div class="card tight" style="padding:7px 11px;width:118px">
            <div style="font-size:8.5px;color:var(--dim);letter-spacing:1.4px;font-weight:800">⚡ الطاقة</div>
            <div class="row gap8" style="margin-top:2px">
              <div class="mono" style="font-size:14px;font-weight:900" id="g-power">0</div>
              <div class="bar" style="flex:1"><i id="b-power" style="width:0%;background:linear-gradient(90deg,#2b8fbe,#4dd9ff)"></i></div>
            </div>
            <div class="mono" id="g-power-note" style="font-size:8.5px;margin-top:3px;color:var(--dim2);letter-spacing:.4px">الشمس بتغذي الألواح</div>
          </div>
          <div class="card tight" style="padding:7px 11px;width:104px">
            <div style="font-size:8.5px;color:var(--dim);letter-spacing:1.4px;font-weight:800">🫁 O₂</div>
            <div class="row gap8" style="margin-top:2px">
              <div class="mono" style="font-size:14px;font-weight:900" id="g-o2">100</div>
              <div class="bar" style="flex:1"><i id="b-o2" style="width:100%;background:linear-gradient(90deg,#2fa064,#45e08a)"></i></div>
            
              <span class="mono drain" id="d-o2" style="font-size:9px;color:var(--amber);min-width:38px">▼0.0</span></div>
          </div>
          <div class="card tight" style="padding:7px 11px;width:104px">
            <div style="font-size:8.5px;color:var(--dim);letter-spacing:1.4px;font-weight:800">💧 H₂O</div>
            <div class="row gap8" style="margin-top:2px">
              <div class="mono" style="font-size:14px;font-weight:900" id="g-h2o">100</div>
              <div class="bar" style="flex:1"><i id="b-h2o" style="width:100%;background:linear-gradient(90deg,#4a63b8,#7ba4ff)"></i></div>
            
              <span class="mono drain" id="d-h2o" style="font-size:9px;color:var(--amber);min-width:38px">▼0.0</span></div>
          </div>
          <div class="card tight" style="padding:7px 11px;width:104px">
            <div style="font-size:8.5px;color:var(--dim);letter-spacing:1.4px;font-weight:800">🥫 الغذاء</div>
            <div class="row gap8" style="margin-top:2px">
              <div class="mono" style="font-size:14px;font-weight:900" id="g-food">100</div>
              <div class="bar" style="flex:1"><i id="b-food" style="width:100%;background:linear-gradient(90deg,#a8742a,#ffb347)"></i></div>
            
              <span class="mono drain" id="d-food" style="font-size:9px;color:var(--amber);min-width:38px">▼0.0</span></div>
          </div>
          <div class="card tight" style="padding:7px 11px;width:132px">
            <div style="font-size:8.5px;color:var(--dim);letter-spacing:1.4px;font-weight:800">☢ الجرعة</div>
            <div class="row gap8" style="margin-top:2px">
              <div class="mono" style="font-size:14px;font-weight:900" id="g-dose">0</div>
              <div class="bar" style="flex:1"><i id="b-dose" style="width:0%;background:linear-gradient(90deg,#45e08a,#ffb347,#ff5f6d)"></i></div>
              <span class="mono" style="font-size:9px;color:var(--dim2)">/600</span>
            </div>
          </div>
          <div class="card tight" style="padding:7px 11px;pointer-events:auto">
            <div style="font-size:8.5px;color:var(--dim);letter-spacing:1.4px;font-weight:800">🕒 ساعات</div>
            <div class="mono" style="font-size:16px;font-weight:900;color:var(--purple)" id="g-hours">24</div>
          </div>
        </div>

        <div id="out-daybar" style="position:absolute;top:0;left:0;height:4px;width:0%;z-index:60;
          background:linear-gradient(90deg,#4dd9ff,#45e08a);box-shadow:0 0 10px rgba(77,217,255,.65)"></div>

        <!-- سجل -->
        <div id="out-log" style="position:absolute;left:16px;bottom:16px;width:min(400px,40%);
          display:flex;flex-direction:column;gap:6px;pointer-events:none;z-index:20"></div>

        <!-- شريط التقدّم + زر السجل -->
        <div style="position:absolute;right:16px;bottom:16px;display:flex;gap:7px;z-index:20;pointer-events:none">
          <button class="pill" id="out-log-btn" style="pointer-events:auto;cursor:pointer;font-family:inherit;border-color:rgba(120,180,230,.35);color:#b8d4ee">📜 السجل</button>
          <span class="pill" style="font-size:10px" title="ثلج مستخرج من السطح">🧊 <span id="g-ice">${Out.ice}</span></span>
          <span class="pill" style="font-size:10px" title="تربة/ريجوليث — تدخل في صهر الدرع">🪨 <span id="g-regolith">${Out.regolith}</span></span>
          <span class="pill" style="font-size:10px" title="الظهرية — عينات/ثلج لسه مارجعتهاش للمسكن">🎒 <span id="g-carry">0</span>/${CARRY_MAX}</span>
          <span class="pill" style="font-size:10px">🎯 <span id="g-samples">${Out.samples}</span>/${sampleTargetOf(m)} عينات</span>
          <span class="pill" style="font-size:10px">🔬 <span id="g-science">${Out.science}</span> علم</span>
        </div>

        <!-- لوحة سجل الأحداث (تنفتح بزر 📜) -->
        <div id="out-history" class="hidden" style="position:absolute;right:16px;bottom:64px;width:min(380px,88vw);max-height:48vh;overflow-y:auto;z-index:215;
          background:rgba(8,14,22,.97);border:1px solid rgba(120,180,230,.24);border-radius:14px;padding:12px 12px 10px;
          box-shadow:0 18px 48px rgba(0,0,0,.55)">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;gap:8px">
            <b style="font-size:12px;color:#c8d8f0">📜 سجل الأحداث</b>
            <button id="out-history-close" style="background:none;border:0;color:var(--dim);cursor:pointer;font-size:15px;line-height:1">✕</button>
          </div>
          <div id="out-history-list" style="display:flex;flex-direction:column;gap:6px"></div>
        </div>

        <!-- تلميح الحركة -->
        <div id="out-hint" style="position:absolute;bottom:16px;left:50%;transform:translateX(-50%);
          display:flex;gap:6px;align-items:center;z-index:20;pointer-events:none;
          transition:opacity .5s">
          <span class="pill" style="font-size:10.5px">← → ↑ ↓ للحركة</span>
          <span class="pill" style="font-size:10.5px">E للتفاعل · مطوّل للعمل</span>
        </div>

        <!-- زر التفاعل عند الاقتراب -->
        <button id="out-act" class="hidden" style="position:absolute;z-index:30;transform:translate(-50%,-50%);
          padding:9px 16px;border-radius:999px;border:1px solid rgba(77,217,255,.6);
          background:rgba(8,20,32,.92);color:var(--cyan);font-weight:900;font-size:12px;
          cursor:pointer;backdrop-filter:blur(8px);pointer-events:auto;
          box-shadow:0 8px 26px rgba(0,0,0,.5)">
          <span id="out-act-label">تفاعل</span> <span class="mono" style="opacity:.6;font-size:10px">E</span>
        </button>

        <!-- تلميح الحفر عند الوقوف على موقع عينة -->
        <div id="out-site-prompt" class="hidden" style="position:absolute;bottom:118px;left:50%;transform:translateX(-50%);z-index:26;
          background:rgba(8,20,14,.92);border:1px solid rgba(120,255,180,.4);border-radius:14px;padding:10px 16px;
          text-align:center;pointer-events:none;box-shadow:0 10px 30px rgba(0,0,0,.5)">
          <div id="out-site-tip" style="font-size:11px;color:#8affb8;font-weight:800">⛏ موقع عينة — اضغط مطوّل <span class="mono">E</span> للحفر</div>
          <div style="height:6px;border-radius:99px;background:rgba(255,255,255,.09);overflow:hidden;margin-top:7px;width:180px">
            <div id="out-drill-fill" style="height:100%;width:0%;background:linear-gradient(90deg,#45e08a,#a8ffc8)"></div>
          </div>
        </div>
        <button id="out-eva-hold" class="hidden" style="position:absolute;bottom:182px;left:50%;transform:translateX(-50%);z-index:26;
          width:132px;height:52px;border-radius:14px;border:1px solid rgba(120,255,180,.55);background:rgba(20,44,30,.92);
          color:#8affb8;font-weight:900;font-size:13px;font-family:inherit">⛏ احفر</button>

        <!-- أزرار النظام -->
        <div style="position:absolute;top:14px;left:50%;transform:translateX(-50%);display:flex;gap:7px;z-index:25">
          <button class="icon-btn" id="p-plan" title="خطة اليوم" style="width:38px;height:38px">
            ${svgIcon('menu', 16, '#4dd9ff')}
          </button>
          <button class="icon-btn" id="p-speed" title="سرعة الزمن" style="width:38px;height:38px;border-color:rgba(77,217,255,.45)">
            <span class="mono" id="p-speed-txt" style="font-size:12px;font-weight:900;color:var(--cyan)">×1</span>
          </button>
          <button class="icon-btn" id="p-src" title="مصادر NASA" style="width:38px;height:38px">
            ${svgIcon('external', 15, '#4dd9ff')}
          </button>
        </div>

        <!-- ============ خطة اليوم (درج جانبي) ============ -->
        <aside id="p-drawer" style="position:absolute;top:0;left:0;bottom:0;width:min(360px,90vw);
          background:linear-gradient(180deg,rgba(8,14,22,.985),rgba(4,7,12,.99));
          border-inline-end:1px solid rgba(120,180,230,.16);z-index:400;
          transform:translateX(-105%);transition:transform .38s cubic-bezier(.16,.84,.3,1);
          display:flex;flex-direction:column;padding:74px 16px 18px;overflow-y:auto">
          <div class="row" style="justify-content:space-between;margin-bottom:12px">
            <div>
              <div class="eyebrow" style="font-size:9px">${m.nameEn} · ${m.site}</div>
              <div class="h3" style="margin:3px 0 0;font-size:17px">لوحة التحكم</div>
            </div>
            <button class="icon-btn" id="p-drawer-close" style="width:32px;height:32px">✕</button>
          </div>
          <div class="sub" style="font-size:10.5px;margin-bottom:12px">${m.primaryThreat}</div>

          <div class="card tight" style="margin-bottom:10px">
            <div class="row" style="justify-content:space-between;margin-bottom:7px">
              <span style="font-size:11px;font-weight:800;color:#c8d8f0">⚡ توزيع الطاقة</span>
              <span class="mono" style="font-size:10.5px" id="p-alloc">0 / 0</span>
            </div>
            <div id="p-sliders"></div>
            <div class="sub" style="font-size:10px;margin-top:6px" id="p-alloc-hint">—</div>
          </div>

          <div class="card tight" style="margin-bottom:12px">
            <div style="font-size:11px;font-weight:800;color:#c8d8f0;margin-bottom:8px">🧑‍🚀 مهام اليوم</div>
            <div id="p-tasks" style="display:flex;flex-direction:column;gap:6px"></div>
          </div>

          <button class="btn ghost sm wide" onclick="go('destinations')">
            ${svgIcon('back', 12)} إنهاء المهمة
          </button>
          <div class="card tight" style="margin-top:10px;border-color:rgba(77,217,255,.2);background:rgba(77,217,255,.04)">
            <div style="font-size:10px;line-height:1.8;color:#a8c6e0">
              <b style="color:var(--cyan)">قاعدة:</b> كل خيار له تكلفة — الدروع بتاكل طاقة الحياة، والعلم بيستهلك أوكسجين.
            </div>
          </div>
        </aside>

        <!-- ============ لوحة الموديول ============ -->
        <aside id="out-panel" style="position:absolute;top:0;right:0;bottom:0;width:min(360px,90vw);
          background:linear-gradient(180deg,rgba(8,14,22,.985),rgba(4,7,12,.99));
          border-inline-start:1px solid rgba(120,180,230,.16);z-index:400;
          transform:translateX(105%);transition:transform .38s cubic-bezier(.16,.84,.3,1);
          display:flex;flex-direction:column;padding:74px 16px 18px;overflow-y:auto">
          <div class="row" style="justify-content:space-between;margin-bottom:12px">
            <div>
              <div class="eyebrow" style="font-size:9px">MODULE</div>
              <div class="h3" style="margin:3px 0 0;font-size:17px" id="out-panel-title">—</div>
            </div>
            <button class="icon-btn" id="out-panel-close" style="width:32px;height:32px">✕</button>
          </div>
          <div id="out-panel-body"></div>
        </aside>
        <div id="out-scrim" class="hidden" style="position:absolute;inset:0;background:rgba(2,4,8,.45);z-index:390"></div>

        <!-- ============ تحكم لمسي (موبايل) ============ -->
        <div id="touch-pad">
          <span></span><button data-dir="up" aria-label="أعلى">▲</button><span></span>
          <button data-dir="left" aria-label="يسار">◀</button><span></span><button data-dir="right" aria-label="يمين">▶</button>
          <span></span><button data-dir="down" aria-label="أسفل">▼</button><span></span>
        </div>
        <button id="touch-e" aria-label="تفاعل">تفاعل</button>

        <!-- ============ طبقة الحدث: فوق العالم ============ -->
        <div id="event-layer" class="hidden" style="position:absolute;inset:0;z-index:500;pointer-events:auto">
          <div id="event-canvas" style="position:absolute;inset:0"></div>
          <div style="position:absolute;inset:0;display:flex;align-items:flex-end;justify-content:center;
            padding:0 16px 22px;pointer-events:none">
            <div class="modal-card" id="event-card" style="width:min(680px,100%);position:relative;z-index:2;
              pointer-events:auto;animation:cardUp .35s cubic-bezier(.16,.84,.3,1)"></div>
          </div>
        </div>
      </div>
    `;

    const cvs = makeCanvas($('out-canvas'));
    const { ctx } = cvs;
    let stop = false, raf = 0, lastT = performance.now(), t = 0;
    const dust = new ParticleField(2000, 1400, 110, { speed: 10, size: [.4, 1.8], alpha: .14, color: m.accent });

    /* =================================================================
       محرّك العالم — مشي اللاعب + كاميرا + تفاعل مع الموديولات
       ================================================================= */
    const WORLD = { w: 1.9, h: 1.0 };   // عرض العالم (أفقياً) × العمق
    const VIEW_W = 0.62;                // نسبة نصف مدى الرؤية الأفقية

    function w2s(wx, wy, W, H) {
      // تحويل عالم → شاشة (منظور بسيط: y يتحكم بالحجم والموضع)
      const depth = clamp(wy, 0, 1);
      const camX = Out.cam.x;
      const sx = W * 0.5 + (wx - camX) * W * (1.02 - depth * 0.28);
      const sy = H * (0.40 + depth * 0.56);
      const sc = clamp(0.62 + depth * 0.95, 0.5, 1.7);
      return { x: sx, y: sy, sc };
    }

    const input = { left: false, right: false, up: false, down: false, act: false, actHeld: false, actDownT: 0 };

    
    /* ---- لوحة المفاتيح (تُثبّت مرة واحدة) ---- */
    let updateKeys = null;
    function bindKeys() {
      const map = {
        ArrowLeft: 'left', KeyA: 'left',
        ArrowRight: 'right', KeyD: 'right',
        ArrowUp: 'up', KeyW: 'up',
        ArrowDown: 'down', KeyS: 'down'
      };
      updateKeys = (enable) => { input._enabled = enable; };
      input._enabled = true;
      const down = (e) => {
        if (!input._enabled) return;
        if (Game.screen !== 'outpost') return;
        if (Out.paused || Out.phase === 'event') return;
        if (e.code === 'Space' || e.code === 'KeyE' || e.code === 'Enter') {
          if (!e.repeat) input.actDownT = performance.now();
          input.actHeld = true;
          e.preventDefault();
          return;
        }
        const k = map[e.code];
        if (k) { input[k] = true; e.preventDefault(); }
      };
      const up = (e) => {
        if (e.code === 'Space' || e.code === 'KeyE' || e.code === 'Enter') {
          input.actHeld = false;
          // نقرة قصيرة (<280ms) = فتح اللوحة عند الموديول
          if (performance.now() - (input.actDownT || 0) < 280) input.act = true;
          return;
        }
        const k = map[e.code];
        if (k) input[k] = false;
      };
      window.addEventListener('keydown', down, { passive: false });
      window.addEventListener('keyup', up);
      bindKeys._off = () => {
        window.removeEventListener('keydown', down);
        window.removeEventListener('keyup', up);
      };
    }

    /* ---- تحديث اللاعب ---- */
    /* ---------------- أعمال يدوية داخل العالم (اضغط مطوّل E) ---------------- */
    function forecastLog() {
      const dusty = m.env.dust_storms;
      if (m.id === 'moon') return (Out.sol % 28 < 14)
        ? '📋 مراجعة الأنظمة (+1 علم) — النهار القمري مستمر: استغل الطاقة للعمل الخارجي.'
        : '📋 مراجعة الأنظمة (+1 علم) — الليل على الأبواب: الألواح هتشتغل بـ15% فقط.';
      if (dusty) return Out.dust > 0.55
        ? '📋 مراجعة الأنظمة (+1 علم) — الغبار في ذروته: نظّف الألواح بدري.'
        : Out.dust > 0.25
          ? '📋 مراجعة الأنظمة (+1 علم) — غبار متزايد متوقع: خطط صيانة.'
          : '📋 مراجعة الأنظمة (+1 علم) — الجو مقبول: فرصة للعمل الخارجي.';
      if (m.id === 'mercury') return '📋 مراجعة الأنظمة (+1 علم) — تقبّل الحرارة: تجنب الظهيرة في أي EVA.';
      if (m.id === 'venus') return '📋 مراجعة الأنظمة (+1 علم) — ضغط الرياح أعلى اليوم: راقب الحبال والمولّد.';
      return '📋 مراجعة الأنظمة (+1 علم) — الأنظمة مستقرة: يوم جيد للعلم.';
    }
    function worldWorkFor(id) {
      /* إصلاحات الطوارئ لها الأولوية على أي شغل روتيني */
      if (id === 'moxie' && Out.arcLeak) {
        const st = Out.arcLeak.stage | 0;
        const hrs = st >= 3 ? 3 : st === 2 ? 2 : 1;
        return {
          id: 'arc-leak', short: '🔧 رتق',
          tip: st >= 3 ? '🔧 الخط ممزق — اضغط مطوّل E للإصلاح — −' + hrs + ' ساعات · يرجع MOXIE يشتغل'
              : '🔧 تسريب — اضغط مطوّل E لوقفه — −' + hrs + ' ساعة',
          time: st >= 3 ? 3.2 : 1.8, hours: hrs,
          done: () => {
            const exploded = (Out.arcLeak.stage | 0) >= 3;
            Out.arcLeak = null;
            Out.flags.leakCd = Out.sol;
            if (exploded) Out.damage.moxie = 0;
            outLog(exploded ? '🔧 الخط اتصلح — <b>MOXIE رجع يشتغل</b>' : '🔧 <b>التسريب اتوقف</b> عند مصدره', 'good');
          }
        };
      }
      if (id === 'solar' && Out.arcBattery) {
        const st = Out.arcBattery.stage | 0;
        const hrs = st >= 3 ? 3 : 2;
        return {
          id: 'arc-batt', short: '🔋 صلّح',
          tip: '🔋 بنك البطاريات — اضغط مطوّل E ' + (st >= 3 ? 'لإعادة التشغيل الكامل' : 'للفحص والرتق') + ' — −' + hrs + ' ساعات',
          time: st >= 3 ? 3.2 : 2.2, hours: hrs,
          done: () => {
            Out.arcBattery = null;
            Out.flags.battCd = Out.sol;
            Out.solarDamage = 0;
            outLog('🔋 بنك البطاريات رجع زي الحديد — <b>الألواح والتخزين سليمة</b>', 'good');
          }
        };
      }
      switch (id) {
        case 'solar':
          return Out.dust > 0.02 ? {
            id: 'solar', short: '🧹 نظّف', tip: '🧹 اضغط مطوّل E لتنظيف الألواح — −4 ساعات',
            time: 2.8, hours: 4,
            done: () => { Out.dust = 0; outLog('تنظيف الألواح — <b>الغبار صفر</b>', 'good'); }
          } : null;
        case 'sci':
          return Out.samples > 0 ? {
            id: 'sci', short: '🔬 حلّل', tip: '🔬 اضغط مطوّل E لتحليل عينة — −4 ساعات · +2 علم',
            time: 2.4, hours: 4,
            can: () => Out.alloc.sci > 2,
            fail: () => 'المعمل بلا طاقة — ارفع توزيع «المعمل» في لوحة التحكم لحد 3+',
            done: () => { Out.science += 2; Quest.setProgress('science', Out.science); outLog('معمل: <b>+2 علم</b> (تحليل عينة)', ''); }
          } : null;
        case 'green':
          return {
            id: 'green', short: '💧 ريّ', tip: '💧 اضغط مطوّل E لريّ المحاصيل — −2 ساعة · −3 ماء · +6 غذاء (حصاد عند اكتمال النمو)',
            time: 2.2, hours: 2,
            can: () => Out.h2o >= 3,
            fail: () => 'الماء مش كفاية للريّ — محتاج 3% من المخزون',
            done: () => {
              Out.h2o = clamp(Out.h2o - 3, 0, resCap());
              const c = Out.crop || (Out.crop = { stage: 2, thirst: 0 });
              let gain = 6, note = '';
              if (c.stage >= 4) { gain = 10; c.stage = 1; note = ' · <b>حصاد كامل 🌱</b>'; }
              else c.stage = clamp(c.stage + 1, 1, 4);
              c.thirst = 0;
              Out.food = clamp(Out.food + gain, 0, resCap());
              Out.harvests++; Quest.setProgress('harvest', Out.harvests);
              outLog('ريّ المحاصيل — <b>−3 ماء · +' + gain + ' غذاء</b>' + note + (c.stage === 4 ? ' · جاهزة للحصاد الجاي' : ''), 'good');
            }
          };
        case 'moxie':
          if (Out.ice >= 2) return {
            id: 'moxie-isru', short: '💧 حلّل', tip: '💧 اضغط مطوّل E لتحليل كهربائي للجليد — −3 ساعات · ثلج−2 · +4 ماء · +6 أكسجين',
            time: 2.6, hours: 3,
            done: () => { Out.ice -= 2; Out.h2o = clamp(Out.h2o + 4, 0, resCap()); Out.o2 = clamp(Out.o2 + 6, 0, resCap());
              Out.isru.electrolysis++; Out.isruCount++; Quest.setProgress('isru', Out.isruCount);
              outLog('تحليل كهربائي — <b>ثلج−2 · +4 ماء · +6 O₂</b>', 'good'); }
          };
          return Out.o2 < 90 ? {
            id: 'moxie', short: '⚡ شغّل', tip: '⚡ اضغط مطوّل E لتشغيل MOXIE — −3 ساعات · +8 أوكسجين',
            time: 2.6, hours: 3,
            done: () => { Out.o2 = clamp(Out.o2 + 8, 0, resCap());
              Out.isru.moxie++; Out.isruCount++; Quest.setProgress('isru', Out.isruCount);
              outLog('MOXIE — <b>+8 أوكسجين</b> (من CO₂ المحلي)', 'good'); }
          } : null;
        case 'hab':
          return Out.reviewedSol !== Out.sol ? {
            id: 'hab', short: '📋 راجع', tip: '📋 اضغط مطوّل E لمراجعة أنظمة الطيران — −2 ساعة · +1 علم',
            time: 2.4, hours: 2,
            done: () => { Out.reviewedSol = Out.sol; Out.science += 1; Quest.setProgress('science', Out.science); outLog(forecastLog(), ''); }
          } : null;
        case 'shield':
          return Out.regolith >= 2 ? {
            id: 'sinter', short: '🧱 صهر', tip: '🧱 اضغط مطوّل E لصهر الريجوليث → كتل درع — −3 ساعات · −2 تربة · +10% كفاءة درع محلي',
            time: 3.0, hours: 3,
            done: () => { Out.regolith -= 2; Out.sinterShield = Math.min(0.4, Out.sinterShield + 0.1);
              Out.isru.sinter++; Out.isruCount++; Quest.setProgress('isru', Out.isruCount);
              Quest.setProgress('shield', Out.isru.sinter);
              outLog('صهر ريجوليث — <b>كفاءة الدرع المحلي +10%</b> (' + Math.round(Out.sinterShield * 100) + '% الآن)', 'good'); }
          } : null;
        case 'dish':
          return !Out.resupplyUsed ? {
            id: 'dish', short: '📡 اطلب', tip: '📡 اضغط مطوّل E لطلب إمداد DSN — مرة واحدة بالمهمة · −2 ساعة · +12 ماء · +12 غذاء · +8 أكسجين',
            time: 2.2, hours: 2,
            done: () => { Out.resupplyUsed = true; Out.h2o = clamp(Out.h2o + 12, 0, resCap()); Out.food = clamp(Out.food + 12, 0, resCap()); Out.o2 = clamp(Out.o2 + 8, 0, resCap()); outLog('إمداد DSN وصل — <b>+12 ماء · +12 غذاء · +8 أكسجين</b>', 'good'); }
          } : null;
        default:
          return null;
      }
    }

    function collectSample(st) {
      st.taken = true;
      Out.drill = 0;
      Out.hours -= 8;
      Out.carry.sample++;                       // في الظهرية — بتتتحسب عند الرجوع للقاعدة بس
      Out.regolith += 1; Out.regolithTotal++;
      Quest.setProgress('regolith', Out.regolithTotal);
      const add = m.env.radiation_dose * 0.9;
      Out.dose = Out.dose.map(x => x + add);
      Audio.quest();
      outLog('⛏ عينة في <b>الظهرية (' + carryUsed() + '/' + CARRY_MAX + ')</b> + <b>1 تربة</b> — <b>+' + add.toFixed(1) + ' mSv</b> — ارجع المسكن للتسجيل', 'warn');
      refreshPanel();
    }
    function collectIce(st) {
      st.taken = true;
      Out.drill = 0;
      Out.hours -= 4;
      Out.carry.ice++;                          // ثلج في الظهرية — يتسلّم عند المسكن
      const add = m.env.radiation_dose * 0.5;
      Out.dose = Out.dose.map(x => x + add);
      Audio.quest();
      outLog('❄ ثلج في <b>الظهرية (' + carryUsed() + '/' + CARRY_MAX + ')</b> — <b>+' + add.toFixed(1) + ' mSv</b> — ارجع المسكن، يتسجّل هناك', 'good');
      refreshPanel();
    }

    /* تفريغ الظهرية عند المسكن — العينات والثلج تُسجّل هنا فقط */
    function depositCarry() {
      const nS = Out.carry.sample | 0, nI = Out.carry.ice | 0;
      if (!nS && !nI) return;
      if (nI) {
        Out.ice += 4 * nI;
        for (let i = 0; i < nI; i++) { Out.isru.ice++; Out.isruCount++; }
        Quest.setProgress('isru', Out.isruCount);
      }
      if (nS) {
        const cap = sampleTargetOf(Out.m);
        Out.samples += nS;
        Quest.setProgress('samples', Math.min(Out.samples, cap));
      }
      Out.carry = { sample: 0, ice: 0 };
      const parts = [];
      if (nS) parts.push('<b>' + nS + ' عينة</b>');
      if (nI) parts.push('<b>' + (4 * nI) + ' وحدة ثلج</b>');
      outLog('🏠 <b>عدت المسكن</b> — سُجّل: ' + parts.join(' · '), 'good');
      Audio.ok();
      refreshPanel();
    }

    function updatePlayer(dt) {
      if (Out.phase === 'event' || Out.paused) return;
      const p = Out.player;
      const SPEED = 0.30;                 // وحدة عالم/ثانية
      let ax = 0, ay = 0;
      if (input.left) ax -= 1;
      if (input.right) ax += 1;
      if (input.up) ay -= 1;
      if (input.down) ay += 1;
      const len = Math.hypot(ax, ay);
      if (len > 0) {
        ax /= len; ay /= len;
        p.x = clamp(p.x + ax * SPEED * dt, 0.055, WORLD.w - 0.055);
        p.y = clamp(p.y + ay * SPEED * dt * 0.62, -0.06, 0.98);
        p.moving = true;
        p.walk += dt * 11;
        p.facing = ax > 0.12 ? 1 : ax < -0.12 ? -1 : p.facing;
      } else {
        p.moving = false;
        p.walk += dt * 1.4;
      }
      // آثار مشي تتلاشى ببطء — العالم يسجل مرورك
      if (p.moving) {
        Out._fpT = (Out._fpT || 0) + dt;
        if (Out._fpT > 0.115) {
          Out._fpT = 0;
          Out.footprints.push({ x: p.x, y: p.y, t: performance.now() / 1000 });
          if (Out.footprints.length > 46) Out.footprints.shift();
        }
      }
      // كاميرا تتبع ناعمة
      const targetCam = clamp(p.x, VIEW_W * 0.55, WORLD.w - VIEW_W * 0.55);
      Out.cam.x = lerp(Out.cam.x, targetCam, 1 - Math.pow(0.001, dt));

      // أقرب موديول
      let best = null, bestD = 1e9;
      for (const md of OUT_LAYOUT) {
        const d = Math.hypot(md.x - p.x, (md.y - p.y) * 1.7);
        if (d < bestD) { bestD = d; best = md; }
      }
      const inRange = best && bestD < (best.r + 0.075);
      if (inRange && best && !Out.visited[best.id]) {
        Out.visited[best.id] = 1;
        Quest.setProgress('explore', Object.keys(Out.visited).length);
      }
      if (inRange !== !!Out.near) {
        Out.near = inRange ? best : null;
        if (inRange) Audio.tick();
      } else if (inRange) {
        Out.near = best;
      }
      // تفريغ الظهرية تلقائيًا عند الوقوف على المسكن
      if (Out.near && Out.near.id === 'hab' && carryUsed() > 0) depositCarry();

      /* ---------- الشفق القطبي — ظاهرة «زويل» الليلية (مكافأة موقعية بدون ساعات) ---------- */
      {
        const isNight = outDaylight() < 0.12;
        if (m.id === 'zewail' && isNight && !Out._wasNight && iceRevealed()) {
          const avail = (Out.iceSites || []).filter(x => !x.taken);
          if (!Out.auroraDoneNight && avail.length && Math.random() < 0.78) {
            try { if (window.ACH) ACH.event({ aurora: 1 }); } catch (e) {}
            Out.aurora = { site: avail[(Math.random() * avail.length) | 0], tLeft: 8 };
            Out.auroraDoneNight = true;
            outLog('✨ <b>الشفق القطبي اشتعل!</b> ثلج <b>مضيء بالبنفسجي</b> — الحقه قبل ما يخفت', 'good');
            Audio.ok();
            saveRun();
          }
        }
        Out._wasNight = isNight;
        if (isNight && !Out._wasEvening) mcEvening();
        Out._wasEvening = isNight;
        if (Out.aurora) {
          Out.aurora.tLeft -= dt;
          const b = $('aurora-banner');
          if (Out.aurora.tLeft <= 0) {
            Out.aurora = null;
            if (b) b.classList.add('hidden');
            outLog('الشفق خفت قبل ما تلحقه — الليلة الجاية فيه فرصة جديدة.', 'warn');
          } else if (b) {
            b.classList.remove('hidden');
            b.textContent = '✨ الشفق نشط — موقع ثلج مضيء! ' + Math.ceil(Out.aurora.tLeft) + ' ث';
          }
        }
      }

      /* تسجيل ظهور المواقع أول مرة (مرة واحدة لكل جلسة) */
      if (samplesRevealed() && !Out._sampleRevealed) {
        Out._sampleRevealed = true;
        outLog('⛏ <b>مواقع العينات ظهرت</b> — ' + Out.sites.filter(x => !x.taken).length + ' مواقع متوهجة أخضر على السطح بانتظارك', 'good');
      }
      if (iceRevealed() && !Out._iceRevealed) {
        Out._iceRevealed = true;
        const n = (Out.iceSites || []).filter(x => !x.taken).length;
        if (n) outLog('❄ <b>مواقع الجليد ظهرت</b> — ' + n + ' بلّورات سماوية — جاهزة للاستخراج والتحليل', 'good');
      }

      // أقرب موقع: عينة أو جليد — اللي أقرب بيفوز (المواقع المختفية لا تُحتسب)
      let siteBest = null, siteD = 1e9, siteIsIce = false;
      if (samplesRevealed()) for (const st of Out.sites) {
        if (st.taken) continue;
        const d = Math.hypot(st.x - p.x, (st.y - p.y) * 1.7);
        if (d < siteD) { siteD = d; siteBest = st; siteIsIce = false; }
      }
      if (iceRevealed()) for (const st of Out.iceSites) {
        if (st.taken) continue;
        const d = Math.hypot(st.x - p.x, (st.y - p.y) * 1.7);
        if (d < siteD) { siteD = d; siteBest = st; siteIsIce = true; }
      }
      const maxSamples = sampleTargetOf(m);
      const sampleFull = siteBest && !siteIsIce && (Out.samples + Out.carry.sample) >= maxSamples;
      const packFull = carryUsed() >= CARRY_MAX;
      Out.nearSite = (siteBest && siteD < 0.085 && !sampleFull && !packFull) ? { st: siteBest, ice: siteIsIce } : null;
      if (packFull && siteBest && siteD < 0.085 && performance.now() - (Out._hWarn || 0) > 2400) {
        Out._hWarn = performance.now();
        toast('🎒 الظهرية مليانة — ارجع المسكن لتفريغها (' + carryUsed() + '/' + CARRY_MAX + ')', 'bad');
      }
      if (Out.nearSite) {
        const needH = Out.nearSite.ice ? 4 : 8;
        if (Out.aurora && Out.nearSite.ice && Out.nearSite.st === Out.aurora.site) {
          /* قطف الشفق — فوري، بدون ساعات، مكافأة موقعية للتواجد وقت الظاهرة */
          Out.nearSite.st.taken = true;
          Out.aurora = null;
          Out.ice += 2;
          Out.science += 4;
          Out.isru.ice++;
          Out.isruCount++;
          Quest.setProgress('isru', Out.isruCount);
          Out.drill = 0;
          Audio.quest();
          outLog('✨ <b>قطفت عينات الشفق!</b> +2 ثلج · +4 علم · +1 استغلال — بدون حرق ساعات', 'good');
          const b = $('aurora-banner'); if (b) b.classList.add('hidden');
          saveRun();
        } else if (input.actHeld) {
          if (Out.hours >= needH) {
            Out.drill = clamp(Out.drill + dt / 2.3, 0, 1);
            if (Out.drill >= 1) { Out.nearSite.ice ? collectIce(Out.nearSite.st) : collectSample(Out.nearSite.st); }
          } else {
            Out.drill = 0;
            if (performance.now() - Out._hWarn > 1600) {
              Out._hWarn = performance.now();
              Audio.fail();
              toast('الحفر محتاج ' + needH + ' ساعات — فاضلك ' + Out.hours.toFixed(1), 'bad');
            }
          }
        } else {
          Out.drill = clamp(Out.drill - dt * 0.8, 0, 1);
        }
      } else {
        Out.drill = clamp(Out.drill - dt * 0.8, 0, 1);
      }

      // أعمال يدوية عند الموديولات (اضغط مطوّل E) — والمواقع أولًا
      Out.workTarget = null;
      if (!Out.nearSite && Out.near) {
        const w = worldWorkFor(Out.near.id);
        if (w) {
          Out.workTarget = w;
          if (input.actHeld) {
            if (w.can && !w.can()) {
              Out.work = { id: '', p: 0 };
              if (performance.now() - Out._hWarn > 1600) { Out._hWarn = performance.now(); Audio.fail(); toast(w.fail(), 'bad'); }
            } else if (Out.hours >= w.hours) {
              if (!Out.work || Out.work.id !== w.id) Out.work = { id: w.id, p: 0 };
              Out.work.p += dt / w.time;
              if (Out.work.p >= 1) {
                Out.hours -= w.hours;
                w.done();
                Out.work = { id: '', p: 0 };
                refreshPanel();
              }
            } else {
              Out.work = { id: '', p: 0 };
              if (performance.now() - Out._hWarn > 1600) { Out._hWarn = performance.now(); Audio.fail(); toast('محتاج ' + w.hours + ' ساعات — فاضلك ' + Out.hours.toFixed(1), 'bad'); }
            }
          } else {
            Out.work = { id: '', p: 0 };
          }
        } else {
          Out.work = { id: '', p: 0 };
        }
      } else if (!Out.nearSite) {
        Out.work = { id: '', p: 0 };
      }

      // زر التفاعل (الموقع له أولوية على الموديول)
      if (input.act) {
        input.act = false;
        if (!Out.nearSite && Out.near) interactModule(Out.near);
      }
    }

    /* ---------- قائمة المهام (To-Do) ---------- */
    const targetSamples = sampleTargetOf(m);
    const targetScience = m.id === 'mars' ? 8 : 4;
    Quest.reset([
      { id: 'explore', t: 'استكشف 7 مواضع في القاعدة', max: 7 },
      { id: 'samples', t: 'اجمع عينات EVA', max: targetSamples },
      { id: 'science', t: 'نقاط العلم من التحليل', max: targetScience },
      { id: 'isru',    t: 'استغل موارد محلية (ثلج · تحويل · صهر)', max: 6 },
      { id: 'regolith', t: 'اجمع 4 حقائب ريجوليث للصهر', max: 4 },
      { id: 'harvest', t: 'اعتنِ بالدفيئة 3 مرات', max: 3 },
      { id: 'shield',  t: 'ابنِ درع ISRU محلي — +10% لكل كتلة مصهورة', max: 2 },
      { id: 'return',  t: 'اقلع — العودة إلى الأرض' }
    ]);
    Quest.mount(root.querySelector('#out-quests'), 'العودة — ' + m.name, {
      launchId: 'return',
      onLaunch: () => { beginReturn(); }
    });
    if (pendingQuestRestore) {           // استئناف: استبدال القائمة المحفوظة بالمولّدة
      try { Quest.restore(pendingQuestRestore); } catch (e) { console.error('[quest restore]', e); }
      pendingQuestRestore = null;
    }
    function beginReturn() {
      if (Out.phase === 'done') return;
      Out.phase = 'done';
      Quest.complete('return');
      // بناء سجل النتيجة مبدئيًا — مرحلة العودة تضيف عليه
      Game.result = {
        mission: m.id,
        reason: 'complete',
        sols: Math.min(Out.sol - 1, m.duration_days),
        samples: Out.samples,
        science: Out.science,
        dose: Out.dose,
        o2: Out.o2, h2o: Out.h2o, food: Out.food,
        target: m.duration_days,
        isru: { ...Out.isru, count: Out.isruCount, sinterShield: Out.sinterShield, resupply: Out.resupplyUsed }
      };
      stop = true; cancelAnimationFrame(raf); cvs.destroy();
      try { if (window.Audio && Audio.ambientWindStop) Audio.ambientWindStop(); } catch (e) {}
      Audio.whoosh();
      toast('رحلة العودة أقلعت من سطح <b>' + m.name + '</b>…', 'good');
      go('return');
    }

    /* ---- التفاعل مع موديول ---- */
    function interactModule(md) {
      Audio.ok();
      const panel = $('out-panel');
      const body = $('out-panel-body');
      if (!panel || !body) return;
      panel.dataset.mod = md.id;
      panel.classList.add('open');
      renderPanelFor(md);
    }

    /* ---- لوحة تفاعل حسب الموديول ---- */
    function renderPanelFor(md) {
      const body = $('out-panel-body');
      const title = $('out-panel-title');
      if (title) title.textContent = md.labelAr || md.label;
      const maxSamples = sampleTargetOf(Out.m);
      const avail = outPowerAvailable(), used = outPowerAllocated();

      if (md.id === 'hab') {
        body.innerHTML = `
          <div class="sub" style="font-size:11.5px;line-height:1.9">
            المسكن هو الملجأ من الإشعاع. جوّاه الأوكسجين والماء بيتجددوا.
          </div>
          <div class="card tight" style="margin-top:12px">
            <div class="row" style="justify-content:space-between;margin-bottom:8px">
              <span style="font-size:11px;color:#b8c8e0">🕒 ساعات الطاقم</span>
              <span class="mono" style="color:var(--purple);font-weight:900">${Out.hours.toFixed(1)} / 24</span>
            </div>
            <div class="segbar" id="p-segs2" style="display:flex;gap:2px;height:8px"></div>
          </div>
          <button class="btn ghost sm wide" style="margin-top:10px" id="p-rest">
            😴 راحة إجبارية <span class="mono" style="color:var(--green);font-size:10px">+6 ساعات</span>
          </button>
          <button class="btn ghost sm wide" style="margin-top:7px" id="p-shelter">
            🛡 ${Out.shelter ? 'إلغاء الملجأ' : 'دخول الملجأ'} <span class="mono" style="font-size:10px;color:var(--amber)">يقلّل الإشعاع 85%</span>
          </button>`;
        fillSegs('p-segs2');
        $('p-rest').onclick = () => { Out.hours = Math.min(24, Out.hours + 6); outLog('راحة — +6 ساعات', 'good'); Audio.ok(); renderPanelFor(md); };
        $('p-shelter').onclick = () => {
          Out.shelter = !Out.shelter; Audio.tick();
          outLog(Out.shelter ? 'الطاقم داخل الملجأ' : 'خروج من الملجأ', Out.shelter ? 'good' : 'warn');
          renderPanelFor(md);
        };
        return;
      }

      if (md.id === 'green') {
        const crops = clamp(Out.food / 100, 0, 1);
        body.innerHTML = `
          <div class="sub" style="font-size:11.5px;line-height:1.9">
            النباتات بتحوّل مياه + طاقة → غذاء وأوكسجين. لو الطاقة قلّت، الزرع بيموت.
          </div>
          <div class="card tight" style="margin-top:12px">
            <div class="row" style="justify-content:space-between;margin-bottom:7px">
              <span style="font-size:11px;color:#b8c8e0">🌱 نمو المحصول</span>
              <span class="mono" style="color:var(--green)">${Math.round(crops * 100)}%</span>
            </div>
            <div class="bar"><i style="width:${crops * 100}%;background:linear-gradient(90deg,#2fa064,#45e08a)"></i></div>
          </div>
          <div class="card tight" style="margin-top:10px;border-color:rgba(255,179,71,.25)">
            <div style="font-size:10.5px;color:#ffcf8f;line-height:1.8">
              كل توسّع زراعي = طاقة أكثر + مياه أكثر. مفيش غذاء مجاني.
            </div>
          </div>`;
        return;
      }

      if (md.id === 'sci') {
        body.innerHTML = `
          <div class="sub" style="font-size:11.5px;line-height:1.9">
            المعمل يحلّل العينات. كل ساعة علم بتحرق طاقة من دعم الحياة.
          </div>
          <div class="row gap8" style="margin-top:12px">
            <div class="stat"><span class="k">🔬 نقاط العلم</span><span class="v mono">${Out.science}</span></div>
            <div class="stat"><span class="k">🎯 العينات</span><span class="v mono">${Out.samples}/${maxSamples}</span></div>
          </div>
          ${Out.samples > 0 && Out.alloc.sci <= 2
            ? `<div class="card tight" style="margin-top:12px;border-color:rgba(255,95,109,.4)">
                <div style="font-size:10.5px;line-height:1.8;color:#ffb3bb">⚠ المعمل بلا طاقة — ارفع توزيع «المعمل العلمي» في لوحة التحكم لحد 3+ قبل التحليل.</div>
              </div>` : ''}
          ${Out.samples > 0
            ? `<button class="btn wide" style="margin-top:12px;${Out.alloc.sci <= 2 ? 'opacity:.45;cursor:not-allowed;' : ''}" id="p-sci" ${Out.alloc.sci <= 2 ? 'disabled' : ''}>
                🔬 تحليل عينة <span class="mono" style="font-size:10px">−4س · +2 علم</span>
              </button>`
            : `<div class="card tight" style="margin-top:12px;border-color:rgba(255,179,71,.3)">
                <div style="font-size:10.5px;line-height:1.8;color:#ffcf8f">⚠ لا توجد عينات — اجمع من السطح أولًا (امشِ للمواقع <b>المتوهجة</b> واضغط مطوّل <span class="mono">E</span>).</div>
              </div>`}`;
        const sciBtn = $('p-sci');
        if (sciBtn) sciBtn.onclick = () => {
          if (Out.samples <= 0) { Audio.fail(); toast('تحتاج عينة أولًا — اجمعها من السطح', 'bad'); return; }
          if (Out.alloc.sci <= 2) { Audio.fail(); toast('المعمل بلا طاقة — ارفع توزيع «المعمل» في لوحة التحكم لحد 3+', 'bad'); return; }
          if (Out.hours < 4) { Audio.fail(); toast('ساعات غير كافية', 'bad'); return; }
          Out.hours -= 4; Out.science += 2; Audio.ok();
          outLog('معمل: +2 علم (تحليل عينة)', ''); renderPanelFor(md);
        };
        return;
      }

      if (md.id === 'shield') {
        body.innerHTML = `
          <div class="sub" style="font-size:11.5px;line-height:1.9">
            الدروع النشطة بتقلّل جرعة الإشعاع 38% — بس بتاكل كهرباء من الحياة والزرع.
          </div>
          <div class="card tight" style="margin-top:12px">
            <div class="row" style="justify-content:space-between">
              <span style="font-size:11px;color:#b8c8e0">☢ أقصى جرعة تراكمية</span>
              <span class="mono" style="color:${Math.max(...Out.dose) > 400 ? 'var(--red)' : 'var(--cyan)'}">${Math.max(...Out.dose).toFixed(0)} / 600 mSv</span>
            </div>
            <div class="bar" style="margin-top:8px"><i style="width:${Math.max(...Out.dose) / 600 * 100}%;background:linear-gradient(90deg,#45e08a,#ffb347,#ff5f6d)"></i></div>
          </div>
          <div class="card tight" style="margin-top:12px;border-color:rgba(190,235,255,.28);background:rgba(20,40,54,.25)">
            <div style="font-size:10.5px;line-height:1.9;color:#a8dfff">🧱 <b>درع من إنتاج محلي</b>: <span class="mono">${Math.round((Out.sinterShield || 0) * 100)}%</span> تقليل جرعة إضافي · تربة متاحة: <span class="mono">${Out.regolith}</span><br>
            <span style="color:var(--dim)">الريجوليث مبيجي من الأرض — بتحقنه من السطح: كل صهرتين تربة = +10% حتى 40%.</span></div>
          </div>
          <button class="btn ghost sm wide" style="margin-top:10px" id="p-sh">
            ${Out.alloc.shield > 3 ? '⬇ خفض الدروع' : '⬆ زيادة الدروع'}
          </button>`;
        $('p-sh').onclick = () => {
          Out.alloc.shield = Out.alloc.shield > 3 ? 2 : 6;
          buildSliders(); refreshPanel(); Audio.tick(); renderPanelFor(md);
        };
        return;
      }

      if (md.id === 'solar') {
        body.innerHTML = `
          <div class="sub" style="font-size:11.5px;line-height:1.9">
            إنتاج الطاقة: ${avail.toFixed(0)} وحدة. المستهلك: ${used.toFixed(0)}.
            ${Out.dust > 0.3 ? '<b style="color:var(--amber)">الغبار مغطّي الألواح — صيانة مطلوبة.</b>' : ''}
          </div>
          <div class="bar" style="margin-top:12px"><i style="width:${clamp(used / Math.max(avail, 1) * 100, 0, 100)}%;background:linear-gradient(90deg,#2b8fbe,#4dd9ff)"></i></div>
          <button class="btn ghost sm wide" style="margin-top:12px" id="p-clean">
            🧹 تنظيف الألواح من الغبار <span class="mono" style="font-size:10px;color:var(--amber)">−4س</span>
          </button>`;
        $('p-clean').onclick = () => {
          if (Out.hours < 4) { Audio.fail(); toast('ساعات غير كافية', 'bad'); return; }
          Out.hours -= 4; Out.dust = 0; Audio.ok();
          outLog('تنظيف الألواح — الغبار صفر', 'good'); renderPanelFor(md);
        };
        return;
      }

      if (md.id === 'moxie') {
        body.innerHTML = `
          <div class="sub" style="font-size:11.5px;line-height:1.9">
            مولّد الأوكسجين بيفصل CO₂ → أوكسجين. محتاج طاقة عالية (${Out.alloc.life} وحدة).
            مثاله الحقيقي: تجربة MOXIE على المسبار Perseverance.
          </div>
          <div class="card tight" style="margin-top:12px">
            <div class="row" style="justify-content:space-between">
              <span style="font-size:11px;color:#b8c8e0">🫁 الأوكسجين</span>
              <span class="mono" style="color:var(--green)">${Out.o2.toFixed(0)}%</span>
            </div>
            <div class="bar" style="margin-top:8px"><i style="width:${Out.o2}%;background:linear-gradient(90deg,#2fa064,#45e08a)"></i></div>
          </div>
          <div style="font-size:10px;color:var(--dim2);margin-top:10px;line-height:1.7">
            🧪 MOXIE أنتج ~12 جرام O₂/ساعة على المريخ (NASA/JPL).
          </div>`;
        return;
      }

      if (md.id === 'dish') {
        const d = Out.m;
        body.innerHTML = `
          <div class="sub" style="font-size:11.5px;line-height:1.9">
            تأخير الاتصال مع الأرض هنا: <b class="mono" style="color:var(--cyan)">${d.comm_delay}</b>.
            عشان كده القرارات لازم تاخدها بنفسك.
          </div>
          <div class="card tight" style="margin-top:12px">
            <div style="font-size:10.5px;color:#a8c6e0;line-height:1.85">
              كل رسالة بتحتاج ${d.comm_delay} للوصول. مفيش مساعدة فورية من التحكّم الأرضي.
            </div>
          </div>
          <div class="card tight" style="margin-top:10px;border-color:rgba(120,255,180,.28);background:rgba(20,44,30,.18)">
            <div style="font-size:10.5px;line-height:1.9;color:#9fe8bd">⛏ <b>EVA دي أنت بإيدك</b> — امشِ على السطح للمواقع <b>المتوهجة</b>، وقف عليها، واضغط مطوّل <span class="mono">E</span> للحفر. كل عينة = 8 ساعات + جرعة إشعاع.</div>
          </div>
          <button class="btn ghost sm wide" style="margin-top:7px" id="p-maint">
            🛠 صيانة وقائية <span class="mono" style="font-size:10px;color:var(--amber)">−4س</span>
          </button>`;
        $('p-maint').onclick = () => {
          if (Out.hours < 4) { Audio.fail(); toast('ساعات غير كافية', 'bad'); return; }
          Out.hours -= 4; Out.dust = Math.max(0, Out.dust - 0.35); Audio.ok();
          outLog('صيانة — الغبار −35%', 'good'); renderPanelFor(md);
        };
        return;
      }
    }

    function fillSegs(id) {
      const segs = $(id);
      if (!segs) return;
      segs.innerHTML = '';
      for (let i = 0; i < 24; i++) {
        const el2 = document.createElement('i');
        el2.style.cssText = 'flex:1;height:8px;border-radius:2px;transition:.3s';
        el2.style.background = i < Math.round(Out.hours)
          ? 'linear-gradient(180deg,#9b7bff,#6b4fbf)' : 'rgba(255,255,255,.07)';
        segs.appendChild(el2);
      }
    }

    /* ---------------- أدوات اللوحة ---------------- */
    function buildSliders() {
      const host = $('p-sliders');
      const defs = [
        { k: 'life', n: 'دعم الحياة', max: 8, c: '#45e08a', fx: 'أقل من 3 = خطر على O₂ (×2.2) · أعلى من 6 = اقتصاد O₂' },
        { k: 'green', n: 'الدفيئة', max: 8, c: '#a8742a', fx: 'فوق 3 تستهلك ماء أكتر · فوق 4 تساعد الغذاء' },
        { k: 'sci', n: 'المعمل العلمي', max: 10, c: '#4dd9ff', fx: 'لازم 3+ — غير كده محظور التحليل' },
        { k: 'shield', n: 'الدروع النشطة', max: 8, c: '#9b7bff', fx: 'أكثر من 2 = الجرعة ×0.62' },
        { k: 'heat', n: 'التدفئة/التبريد', max: 8, c: '#ffb347', fx: 'أقل من 2 + ليل = الماء بينزل ×1.45' }
      ];
      host.innerHTML = defs.map(d => `
        <div style="margin-bottom:11px">
          <div style="display:flex;align-items:center;gap:9px">
            <span style="font-size:10.5px;width:82px;flex:0 0 82px;color:#b8c8e0">${d.n}</span>
            <input type="range" min="0" max="${d.max}" value="${Out.alloc[d.k]}" data-k="${d.k}"
              style="-webkit-appearance:none;appearance:none;flex:1;height:5px;border-radius:9px;
                background:rgba(255,255,255,.13);outline:none;accent-color:${d.c}">
            <span class="mono" style="font-size:11px;width:34px;text-align:center;color:${d.c}" data-v="${d.k}">${Out.alloc[d.k]}</span>
          </div>
          <div style="font-size:9px;color:var(--dim2);margin:3px 0 0 91px;line-height:1.5">${d.fx}</div>
        </div>`).join('');
      host.querySelectorAll('input').forEach(inp => {
        inp.addEventListener('input', () => {
          Out.alloc[inp.dataset.k] = +inp.value;
          host.querySelector('[data-v="' + inp.dataset.k + '"]').textContent = inp.value;
          Audio.tick();
          refreshPanel();
        });
      });
    }

    function buildTasks() {
      const host = $('p-tasks');
      const maxSamples = sampleTargetOf(m);
      const defs = [
        { k: 'sample', n: '⛏ جمع عينة (EVA)', h: 8, note: Out.samples >= maxSamples ? 'مكتمل ✓' : 'امشِ لموقع متوهج على السطح ← اضغط مطوّل E' },
        { k: 'maint', n: '🛠 صيانة وقائية', h: 4, note: 'يقلل الغبار والعطل' },
        { k: 'science', n: '🔬 تحليل عينة', h: 4, note: Out.samples > 0 ? '+2 علم' : 'يحتاج عينة من السطح' },
        { k: 'rest', n: '😴 راحة إجبارية', h: 0, note: 'بعد 3 أيام عمل' }
      ];
      host.innerHTML = defs.map(d => {
        if (d.k === 'sample') {
          const done = Out.samples >= maxSamples;
          return `<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;
              padding:9px 12px;border-radius:12px;border:1px dashed rgba(120,255,180,.35);
              background:rgba(20,44,30,.16);font-size:11px">
            <span style="color:#9fe8bd;font-weight:800">${d.n} — <span class="mono">${Out.samples}/${maxSamples}</span></span>
            <span style="font-size:9px;color:var(--dim);text-align:left;max-width:150px;line-height:1.6">${d.note}</span>
          </div>`;
        }
        const disabledBtn = d.k === 'science' && Out.samples <= 0;
        return `<button class="btn ghost sm" data-task="${d.k}" ${disabledBtn ? 'disabled' : ''}
          style="justify-content:space-between;text-align:right;padding:9px 12px;font-size:11px${disabledBtn ? ';opacity:.45' : ''}">
          <span>${d.n}</span>
          <span class="mono" style="color:${d.h ? 'var(--amber)' : 'var(--green)'};font-size:10px">
            ${d.h ? '−' + d.h + 'س' : d.note}
          </span>
        </button>`;
      }).join('') + `
        <div class="sub" style="font-size:10px;margin-top:2px" id="p-task-sum">—</div>`;

      host.querySelectorAll('[data-task]').forEach(b => {
        b.addEventListener('click', () => {
          const k = b.dataset.task;
          const def = defs.find(d => d.k === k);
          if (def.h > Out.hours) { Audio.fail(); toast('ساعات غير كافية', 'bad'); return; }
          if (k === 'maint') {
            Out.hours -= 4; Out.dust = Math.max(0, Out.dust - 0.35);
            outLog('صيانة — الغبار −35%', 'good');
          } else if (k === 'science') {
            if (Out.samples <= 0) { Audio.fail(); toast('تحتاج عينة أولًا — اجمعها من السطح', 'bad'); return; }
            Out.hours -= 4; Out.science += 2;
            Quest.setProgress('science', Out.science);
            outLog('معمل: +2 علم (تحليل عينة)', '');
          } else {
            Out.hours = Math.min(24, Out.hours + 6);
            outLog('راحة — استعادة 6 ساعات', 'good');
          }
          Audio.ok();
          refreshPanel();
        });
      });
    }

    function refreshPanel() {
      const avail = outPowerAvailable();
      const used = outPowerAllocated();
      const ph = $('p-hours'); if (ph) ph.textContent = Out.hours.toFixed(Out.hours % 1 ? 1 : 0);
      const segs = $('p-segs');
      if (segs) {
        segs.innerHTML = '';
        for (let i = 0; i < 24; i++) {
          const s = document.createElement('i');
          s.style.cssText = 'flex:1;height:8px;border-radius:2px;transition:.3s';
          s.style.background = i < Math.round(Out.hours) ? 'linear-gradient(180deg,#9b7bff,#6b4fbf)' : 'rgba(255,255,255,.07)';
          segs.appendChild(s);
        }
      }
      const pa = $('p-alloc');
      if (pa) {
        pa.textContent = used + ' / ' + avail;
        pa.style.color = used > avail ? 'var(--red)' : 'var(--cyan)';
      }
      const hint = $('p-alloc-hint');
      if (hint) {
        if (used > avail) hint.innerHTML = '<span style="color:var(--red)">⚠ الطلب أعلى من الإنتاج — الأوكسجين هينقص ×1.5 والماء ×1.4 النهاردة. قلّل الأحمال أو نظّف الألواح.</span>';
        else if (used < avail * 0.7) hint.innerHTML = '<span style="color:var(--amber)">طاقة مهدورة — مش ميزة.</span>';
        else hint.innerHTML = 'توزيع متوازن.';
      }
      const ts = $('p-task-sum');
      if (ts) ts.textContent = 'فاضل ' + Out.hours.toFixed(1) + ' ساعة من 24';
      // gauges
      const set = (id, bid, v, max, col) => {
        const e = $(id); if (e) e.textContent = Math.round(v);
        const b = $(bid); if (b) { b.style.width = clamp(v / max * 100, 0, 100) + '%'; if (col) b.style.background = col; }
      };
      set('g-o2', 'b-o2', Out.o2, 100, Out.o2 < 35 ? 'linear-gradient(90deg,#8a1f28,#ff5f6d)' : 'linear-gradient(90deg,#2fa064,#45e08a)');
      set('g-h2o', 'b-h2o', Out.h2o, 100, Out.h2o < 30 ? 'linear-gradient(90deg,#5a1f28,#ff5f6d)' : 'linear-gradient(90deg,#4a63b8,#7ba4ff)');
      set('g-food', 'b-food', Out.food, 100, Out.food < 30 ? 'linear-gradient(90deg,#5a2f12,#ff5f6d)' : 'linear-gradient(90deg,#a8742a,#ffb347)');
      const maxDose = Math.max(...Out.dose);
      set('g-dose', 'b-dose', maxDose, 600);
      const gh = $('g-hours'); if (gh) gh.textContent = Out.hours.toFixed(Out.hours % 1 ? 1 : 0);
      const gs = $('g-samples'); if (gs) gs.textContent = Out.samples;
      const gsc = $('g-science'); if (gsc) gsc.textContent = Out.science;
      const gi = $('g-ice'); if (gi) gi.textContent = Out.ice;
      const gr = $('g-regolith'); if (gr) gr.textContent = Out.regolith;
      const gcar = $('g-carry'); if (gcar) gcar.textContent = carryUsed();
      const gsol = $('out-sol');
      if (gsol) gsol.innerHTML = String(Out.sol).padStart(2, '0') +
        '<span style="font-size:10px;color:var(--dim2)">/' + Out.m.duration_days + '</span>';
      fillSegs('p-segs2');
      const gp = $('g-power'); if (gp) { gp.textContent = avail.toFixed(0); gp.style.color = used > avail ? 'var(--red)' : ''; }
      const bp = $('b-power'); if (bp) bp.style.width = clamp(used / Math.max(avail, 1) * 100, 0, 100) + '%';
    }

    /* ---- مؤشرات الاستنزاف وساعة النهار/الليل — تحديث كل 250ms من frame() ---- */
    function updateHudRates() {
      const rates = outDrainRates();
      const dl = outDaylight();
      const tod = $('g-tod');
      if (tod) tod.textContent = DayClock.icon();
      const gck = $('g-clock'); if (gck) gck.textContent = DayClock.fmt();
      const gdn = $('g-dayn'); if (gdn) gdn.textContent = 'DAY ' + DayClock.dayN();
      const gtw = $('g-tod-wrap'); if (gtw && !gtw._factSet) { gtw._factSet = 1; gtw.title = DayClock.factLine(); }
      const setRate = (id, rate) => {
        const e = $(id); if (!e) return;
        const gain = rate < 0;
        e.textContent = (gain ? '▲' : '▼') + Math.abs(rate).toFixed(1) + '/سل';
        e.style.color = gain ? 'var(--green)' : rates.deficit ? 'var(--red)' : 'var(--amber)';
      };
      setRate('d-o2', rates.o2);
      setRate('d-h2o', rates.h2o);
      setRate('d-food', rates.food);
      const pn = $('g-power-note');
      if (pn) {
        if (rates.deficit) { pn.textContent = '⚠ عجز — الطلب أعلى من الإنتاج'; pn.style.color = 'var(--red)'; }
        else if ((Out.solarDamage || 0) > 0.02) { pn.textContent = '⚠ ضرر ألواح −' + Math.round(Out.solarDamage * 100) + '% — بيترمم مع الوقت'; pn.style.color = 'var(--amber)'; }
        else if (dl < 0.08) { pn.textContent = '🌙 ليل — المفاعل فقط والألواح متوقفة'; pn.style.color = 'var(--dim2)'; }
        else { pn.textContent = '☀️ الشمس بتغذي الألواح'; pn.style.color = 'var(--dim2)'; }
      }
      const lowTog = (resId, v) => {
        const e = $(resId); if (!e) return;
        const card = e.closest('.card'); if (card) card.classList.toggle('low', v < 25);
      };
      lowTog('g-o2', Out.o2); lowTog('g-h2o', Out.h2o); lowTog('g-food', Out.food);
    }

    buildSliders();
    buildTasks();
    refreshPanel();
    updateHudRates();

    /* ==================== رسم العالم ==================== */
    let starSeed = null;

    function drawWorld(W, H, time) {
      const S2 = PLANET_STYLE[m.id] || PLANET_STYLE.mars;
      const hz = H * 0.395;

      /* ---------- سماء ---------- */
      skyGradient(ctx, W, H, S2.skyTop, S2.skyBot);
      if (S2.stars) starField(ctx, W, hz + 30, S2.stars, 33, 0.85);

      /* ---------- الشمس والقمر — بيتحركوا مع ساعة الـSol (نهار يخلص = طاقة شمسية صفر) ---------- */
      const dayFrac = outDayFrac();
      const dl = outDaylight();
      const rt = DayClock.rot();
      const effTilt = rt.tilt > 90 ? 180 - rt.tilt : rt.tilt;             // الزهرة ارتدادية — الميل الفعّال 2.6°
      const tiltAmp = 0.185 * clamp(1.18 - effTilt / 32, 0.36, 1.18);      // نجوم عليا/دنيا حسب الميل المحوري
      const tiltSlope = (effTilt * H * 0.0032) * (rt.retro ? -1 : 1);      // مسار الشمس يميل مع المحور
      if (dl > 0.03) {
        const dayF = clamp((dayFrac - 0.25) / 0.5, 0, 1);   // 0 عند الشروق → 1 عند الغروب
        const sunX = W * (rt.retro ? (0.88 - 0.76 * dayF) : (0.12 + 0.76 * dayF)) - (Out.cam.x - 0.6) * 14;  // الزهرة: الشمس تشرق غربًا
        const sunY = H * (0.31 - Math.sin(Math.PI * dayF) * tiltAmp) + (dayF - 0.5) * tiltSlope;
        const sg = ctx.createRadialGradient(sunX, sunY, 4, sunX, sunY, H * 0.42);
        sg.addColorStop(0, `rgba(255,246,224,${0.95 * dl})`);
        sg.addColorStop(0.28, `rgba(255,214,160,${0.34 * dl})`);
        sg.addColorStop(0.6, `rgba(255,178,120,${0.12 * dl})`);
        sg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = sg;
        ctx.beginPath(); ctx.arc(sunX, sunY, H * 0.42, 0, 7); ctx.fill();
        ctx.fillStyle = `rgba(255,252,240,${0.95 * dl})`;
        ctx.beginPath(); ctx.arc(sunX, sunY, H * 0.016, 0, 7); ctx.fill();
      } else {
        // قمر + نجوم — الليل
        const nightF = dayFrac > 0.75 ? (dayFrac - 0.75) / 0.5 : (dayFrac + 0.25) / 0.5;
        const moonX = W * (0.18 + 0.64 * nightF), moonY = H * 0.13;
        const mg = ctx.createRadialGradient(moonX, moonY, 2, moonX, moonY, H * 0.22);
        mg.addColorStop(0, 'rgba(214,224,240,.85)');
        mg.addColorStop(0.35, 'rgba(180,196,220,.22)');
        mg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = mg;
        ctx.beginPath(); ctx.arc(moonX, moonY, H * 0.22, 0, 7); ctx.fill();
        ctx.fillStyle = '#dfe7f4';
        ctx.beginPath(); ctx.arc(moonX, moonY, H * 0.012, 0, 7); ctx.fill();
        ctx.fillStyle = 'rgba(160,172,196,.7)';
        ctx.beginPath(); ctx.arc(moonX - 4, moonY + 2, H * 0.004, 0, 7); ctx.fill();
        ctx.beginPath(); ctx.arc(moonX + 3, moonY - 3, H * 0.003, 0, 7); ctx.fill();
      }
      if (dl < 0.45) starField(ctx, W, hz + 30, Math.round(120 * (1 - dl)), 77, 0.9 * (1 - dl));

      /* ---------- شفق قطبي — شرائط ضوئية متموجة (زويل) — أقوى عند تفعّل الحدث ---------- */
      if (m.id === 'zewail' && dl < 0.5) {
        const boost = Out.aurora ? 1 : 0.55;
        const nightK = 1 - dl / 0.5;               // أقوى في قلب الليل
        const tt = time * 0.55;
        const cols = [[110, 255, 205], [120, 215, 255], [190, 135, 255]];   // أخضر مُزرق · تركوازي · بنفسجي
        for (let ribbon = 0; ribbon < 3; ribbon++) {
          const baseY = H * (0.10 + ribbon * 0.072);
          const amp = 15 + ribbon * 6;
          const [r, g, b] = cols[ribbon];
          const wob = (x) => baseY
            + Math.sin(x * 0.011 + tt + ribbon * 1.9) * amp
            + Math.sin(x * 0.027 - tt * 1.6 + ribbon) * 6;
          ctx.save();
          ctx.globalAlpha = 0.62 * boost * nightK;
          /* جسم الشريط: بين منحنيين — قمة ساطعة تتلاشى للأسفل */
          const grad = ctx.createLinearGradient(0, baseY - amp, 0, baseY + amp * 2.6);
          grad.addColorStop(0, `rgba(${r},${g},${b},0)`);
          grad.addColorStop(0.26, `rgba(${r},${g},${b},.9)`);
          grad.addColorStop(0.45, `rgba(${r},${g},${b},.34)`);
          grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
          ctx.fillStyle = grad;
          ctx.beginPath();
          for (let x = -20; x <= W + 20; x += 14) {
            const y = wob(x) - amp * 0.5;
            if (x === -20) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          }
          for (let x = W + 20; x >= -20; x -= 14) ctx.lineTo(x, wob(x) + amp * 2.4);
          ctx.closePath();
          ctx.fill();
          /* أشعة عمودية خافتة توميض */
          for (let ray = 0; ray < 10; ray++) {
            const rayX = ((ray * 167 + ribbon * 131) % (W + 140)) - 70;
            const sway = Math.sin(tt * 1.25 + ray * 1.3) * 11;
            const a = (0.34 + 0.22 * Math.sin(time * 2.1 + ray * 2.4 + ribbon)) * boost * nightK;
            const rg = ctx.createLinearGradient(0, baseY - amp, 0, baseY + amp * 2.5);
            rg.addColorStop(0, `rgba(${r},${g},${b},${a})`);
            rg.addColorStop(1, `rgba(${r},${g},${b},0)`);
            ctx.fillStyle = rg;
            ctx.fillRect(rayX + sway, baseY - amp * 0.5, 4 + (ray % 4) * 3, amp * 2.7);
          }
          ctx.restore();
        }
      }

      /* ---------- سلاسل جبال بعيدة (parallax) ---------- */
      const par = (Out.cam.x - 0.6) * 120;
      for (let layer = 0; layer < 2; layer++) {
        const off = par * (0.35 + layer * 0.5);
        const cCol = layer === 0
          ? (S2.horizon + '55')
          : shade(S2.horizon, -0.35) + 'cc';
        ctx.fillStyle = cCol;
        ctx.beginPath();
        ctx.moveTo(-40, hz + 12);
        for (let x = -40; x <= W + 60; x += 54) {
          const xx = x - off;
          const hgt = 26 + layer * 20 +
            Math.sin((x + layer * 260) * 0.013) * (16 + layer * 9) +
            Math.sin((x + layer * 90) * 0.031) * 7;
          ctx.lineTo(xx, hz + 12 - hgt);
          ctx.quadraticCurveTo(xx + 27, hz + 12 - hgt - 9, xx + 54, hz + 12 - hgt * 0.72);
        }
        ctx.lineTo(W + 60, hz + 20);
        ctx.lineTo(-40, hz + 20);
        ctx.closePath();
        ctx.fill();
      }

      /* ---------- الأرض ---------- */
      const gg = ctx.createLinearGradient(0, hz, 0, H);
      gg.addColorStop(0, S2.ground[0]);
      gg.addColorStop(0.45, S2.ground[1]);
      gg.addColorStop(1, S2.ground[2]);
      ctx.fillStyle = gg;
      ctx.fillRect(0, hz, W, H - hz);

      // خطوط عمق (شبكة أرضية) توضّح منظور الحركة
      ctx.save();
      ctx.globalAlpha = 0.055;
      ctx.strokeStyle = shade(S2.ground[0], 0.35);
      ctx.lineWidth = 1;
      for (let i = 0; i <= 18; i++) {
        const yy = hz + Math.pow(i / 18, 2.1) * (H - hz);
        ctx.beginPath(); ctx.moveTo(0, yy); ctx.lineTo(W, yy); ctx.stroke();
      }
      ctx.restore();

      /* ---------- بصمات اللاعب على الغبار ---------- */
      {
        const nowSec = performance.now() / 1000;
        for (const fp of Out.footprints) {
          const age = nowSec - fp.t;
          if (age > 26) continue;
          const P = w2s(fp.x, fp.y, W, H);
          if (P.x < -40 || P.x > W + 40) continue;
          ctx.fillStyle = 'rgba(0,0,0,' + (0.32 * (1 - age / 26)).toFixed(3) + ')';
          ctx.beginPath(); ctx.ellipse(P.x - 3.2 * P.sc, P.y + 2, 2.7 * P.sc, 1.35 * P.sc, 0.28, 0, 7); ctx.fill();
          ctx.beginPath(); ctx.ellipse(P.x + 3.2 * P.sc, P.y + 2, 2.7 * P.sc, 1.35 * P.sc, -0.28, 0, 7); ctx.fill();
        }
      }

      /* ---------- دوامات ترابية محيطية تجوب الأفق ---------- */
      if (!drawWorld.devils) {
        drawWorld.devils = [
          { x: 0.35, y: 0.42, vx: 0.011, size: 1.0, ph: 0.4 },
          { x: 1.45, y: 0.22, vx: -0.0085, size: 0.68, ph: 2.2 }
        ];
      }
      for (const dv of drawWorld.devils) {
        dv.x += dv.vx * 0.016 * (m.env.dust_storms ? 1.7 : 1);
        if (dv.x > WORLD.w + 0.3) dv.x = -0.3;
        if (dv.x < -0.3) dv.x = WORLD.w + 0.3;
        const P = w2s(dv.x, dv.y, W, H);
        if (P.x < -90 || P.x > W + 90) continue;
        const dh = 58 * P.sc * dv.size, dw = 20 * P.sc * dv.size;
        ctx.save();
        for (let i = 0; i < 5; i++) {
          const q = i / 4;
          const yy = P.y - q * dh;
          const wob = Math.sin(time * 1.9 + dv.ph + i * 0.95) * 6.5 * P.sc;
          ctx.strokeStyle = 'rgba(216,152,98,' + (0.62 - q * 0.38).toFixed(3) + ')';
          ctx.lineWidth = (3.6 - q * 2.2) * P.sc;
          ctx.beginPath();
          ctx.ellipse(P.x + wob, yy, dw * (0.45 + q * 0.95), 4.4 * P.sc, 0, Math.PI * 1.06, Math.PI * 1.94);
          ctx.stroke();
        }
        ctx.restore();
      }

      /* ---------- صخور متناثرة ---------- */
      if (!drawWorld.rocks) {
        drawWorld.rocks = Array.from({ length: 34 }, (_, i) => ({
          x: ((i * 137.5) % 240) / 100 - 0.25,
          y: ((i * 71.3) % 100) / 100,
          r: 3 + (i * 13) % 11,
          s: 0.5 + ((i * 29) % 50) / 100
        }));
      }
      for (const rk of drawWorld.rocks) {
        const P = w2s(rk.x, rk.y, W, H);
        if (P.x < -60 || P.x > W + 60) continue;
        ctx.fillStyle = shade(S2.ground[1], -0.22);
        ctx.beginPath();
        ctx.ellipse(P.x, P.y + 2, rk.r * P.sc * rk.s, rk.r * P.sc * rk.s * 0.48, 0, 0, 7);
        ctx.fill();
        ctx.fillStyle = shade(S2.ground[0], -0.1);
        ctx.beginPath();
        ctx.ellipse(P.x - 1, P.y - 1, rk.r * P.sc * rk.s * 0.82, rk.r * P.sc * rk.s * 0.4, 0, 0, 7);
        ctx.fill();
      }

      /* ---------- كابلات + موديولات (من الخلف للأمام) ---------- */
      const ordered = OUT_LAYOUT.slice().sort((a, b) => a.y - b.y);

      // كابلات تُرسم قبل الموديولات
      const pairs = [['solar', 'hab'], ['hab', 'green'], ['hab', 'sci'], ['hab', 'shield'], ['hab', 'moxie'], ['hab', 'dish']];
      for (const [a, b] of pairs) {
        const A = OUT_LAYOUT.find(q => q.id === a), B = OUT_LAYOUT.find(q => q.id === b);
        if (!A || !B) continue;
        const PA = w2s(A.x, A.y, W, H), PB = w2s(B.x, B.y, W, H);
        ctx.strokeStyle = 'rgba(10,16,24,.55)';
        ctx.lineWidth = 3 * ((PA.sc + PB.sc) / 2);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(PA.x, PA.y);
        ctx.quadraticCurveTo((PA.x + PB.x) / 2, (PA.y + PB.y) / 2 + 26 * PA.sc, PB.x, PB.y);
        ctx.stroke();
        // نبض الطاقة
        const on = moduleOn(b) || moduleOn(a);
        const flow = 0.22 + (Out.powerUse / Math.max(Out.powerGen, 1)) * 0.6;
        for (let i = 0; i < 3; i++) {
          const q = ((time * flow + i * 0.33) % 1);
          const iq = 1 - q;
          const px = iq * iq * PA.x + 2 * iq * q * ((PA.x + PB.x) / 2) + q * q * PB.x;
          const py = iq * iq * PA.y + 2 * iq * q * ((PA.y + PB.y) / 2 + 26 * PA.sc) + q * q * PB.y;
          if (on) { ctx.shadowColor = 'rgba(90,215,255,.9)'; ctx.shadowBlur = 9; }
          ctx.fillStyle = on ? 'rgba(150,235,255,.95)' : 'rgba(110,124,140,.35)';
          ctx.beginPath(); ctx.arc(px, py, 1.9 * ((PA.sc + PB.sc) / 2), 0, 7); ctx.fill();
          ctx.shadowBlur = 0;
        }
      }

      // ظلال الموديولات (كلها أولاً) — تنزاح مع ارتفاع الشمس
      const dlSh = outDaylight();
      const dayFSh = clamp((outDayFrac() - 0.25) / 0.5, 0, 1);
      const shOff = (dlSh > 0.02) ? Math.cos(Math.PI * dayFSh) * 26 : -16;
      for (const md of ordered) {
        const P = w2s(md.x, md.y, W, H);
        if (P.x < -220 || P.x > W + 220) continue;
        ctx.fillStyle = 'rgba(0,0,0,.30)';
        ctx.beginPath();
        ctx.ellipse(P.x + shOff * P.sc, P.y + 6 * P.sc, md.r * W * 1.28 * (1.15 - dlSh * 0.3), md.r * W * 0.30, 0, 0, 7);
        ctx.fill();
      }

      // الموديولات
      for (const md of ordered) drawModule(md, W, H, time, S2);

      /* ---------- علم المهمة المزروع بجانب المسكن ---------- */
      {
        const FP = w2s(0.545, 0.565, W, H);
        const fw = Math.sin(time * 2.35) * 2.6 * FP.sc;
        ctx.strokeStyle = '#ccd8e6'; ctx.lineWidth = 2.1 * FP.sc;
        ctx.beginPath(); ctx.moveTo(FP.x, FP.y); ctx.lineTo(FP.x, FP.y - 27 * FP.sc); ctx.stroke();
        ctx.fillStyle = '#d9483b';
        ctx.beginPath();
        ctx.moveTo(FP.x, FP.y - 27 * FP.sc);
        ctx.quadraticCurveTo(FP.x + 12 * FP.sc + fw, FP.y - 24.5 * FP.sc, FP.x + 20 * FP.sc + fw, FP.y - 21.5 * FP.sc);
        ctx.lineTo(FP.x, FP.y - 15.5 * FP.sc);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.85)';
        ctx.beginPath(); ctx.arc(FP.x + 6.4 * FP.sc + fw * 0.4, FP.y - 22.4 * FP.sc, 1.5 * FP.sc, 0, 7); ctx.fill();
      }

      /* ---------- كومة صهر الريجوليث بجانب الدروع — تكبر مع كل صهر ---------- */
      {
        const heapN = Math.min(16, (Out.regolithTotal | 0) + (Out.isru.sinter | 0) * 2);
        if (heapN > 0) {
          const SP = w2s(0.232, 0.582, W, H);
          const hw = (5 + heapN * 1.5) * SP.sc;
          ctx.fillStyle = '#454c56';
          ctx.beginPath();
          ctx.moveTo(SP.x - hw, SP.y);
          ctx.quadraticCurveTo(SP.x - hw * 0.35, SP.y - hw * 0.9, SP.x + hw * 0.15, SP.y - hw * 0.6);
          ctx.quadraticCurveTo(SP.x + hw * 0.55, SP.y - hw * 0.3, SP.x + hw, SP.y);
          ctx.closePath(); ctx.fill();
          ctx.fillStyle = 'rgba(200,215,235,.16)';
          ctx.beginPath();
          ctx.moveTo(SP.x - hw * 0.4, SP.y - hw * 0.52);
          ctx.quadraticCurveTo(SP.x - hw * 0.1, SP.y - hw * 0.72, SP.x + hw * 0.3, SP.y - hw * 0.5);
          ctx.quadraticCurveTo(SP.x + hw * 0.1, SP.y - hw * 0.42, SP.x - hw * 0.4, SP.y - hw * 0.52);
          ctx.closePath(); ctx.fill();
        }
      }

      /* ---------- أضلاع الدرع المركّب فوق قبة المسكن (تقدّم مهام ISRU) ---------- */
      {
        const rigs = Math.min(3, (Out.isru && Out.isru.sinter) | 0);
        if (rigs > 0) {
          const HP = w2s(0.50, 0.60, W, H);
          const R = 46 * HP.sc;
          for (let i = 0; i < rigs; i++) {
            const k = 0.62 + i * 0.30;
            ctx.strokeStyle = 'rgba(196,210,230,' + (0.42 + rigs * 0.16).toFixed(3) + ')';
            ctx.lineWidth = (2.2 + i * 0.7) * HP.sc;
            ctx.beginPath(); ctx.ellipse(HP.x, HP.y, R * k, R * 0.24 * k, 0, Math.PI * 1.06, Math.PI * 1.94); ctx.stroke();
          }
        }
      }

      /* ---------- مواقع الجليد (سماوية) — مختفية لحد مهمة الموارد المحلية ---------- */
      for (const st of (iceRevealed() ? Out.iceSites : [])) {
        if (st.taken) continue;
        const P = w2s(st.x, st.y, W, H);
        if (P.x < -60 || P.x > W + 60) continue;
        const pulse = 0.55 + 0.45 * Math.sin(time * 3.0 + st.seed);
        ctx.strokeStyle = 'rgba(150,225,255,' + (0.32 + 0.35 * pulse).toFixed(3) + ')';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 7]);
        ctx.beginPath(); ctx.ellipse(P.x, P.y + 3, 30 * P.sc, 10.5 * P.sc, 0, 0, 7); ctx.stroke();
        ctx.setLineDash([]);
        // بلّورة جليد
        ctx.fillStyle = 'rgba(190,235,255,' + (0.65 + 0.3 * pulse).toFixed(3) + ')';
        ctx.beginPath();
        ctx.moveTo(P.x, P.y - 12 * P.sc);
        ctx.lineTo(P.x - 6 * P.sc, P.y - 2 * P.sc);
        ctx.lineTo(P.x, P.y + 2.5 * P.sc);
        ctx.lineTo(P.x + 6 * P.sc, P.y - 2 * P.sc);
        ctx.closePath(); ctx.fill();
        // علامة ❄ عائمة
        const dy = P.y - 28 * P.sc + Math.sin(time * 2.6 + st.seed) * 3;
        ctx.fillStyle = 'rgba(170,230,255,' + (0.55 + 0.45 * pulse).toFixed(3) + ')';
        ctx.beginPath();
        ctx.moveTo(P.x, dy + 8 * P.sc);
        ctx.lineTo(P.x - 6.5 * P.sc, dy - 2.5 * P.sc);
        ctx.lineTo(P.x, dy - 8 * P.sc);
        ctx.lineTo(P.x + 6.5 * P.sc, dy - 2.5 * P.sc);
        ctx.closePath(); ctx.fill();
      }

      /* ---------- عمود الشفق فوق الثلج المطلوب ---------- */
      if (iceRevealed() && Out.aurora && Out.aurora.site && !Out.aurora.site.taken) {
        const st = Out.aurora.site;
        const P = w2s(st.x, st.y, W, H);
        if (P.x > -80 && P.x < W + 80) {
          const bg = ctx.createLinearGradient(P.x, 0, P.x, P.y);
          bg.addColorStop(0, 'rgba(210,170,255,0)');
          bg.addColorStop(0.72, 'rgba(205,160,255,.28)');
          bg.addColorStop(1, 'rgba(235,215,255,.6)');
          ctx.fillStyle = bg;
          ctx.fillRect(P.x - 15 * P.sc, 0, 30 * P.sc, P.y);
          const pa = 0.6 + 0.4 * Math.sin(time * 6.2);
          ctx.save();
          ctx.globalAlpha = pa;
          ctx.strokeStyle = '#e6ccff';
          ctx.lineWidth = 2.6;
          ctx.setLineDash([4, 6]);
          ctx.beginPath(); ctx.ellipse(P.x, P.y + 3, 38 * P.sc, 13 * P.sc, 0, 0, 7); ctx.stroke();
          ctx.restore();
          ctx.setLineDash([]);
        }
      }

      /* ---------- مواقع العينات المتوهجة — مختفية لحد مهمة العينات ---------- */
      for (const st of (samplesRevealed() ? Out.sites : [])) {
        if (st.taken) continue;
        const P = w2s(st.x, st.y, W, H);
        if (P.x < -60 || P.x > W + 60) continue;
        const pulse = 0.55 + 0.45 * Math.sin(time * 3.4 + st.seed);
        // دائرة تفاعل متقطعة
        ctx.strokeStyle = 'rgba(120,255,180,' + (0.30 + 0.35 * pulse).toFixed(3) + ')';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 7]);
        ctx.beginPath(); ctx.ellipse(P.x, P.y + 3, 32 * P.sc, 11 * P.sc, 0, 0, 7); ctx.stroke();
        ctx.setLineDash([]);
        // صخرة العينة
        ctx.fillStyle = '#39463a';
        ctx.beginPath(); ctx.ellipse(P.x, P.y - 3 * P.sc, 10 * P.sc, 7 * P.sc, 0.3, 0, 7); ctx.fill();
        ctx.fillStyle = '#5b7260';
        ctx.beginPath(); ctx.ellipse(P.x - 2 * P.sc, P.y - 5 * P.sc, 6 * P.sc, 3.6 * P.sc, 0.3, 0, 7); ctx.fill();
        // معيّن ⛏ نابض فوق الموقع
        const bob = Math.sin(time * 2.2 + st.seed) * 3;
        const dy = P.y - 26 * P.sc + bob;
        ctx.fillStyle = 'rgba(140,255,185,' + (0.55 + 0.45 * pulse).toFixed(3) + ')';
        ctx.beginPath();
        ctx.moveTo(P.x, dy + 9 * P.sc);
        ctx.lineTo(P.x - 7 * P.sc, dy - 2.5 * P.sc);
        ctx.lineTo(P.x, dy - 9 * P.sc);
        ctx.lineTo(P.x + 7 * P.sc, dy - 2.5 * P.sc);
        ctx.closePath(); ctx.fill();
      }

      /* ---------- اللاعب ---------- */
      const p = Out.player;
      const PP = w2s(p.x, p.y, W, H);

      // ظل اللاعب
      ctx.fillStyle = 'rgba(0,0,0,.38)';
      ctx.beginPath();
      ctx.ellipse(PP.x, PP.y + 2, 13 * PP.sc, 4.6 * PP.sc, 0, 0, 7);
      ctx.fill();

      // دائرة تفاعل
      if (Out.near) {
        const NP = w2s(Out.near.x, Out.near.y, W, H);
        const rr0 = Out.near.r * W * 0.95;
        ctx.strokeStyle = `rgba(77,217,255,${0.35 + Math.sin(time * 3) * 0.13})`;
        ctx.lineWidth = 1.8;
        ctx.setLineDash([6, 8]);
        ctx.beginPath(); ctx.ellipse(NP.x, NP.y + 4, rr0, rr0 * 0.30, 0, 0, 7); ctx.stroke();
        ctx.setLineDash([]);
      }

      drawAstronaut(ctx, PP.x, PP.y, {
        scale: clamp(PP.sc * 0.92, 0.55, 1.5),
        facing: p.facing,
        walkPhase: p.walk,
        mode: p.moving ? 'walk' : 'idle',
        accent: m.accent,
        suit: '#eef3f9'
      });

      /* ---------- عاصفة / ليل ---------- */
      if (Out.storm) {
        const k = Out.storm.intensity || 0.6;
        ctx.fillStyle = `rgba(230,150,90,${0.06 + k * 0.14})`;
        ctx.fillRect(0, 0, W, H);
        ctx.strokeStyle = `rgba(255,220,190,${0.10 + k * 0.20})`;
        ctx.lineWidth = 1.4;
        for (let i = 0; i < 40; i++) {
          const sx = ((i * 173 + time * 900) % (W + 240)) - 120;
          const sy = ((i * 97 + time * 260) % H);
          ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx - 34, sy + 26); ctx.stroke();
        }
      }

      /* ---------- غبار ---------- */
      dust.reset(W, H);
      dust.draw(ctx, 0.016, S2.dust);

      vignette(ctx, W, H, 0.55);
      scanlines(ctx, W, H, 0.018);
    }

    function moduleOn(id) {
      if (Out.damage && Out.damage[id] === 2) return false;   // موديول معطّل — بلا طاقة وظيفي
      if (id === 'hab') return Out.alloc.life > 0;
      if (id === 'green') return Out.alloc.green > 2;
      if (id === 'sci') return Out.alloc.sci > 2;
      if (id === 'shield') return Out.alloc.shield > 2;
      if (id === 'moxie') return Out.alloc.life > 1 && !(Out.arcLeak && Out.arcLeak.stage >= 3);
      return true;
    }

    function shade(hex, amt) {
      // hex #rrggbb + تعديل سطوع
      if (!hex || hex[0] !== '#') return '#8899aa';
      const n = parseInt(hex.slice(1), 16);
      let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
      if (amt >= 0) { r += (255 - r) * amt; g += (255 - g) * amt; b += (255 - b) * amt; }
      else { r *= (1 + amt); g *= (1 + amt); b *= (1 + amt); }
      return `rgb(${r | 0},${g | 0},${b | 0})`;
    }

    /* ---------- رسم موديول واحد ---------- */
    function drawModule(md, W, H, time, S2) {
      const P = w2s(md.x, md.y, W, H);
      if (P.x < -220 || P.x > W + 220) return;
      const on = moduleOn(md.id);
      const sc = P.sc * clamp(W / 1100, 0.75, 1.5);
      const near = Out.near && Out.near.id === md.id;
      const bob = Math.sin(time * 1.4 + md.x * 9) * 1.4 * sc;

      ctx.save();
      ctx.translate(P.x, P.y + bob);

      if (md.id === 'hab') {
        // قبة كبيرة
        const R = 46 * sc;
        const g2 = ctx.createRadialGradient(-R * 0.4, -R * 1.3, R * 0.2, 0, -R * 0.6, R * 2);
        g2.addColorStop(0, on ? '#f4f8fd' : '#7b828c');
        g2.addColorStop(0.55, on ? '#c2ccda' : '#565d67');
        g2.addColorStop(1, '#3d4551');
        ctx.fillStyle = g2;
        ctx.beginPath();
        ctx.arc(0, -R * 0.55, R, Math.PI, 0);
        ctx.lineTo(R, 0);
        ctx.ellipse(0, 0, R, R * 0.20, 0, 0, Math.PI);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,.28)'; ctx.lineWidth = 1.6; ctx.stroke();
        // حلقات
        ctx.strokeStyle = 'rgba(60,76,94,.22)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.ellipse(0, -R * 0.55, R * 0.62, R * 0.62, 0, Math.PI, 0); ctx.stroke();
        // نوافذ مضيئة
        for (let i = -2; i <= 2; i++) {
          const lit = on && !Out.storm;
          if (lit) { ctx.shadowColor = 'rgba(255,186,90,.95)'; ctx.shadowBlur = 18; }
          ctx.fillStyle = lit ? 'rgba(255,208,132,.95)' : 'rgba(28,38,50,.9)';
          ctx.beginPath(); ctx.arc(i * R * 0.30, -R * 0.72, R * 0.105, 0, 7); ctx.fill();
          ctx.shadowBlur = 0;
        }
        // بوابة (تلمع لو في ملجأ)
        ctx.fillStyle = Out.shelter ? 'rgba(69,224,138,.95)' : 'rgba(18,26,36,.95)';
        rr(ctx, -R * 0.19, -R * 0.30, R * 0.38, R * 0.30, R * 0.05); ctx.fill();
        if (Out.shelter) { ctx.shadowColor = 'rgba(69,224,138,.9)'; ctx.shadowBlur = 22;
          rr(ctx, -R * 0.19, -R * 0.30, R * 0.38, R * 0.30, R * 0.05); ctx.fill(); ctx.shadowBlur = 0; }
        // منارة طوارئ حمراء ليلًا/وقت العاصفة
        if (outDaylight() < 0.35 || Out.storm) {
          const bl = Math.sin(time * 3.5) > 0.15;
          ctx.save();
          if (bl) { ctx.shadowColor = 'rgba(255,80,80,.95)'; ctx.shadowBlur = 12; }
          ctx.fillStyle = bl ? 'rgba(255,92,92,.98)' : 'rgba(88,42,42,.85)';
          ctx.beginPath(); ctx.arc(0, -R * 1.56, 2.6 * sc, 0, 7); ctx.fill();
          ctx.restore();
        }
      }

      else if (md.id === 'green') {
        const w2 = 40 * sc, h2 = 30 * sc;
        ctx.fillStyle = shade(S2.ground[1], -0.25);
        rr(ctx, -w2, -h2, w2 * 2, h2 + 4 * sc, 5 * sc); ctx.fill();
        // سقف زجاجي
        const g2 = ctx.createLinearGradient(0, -h2 * 1.9, 0, -h2);
        g2.addColorStop(0, on ? 'rgba(150,230,190,.55)' : 'rgba(90,100,110,.35)');
        g2.addColorStop(1, on ? 'rgba(40,120,80,.5)' : 'rgba(40,60,60,.4)');
        ctx.fillStyle = g2;
        ctx.beginPath();
        ctx.moveTo(-w2, -h2);
        ctx.quadraticCurveTo(0, -h2 * 2.1, w2, -h2);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(180,240,210,.35)'; ctx.lineWidth = 1.3; ctx.stroke();
        // نباتات — مراحل نمو حقيقية (Out.crop): ٠ تربة ← ٤ ناضجة + صفار العطش
        const cStage = Out.crop ? (Out.crop.stage | 0) : 2;
        const sick = !!(Out.crop && Out.crop.thirst >= 3);
        for (let i = 0; i < 6; i++) {
          const px = -w2 * 0.78 + i * (w2 * 1.56 / 5);
          if (cStage <= 0) {   // ماتت — تربة قاحلة بس
            ctx.fillStyle = 'rgba(122,88,52,.9)';
            ctx.beginPath(); ctx.ellipse(px, -h2 * 0.16, 3.4 * sc, 1.6 * sc, 0, 0, 7); ctx.fill();
            continue;
          }
          const jitt = 0.78 + 0.28 * Math.abs(Math.sin(i * 2.3 + 1.7));
          const hh = (4 + cStage * 3.6) * sc * jitt + Math.sin(time * 1.2 + i) * 1.1 * sc;
          const sway = Math.sin(time * 1.15 + i * 1.3) * 1.15 * sc;
          const stemCol = sick ? 'rgba(214,190,80,.92)' : (on ? 'rgba(110,225,140,.9)' : 'rgba(120,130,100,.5)');
          const leafCol = sick ? 'rgba(228,205,95,.92)' : (on ? 'rgba(120,235,150,.9)' : 'rgba(120,130,100,.5)');
          ctx.strokeStyle = stemCol;
          ctx.lineWidth = 2 * sc;
          ctx.beginPath(); ctx.moveTo(px, -h2 * 0.18); ctx.lineTo(px + sway, -h2 * 0.18 - hh); ctx.stroke();
          ctx.fillStyle = leafCol;
          ctx.beginPath(); ctx.ellipse(px + sway, -h2 * 0.18 - hh, 4 * sc, 2.6 * sc, 0, 0, 7); ctx.fill();
          if (cStage >= 3) {   // براعم وردية
            ctx.fillStyle = sick ? 'rgba(226,150,60,.9)' : 'rgba(255,172,205,.92)';
            ctx.beginPath(); ctx.arc(px + sway + 2.3 * sc, -h2 * 0.18 - hh * 0.82, 1.5 * sc, 0, 7); ctx.fill();
          }
          if (cStage >= 4) {   // ثمار ذهبية ناضجة
            ctx.fillStyle = 'rgba(255,197,66,.96)';
            ctx.beginPath(); ctx.arc(px + sway - 2.1 * sc, -h2 * 0.18 - hh * 0.58, 1.8 * sc, 0, 7); ctx.fill();
          }
        }
        // لافتة
        ctx.fillStyle = 'rgba(120,240,170,.75)';
        ctx.font = `900 ${Math.round(7 * sc)}px "Segoe UI",sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('GREEN', 0, -h2 * 1.62);
      }

      else if (md.id === 'sci') {
        const w2 = 34 * sc, h2 = 26 * sc;
        const g2 = ctx.createLinearGradient(-w2, -h2 * 2, w2, 0);
        g2.addColorStop(0, on ? '#dfe7f1' : '#6b727c');
        g2.addColorStop(1, '#4a525e');
        ctx.fillStyle = g2;
        rr(ctx, -w2, -h2 * 1.7, w2 * 2, h2 * 1.7, 4 * sc); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 1.2; ctx.stroke();
        // نافذة مضيئة + أجهزة
        ctx.fillStyle = on ? 'rgba(90,200,255,.45)' : 'rgba(30,45,60,.7)';
        rr(ctx, -w2 * 0.72, -h2 * 1.42, w2 * 1.44, h2 * 0.52, 2 * sc); ctx.fill();
        if (on) {
          for (let i = 0; i < 3; i++) {
            ctx.fillStyle = `rgba(120,240,255,${0.5 + Math.sin(time * 2.4 + i) * 0.3})`;
            ctx.fillRect(-w2 * 0.6 + i * w2 * 0.38, -h2 * 1.45, w2 * 0.2, 2 * sc);
          }
        }
        ctx.fillStyle = 'rgba(77,217,255,.85)';
        ctx.font = `900 ${Math.round(7 * sc)}px "Segoe UI",sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('LAB', 0, h2 * 0.02);
      }

      else if (md.id === 'shield') {
        ctx.fillStyle = on ? 'rgba(155,123,255,.30)' : 'rgba(70,70,90,.26)';
        rr(ctx, -20 * sc, -34 * sc, 40 * sc, 40 * sc, 7 * sc); ctx.fill();
        ctx.strokeStyle = on ? 'rgba(185,160,255,.9)' : 'rgba(100,100,120,.45)';
        ctx.lineWidth = 2 * sc; ctx.stroke();
        if (on) {
          // هالة درع
          for (let i = 0; i < 2; i++) {
            const pu = ((time * 0.55 + i * 0.5) % 1);
            ctx.strokeStyle = `rgba(180,150,255,${(1 - pu) * 0.5})`;
            ctx.lineWidth = 1.6;
            ctx.beginPath(); ctx.arc(0, -14 * sc, (20 + pu * 34) * sc, 0, 7); ctx.stroke();
          }
        }
        // هوائي
        ctx.strokeStyle = '#7d8a9c'; ctx.lineWidth = 1.6 * sc;
        ctx.beginPath(); ctx.moveTo(0, -34 * sc); ctx.lineTo(0, -46 * sc); ctx.stroke();
      }

      else if (md.id === 'solar') {
        // 6 ألواح
        for (let r = 0; r < 2; r++) for (let i = 0; i < 3; i++) {
          const px = -52 * sc + i * 36 * sc;
          const py = -52 * sc + r * 26 * sc;
          const g2 = ctx.createLinearGradient(px, py, px + 32 * sc, py + 22 * sc);
          g2.addColorStop(0, on ? '#4e9ed9' : '#3a4048');
          g2.addColorStop(1, on ? '#123a58' : '#21252b');
          ctx.save();
          ctx.transform(1, 0.16, 0, 1, 0, 0);   // ميل بسيط
          ctx.fillStyle = g2;
          ctx.fillRect(px, py, 32 * sc, 22 * sc);
          ctx.strokeStyle = 'rgba(160,220,255,.38)'; ctx.lineWidth = 1;
          ctx.strokeRect(px, py, 32 * sc, 22 * sc);
          // شبكة الخلايا
          ctx.strokeStyle = 'rgba(10,30,45,.5)';
          ctx.beginPath();
          ctx.moveTo(px + 16 * sc, py); ctx.lineTo(px + 16 * sc, py + 22 * sc);
          ctx.moveTo(px, py + 11 * sc); ctx.lineTo(px + 32 * sc, py + 11 * sc);
          ctx.stroke();
          // غبار
          if (Out.dust > 0.05) {
            ctx.fillStyle = `rgba(190,128,74,${Out.dust * 0.62})`;
            ctx.fillRect(px, py, 32 * sc, 22 * sc);
          }
          ctx.restore();
        }
        // مصباح تحذير بنك البطاريات
        if (Out.arcBattery) {
          const st = Out.arcBattery.stage | 0;
          const bl = Math.sin(time * (st >= 2 ? 8.2 : 5.2)) > (st >= 2 ? -0.2 : 0.25);
          ctx.save();
          if (bl) { ctx.shadowColor = 'rgba(255,176,66,.95)'; ctx.shadowBlur = 13; }
          ctx.fillStyle = bl ? 'rgba(255,178,66,.98)' : 'rgba(96,66,26,.9)';
          ctx.beginPath(); ctx.arc(-2 * sc, -30.5 * sc, 2.7 * sc, 0, 7); ctx.fill();
          ctx.restore();
        }
        ctx.strokeStyle = '#4c5666'; ctx.lineWidth = 3.4 * sc;
        ctx.beginPath(); ctx.moveTo(-2 * sc, 6 * sc); ctx.lineTo(-2 * sc, -28 * sc); ctx.stroke();
        if (on) {
          // لمعان
          const gl = (time * 0.6) % 1;
          const gx = -52 * sc + gl * 104 * sc;
          ctx.fillStyle = `rgba(200,240,255,${0.16 * (1 - Math.abs(gl - 0.5) * 2)})`;
          ctx.fillRect(gx, -52 * sc, 12 * sc, 48 * sc);
        }
      }

      else if (md.id === 'moxie') {
        const g2 = ctx.createLinearGradient(-18 * sc, -30 * sc, 18 * sc, 0);
        g2.addColorStop(0, on ? '#b9c3cf' : '#646b75');
        g2.addColorStop(1, '#4b535e');
        ctx.fillStyle = g2;
        rr(ctx, -18 * sc, -30 * sc, 36 * sc, 30 * sc, 4 * sc); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,.3)'; ctx.lineWidth = 1; ctx.stroke();
        // مصباح حالة
        const pulse = on ? 0.55 + Math.sin(time * 4) * 0.35 : 0.2;
        ctx.save();
        if (on) { ctx.shadowColor = 'rgba(69,224,138,.95)'; ctx.shadowBlur = 16; }
        ctx.fillStyle = on ? `rgba(69,224,138,${pulse})` : 'rgba(120,70,70,.7)';
        ctx.beginPath(); ctx.arc(9 * sc, -20 * sc, 2.6 * sc, 0, 7); ctx.fill();
        ctx.restore();
        // أنبوب
        ctx.strokeStyle = '#8b97a6'; ctx.lineWidth = 2.4 * sc;
        ctx.beginPath(); ctx.moveTo(-18 * sc, -8 * sc); ctx.lineTo(-30 * sc, -8 * sc); ctx.stroke();
        // بخار التسريب / دخان الانفجار
        if (Out.arcLeak) {
          const st = Out.arcLeak.stage | 0;
          for (let i = 0; i < 4; i++) {
            const q = ((time * 0.72 + i * 0.265) % 1);
            const yy = -10 * sc - q * 27 * sc;
            const drift = Math.sin(time * 1.9 + i * 2.1) * 3.6 * sc;
            const alpha = (1 - q) * (st >= 3 ? 0.6 : 0.5);
            ctx.fillStyle = st >= 3 ? 'rgba(78,82,90,' + alpha.toFixed(3) + ')' : 'rgba(233,243,251,' + alpha.toFixed(3) + ')';
            ctx.beginPath(); ctx.arc(-27 * sc + drift, yy, (3.1 + q * 5.2) * sc, 0, 7); ctx.fill();
          }
          if (st >= 3) {   // شرخ في الأنبوب
            ctx.strokeStyle = 'rgba(255,120,90,.85)'; ctx.lineWidth = 1.6 * sc;
            ctx.beginPath(); ctx.moveTo(-24 * sc, -11 * sc); ctx.lineTo(-27 * sc, -7.5 * sc); ctx.lineTo(-23.5 * sc, -5 * sc); ctx.stroke();
          }
        }
        ctx.fillStyle = 'rgba(69,224,138,.8)';
        ctx.font = `900 ${Math.round(7 * sc)}px "Segoe UI",sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('MOXIE', 0, 10 * sc);
      }

      else if (md.id === 'dish') {
        ctx.strokeStyle = '#59637a'; ctx.lineWidth = 3 * sc;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -26 * sc); ctx.stroke();
        // قاعدة
        ctx.fillStyle = '#39434f';
        ctx.beginPath(); ctx.ellipse(0, 0, 12 * sc, 4 * sc, 0, 0, 7); ctx.fill();
        ctx.save();
        ctx.translate(0, -26 * sc);
        ctx.rotate(Math.sin(time * 0.35) * 0.45 - 0.35);
        const g2 = ctx.createLinearGradient(-22 * sc, 0, 22 * sc, 0);
        g2.addColorStop(0, '#eef5fd'); g2.addColorStop(1, '#7d8a9c');
        ctx.fillStyle = g2;
        ctx.beginPath(); ctx.ellipse(0, 0, 22 * sc, 10 * sc, 0, 0, 7); ctx.fill();
        ctx.strokeStyle = '#3d4a5c'; ctx.lineWidth = 1.4 * sc;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(12 * sc, -11 * sc); ctx.stroke();
        ctx.restore();
        // موجات
        for (let i = 0; i < 3; i++) {
          const q = ((time * 0.55 + i * 0.33) % 1);
          ctx.strokeStyle = `rgba(77,217,255,${(1 - q) * 0.55})`;
          ctx.lineWidth = 1.4;
          ctx.beginPath(); ctx.arc(0, -26 * sc, (12 + q * 34) * sc, -2.4, -1.0); ctx.stroke();
        }
      }

      // تسمية
      const showLabel = near || P.sc > 0.9;
      if (showLabel) {
        ctx.textAlign = 'center';
        ctx.font = `900 ${Math.round(9 * clamp(sc, .8, 1.5))}px "Segoe UI",sans-serif`;
        ctx.fillStyle = near ? 'rgba(77,217,255,.95)' : 'rgba(226,238,255,.55)';
        ctx.fillText(md.label, 0, (md.id === 'solar' ? 22 : 20) * sc);
      }

      ctx.restore();
    }

    /* ---------------- حلقة الرسم ---------------- */
    try { if (window.Audio && Audio.ambientWind) Audio.ambientWind(); } catch (e) {}
    bindKeys();

    function frame(now) {
      if (stop) return;
      const dt = Math.min(0.05, (now - lastT) / 1000);
      lastT = now; t += dt;

      if (!Out.paused) updatePlayer(dt);
      updateSim(dt);
      if (Out.phase === 'done') return;   // حدث/نهاية أثناء updateSim — الراوتر تولّى
      const daybar = $('out-daybar');
      if (daybar) daybar.style.width = ((Out.simT / Out.solLength) * 100).toFixed(1) + '%';
      if (now - (Out._hudT || 0) > 250) { Out._hudT = now; updateHudRates(); }

      const W = cvs.w, H = cvs.h;
      ctx.clearRect(0, 0, W, H);
      drawWorld(W, H, t);
      const dlNow = outDaylight();
      if (dlNow < 0.995) {
        ctx.fillStyle = `rgba(5,9,24,${((1 - dlNow) * 0.52).toFixed(3)})`;
        ctx.fillRect(0, 0, W, H);
      }

      // زر التفاعل يتبع الموديول
      const actBtn = $('out-act');
      if (actBtn) {
        if (Out.near && !Out.nearSite && !Out.workTarget) {
          const NP = w2s(Out.near.x, Out.near.y, W, H);
          actBtn.classList.remove('hidden');
          actBtn.style.left = NP.x + 'px';
          actBtn.style.top = (NP.y - Out.near.r * W * 0.55) + 'px';
          $('out-act-label').textContent = Out.near.labelAr || Out.near.label;
        } else if (!actBtn.classList.contains('hidden')) {
          actBtn.classList.add('hidden');
        }
      }
      // تلميح الحفر + زر «احفر» للمس
      const isTouch = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
      const maxS2 = sampleTargetOf(m);
      const showDrill = !!(Out.nearSite && Out.phase !== 'event' && !Out.paused);
      const workT = Out.workTarget;
      const showWork = !!(!Out.nearSite && workT && Out.phase !== 'event' && !Out.paused);
      const sp = $('out-site-prompt');
      if (sp) {
        if (showDrill) {
          sp.classList.remove('hidden');
          const iceJob = Out.nearSite && Out.nearSite.ice;
          $('out-site-tip').innerHTML = iceJob
            ? (isTouch ? '❄ موقع جليد — اضغط مطوّل «احفر»' : '❄ موقع جليد — اضغط مطوّل <span class="mono">E</span> للحفر')
            : (isTouch ? '⛏ موقع عينة — اضغط مطوّل «احفر»' : '⛏ موقع عينة — اضغط مطوّل <span class="mono">E</span> للحفر');
          $('out-drill-fill').style.width = (Out.drill * 100).toFixed(1) + '%';
        } else if (showWork) {
          sp.classList.remove('hidden');
          $('out-site-tip').innerHTML = workT.tip;
          const wp = (Out.work && Out.work.id === workT.id) ? Out.work.p : 0;
          $('out-drill-fill').style.width = (wp * 100).toFixed(1) + '%';
        } else {
          sp.classList.add('hidden');
        }
      }
      const evaBtn = $('out-eva-hold');
      // زر الإمساك يظهر دائمًا عند توفر هدف (يُمسك بالماوس أو اللمس)
      if (evaBtn) {
        const showHold = (showDrill && Out.samples < maxS2) || showWork;
        evaBtn.classList.toggle('hidden', !showHold);
        evaBtn.textContent = showWork ? workT.short : (Out.nearSite && Out.nearSite.ice ? '❄ احفر' : '⛏ احفر');
      }
      // إخفاء التلميح بعد 8 ثواني
      const hint = $('out-hint');
      if (hint && t > 9) hint.style.opacity = '0';

      raf = requestAnimationFrame(frame);
    }
    frame(performance.now());

    /* ---------------- ربط الأزرار والدرج ---------------- */
    const mcCard = $('mc-card');
    if (mcCard) mcCard.addEventListener('click', () => { mcCard.classList.add('hidden'); Audio.click(); });

    const drawer = $('p-drawer');
    const panel = $('out-panel');
    const scrim = $('out-scrim');
    function openDrawer(v) {
      drawer.style.transform = v ? 'translateX(0)' : 'translateX(-105%)';
      scrim.classList.toggle('hidden', !v);
      Out.paused = v;
      if (v) closePanel();
    }
    function closePanel() {
      panel.classList.remove('open');
      panel.style.transform = 'translateX(105%)';
      if (!drawer.style.transform.includes('-105')) return;
      scrim.classList.add('hidden');
      Out.paused = false;
    }
    function openPanel() {
      panel.style.transform = 'translateX(0)';
      scrim.classList.remove('hidden');
      Out.paused = true;
    }
    $('p-plan').addEventListener('click', () => { Audio.click(); openDrawer(true); });
    $('p-drawer-close').addEventListener('click', () => { Audio.click(); openDrawer(false); });
    $('p-src').addEventListener('click', () => { Audio.click(); openSourcesModal(); });
    $('out-panel-close').addEventListener('click', () => { Audio.click(); closePanel(); });
    scrim.addEventListener('click', () => { openDrawer(false); closePanel(); });
    const renderHistory = () => {
      const list = $('out-history-list');
      if (!list) return;
      if (!Out.log.length) { list.innerHTML = '<div class="sub" style="font-size:11px">مفيش أحداث لسه.</div>'; return; }
      list.innerHTML = Out.log.slice(0, 30).map(l =>
        `<div style="font-size:11.5px;line-height:1.7;border-inline-start:2px solid rgba(120,180,230,.35);padding-inline-start:9px">
          <span class="mono" style="color:var(--dim2);font-size:9px">SOL ${String(l.sol).padStart(2, '0')}</span><br>${l.html}</div>`).join('');
    };
    $('out-log-btn').addEventListener('click', () => {
      const h = $('out-history');
      h.classList.toggle('hidden');
      if (!h.classList.contains('hidden')) renderHistory();
      Audio.click();
    });
    $('out-history-close').addEventListener('click', () => { $('out-history').classList.add('hidden'); Audio.click(); });
    $('out-act').addEventListener('click', () => { if (Out.near) { interactModule(Out.near); openPanel(); } });

    // فتح اللوحة تلقائياً عند التفاعل
    const _interact = interactModule;
    interactModule = function (md) { _interact(md); openPanel(); };

    /* ---------------- تحكم لمسي ---------------- */
    const isTouch = matchMedia('(pointer: coarse)').matches || window.innerWidth < 820;
    if (isTouch) {
      $('touch-pad').classList.add('on');
      $('touch-e').classList.add('on');
    }
    const bindHold = (btn, key) => {
      const on = (e) => { e.preventDefault(); input[key] = true; };
      const off = (e) => { e.preventDefault(); input[key] = false; };
      btn.addEventListener('pointerdown', on);
      btn.addEventListener('pointerup', off);
      btn.addEventListener('pointercancel', off);
      btn.addEventListener('pointerleave', off);
    };
    qsa('#touch-pad button').forEach(b => bindHold(b, b.dataset.dir));
    $('touch-e').addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (Out.nearSite) return; // الحفر بزر «احفر» المجاور
      const n = Out.near;
      if (n) { interactModule(n); openPanel(); }
      else { Audio.fail(); toast('اقترب من موديول الأول', 'warn'); }
    });
    const evaHold = $('out-eva-hold');
    const holdOn = (e) => { e.preventDefault(); input.actHeld = true; };
    const holdOff = (e) => { e.preventDefault(); input.actHeld = false; };
    evaHold.addEventListener('pointerdown', holdOn);
    evaHold.addEventListener('pointerup', holdOff);
    evaHold.addEventListener('pointercancel', holdOff);
    evaHold.addEventListener('pointerleave', holdOff);

    /* ---------------- الزمن المستمر: كل حاجة بتستنزف مع الوقت ---------------- */
    /* معدلات الاستنزاف لكل Sol — مصدر واحد للمحاكاة والأسهم في الواجهة */
    function outDrainRates() {
      const avail = outPowerAvailable();
      const used = outPowerAllocated();
      const deficit = used > avail;
      const pressure = 1 + Math.min(0.25, (Out.sol || 1) * 0.005);   // المهمة بتسخن: +25% استنزاف بنهاية مارس/زحل
      const shielded = Out.alloc.shield > 2;
      const sinterCut = Math.min(0.4, Out.sinterShield || 0);
      return {
        deficit, avail, used,
        o2: (SIM.daily.o2_draw * m.resources.oxygen * pressure * (deficit ? 1.5 : 1) * (Out.alloc.life < 3 ? 2.2 : 1) + (Out.alloc.life > 6 ? -0.4 : 0) + ((Out.arcLeak && Out.arcLeak.stage >= 2) ? 2.1 : 0)),
        h2o: (SIM.daily.water_draw * m.resources.water * pressure * (deficit ? 1.4 : 1) * (Out.alloc.life < 3 ? 2 : 1) * (Out.alloc.heat < 2 && outDaylight() < 0.25 ? 1.45 : 1) + (Out.alloc.green > 3 ? 0.8 : 0)),
        food: (SIM.daily.food_draw * pressure * (1 / Math.max(m.resources.food, 0.3)) + (Out.alloc.green > 4 ? -0.6 : 0.1)),
        dose: SIM.doses.surface * (shielded ? 0.62 : 1) * (Out.shelter ? 0.15 : 1) * (1 - sinterCut)
      };
    }

    function updateSim(dt) {
      if (Out.paused || Out.phase === 'event' || Out.phase === 'done') return;
      const step = dt * Out.simSpeed;
      const SL = Out.solLength;
      const rates = outDrainRates();
      const deficit = rates.deficit;
      const avail = rates.avail, used = rates.used;
      Out.powerGen = avail; Out.powerUse = used;

      // معدلات الاستنزاف لكل Sol (تُطبَّق باستمرار كل فريم)
      const o2Draw = rates.o2, h2oDraw = rates.h2o, foodDraw = rates.food, doseRate = rates.dose;

      const pre = { o2: Out.o2, h2o: Out.h2o, food: Out.food };
      Out.o2 = clamp(Out.o2 - (o2Draw / SL) * step, 0, resCap());
      Out.h2o = clamp(Out.h2o - (h2oDraw / SL) * step, 0, resCap());
      Out.food = clamp(Out.food - (foodDraw / SL) * step, 0, resCap());
      Out.dose = Out.dose.map(d => d + (doseRate / SL) * step);

      // جمّع استنزاف الـSol للسجل التلقائي
      const ac = Out.solAccum;
      ac.o2 += pre.o2 - Out.o2; ac.h2o += pre.h2o - Out.h2o; ac.food += pre.food - Out.food;
      ac.dose += (doseRate / SL) * step; ac.deficit = ac.deficit || deficit;

      // ساعة الـSol — المهمة بتمشي لوحدها
      Out.simT += step;
      if (Out.simT >= SL) {
        Out.simT -= SL;
        tickSol();
      }

      // فشل فوري لو الموارد وصلت الصفر
      const maxDose = Math.max(...Out.dose);
      if (Out.o2 <= 0) return finishMission('o2');
      if (Out.h2o <= 0) return finishMission('water');
      if (Out.food <= 0) return finishMission('food');
      if (maxDose >= OUT_TARGETS.doseLimit) return finishMission('dose');
    }

    function tickSol() {
      const ac = Out.solAccum || { o2: 0, h2o: 0, food: 0, dose: 0, deficit: false };
      const finishedSol = Out.sol;
      Out.sol++;
      Out.storm = null; Out.shelter = false;
      Out.auroraDoneNight = false; Out._wasNight = outDaylight() < 0.12;   // فرصة شفق جديدة كل ليلة
      if (m.env.dust_storms) Out.dust = clamp(Out.dust + 0.04, 0, 1);
      if (Out.solarDamage > 0) Out.solarDamage = Math.max(0, Out.solarDamage - 0.12);

      // سطر تقرير تلقائي في السجل — بدون ما يوقفك
      const sign = (v) => (v >= 0 ? '−' : '+') + Math.abs(v).toFixed(1);
      outLog(`<b>Sol ${finishedSol}</b> انتهى — O₂ ${sign(ac.o2)} · H₂O ${sign(ac.h2o)} · غذاء ${sign(ac.food)} · ☢ +${ac.dose.toFixed(2)} mSv${ac.deficit ? ' · <span style="color:var(--red)">عجز طاقة!</span>' : ''}`, ac.deficit ? 'warn' : '');
      Out.solAccum = { o2: 0, h2o: 0, food: 0, dose: 0, deficit: false };
      mcMorning(ac);

      tickArcs(finishedSol);
      tickCrop();

      const maxDose = Math.max(...Out.dose);
      if (Out.sol > m.duration_days) return finishMission('complete');

      const solEl = $('out-sol');
      if (solEl) solEl.innerHTML = String(Out.sol).padStart(2, '0') +
        '<span style="font-size:10px;color:var(--dim2)">/' + m.duration_days + '</span>';
      refreshPanel();

      // حدث — تداعيات أولًا (مترتبة على قراراتك واستهلاكك)، ثم عشوائي موزون
      const esc = 1 + Math.min(0.5, Out.sol / 45);              // المهمة بتسخن مع تقدم الوقت
      const shouldEvent = (Out.sol % 3 === 0) || Math.random() < 0.26 * esc;
      const casc = pickCascade();
      if (casc) triggerEvent(casc);
      else if (shouldEvent) triggerEvent(pickScenarioWeighted());
    }

    /* ---------------- سرعة الزمن ---------------- */
    $('p-speed').addEventListener('click', () => {
      Out.simSpeed = Out.simSpeed >= 3 ? 1 : Out.simSpeed + 1;
      const t = $('p-speed-txt'); if (t) t.textContent = '×' + Out.simSpeed;
      Audio.click();
    });
    outLog('المهمة جارية — الزمن بيجري، وكل حاجة بتقل مع الوقت. توكّل على الريجوليث والجليد.');

    /* «التداعيات» — مشاكل مترتبة على واقعك: استنزاف، إجهاد، تراكمات قرارات.
       تحل محل خانة الحدث اليومي (لا تتكدس فوقه)، ومبردة ٣ أيام بين تكرار نفس النوع.
       لا تدخل في سحب الأحداث العشوائي — تُطلق من هنا فقط. */
    function pickCascade() {
      const cd = Out.cascadeCd = Out.cascadeCd || {};
      const today = Out.sol || 1;
      const ac = Out.solAccum || { dose: 0, deficit: false };
      const cand = [];
      if (Out.o2 <= 25) cand.push(['o2', 'cascade_o2']);
      if (Out.h2o <= 25) cand.push(['water', 'cascade_water']);
      if (Out.food <= 25) cand.push(['food', 'cascade_food']);
      if (ac.deficit) cand.push(['power', 'cascade_power']);
      if ((Out.dust || 0) >= 0.55) cand.push(['dust', 'cascade_dust']);
      if ((Out.hours || 24) <= 5) cand.push(['fatigue', 'cascade_fatigue']);
      if ((ac.dose || 0) > 12) cand.push(['dose', 'cascade_dose']);
      if ((Out.solarDamage || 0) >= 0.45) cand.push(['solar', 'cascade_solar']);
      if (Out.flags && Out.flags.maintDue && Out.flags.maintDue <= today) cand.push(['maint', 'cascade_maintenance']);
      const fresh = cand.filter(([k]) => !(cd[k] && today - cd[k] < 3));
      if (!fresh.length) return null;
      const [k, id] = fresh[0];                       // الأولوية: الموارد الحرجة أولًا
      cd[k] = today;
      Out.evHistory = [...(Out.evHistory || []), id].slice(-6);
      const why = {
        o2: 'مخزون الأوكسجين وصل ' + Math.round(Out.o2) + '%',
        water: 'مخزون الماء وصل ' + Math.round(Out.h2o) + '%',
        food: 'مخزون الغذاء وصل ' + Math.round(Out.food) + '%',
        power: 'الأحمال تجاوزت الإنتاج طوال اليوم',
        dust: 'تراكم الغبار وصل ' + Math.round(Out.dust * 100) + '%',
        fatigue: 'الساعات المتبقية اليوم ' + (Out.hours || 0).toFixed(1) + ' فقط',
        dose: 'الجرعة المتراكمة لآخر يوم ' + (ac.dose || 0).toFixed(1) + ' mSv',
        solar: 'ضرر الألواح ' + Math.round((Out.solarDamage || 0) * 100) + '%',
        maint: 'قرارات مستعجلة ضغطت على المعدات',
      }[k];
      Out._cascadeCause = why;
      if (k === 'maint' && Out.flags) Out.flags.maintDue = 0;
      return id;
    }

    /* محدد أحداث تكيفي: وزون قراراتك (إشعاع أكتر مع قرارات خاطئة)، بلا تكرار خلفي */
    function pickScenarioWeighted() {
      const recent = (Out.evHistory || []).slice(-2);
      let pool = m.scenarios.filter(id => SCENARIOS[id] && !recent.includes(id));
      if (!pool.length) pool = m.scenarios.filter(id => SCENARIOS[id]);
      const radBoost = 1 + 0.45 * (Out.badCalls || 0);
      const weighted = pool.map(id => ({ id, w: SCENARIOS[id].kind === 'radiation' ? radBoost : 1 }));
      let r = Math.random() * weighted.reduce((a, b) => a + b.w, 0);
      for (const it of weighted) { r -= it.w; if (r <= 0) { Out.evHistory = [...(Out.evHistory || []), it.id].slice(-6); return it.id; } }
      const last = weighted[weighted.length - 1].id;
      Out.evHistory = [...(Out.evHistory || []), last].slice(-6);
      return last;
    }

    /* ============ أنظمة «العالم الحي» — تداعيات متعددة المراحل ============ */
    /* كل طور (stage) يظهر في العالم نفسه: بخار، وميض، دخان — ويتصلح بالتمشية وE مطوّل */
    function tickArcs() {
      const sNow = Out.sol;
      /* --- تسريب خط الأوكسجين (MOXIE) --- */
      if (Out.arcLeak) {
        const a = Out.arcLeak;
        if (sNow - (a.sol | 0) >= 1) {
          a.stage = Math.min(3, (a.stage | 0) + 1);
          a.sol = sNow;
          if (a.stage === 2) {
            outLog('🛠 <b>التسريب بيكبر</b> — خط O₂ فقد صمامه: نزيف مستمر على مخزون الأوكسجين. امش للـMOXIE ورتق (E مطوّل)', 'warn');
            Audio.alarm();
          } else if (a.stage === 3) {
            Out.o2 = clamp(Out.o2 - 14, 0, resCap());
            Out.damage.moxie = 2;
            outLog('💥 <b>خط الأوكسجين انفجر!</b> −14 O₂ — MOXIE متوقف لحد ما تصلح الخط بإيدك', 'bad');
            Audio.critical();
          }
        }
      } else if (sNow >= 3 && (sNow - (Out.flags.leakCd || 0)) >= 4 && Math.random() < 0.22 && Out.o2 > 30) {
        Out.arcLeak = { stage: 1, sol: sNow };
        Out.flags.leakCd = sNow;
        outLog('🛠 <b>المجسّات رصدت همسة تسريب</b> في خط الأوكسجين — ارتقِي E مطوّل في الـMOXIE قبل ما يكبر (−1 ساعة)', 'warn');
        Audio.alarm();
      }
      /* --- بنك بطاريات الألواح --- */
      if (Out.arcBattery) {
        const b = Out.arcBattery;
        if (sNow - (b.sol | 0) >= 1) {
          b.stage = Math.min(3, (b.stage | 0) + 1);
          b.sol = sNow;
          if (b.stage === 2) {
            outLog('🔋 <b>البطاريات بتفقد شحنها بسرعة</b> — تخزين أقل كفاءة: القدرة متاحة أقل لحد الفحص', 'warn');
            Audio.alarm();
          } else if (b.stage === 3) {
            outLog('⚡ <b>بنك التخزين انهار</b> — الألواح بتشغل نص طاقتها بس لحد ما تصلح البنك', 'bad');
            Audio.critical();
          }
        }
      } else if (sNow >= 4 && (sNow - (Out.flags.battCd || 0)) >= 5 && (Out.solarDamage > 0.02 ? Math.random() < 0.32 : (sNow >= 7 && Math.random() < 0.15))) {
        Out.arcBattery = { stage: 1, sol: sNow };
        Out.flags.battCd = sNow;
        outLog('🔋 <b>البطارية الاحتياطية تقترب من نهاية عمرها</b> — امش للألواح الشمسية وافحص البنك (E مطوّل)', 'warn');
        Audio.alarm();
      }
    }

    function tickCrop() {
      const c = Out.crop || (Out.crop = { stage: 2, thirst: 0 });
      c.thirst = (c.thirst | 0) + 1;
      if (c.thirst >= 3) {
        const st = Math.max(0, (c.stage | 0) - 1);
        c.stage = st;
        c.thirst = 2;
        outLog(st === 0
          ? '🥀 <b>المحاصيل ماتت عطشًا</b> — ريّ فوري لإعادة الزراعة (الدفيئة محتاجة مياه دلوقتي)'
          : '🌿 المحاصيل <b>عطشانة</b> — نزلت مرحلة نمو (' + st + '/4) — الدفيئة بتدفع ثمن التأخير', 'warn');
      }
    }

    /* ============ «مركز التحكم — هيوستن» يتكلم ============
       بث صباحي بتقرير حقيقي + مساء الخير عند الغروب + صدى بعد كل قرار */
    const NASA_FACTS = [
      'يوم الزهرة أطول من سنته — 5832 ساعة ارتدادي، يعني الشمس بتشرق من الغرب',
      'سول المريخ = 24 ساعة و37 دقيقة — أطول من يوم الأرض بـ40 دقيقة كاملة',
      'ضغط سطح المريخ أقل من 1% من ضغط الأرض عند سطح البحر — غلاف جوي أرق من خيوط',
      'عاصفة ١٠ مايو ٢٠٢٤ كانت أقوى عاصفة جيومغناطيسية منذ عقدين — Kp=9.0',
      'MOXIE على «برسفيرنس» حلّل CO₂ في فوهة جيزيرو واستخرج أكسجين نقي — أول أكسدة صناعية على كوكب آخر',
      'تايتان غلافه 95% نيتروجين + 5% ميثان — الكوكب الوحيد في النظام الشمسي غير الأرض بغيوم وبحار سائلة',
      'يوم القمر الظاهري (الاقتراني) = 29.53 يومًا — نفس الدورة اللي بتحدد المد على شواطئ الأرض',
      'قاع فوهة شاكليتون في قطب القمر الجنوبي لا يرى الشمس أبدًا تقريبًا — أكياس ثلج نقية بلا تبخر',
      'كاسيني عاشت 13 سنة عند زحل ودخلت الغلاف 22 مرة قبل نهاية «الحفلة الختامية» — سبتمبر ٢٠١٧',
      'جرعة 600 mSv سقف NASA المهني مدى الحياة — الفضاء بيحاسب على كل ميلليسيفرت'
    ];
    function mcSay(html, factHtml) {
      const card = $('mc-card');
      if (!card) return;
      $('mc-body').innerHTML = html;
      const f = $('mc-fact');
      if (f) { f.innerHTML = factHtml || ''; f.style.display = factHtml ? 'block' : 'none'; }
      $('mc-sol').textContent = 'SOL ' + String(Out.sol).padStart(2, '0');
      card.classList.remove('hidden');
      card.classList.add('mc-in');
      if (Out._mcT) clearTimeout(Out._mcT);
      Out._mcT = setTimeout(() => { card.classList.add('hidden'); }, 7800);
    }
    function mcMorning(ac) {
      const lines = ['صباح الخير من هيوستن — Sol ' + String(Out.sol).padStart(2, '0') + '/' + m.duration_days + ' على السطح. خلّيك سامع لينا.'];
      lines.push('المخزون: O₂ <b>' + Math.round(Out.o2) + '</b> · ماء <b>' + Math.round(Out.h2o) + '</b> · غذاء <b>' + Math.round(Out.food) + '</b>');
      if (ac && ac.deficit) lines.push('⚡ عجز طاقة النهار اللي فات — قلّل التخصيص أو نظّف الألواح بدري');
      else if (Out.o2 < 30) lines.push('🔴 <b>الأوكسجين حرج</b> — MOXIE بيدك أو ثلج بتمكه، دلوقتي مش بكرة');
      else if (Out.h2o < 30) lines.push('🔴 <b>الماء حرج</b> — راجع الاستهلاك وريّ المحاصيل بترشيد');
      else if (Out.food < 30) lines.push('🔴 <b>الغذاء حرج</b> — الدفيئة محتاجة ريّ قبل ما تنشف');
      else if (Out.dust > 0.55 && m.env.dust_storms) lines.push('🧹 الغبار بيقطع نور الألواح — نظّفها صباح اليوم ده');
      else if (Math.max(...Out.dose) > 400) lines.push('☢ الجرعة عالية — راقب الدرع والملجأ في كل خروج');
      const fact = NASA_FACTS[(Out.sol * 7 + 3) % NASA_FACTS.length];
      mcSay(lines.join('<br>'), '🧠 معلومة ناسا — ' + fact);
    }
    function mcEvening() {
      const warn = Out.o2 < 30 || Out.h2o < 30 || Out.food < 30;
      mcSay('غروب الشمس على ' + m.name + ' — المساء جه.<br>' +
        (warn ? 'بعض المؤشرات قلقانة — راجع المخزون قبل ما تنام.' : 'الأنظمة هادية — ليلة هادية يا رائد.') , null);
    }
    const MC_ECHO_OK = ['👍 استقبال ممتاز — تحليلك أحسن من ذاكرتنا', '🛰 هيوستن معاك — كمل كده', '📡 مركز التحكم يستقبل — قرار محسوب'];
    const MC_ECHO_BAD = ['😬 هيوستن… هنراجع القرار ده سوا — تابع مؤشراتك النهاردة', '⚠ قرار حرج — راقب الصحة والجرعة عن قرب', '📡 وصلنا تبعات القرار — راجع بروتوكول الطوارئ'];
    function mcEcho(good) {
      const pick = good ? MC_ECHO_OK[(Math.random() * MC_ECHO_OK.length) | 0] : MC_ECHO_BAD[(Math.random() * MC_ECHO_BAD.length) | 0];
      mcSay('<span style="color:var(--dim2)">صدى من هيوستن —</span> ' + pick, null);
    }

    /* ---------------- الأحداث ---------------- */
    function triggerEvent(id) {
      const sc = SCENARIOS[id];
      if (!sc) return;
      Out.phase = 'event';
      Out.paused = true;
      const layer = $('event-layer');
      const card = $('event-card');
      layer.classList.remove('hidden');

      // صوت حسب الشدة
      if (sc.severity === 'critical') Audio.critical();
      else Audio.alarm();

      // رسم خلفية الحدث
      const evCvs = makeCanvas($('event-canvas'));
      let evStop = false, evT = 0, evRaf = 0, evLast = performance.now();
      const evKind = sc.kind;

      function evFrame(now) {
        if (evStop) return;
        const dt = Math.min(0.05, (now - evLast) / 1000);
        evLast = now; evT += dt;
        const W = evCvs.w, H = evCvs.h;
        const c = evCvs.ctx;
        c.clearRect(0, 0, W, H);
        drawEventScene(c, W, H, evKind, evT, sc);
        evRaf = requestAnimationFrame(evFrame);
      }
      evFrame(performance.now());

      // بطاقة القرار
      const src = SOURCES[sc.source];
      const sevColor = sc.severity === 'critical' ? 'var(--red)' : 'var(--amber)';
      card.innerHTML = `
        <div class="row" style="justify-content:space-between;align-items:flex-start;margin-bottom:14px">
          <div>
            <div class="eyebrow" style="color:${sevColor};font-size:9.5px">
              ⚠ ${sc.severity === 'critical' ? 'CRITICAL EVENT' : 'WARNING'} · SOL ${String(Out.sol).padStart(2, '0')}
            </div>
            <div class="h2" style="margin-top:8px;font-size:20px">${sc.title}</div>
            <div class="mono" style="font-size:9.5px;color:var(--dim2);letter-spacing:1.4px;margin-top:4px">${sc.titleEn}</div>
          </div>
          <div class="mono" style="font-size:34px;font-weight:900;color:${sevColor};line-height:1"
               id="ev-timer">${sc.time_to_impact || 30}</div>
        </div>

        <div style="font-size:12.5px;line-height:1.8;color:#c8d8ea;margin-bottom:16px">${sc.briefing}</div>
        ${Out._cascadeCause ? `<div style="display:flex;align-items:center;gap:8px;margin:-6px 0 14px;padding:8px 12px;border-radius:12px;border:1px solid rgba(255,179,71,.4);background:rgba(255,179,71,.08);color:#ffd98a;font-size:11px;font-weight:800">🪢 تداعيات قراراتك — ${Out._cascadeCause}</div>` : ''}

        <div class="row" style="margin-bottom:16px;gap:8px;flex-wrap:wrap">
          <span class="pill" style="font-size:10px">📊 ${src ? src.label : 'تقدير اللعبة'}</span>
          ${src && src.kind === 'real' ? '<span class="pill live" style="font-size:9.5px">بيانات NASA</span>' : '<span class="pill cached" style="font-size:9.5px">تقدير اللعبة</span>'}
        </div>

        <div class="h3" style="font-size:11px;color:var(--cyan);letter-spacing:1.4px;margin-bottom:10px">
          اختر — مفيش خيار مجاني
        </div>
        <div style="display:flex;flex-direction:column;gap:9px" id="ev-choices"></div>
      `;

      const chHost = card.querySelector('#ev-choices');
      sc.choices.forEach((ch, i) => {
        const b = el('button');
        b.className = 'btn ghost';
        b.style.cssText = 'text-align:right;justify-content:flex-start;flex-direction:column;align-items:stretch;padding:13px 16px;gap:5px';
        const fx = Object.entries(ch.effects).map(([k, v]) => {
          const labels = { dose: 'mSv', o2: 'O₂', water: 'ماء', food: 'غذاء', power: 'kW', hours: 'ساعة', fuel: 'وقود', science: 'علم', dust: 'غبار', solar: 'ضرر ألواح', regolith: 'تربة' };
          const good = (k === 'dose' && v <= 0) || (['o2', 'water', 'food', 'power', 'science'].includes(k) && v > 0) || (k === 'regolith' && v > 0) || ((k === 'dust' || k === 'solar') && v <= 0);
          return `<span style="font-size:9.5px;font-weight:900;padding:2px 8px;border-radius:99px;
            background:${good ? 'rgba(69,224,138,.16)' : 'rgba(255,95,109,.14)'};
            color:${good ? 'var(--green)' : 'var(--red)'}">${v > 0 ? '+' : ''}${v} ${labels[k] || k}</span>`;
        }).join(' ');
        b.innerHTML = `
          <div style="font-weight:900;font-size:13px;color:var(--txt)">${ch.label}</div>
          <div style="font-size:11.5px;color:var(--dim);line-height:1.6">${ch.detail}</div>
          <div class="row gap6 wrap" style="margin-top:4px">${fx}</div>`;
        b.addEventListener('click', () => { evStop = true; cancelAnimationFrame(evRaf); evCvs.destroy(); resolveEvent(sc, ch); });
        chHost.appendChild(b);
      });

      // مؤقت
      let remain = sc.time_to_impact || 30;
      const timerEl = card.querySelector('#ev-timer');
      Out._evTimer = setInterval(() => {
        remain -= 1;
        if (timerEl) timerEl.textContent = Math.max(0, remain);
        if (remain <= 5 && remain > 0) Audio.tick();
        if (remain <= 0) {
          clearInterval(Out._evTimer);
          // اختيار افتراضي: أسوأ خيار
          const worst = sc.choices.reduce((a, b) => (b.correct === false && (a.correct !== false || Math.abs(b.effects.dose || 0) > Math.abs(a.effects.dose || 0)) ? b : a), sc.choices[0]);
          evStop = true; cancelAnimationFrame(evRaf); evCvs.destroy();
          toast('انتهى الوقت — القرار الافتراضي اتطبّق', 'warn');
          resolveEvent(sc, worst);
        }
      }, 1000);
    }

    function resolveEvent(sc, choice) {
      if (Out._evTimer) { clearInterval(Out._evTimer); Out._evTimer = null; }
      const e = choice.effects;
      if (e.dose) Out.dose = Out.dose.map(d => d + e.dose);
      if (e.o2) Out.o2 = clamp(Out.o2 + e.o2, 0, resCap());
      if (e.water) Out.h2o = clamp(Out.h2o + e.water, 0, resCap());
      if (e.food) Out.food = clamp(Out.food + e.food, 0, resCap());
      if (e.science) Out.science += e.science;
      if (e.hours) Out.hours = clamp(Out.hours + e.hours, 0, 24);
      if (e.dust) Out.dust = clamp(Out.dust + e.dust, 0, 1);
      if (e.solar) Out.solarDamage = clamp((Out.solarDamage || 0) + e.solar, 0, 0.8);
      if (e.regolith) Out.regolith = Math.max(0, Out.regolith + e.regolith);
      if (e.dust || e.solar) refreshPanel();

      if (choice.aftermath === 'maintenance') { Out.flags = Out.flags || {}; Out.flags.maintDue = (Out.sol || 1) + 1; }
      Out._cascadeCause = null;
      if (choice.correct) Out.goodCalls++; else Out.badCalls++;
      if (choice.correct) Audio.ok(); else Audio.fail();
      try { mcEcho(!!choice.correct); } catch (e) {}
      if (Out.badCalls === 3) toast('مركز التحكم: قرارات غير موفقة متكررة — راجع بروتوكولات الطوارئ', 'bad');
      outLog(`<b>${sc.title}</b> → ${choice.label}`, choice.correct ? 'good' : 'bad');

      // إغلاق الحدث + بطاقة النتيجة التعليمية
      const layer = $('event-layer');
      const card = $('event-card');
      card.innerHTML = `
        <div class="eyebrow" style="color:${choice.correct ? 'var(--green)' : 'var(--red)'};font-size:9.5px">
          ${choice.correct ? '✓ قرار صحيح' : '✕ عواقب'}
        </div>
        <div class="h2" style="margin:10px 0 12px;font-size:19px">${sc.title}</div>
        <div class="card tight" style="background:${choice.correct ? 'rgba(69,224,138,.07)' : 'rgba(255,95,109,.07)'};
          border-color:${choice.correct ? 'rgba(69,224,138,.35)' : 'rgba(255,95,109,.35)'};margin-bottom:14px">
          <div style="font-size:12.5px;line-height:1.85;color:#d6e4f2">${choice.why}</div>
        </div>
        <div class="h3" style="font-size:11px;color:var(--cyan);letter-spacing:1.2px;margin-bottom:8px">الأثر الفعلي</div>
        <div style="display:flex;gap:7px;flex-wrap:wrap;margin-bottom:18px">
          ${Object.entries(choice.effects).map(([k, v]) => {
            const labels = { dose: 'mSv جرعة', o2: 'O₂', water: 'ماء', food: 'غذاء', power: 'kW', hours: 'ساعة', fuel: 'وقود', science: 'علم', dust: 'غبار', solar: 'ضرر ألواح', regolith: 'تربة' };
            const bad = (k === 'dose' && v > 0) || (['o2', 'water', 'food'].includes(k) && v < 0) || (['dust', 'solar', 'regolith'].includes(k) && v > 0);
            return `<span class="pill ${bad ? 'bad' : 'ok'}" style="font-size:10px">${v > 0 ? '+' : ''}${v} ${labels[k] || k}</span>`;
          }).join('')}
        </div>
        <button class="btn wide" id="ev-continue">متابعة ←</button>
      `;
      card.querySelector('#ev-continue').addEventListener('click', () => {
        layer.classList.add('hidden');
        Audio.click();
        Out.paused = false;
        Out.phase = 'plan';
      });
    }

    /* ---------------- إنهاء المهمة ---------------- */
    function finishMission(reason) {
      Out.phase = 'done';
      if (reason === 'complete') {
        Quest.markMissed();
        beginReturn();   // تبني Game.result بنفسها
        return;
      }
      Game.result = {
        mission: m.id,
        reason,
        sols: Math.min(Out.sol - 1, m.duration_days),
        samples: Out.samples,
        science: Out.science,
        dose: Out.dose,
        o2: Out.o2, h2o: Out.h2o, food: Out.food,
        target: m.duration_days,
        isru: { ...Out.isru, count: Out.isruCount, sinterShield: Out.sinterShield, resupply: Out.resupplyUsed }
      };
      stop = true; cancelAnimationFrame(raf); cvs.destroy();
      go('result');
    }

    Out.__event = triggerEvent;
    Out.__pick = pickScenarioWeighted;   // @QA
    Out.__endSol = () => { Out.simT = 0; tickSol(); };
    Out.__completeQuests = () => Quest.__completeAll(); // @QA
    Out.__beginReturn = beginReturn; // @QA

    this._stop = () => {
      stop = true; cancelAnimationFrame(raf); cvs.destroy();
      if (Out._evTimer) clearInterval(Out._evTimer);
      if (bindKeys._off) { bindKeys._off(); bindKeys._off = null; }
      input._enabled = false;
      Out.paused = false;
      for (const k in input) input[k] = false;
    };
  },
  unmount() { if (this._stop) this._stop(); }
});


/* ======================================================================
   مشاهد الأحداث — كل نوع له رسم مختلف تمامًا
   ====================================================================== */
function drawEventScene(c, W, H, kind, t, sc) {
  const base = { radiation: ['#1a0507', '#3d0e12'], oxygen: ['#050a14', '#0d2032'], power: ['#08080c', '#12141c'], water: ['#03080f', '#0a1a2a'], food: ['#0a0a05', '#1a1808'], comms: ['#050a10', '#0c1a24'], heat: ['#1a0d02', '#3a1c05'], cold: ['#040810', '#0d1a2a'], wind: ['#0a0d14', '#1c2230'], acid: ['#12100a', '#2a2410'], fog: ['#0a0c10', '#1c2028'], rings: ['#05060f', '#101426'], bones: ['#0a0508', '#1a0e14'] };
  const pair = base[kind] || base.power;
  skyGradient(c, W, H, pair[0], pair[1]);

  if (kind === 'radiation' || kind === 'bones') {
    // شمس تنفجر + جزيئات
    const cx = W * 0.5, cy = H * 0.28;
    const pulse = 1 + Math.sin(t * 4) * 0.06;
    const g = c.createRadialGradient(cx, cy, 10, cx, cy, 320 * pulse);
    g.addColorStop(0, 'rgba(255,240,180,.95)');
    g.addColorStop(0.25, 'rgba(255,150,60,.65)');
    g.addColorStop(0.6, 'rgba(255,70,50,.22)');
    g.addColorStop(1, 'rgba(255,40,20,0)');
    c.fillStyle = g;
    c.beginPath(); c.arc(cx, cy, 320 * pulse, 0, 7); c.fill();
    c.fillStyle = 'rgba(255,255,235,.95)';
    c.beginPath(); c.arc(cx, cy, 26, 0, 7); c.fill();
    // لهب الشمس
    for (let i = 0; i < 28; i++) {
      const a = i * 0.224 + t * 0.5;
      const r1 = 40 + Math.sin(t * 3 + i) * 14;
      const r2 = 120 + Math.sin(t * 2 + i * 1.7) * 50;
      c.strokeStyle = `rgba(255,${140 + (i % 5) * 20},80,.35)`;
      c.lineWidth = 2 + (i % 3);
      c.beginPath();
      c.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
      c.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2);
      c.stroke();
    }
    // جزيئات قادمة
    for (let i = 0; i < 90; i++) {
      const p = ((t * 0.35 + i * 0.011) % 1);
      const a = i * 2.4;
      const dist = p * Math.max(W, H) * 0.9;
      const x = cx + Math.cos(a) * dist * 1.3;
      const y = cy + Math.sin(a) * dist;
      c.fillStyle = `rgba(255,${180 + (i % 4) * 15},140,${(1 - p) * 0.75})`;
      c.beginPath(); c.arc(x, y, 1.6 + (i % 3), 0, 7); c.fill();
    }
  }

  else if (kind === 'oxygen') {
    // تسريب هواء
    const cx = W * 0.5, cy = H * 0.5;
    c.strokeStyle = 'rgba(120,200,255,.22)';
    c.lineWidth = 2;
    for (let i = 0; i < 5; i++) {
      c.beginPath();
      c.arc(cx, cy, 100 + i * 46 + Math.sin(t * 2 + i) * 6, 0, 7);
      c.stroke();
    }
    // جزيئات هاربة من ثقب
    for (let i = 0; i < 110; i++) {
      const p = ((t * 0.5 + i * 0.009) % 1);
      const a = -0.6 + (i % 18) * 0.12;
      const dist = p * Math.max(W, H) * 0.8;
      const x = cx + Math.cos(a) * dist;
      const y = cy + Math.sin(a) * dist * 0.75;
      c.fillStyle = `rgba(160,225,255,${(1 - p) * 0.55})`;
      c.beginPath(); c.arc(x, y, 2 + (i % 3), 0, 7); c.fill();
    }
    c.fillStyle = 'rgba(160,225,255,.5)';
    c.beginPath(); c.arc(cx, cy, 7 + Math.sin(t * 8) * 3, 0, 7); c.fill();
  }

  else if (kind === 'power') {
    // انهيار كهربائي: خطوط تنقطع
    const rows = 9;
    for (let r = 0; r < rows; r++) {
      const y = H * (0.15 + r * 0.085);
      c.strokeStyle = `rgba(77,217,255,${0.05 + Math.random() * 0.12})`;
      c.lineWidth = 1;
      c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke();
    }
    for (let i = 0; i < 14; i++) {
      const x = W * ((i * 0.077 + 0.06) % 1);
      const h = H * (0.2 + (i % 5) * 0.1);
      const flick = Math.sin(t * (7 + i) + i) > 0 ? 1 : 0.15;
      c.fillStyle = `rgba(77,217,255,${0.35 * flick})`;
      c.fillRect(x, H * 0.7 - h, 3, h);
      c.fillStyle = `rgba(69,224,138,${0.5 * flick})`;
      c.fillRect(x, H * 0.7 - h, 3, 4);
    }
    // وميض
    if (Math.sin(t * 11) > 0.85) {
      c.fillStyle = 'rgba(255,255,255,.06)';
      c.fillRect(0, 0, W, H);
    }
    c.fillStyle = 'rgba(255,95,109,.5)';
    c.font = '900 46px "Segoe UI",sans-serif';
    c.textAlign = 'center';
    c.fillText('⚠', W * 0.5, H * 0.5);
  }

  else if (kind === 'water') {
    // قطرات وكفاءة
    for (let i = 0; i < 70; i++) {
      const p = ((t * 0.55 + i * 0.017) % 1);
      const x = (i * 137) % W;
      const y = p * H;
      c.fillStyle = `rgba(123,164,255,${(1 - p) * 0.55})`;
      c.beginPath();
      c.ellipse(x, y, 2.2, 5.5 + (i % 3), 0, 0, 7);
      c.fill();
    }
    // عدّاد دائري
    const cx = W * 0.5, cy = H * 0.5;
    const k = 0.5;
    c.strokeStyle = 'rgba(123,164,255,.22)';
    c.lineWidth = 12;
    c.beginPath(); c.arc(cx, cy, 74, 0, 7); c.stroke();
    c.strokeStyle = 'rgba(123,164,255,.9)';
    c.beginPath(); c.arc(cx, cy, 74, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k, false); c.stroke();
    c.fillStyle = 'rgba(200,225,255,.85)';
    c.font = '900 26px "Segoe UI",sans-serif';
    c.textAlign = 'center';
    c.fillText('50%', cx, cy + 9);
  }

  else if (kind === 'food') {
    // نباتات بتدبل
    const gy2 = H * 0.72;
    c.fillStyle = 'rgba(30,50,30,.5)';
    c.fillRect(0, gy2, W, H - gy2);
    for (let i = 0; i < 22; i++) {
      const x = W * (0.06 + i * 0.042);
      const wilt = clamp((t * 0.25 + i * 0.03) % 1.4, 0, 1);
      const h = 60 * (1 - wilt * 0.7);
      c.strokeStyle = `rgba(${140 - wilt * 80},${190 - wilt * 110},${110 - wilt * 60},.8)`;
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(x, gy2);
      c.quadraticCurveTo(x + wilt * 22, gy2 - h * 0.6, x + wilt * 34, gy2 - h);
      c.stroke();
      c.fillStyle = `rgba(${160 - wilt * 90},${210 - wilt * 120},120,.75)`;
      c.beginPath();
      c.ellipse(x + wilt * 34, gy2 - h, 7, 4, wilt, 0, 7);
      c.fill();
    }
    c.fillStyle = 'rgba(255,179,71,.55)';
    c.font = '900 40px "Segoe UI",sans-serif';
    c.textAlign = 'center';
    c.fillText('🌱', W * 0.5, H * 0.3);
  }

  else if (kind === 'comms') {
    // هوائي وأمواج مع تأخير
    const cx = W * 0.5, cy = H * 0.62;
    c.strokeStyle = 'rgba(120,200,255,.7)';
    c.lineWidth = 3;
    c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx, cy - 90); c.stroke();
    c.fillStyle = 'rgba(200,230,255,.85)';
    c.beginPath(); c.ellipse(cx, cy - 92, 34, 13, 0, 0, 7); c.fill();
    for (let i = 0; i < 6; i++) {
      const p = ((t * 0.5 + i * 0.167) % 1);
      c.strokeStyle = `rgba(77,217,255,${(1 - p) * 0.65})`;
      c.lineWidth = 2;
      c.beginPath();
      c.arc(cx, cy - 92, 40 + p * 190, -2.5, -0.65);
      c.stroke();
    }
    // إشارة مقطوعة
    if (Math.sin(t * 2.2) > 0.4) {
      c.strokeStyle = 'rgba(255,95,109,.8)';
      c.lineWidth = 4;
      c.beginPath(); c.moveTo(cx - 40, cy + 30); c.lineTo(cx + 40, cy + 30); c.stroke();
    }
  }

  else if (kind === 'heat' || kind === 'cold') {
    const warm = kind === 'heat';
    const cy = H * 0.5;
    // تمويه حراري
    for (let i = 0; i < 40; i++) {
      const x = (i * 71) % W;
      const y = cy + Math.sin(t * 2 + i * 0.4) * 40 + (i % 5) * 22;
      c.strokeStyle = warm
        ? `rgba(255,${120 + (i % 6) * 20},60,${0.12 + (i % 4) * 0.05})`
        : `rgba(${140 + (i % 5) * 20},${200 + (i % 4) * 12},255,${0.1 + (i % 4) * 0.05})`;
      c.lineWidth = 2 + (i % 4);
      c.beginPath();
      c.moveTo(x, y);
      c.quadraticCurveTo(x + 30, y - 18, x + 60, y);
      c.stroke();
    }
    c.fillStyle = warm ? 'rgba(255,150,60,.55)' : 'rgba(170,210,255,.55)';
    c.font = '900 54px "Segoe UI",sans-serif';
    c.textAlign = 'center';
    c.fillText(warm ? '🌡' : '❄', W * 0.5, H * 0.36);
  }

  else if (kind === 'wind') {
    for (let i = 0; i < 26; i++) {
      const y = (i * 41) % H;
      const x = ((t * (180 + i * 12) + i * 90) % (W + 300)) - 150;
      c.strokeStyle = `rgba(200,215,235,${0.06 + (i % 5) * 0.045})`;
      c.lineWidth = 1 + (i % 3);
      c.beginPath();
      c.moveTo(x, y);
      c.quadraticCurveTo(x + 60, y - 12, x + 140, y);
      c.stroke();
    }
  }

  else if (kind === 'acid') {
    for (let i = 0; i < 60; i++) {
      const x = (i * 113 + Math.sin(t + i) * 30) % W;
      const y = ((t * 40 + i * 53) % H);
      c.fillStyle = `rgba(${200 + (i % 4) * 12},${220 + (i % 3) * 10},${90 + (i % 5) * 18},${0.18})`;
      c.beginPath(); c.arc(x, y, 4 + (i % 4) * 2, 0, 7); c.fill();
    }
    // تآكل
    for (let i = 0; i < 18; i++) {
      const x = (i * 83) % W, y = (i * 57) % H;
      c.strokeStyle = `rgba(220,190,60,${0.25 * Math.sin(t * 2 + i)})`;
      c.lineWidth = 2;
      c.beginPath();
      for (let k = 0; k < 6; k++) {
        c.lineTo(x + Math.sin(k * 2 + i + t) * 22, y + Math.cos(k * 3 + i) * 16);
      }
      c.stroke();
    }
  }

  else if (kind === 'fog') {
    for (let i = 0; i < 22; i++) {
      const x = ((i * 0.09 + t * 0.02) % 1.2) * W;
      const y = H * (0.25 + (i % 6) * 0.12) + Math.sin(t * 0.6 + i) * 12;
      const r = 100 + (i % 5) * 70;
      const g = c.createRadialGradient(x, y, 5, x, y, r);
      g.addColorStop(0, 'rgba(200,190,160,.14)');
      g.addColorStop(1, 'rgba(200,190,160,0)');
      c.fillStyle = g;
      c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
    }
  }

  else if (kind === 'rings') {
    const cx = W * 0.5, cy = H * 0.6;
    c.save();
    c.translate(cx, cy);
    c.rotate(-0.36);
    for (let i = 0; i < 5; i++) {
      c.strokeStyle = `rgba(220,205,170,${0.4 - i * 0.06})`;
      c.lineWidth = 4 + i * 4;
      c.beginPath();
      c.ellipse(0, 0, 200 + i * 48, 54 + i * 13, 0, 0, 7);
      c.stroke();
    }
    c.restore();
    // شظايا
    for (let i = 0; i < 40; i++) {
      const a = i * 1.7 + t * 0.5;
      const r = 180 + (i % 7) * 46;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r * 0.28;
      c.fillStyle = `rgba(230,240,255,${0.4 + (i % 3) * 0.2})`;
      c.beginPath(); c.arc(x, y, 1.5 + (i % 3), 0, 7); c.fill();
    }
  }

  else {
    // عام
    for (let i = 0; i < 50; i++) {
      const x = (i * 97 + t * 30) % W;
      const y = (i * 53) % H;
      c.fillStyle = `rgba(255,255,255,${0.05 + (i % 4) * 0.02})`;
      c.beginPath(); c.arc(x, y, 1.6, 0, 7); c.fill();
    }
  }

  // تعتيم خلفي عشان النص يبان
  c.fillStyle = 'rgba(2,4,8,.42)';
  c.fillRect(0, 0, W, H);
  vignette(c, W, H, 0.7);
}
