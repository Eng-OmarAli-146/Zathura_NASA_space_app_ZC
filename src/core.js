/* ============================================================================
   core.js — محرك اللعبة: الحالة، الأصوات، التنبيهات، التنقل، الإعدادات
   ==========================================================================*/

/* ---------------------------------------------------------------- STATE */
const Game = {
  screen: 'intro',
  mission: null,          // mission id
  phase: 'hq',            // hq | boarding | launch | travel | arrive | outpost | result
  settings: { sound: true, volume: 0.55, reduceMotion: false, muted: false, lowGfx: false, bigText: false },
  dataMode: 'CACHED',     // LIVE | CACHED | OFFLINE
  lastFetch: null,
  loaded: false,
  history: []
};

/* ------------------------------------------------ تشغيل/حفظ الإعدادات */
const SETTINGS_KEY = 'aerodelta.settings.v1';
const LEGACY_SETTINGS_KEY = 'orbit.settings.v2';   // مفتاح الإصدارات السابقة — تُقرأ مرة واحدة ثم تُهجر
function applyBigText() { try { document.body.classList.toggle('text-plus', !!Game.settings.bigText); } catch (e) {} }
function toggleFullscreen() {
  try {
    if (document.fullscreenElement) { document.exitFullscreen().catch(() => {}); }
    else if (document.documentElement.requestFullscreen) { document.documentElement.requestFullscreen().catch(() => {}); }
  } catch (e) {}
}
function loadSettings() {
  try {
    let raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) { const legacy = localStorage.getItem(LEGACY_SETTINGS_KEY); if (legacy) { try { localStorage.setItem(SETTINGS_KEY, legacy); localStorage.removeItem(LEGACY_SETTINGS_KEY); } catch (e) {} raw = legacy; } }
    if (raw) Object.assign(Game.settings, JSON.parse(raw));
  } catch (e) { /* localStorage may be blocked */ }
}
function saveSettings() {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(Game.settings)); } catch (e) {}
}

/* ============================================================================
   حفظ المهمة الجارية — autosave + استئناف من مركز التحكم
   ==========================================================================*/
const RUN_KEY = 'aerodelta.run.v1';
const BEST_KEY = 'aerodelta.best.v1';
let pendingQuestRestore = null;          // تُطبَّق داخل شاشات_outpost بعد Quest.mount

const RunSave = {
  exists() { try { return !!localStorage.getItem(RUN_KEY); } catch (e) { return false; } },
  read() {
    try { const r = localStorage.getItem(RUN_KEY); return r ? JSON.parse(r) : null; } catch (e) { return null; }
  },
  write(d) { try { localStorage.setItem(RUN_KEY, JSON.stringify(d)); } catch (e) {} },
  clear() { try { localStorage.removeItem(RUN_KEY); } catch (e) {} }
};
const BestSave = {
  all() { try { return JSON.parse(localStorage.getItem(BEST_KEY) || '{}'); } catch (e) { return {}; } },
  get(id) { return BestSave.all()[id] || 0; },
  count() { return Object.keys(BestSave.all()).filter(k => (BestSave.all()[k] || 0) > 0).length; },
  total() { return Object.values(BestSave.all()).reduce((a, b) => a + (b || 0), 0); },
  set(id, stars) {
    const all = BestSave.all();
    if ((all[id] || 0) < (stars || 0)) { all[id] = stars; try { localStorage.setItem(BEST_KEY, JSON.stringify(all)); } catch (e) {} }
  }
};

/* ============================================================================
   الساعة الفلكية — 1 دقيقة واقعية = 1 ساعة كوكبية (دورة يوم كامل ≈ 24 دقيقة)
   مستقلة تمامًا عن دورة SOL الاقتصادية للعبة (12 ث = يوم لعب كامل)
   فترات الدوران والميل المحوري من NASA Planetary Fact Sheets (راجع SOURCES-AUDIT.md)
   ملاحظة: «زويل» كوكب خيالي بالكامل لهذه اللعبة
   ==========================================================================*/
const PLANET_ROT = {
  earth:   { ar: 'الأرض',  hours: 23.9345, tilt: 23.44,  retro: false, fact: 'يوم الأرض النجمي 23س 56د 4ث · ميل محوري 23.44°' },
  mars:    { ar: 'المريخ', hours: 24.6229, tilt: 25.19,  retro: false, fact: 'سول المريخ 24س 37د 22ث · ميل محوري 25.19°' },
  mercury: { ar: 'عطارد',  hours: 1407.6,  tilt: 0.034,  retro: false, fact: 'يوم عطارد 58.6 يومًا أرضيًا · ميل محوري 0.034°' },
  venus:   { ar: 'الزهرة', hours: 5832.5,  tilt: 177.4,  retro: true,  fact: 'يوم الزهرة 243 يومًا — ارتدادي: الشمس تشرق من الغرب · ميل 177.4°' },
  saturn:  { ar: 'زحل',    hours: 10.656,  tilt: 26.73,  retro: false, fact: 'يوم زحل 10س 39د · ميل محوري 26.73°' },
  moon:    { ar: 'القمر',  hours: 708.73,  tilt: 1.54,   retro: false, fact: 'اليوم القمري (اقتراني) 29.53 يومًا · ميل 1.54°' },
  zewail:  { ar: 'زويل',   hours: 26.3,    tilt: 19.0,   retro: false, fact: 'كوكب خيالي — يومه 26.3 ساعة · ميل 19°' },
};
/* تسريع عرضي (للمعاينة داخل اللعبة فقط): يوم عطارد ≈ 1408 ساعة ويوم القمر الاقتراني ≈ 709 ساعات —
   بالمعدل الأصلي (1 د = 1 س كوكبية) لا يرى اللاعب غروبًا أبدًا. نضرب دورة العرض بـ hours/24
   فيصير «يوم بصري» كامل ≈ 24 دقيقة مثل الأرض. لا يمسّ هذا أي اقتصاد لعب (SOL) ولا الحفظ — عرض فقط. */
const VIS_MUL = {
  mercury: PLANET_ROT.mercury.hours / 24,
  moon:    PLANET_ROT.moon.hours / 24,
};
const DayClock = {
  abs: null, epoch: 0,
  mount(absHours) { this.abs = (absHours == null ? 5.67 : absHours); this.epoch = Date.now(); },   // 05:40 فجرًا — الهبوط عند الفجر
  now() { if (this.abs == null) this.mount(5.67); return this.abs + (Date.now() - this.epoch) / 60000; },
  rot(id) { return PLANET_ROT[id || Game.mission] || PLANET_ROT.earth; },
  _mul(id) { return VIS_MUL[id || Game.mission] || 1; },
  phase(id) { const p = this.rot(id); const f = ((this.now() * this._mul(id)) / p.hours) % 1; return f < 0 ? f + 1 : f; },
  localH(id) { return this.phase(id) * 24; },
  fmt(id) { const h = this.localH(id), hh = Math.floor(h), mm = Math.floor((h - hh) * 60); return String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0'); },
  dayN(id) { const p = this.rot(id); return Math.floor((this.now() * this._mul(id)) / p.hours) + 1; },
  icon(id) { const h = this.localH(id); return (h >= 5.6 && h < 18.4) ? (h < 7.2 || h >= 17.2 ? '🌇' : '☀️') : '🌙'; },
  isNight(id) { const h = this.localH(id); return h < 5.6 || h >= 18.4; },
  factLine(id) { const p = this.rot(id); const mul = this._mul(id); return '🕐 ' + p.ar + ' — 1 دقيقة واقعية = 1 ساعة كوكبية · ' + p.fact + (mul > 1 ? ' · ⏩ معاينة متسارعة في العرض (يوم بصري ≈ 24 دقيقة)' : ''); },
};
window.DayClock = DayClock;

/* ============================================================================
   الإنجازات — تُحفظ محليًا في aerodelta.ach.v1 وتستمر عبر الجلسات
   ==========================================================================*/
const ACH_KEY = 'aerodelta.ach.v1';
const ACHIEVEMENTS = [
  { id: 'first_launch',    icon: '🚀', t: 'أول إشعال',            d: 'شغّلت المحركات وأقلعت من الأرض لأول مرة',           stat: 'launches',        need: 1 },
  { id: 'touchdown',       icon: '🎉', t: 'عودة كاملة',           d: 'أتممت مهمة كاملة بفريق حيّ',                       stat: 'completes',       need: 1 },
  { id: 'planet_explorer', icon: '🪐', t: 'مستكشف الكواكب',       d: 'أتممت ٣ مهمات كاملة على عوالم مختلفة',              stat: 'completes',       need: 3 },
  { id: 'solar_explorer',  icon: '☀️', t: 'مستكشف النظام الشمسي', d: 'أتممت المهمات الست كلها — من القمر إلى زويل',      stat: 'completes',       need: 6 },
  { id: 'researcher',      icon: '🔬', t: 'باحث علمي',            d: 'تراكم ١٢٠ نقطة علم عبر مهامك',                     stat: 'scienceTotal',    need: 120 },
  { id: 'perfect_landing', icon: '🪂', t: 'هبوط مثالي',           d: 'فتحت المظلة داخل النطاق المثالي (2.2 – 4.5 كم)',   stat: 'perfectLandings', need: 1 },
  { id: 'aurora_hunter',   icon: '✨', t: 'صائد الشفق',           d: 'شهدت الشفق القطبي في سماء زويل',                   stat: 'aurora',          need: 1 },
  { id: 'mission_master',  icon: '👑', t: 'سيد المهام',           d: 'حصلت على النجوم الثلاثة كلها في مهمة واحدة',       stat: 'bestStars',       need: 3 },
];
const ACH = (() => {
  let store = { stats: {}, unlocked: {} };
  try {
    const raw = localStorage.getItem(ACH_KEY);
    if (raw) { const p2 = JSON.parse(raw); store = { stats: (p2 && p2.stats) || {}, unlocked: (p2 && p2.unlocked) || {} }; }
  } catch (e) {}
  function persist() { try { localStorage.setItem(ACH_KEY, JSON.stringify(store)); } catch (e) {} }
  function renderAchList() {
    const list = $('ach-list'); if (!list) return;
    const st = ACH.state();
    list.innerHTML = ACHIEVEMENTS.map(a => {
      const got = !!st.unlocked[a.id];
      const v = Math.min(st.stats[a.stat] || 0, a.need);
      return `<div class="ach-row${got ? '' : ' locked'}" role="listitem">
        <div class="ach-ic">${a.icon}</div>
        <div><div class="ach-t">${a.t}</div><div class="ach-d">${a.d}</div></div>
        <div class="ach-state">${got ? '✓ مكتمل' : v > 0 ? v + '/' + a.need : 'مغلق'}</div>
      </div>`;
    }).join('');
    const c = $('ach-count'); if (c) c.textContent = ACH.count() + '/' + ACHIEVEMENTS.length;
    const ss = $('ach-stars'); if (ss) ss.textContent = BestSave.total();
    const sl = $('ach-launches'); if (sl) sl.textContent = st.stats.launches || 0;
  }
  function check() {
    const fresh = [];
    for (const a of ACHIEVEMENTS) {
      if (store.unlocked[a.id]) continue;
      if ((store.stats[a.stat] || 0) >= a.need) { store.unlocked[a.id] = true; fresh.push(a); }
    }
    if (fresh.length) {
      persist();
      fresh.forEach((a, i) => setTimeout(() => {
        try { toast('🏆 إنجاز جديد: <b>' + a.t + '</b>', 'good'); } catch (e) {}
      }, 650 * i));
    }
    renderAchList();
    return fresh;
  }
  return {
    event(patch) {
      if (!patch) return;
      for (const k of Object.keys(patch)) {
        if (!patch[k]) continue;
        if (k === 'bestStars') store.stats.bestStars = Math.max(store.stats.bestStars || 0, patch[k]);
        else store.stats[k] = (store.stats[k] || 0) + patch[k];
      }
      persist();
      return check();
    },
    state() { return { stats: { ...store.stats }, unlocked: { ...store.unlocked } }; },
    count() { return Object.keys(store.unlocked).length; },
    check, renderAchList,
  };
})();
window.ACH = ACH;
function openAchModal() { ACH.renderAchList(); const m = $('modal-ach'); if (m) m.classList.add('open'); Audio.click(); }

/* ============================================================================
   ترقية المركبة — نظام تقدّم دائم (aerodelta.upgrades.v1)
   العملة: «رصيد العلم» — تُكتسب نقطة مقابل كل نقطة عِلم عند إكمال مهمة
   كل ترقية حقيقية (تدخل في منطق اللعب) ومحدودة بـ ٣ مستويات لكل مسار
   ==========================================================================*/
const UPG_KEY = 'aerodelta.upgrades.v1';
const UPGRADES = [
  { id: 'thrust', icon: '🚀', t: 'محركات التسارع',       d: 'خزان ضغط أكبر — تعبئة إشعال أسرع بـ 30% لكل مستوى',        unit: 'إشعال' },
  { id: 'tank',   icon: '⛽', t: 'خزان المؤكسد والسعة',   d: 'الحد الأقصى للأكسجين والماء والغذاء +10 لكل مستوى (100 ← 130)', unit: 'سعة' },
  { id: 'cargo',  icon: '📦', t: 'سعة الحمولة وموازنتها', d: 'اتساع نطاق «الهبوط المثالي» بـ 0.4 كم من الأسفل لكل مستوى',  unit: 'هبوط' },
];
const UPG_COST = [30, 80, 150];   // تكلفة المستوى ١ ← ٢ ← ٣ لكل مسار
const UPG = (() => {
  let store = { credits: 0, lv: {} };
  try {
    const raw = localStorage.getItem(UPG_KEY);
    if (raw) { const p = JSON.parse(raw); store = { credits: Math.max(0, p.credits | 0), lv: (p && p.lv) || {} }; }
  } catch (e) {}
  function persist() { try { localStorage.setItem(UPG_KEY, JSON.stringify(store)); } catch (e) {} }
  const lvOf = id => Math.min(UPG_COST.length, Math.max(0, store.lv[id] | 0));
  const costOf = id => (lvOf(id) >= UPG_COST.length ? null : UPG_COST[lvOf(id)]);
  return {
    state() { return { credits: store.credits, lv: { ...store.lv } }; },
    lvOf, costOf,
    cap()        { return 100 + 10 * lvOf('tank'); },          // حد الموارد القصوى
    thrustMul()  { return 1 + 0.30 * lvOf('thrust'); },        // مضاعف تعبئة ضغط الإشعال
    perfectLo()  { return 2.2 - 0.4 * lvOf('cargo'); },        // أرضية نطاق الهبوط المثالي
    totalLv()    { return UPGRADES.reduce((a, u) => a + lvOf(u.id), 0); },
    award(points, isWin) {
      const n = Math.max(0, Math.round(points || 0));
      if (!isWin || !n) return 0;
      store.credits += n; persist();
      return n;
    },
    buy(id) {
      const cost = costOf(id);
      if (cost == null) return { ok: false, reason: 'full' };
      if (store.credits < cost) return { ok: false, reason: 'poor' };
      store.credits -= cost;
      store.lv[id] = lvOf(id) + 1;
      persist();
      return { ok: true, cost, lv: store.lv[id] };
    },
    /* للاختبار/التصحيح فقط — تُزال من نسخة التوزيع */
    /* @QA:upg */ _grant(n) { store.credits += (n | 0); persist(); },
  };
})();
window.UPG = UPG;

function renderUpgModal() {
  const st = UPG.state();
  const c = $('upg-credits'); if (c) c.textContent = st.credits;
  const list = $('upg-list'); if (!list) return;
  list.innerHTML = UPGRADES.map(u => {
    const lv = UPG.lvOf(u.id), cost = UPG.costOf(u.id), maxed = cost == null;
    const afford = !maxed && st.credits >= cost;
    const pips = Array.from({ length: UPG_COST.length }, (_, i) =>
      `<span class="upg-pip${i < lv ? ' on' : ''}"></span>`).join('');
    return `<div class="upg-row" role="listitem">
      <div class="ach-ic">${u.icon}</div>
      <div class="upg-body">
        <div class="ach-t">${u.t} <span class="mono" style="font-size:10px;color:var(--dim2)">· ${u.unit}</span></div>
        <div class="ach-d">${u.d}</div>
        <div class="upg-pips" aria-label="المستوى ${lv} من ${UPG_COST.length}">${pips}</div>
      </div>
      <button class="btn sm upg-buy${afford ? '' : ' ghost'}" data-upg="${u.id}" ${afford ? '' : 'disabled'} style="min-width:96px">
        ${maxed ? 'مكتمل ✓' : 'ترقية · ' + cost + ' ⚛'}
      </button>
    </div>`;
  }).join('');
  list.querySelectorAll('[data-upg]').forEach(btn => btn.addEventListener('click', () => {
    const res = UPG.buy(btn.dataset.upg);
    if (res.ok) { Audio.ok(); toast('🚀 تمت الترقية — المستوى <b>' + res.lv + '</b>', 'good'); }
    else if (res.reason === 'poor') { Audio.fail(); toast('رصيد غير كافٍ — أكمل مهمات لتجميع نقاط العِلم', 'bad'); }
    renderUpgModal();
  }));
}
function openUpgModal() { renderUpgModal(); const m = $('modal-upg'); if (m) m.classList.add('open'); Audio.click(); }

/* تجميع حالة المهمة الحالية للحفظ — تُستدعى تلقائيًا مع كل حدث مؤثر */
function saveRun() {
  if (Game.screen !== 'outpost' || !Out.m) return;
  RunSave.write({
    v: 1, mission: Game.mission, sol: Out.sol, hours: Out.hours,
    alloc: { ...Out.alloc }, tasks: { ...Out.tasks },
    o2: Out.o2, h2o: Out.h2o, food: Out.food, dose: [...Out.dose],
    samples: Out.samples, science: Out.science, shelter: !!Out.shelter,
    dust: Out.dust, storm: Out.storm, log: (Out.log || []).slice(0, 14),
    stars: Out.stars | 0, solarDamage: Out.solarDamage || 0,
    harvests: Out.harvests | 0, regolithTotal: Out.regolithTotal | 0,
    evHistory: [...(Out.evHistory || [])], goodCalls: Out.goodCalls | 0, badCalls: Out.badCalls | 0,
    reviewedSol: Out.reviewedSol || 0, resupplyUsed: !!Out.resupplyUsed,
    ice: Out.ice | 0, regolith: Out.regolith | 0, sinterShield: Out.sinterShield || 0,
    isruCount: Out.isruCount | 0,
    isru: { ...(Out.isru || { ice: 0, electrolysis: 0, sinter: 0, moxie: 0 }) },
    visited: { ...(Out.visited || {}) },
    auroraDoneNight: !!Out.auroraDoneNight,
    flags: { ...(Out.flags || {}) },
    cascadeCd: { ...(Out.cascadeCd || {}) },
    sitesTaken: (Out.sites || []).map(x => !!x.taken),
    iceTaken: (Out.iceSites || []).map(x => !!x.taken),
    damage: { ...(Out.damage || {}) },
    arcLeak: Out.arcLeak ? { ...Out.arcLeak } : null,
    arcBattery: Out.arcBattery ? { ...Out.arcBattery } : null,
    crop: { ...(Out.crop || { stage: 2, thirst: 0 }) },
    carry: { ...(Out.carry || { sample: 0, ice: 0 }) },
    player: { x: Out.player.x, y: Out.player.y, facing: Out.player.facing },
    simSpeed: Out.simSpeed || 1,
    dayClockAbs: DayClock.now(),
    quest: Quest.serialize(),
    savedAt: Date.now()
  });
}

/* تطبيق حفظ سابق على حالة Out المُهيأة (تُستدعى بعد outReset) */
function applyRun(s) {
  Out.sol = s.sol || 1;
  Out.hours = s.hours ?? 24;
  Out.alloc = { ...Out.alloc, ...(s.alloc || {}) };
  Out.tasks = { ...Out.tasks, ...(s.tasks || {}) };
  Out.o2 = s.o2 ?? 100; Out.h2o = s.h2o ?? 100; Out.food = s.food ?? 100;
  Out.dose = Array.isArray(s.dose) ? [...s.dose] : [12, 9, 8];
  Out.samples = s.samples | 0; Out.science = s.science | 0; Out.shelter = !!s.shelter;
  Out.dust = s.dust || 0; Out.storm = s.storm || null; Out.log = s.log || [];
  Out.stars = s.stars | 0; Out.solarDamage = s.solarDamage || 0;
  Out.harvests = s.harvests | 0; Out.regolithTotal = s.regolithTotal | 0;
  Out.evHistory = s.evHistory || []; Out.goodCalls = s.goodCalls | 0; Out.badCalls = s.badCalls | 0;
  Out.reviewedSol = s.reviewedSol || 0; Out.resupplyUsed = !!s.resupplyUsed;
  Out.ice = s.ice | 0; Out.regolith = s.regolith | 0; Out.sinterShield = s.sinterShield || 0;
  Out.isruCount = s.isruCount | 0;
  Out.isru = { ice: 0, electrolysis: 0, sinter: 0, moxie: 0, ...(s.isru || {}) };
  Out.visited = { ...(s.visited || {}) };
  Out.auroraDoneNight = !!s.auroraDoneNight;
  Out.flags = { ...(s.flags || {}) };
  Out.cascadeCd = { ...(s.cascadeCd || {}) };
  if (Array.isArray(s.sitesTaken)) (Out.sites || []).forEach((x, i) => { if (i < s.sitesTaken.length) x.taken = !!s.sitesTaken[i]; });
  if (Array.isArray(s.iceTaken)) (Out.iceSites || []).forEach((x, i) => { if (i < s.iceTaken.length) x.taken = !!s.iceTaken[i]; });
  Out.damage = { solar: 0, sci: 0, moxie: 0, green: 0, hab: 0, shield: 0, dish: 0, ...(s.damage || {}) };
  Out.arcLeak = s.arcLeak ? { ...s.arcLeak } : null;
  Out.arcBattery = s.arcBattery ? { ...s.arcBattery } : null;
  Out.crop = { stage: 2, thirst: 0, ...(s.crop || {}) };
  Out.carry = { sample: 0, ice: 0, ...(s.carry || {}) };
  if (s.player) { Out.player.x = s.player.x; Out.player.y = s.player.y; Out.player.facing = s.player.facing || 1; }
  Out.simSpeed = s.simSpeed || 1;
  if (s.dayClockAbs != null && s.savedAt) DayClock.mount(s.dayClockAbs + (Date.now() - s.savedAt) / 60000);
  else DayClock.mount(5.67);
  pendingQuestRestore = s.quest || null;
  /* حزام أمان: مهمة «الاستغلال المحلي» تتبع عداد ISRU حتى لو تفرقت الحالتان */
  if (pendingQuestRestore && Array.isArray(pendingQuestRestore.items)) {
    const it = pendingQuestRestore.items.find(q => q.id === 'isru');
    if (it) it.cur = Math.max(it.cur | 0, Out.isruCount | 0);
  }
}

/* استئناف مهمة محفوظة — تُستدعى من زر الاستئناف في HQ أو تلقائيًا عند الدخول */
function tryResumeRun() {
  const s = RunSave.read();
  if (!s || !s.mission) return false;
  Game.mission = s.mission;
  Out.m = MISSIONS.find(x => x.id === s.mission);
  if (!Out.m) return false;
  outReset();                     // يبني العالم من الصفر ثم نحمّل الديناميكية فوقه
  applyRun(s);
  return true;
}
window.addEventListener('beforeunload', () => { try { saveRun(); } catch (e) {} });

/* مشاركة نتيجة المهمة — Web Share API مع نسخ احتياطي */
async function copyText(t) {
  if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(t);
  const ta = document.createElement('textarea');
  ta.value = t; ta.style.cssText = 'position:fixed;opacity:0;top:0';
  document.body.appendChild(ta); ta.select();
  let ok = false; try { ok = document.execCommand('copy'); } catch (e) {}
  ta.remove();
  if (!ok) throw new Error('copy unsupported');
}
function shareResult() {
  const r = Game.result || {};
  const m = MISSIONS.find(x => x.id === r.mission);
  const starsEl = document.querySelector('#res-stars');
  const stars = starsEl ? (+(starsEl.dataset.stars || 0)) : 0;
  const won = r.reason === 'complete';
  const text = `ZATHURA — ${won ? 'أكملت' : 'شاركت في'} مهمة «${m ? m.name : ''}» بـ${stars}★ (${r.sols || 0} Sol) · NASA Space Apps Challenge 2026`;
  if (navigator.share) {
    navigator.share({ title: 'ZATHURA', text }).catch(() => {});
    return;
  }
  copyText(text).then(
    () => toast('اتنسخت نتيجتك — الصقها في أي منصة 🚀', 'good'),
    () => toast('المتصفح منع النسخ — اكتبها بإيدك: ' + text, 'warn', 9000)
  );
}

/* --------------------------------------------------------------- AUDIO */
/* كل الأصوات مولّدة بـWebAudio — مفيش ملفات خارجية */
const Audio = (() => {
  let ctx = null;
  function ensure() {
    if (ctx) return ctx;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    } catch (e) { ctx = null; }
    return ctx;
  }
  function canPlay() {
    return Game.settings.sound && !Game.settings.muted && ctx;
  }
  function resume() {
    const c = ensure();
    if (c && c.state === 'suspended') c.resume();
  }
  function tone({ freq = 440, type = 'sine', dur = 0.18, gain = 0.16, slideTo = null, delay = 0 }) {
    const c = ensure(); if (!c || !canPlay()) return;
    const t0 = c.currentTime + delay;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(gain * Game.settings.volume, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g); g.connect(c.destination);
    osc.start(t0); osc.stop(t0 + dur + 0.03);
  }
  /* موسيقى القائمة/الغلاف الجوي — توليد حي، بلا ملفات خارجية */
  let amb = null;
  function ambientStart() {
    const c = ensure(); if (!c || amb) return;
    const master = c.createGain(); master.gain.value = 0;
    master.gain.linearRampToValueAtTime(0.055 * Game.settings.volume, c.currentTime + 2.8);
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 640; lp.Q.value = 0.7;
    const mk = (type, f, g) => { const o = c.createOscillator(); o.type = type; o.frequency.value = f; const og = c.createGain(); og.gain.value = g; o.connect(og); og.connect(lp); o.start(); return o; };
    mk('triangle', 110.0, 0.5);    // A2
    mk('sine',     164.81, 0.38);  // E3
    mk('triangle', 220.0, 0.3);    // A3
    mk('sine',     277.18, 0.18);  // C#4 — لون A maj add9
    const lfo = c.createOscillator(); lfo.frequency.value = 0.07;
    const lfoG = c.createGain(); lfoG.gain.value = 260;
    lfo.connect(lfoG); lfoG.connect(lp.frequency); lfo.start();
    lp.connect(master); master.connect(c.destination);
    amb = { master };
  }
  function ambientLevel() {
    if (!amb) return;
    const target = (Game.settings.sound && !Game.settings.muted) ? 0.055 * Game.settings.volume : 0;
    try { amb.master.gain.setTargetAtTime(target, ensure().currentTime, 0.4); } catch (e) {}
  }

  function noise({ dur = 0.3, gain = 0.1, filter = 800, delay = 0 }) {
    const c = ensure(); if (!c || !canPlay()) return;
    const t0 = c.currentTime + delay;
    const n = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, n, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = c.createBufferSource(); src.buffer = buf;
    const bp = c.createBiquadFilter(); bp.type = 'lowpass'; bp.frequency.value = filter;
    const g = c.createGain(); g.gain.value = gain * Game.settings.volume;
    src.connect(bp); bp.connect(g); g.connect(c.destination);
    src.start(t0);
  }

  /* رياح السطح — توليد حي متواصل للقاعدة (ضوضاء بنية + bandpass يتنفس) */
  let wind = null;
  function windStart() {
    const c = ensure(); if (!c || wind) return;
    const master = c.createGain(); master.gain.value = 0;
    master.gain.setTargetAtTime(0.05 * Game.settings.volume, c.currentTime, 1.4);
    const buf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = last * 3.4; }
    const src = c.createBufferSource(); src.buffer = buf; src.loop = true;
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 470; bp.Q.value = 0.6;
    const lfo = c.createOscillator(); lfo.frequency.value = 0.09;
    const lfoG = c.createGain(); lfoG.gain.value = 230;
    lfo.connect(lfoG); lfoG.connect(bp.frequency); lfo.start();
    src.connect(bp); bp.connect(master); master.connect(c.destination);
    src.start();
    wind = { master, src, lfo };
  }
  function windStop() {
    if (!wind) return;
    try {
      const w = wind; wind = null;
      w.master.gain.setTargetAtTime(0, ensure().currentTime, 0.4);
      setTimeout(() => { try { w.src.stop(); w.lfo.stop(); } catch (e) {} }, 1200);
    } catch (e) { wind = null; }
  }
  function windLevel() {
    if (wind) { try { wind.master.gain.setTargetAtTime((Game.settings.sound && !Game.settings.muted) ? 0.05 * Game.settings.volume : 0, ensure().currentTime, 0.3); } catch (e) {} }
  }

  return {
    resume,
    ambient: ambientStart,
    ambientLevel,
    ambientWind: windStart,
    ambientWindStop: windStop,
    ambientWindLevel: windLevel,
    click:   () => tone({ freq: 620, type: 'square', dur: .06, gain: .05 }),
    hover:   () => tone({ freq: 860, type: 'sine', dur: .04, gain: .022 }),
    ok:      () => { tone({ freq: 660, dur: .1, gain: .1 }); tone({ freq: 990, dur: .14, gain: .09, delay: .1 }); },
    fail:    () => { tone({ freq: 220, type: 'sawtooth', dur: .22, gain: .1 }); tone({ freq: 160, type: 'sawtooth', dur: .3, gain: .09, delay: .16 }); },
    alarm:   () => {
      for (let i = 0; i < 4; i++) tone({ freq: i % 2 ? 880 : 660, type: 'square', dur: .13, gain: .11, delay: i * .15 });
    },
    critical: () => {
      for (let i = 0; i < 5; i++) tone({ freq: i % 2 ? 1040 : 520, type: 'sawtooth', dur: .12, gain: .09, delay: i * .11 });
      noise({ dur: .5, gain: .07, filter: 500 });
    },
    countdown: () => tone({ freq: 440, type: 'sine', dur: .16, gain: .1 }),
    go:      () => { tone({ freq: 880, dur: .18, gain: .14 }); tone({ freq: 1320, dur: .34, gain: .1, delay: .18 }); },
    rumble:  () => { noise({ dur: 2.6, gain: .16, filter: 320 }); },
    whoosh:  () => { noise({ dur: 1.1, gain: .1, filter: 900 }); },
    boot:    () => { tone({ freq: 380, dur: .1, gain: .07 }); tone({ freq: 570, dur: .14, gain: .06, delay: .1 }); tone({ freq: 760, dur: .2, gain: .06, delay: .22 }); },
    tick:    () => tone({ freq: 1200, type: 'square', dur: .025, gain: .03 }),
    splash:  () => { noise({ dur: .35, gain: .09, filter: 1200 }); tone({ freq: 300, slideTo: 120, dur: .3, gain: .07 }); },
    quest:   () => { tone({ freq: 784, type: 'sine', dur: .12, gain: .11 }); tone({ freq: 1175, type: 'sine', dur: .2, gain: .11, delay: .09 }); tone({ freq: 1568, type: 'sine', dur: .3, gain: .08, delay: .2 }); },
    questPop: () => tone({ freq: 1046, type: 'sine', dur: .09, gain: .09 })
  };
})();

/* ------------------------------------------------------------- TOASTS */
function toast(html, kind = '', ttl = 5200) {
  const host = document.getElementById('toasts');
  if (!host) return;
  const d = document.createElement('div');
  d.className = 'toast ' + kind;
  d.innerHTML = html;
  host.appendChild(d);
  while (host.children.length > 3) host.removeChild(host.firstChild);
  setTimeout(() => { d.classList.add('out'); }, ttl - 400);
  setTimeout(() => d.remove(), ttl);
}

/* ------------------------------------------------------- SCREEN ROUTER */
const SCREENS = {};
function registerScreen(name, { mount, unmount, update } = {}) {
  SCREENS[name] = { mount, unmount, update, el: null };
}
function go(name, opts = {}) {
  document.querySelectorAll('.modal.open').forEach(m => m.classList.remove('open'));   // navigation dismisses overlays
  const prev = SCREENS[Game.screen];
  if (prev) {
    if (prev.el) prev.el.classList.remove('active', 'fade-in');
    if (prev.unmount) { try { prev.unmount(); } catch (e) { console.error('[unmount ' + Game.screen + ']', e); } }
  }
  const next = SCREENS[name];
  if (!next) { console.error('screen not found:', name); return; }
  Game.history.push(Game.screen);
  Game.screen = name;
  next.el = document.getElementById('screen-' + name);
  if (!next.el) { console.error('element missing for', name); return; }
  next.el.classList.add('active');
  requestAnimationFrame(() => next.el && next.el.classList.add('fade-in'));
  if (next.mount) { try { next.mount(opts); } catch (e) { console.error('[mount ' + name + ']', e); } }
  document.body.dataset.screen = name;
}

/* ----------------------------------------------------------- UTILITIES */
const $ = (id) => document.getElementById(id);
const qs = (sel) => document.querySelector(sel);
const qsa = (sel) => [...document.querySelectorAll(sel)];
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const fmt = (n, d = 0) => Number(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
const pct = (v) => Math.round(clamp(v, 0, 100)) + '%';
function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
}
function svgIcon(name, size = 18, color = 'currentColor') {
  const P = {
    sound:   'M11 5L6 9H3v6h3l5 4V5z M16 9a4 4 0 010 6',
    mute:    'M11 5L6 9H3v6h3l5 4V5z M17 9l4 6 M21 9l-4 6',
    data:    'M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3z M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6 M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3',
    settings:'M12 15a3 3 0 100-6 3 3 0 000 6z M19.4 15a1.6 1.6 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.6 1.6 0 00-1.8-.3 1.6 1.6 0 00-1 1.5V21a2 2 0 11-4 0v-.1A1.6 1.6 0 008 19.4a1.6 1.6 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.6 1.6 0 00.3-1.8 1.6 1.6 0 00-1.5-1H2a2 2 0 110-4h.1A1.6 1.6 0 004.6 8a1.6 1.6 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.6 1.6 0 001.8.3H9a1.6 1.6 0 001-1.5V2a2 2 0 114 0v.1a1.6 1.6 0 001 1.5 1.6 1.6 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.6 1.6 0 00-.3 1.8V9a1.6 1.6 0 001.5 1H22a2 2 0 110 4h-.1a1.6 1.6 0 00-1.5 1z',
    close:   'M18 6L6 18M6 6l12 12',
    back:    'M19 12H5M12 19l-7-7 7-7',
    arrow:   'M5 12h14M12 5l7 7-7 7',
    play:    'M6 4l14 8-14 8V4z',
    pause:   'M8 5v14M16 5v14',
    menu:    'M4 6h16M4 12h16M4 18h16',
    external:'M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3',
    check:   'M20 6L9 17l-5-5',
    info:    'M12 16v-4M12 8h.01M12 22a10 10 0 100-20 10 10 0 000 20z'
  };
  const d = P[name] || P.close;
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}"
    stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex:0 0 auto">
    <path d="${d}"/></svg>`;
}

/* --------------------------------------------------- TOP HUD BUILDER */
function buildHUD() {
  const hud = el('div', 'hud');
  hud.id = 'hud';
  hud.innerHTML = `
    <div class="brand" aria-label="ZATHURA — البداية">
      <span class="mark" aria-hidden="true"><svg width="19" height="19" viewBox="0 0 24 24" fill="none"><path d="M12 2l2.4 6.4L21 11l-6.6 2.6L12 20l-2.4-6.4L3 11l6.6-2.6L12 2z" stroke="#05101f" stroke-width="1.7" stroke-linejoin="round" fill="#05101f" fill-opacity=".25"/></svg></span>
      <span class="brand-txt">ZAT<b>H</b>URA<span class="tag">SPACE AGENCY</span></span>
    </div>
    <a class="nasa-chip" href="https://www.spaceappschallenge.org/2026/challenges/junior-astronaut-mission-trainer/?tab=resources" target="_blank" rel="noopener" aria-label="NASA Space Apps 2026 — Junior Astronaut Mission Trainer">
      <span class="plate">NASA</span>
      <span class="lbl">SPACE APPS 2026<small>JUNIOR ASTRONAUT MISSION TRAINER</small></span>
    </a>
    <span class="pill" id="hud-data"><span class="dot"></span><span id="hud-data-txt">—</span></span>
    <div class="spacer"></div>
    <a class="hub-back" href="index.html" aria-label="العودة إلى بوابة ZATHURA"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 2l2.4 6.4L21 11l-6.6 2.6L12 20l-2.4-6.4L3 11l6.6-2.6L12 2z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg><span class="hub-back-txt">⇦ بوابة ZATHURA</span></a>
    <button class="icon-btn" id="btn-home" title="القائمة الرئيسية" aria-label="القائمة الرئيسية" style="border-color:rgba(77,217,255,.4);color:#8fe4ff">${svgIcon('menu', 17)}</button>
    <button class="icon-btn" id="btn-data" title="NASA DATA SOURCES">${svgIcon('data', 17)}</button>
    <button class="icon-btn" id="btn-sound" title="الصوت">${svgIcon('sound', 17)}</button>
    <button class="icon-btn" id="btn-settings" title="الإعدادات">${svgIcon('settings', 17)}</button>
  `;
  return hud;
}

/* --------------------------------------------------------- DATA MODE */
function setDataMode(mode, detail = '') {
  Game.dataMode = mode;
  const txt = $('hud-data-txt');
  const wrap = $('hud-data');
  if (!txt || !wrap) return;
  wrap.className = 'pill ' + (mode === 'LIVE' ? 'live' : mode === 'CACHED' ? 'cached' : 'bad');
  txt.innerHTML = mode === 'LIVE'
    ? `<b>LIVE</b> · DONKI الآن`
    : mode === 'CACHED'
      ? `<b>ARCHIVED</b> · DONKI`
      : `<b>OFFLINE</b> · سيم فقط`;
  wrap.title = detail || 'مصدر بيانات الطقس الفضائي';
}

/* ------------------------------------------------------ MODAL SYSTEM */
function openSourcesModal() {
  const m = $('modal-sources');
  if (!m) return;
  renderSourcesInto(m.querySelector('.src-body'));
  m.classList.add('open');
  Audio.click();
}
function closeModal(id) {
  const m = $(id);
  if (m) m.classList.remove('open');
}
function renderSourcesInto(host) {
  if (!host) return;
  const groups = [
    { t: 'الطقس الفضائي والإشعاع', ids: ['donki_catalog', 'donki_sep', 'donki_may2024', 'radlab'] },
    { t: 'البيئة الكوكبية', ids: ['rad_surface', 'rad_cruise', 'rems', 'artemis', 'mars_program', 'planetary'] },
    { t: 'صحة الطاقم ودعم الحياة', ids: ['crew_limit', 'storm_limit', 'eclss_o2', 'bvad_water', 'bvad_food', 'water_recovery', 'moxie', 'osdr'] },
    { t: 'كوكب زويل — الوجهة الخيالية في اللعبة', ids: ['sharad_ice', 'ice_moon', 'isru_program', 'moxie'] }
  ];
  host.innerHTML = groups.map(g => `
    <div class="h3" style="margin:18px 0 10px;color:var(--cyan);font-size:13px;letter-spacing:1px">${g.t}</div>
    ${g.ids.map(id => {
      const s = SOURCES[id]; if (!s) return '';
      const badge = s.kind === 'real'
        ? `<span class="pill live" style="font-size:9.5px;padding:2px 8px">بيانات NASA</span>`
        : `<span class="pill cached" style="font-size:9.5px;padding:2px 8px">تقدير اللعبة</span>`;
      return `<div class="src-item">
        <div class="row" style="justify-content:space-between;align-items:flex-start;gap:8px">
          <a href="${s.url}" target="_blank" rel="noopener noreferrer">${s.label}</a>
          ${badge}
        </div>
        <div class="sd">${s.desc}</div>
        ${s.value && s.value !== '—' ? `<div class="sv">${s.value}</div>` : ''}
      </div>`;
    }).join('')}
  `).join('') + `
    <div class="card tight" style="margin-top:16px;border-color:rgba(255,179,71,.35);background:rgba(255,179,71,.06)">
      <div style="font-size:12px;line-height:1.85;color:#ffd9a8">
        <b>قاعدة الصدق:</b> كل رقم في اللعبة إما قياس NASA حقيقي (بمصدره) أو تقدير لعب
        معلَّم بكلمة <b>«تقدير اللعبة»</b>. مفيش رقم مخترع بيتم تقديمه كقياس.
        لو الـAPI مش متاح، اللعبة بتشتغل على أرشيف محفوظ وبتعلنه على الشاشة
        (<b>LIVE / ARCHIVED / OFFLINE</b>).
      </div>
    </div>
    <div class="sub" style="margin-top:12px;font-size:11px;color:var(--dim2)">
      دونكي بيانات بحثية أولية (prototyping quality) حسب سياسة CCMC.
      NOAA SWPC هو المصدر الرسمي للتنبؤات. هذه اللعبة مش منتج رسمي من NASA.
    </div>`;
}

function openSettingsModal() {
  const m = $('modal-settings');
  if (!m) return;
  syncSettingsUI();
  m.classList.add('open');
  Audio.click();
}
function syncSettingsUI() {
  const s = Game.settings;
  const st = $('set-sound'); if (st) st.checked = s.sound;
  const rd = $('set-motion'); if (rd) rd.checked = s.reduceMotion;
  const vol = $('set-vol'); if (vol) vol.value = Math.round(s.volume * 100);
  const vt = $('set-vol-txt'); if (vt) vt.textContent = Math.round(s.volume * 100) + '%';
  const bt = $('btn-sound');
  if (bt) bt.innerHTML = svgIcon(s.sound && !s.muted ? 'sound' : 'mute', 17);
  const gfx = $('set-gfx'); if (gfx) gfx.value = Game.settings.lowGfx ? '1' : '0';
  const gtxt = $('set-gfx-txt'); if (gtxt) gtxt.textContent = Game.settings.lowGfx ? 'موفّرة' : 'عالية';
  const btx = $('set-text'); if (btx) btx.checked = !!Game.settings.bigText;
}

/* --------------------------------------------------------- BOOTSTRAP */
function bootGame() {
  loadSettings();
  applyBigText();

  // HUD
  const app = $('app');
  const hud = buildHUD();
  app.insertBefore(hud, app.firstChild);

  // wire HUD buttons
  $('btn-data').addEventListener('click', openSourcesModal);
  $('btn-settings').addEventListener('click', openSettingsModal);
  $('btn-home').addEventListener('click', () => {
    Audio.click();
    if (Game.screen === 'hq') return;   // إنت أصلًا في القائمة الرئيسية
    const m = $('modal-menu');
    if (m) m.classList.add('open');
  });
  const resumeBtn = $('menu-resume');
  if (resumeBtn) resumeBtn.addEventListener('click', () => { $('modal-menu').classList.remove('open'); Audio.click(); });
  const quitBtn = $('menu-quit');
  if (quitBtn) quitBtn.addEventListener('click', () => { $('modal-menu').classList.remove('open'); Audio.ok(); go('hq'); });
  $('btn-sound').addEventListener('click', () => {
    Game.settings.sound = !Game.settings.sound;
    saveSettings(); syncSettingsUI(); Audio.ambientLevel();
    if (Game.settings.sound) Audio.ok();
  });

  // modals close
  qsa('[data-close]').forEach(b => b.addEventListener('click', () => closeModal(b.dataset.close)));
  qsa('.modal').forEach(m => m.addEventListener('click', (e) => { if (e.target === m) m.classList.remove('open'); }));

  // settings wiring
  const st = $('set-sound');
  if (st) st.addEventListener('change', () => { Game.settings.sound = st.checked; saveSettings(); syncSettingsUI(); Audio.ambientLevel(); Audio.ambientWindLevel && Audio.ambientWindLevel(); Audio.ok(); });
  const rd = $('set-motion');
  if (rd) rd.addEventListener('change', () => { Game.settings.reduceMotion = rd.checked; saveSettings(); });
  const vol = $('set-vol');
  if (vol) vol.addEventListener('input', () => {
    Game.settings.volume = vol.value / 100; saveSettings(); syncSettingsUI(); Audio.tick(); Audio.ambientLevel();
  });
  const gfx = $('set-gfx');
  if (gfx) gfx.addEventListener('input', () => {
    Game.settings.lowGfx = gfx.value === '1'; saveSettings(); syncSettingsUI();
    const gtxt = $('set-gfx-txt'); if (gtxt) gtxt.textContent = Game.settings.lowGfx ? 'موفّرة' : 'عالية';
  });
  const btx = $('set-text');
  if (btx) btx.addEventListener('change', () => { Game.settings.bigText = btx.checked; saveSettings(); applyBigText(); Audio.click(); });
  const fsBtn = $('set-fullscreen');
  if (fsBtn) fsBtn.addEventListener('click', () => { Audio.click(); toggleFullscreen(); });
  const hqAch = $('hq-ach');
  if (hqAch) hqAch.addEventListener('click', openAchModal);
  const exitAgain = $('exit-again');
  if (exitAgain) exitAgain.addEventListener('click', () => location.reload());
  ACH.renderAchList();

  // unlock audio on first gesture
  const unlock = () => { Audio.resume(); Audio.ambient(); window.removeEventListener('pointerdown', unlock); window.removeEventListener('keydown', unlock); };
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);

  // ESC closes modals
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') qsa('.modal.open').forEach(m => m.classList.remove('open'));
  });

  syncSettingsUI();
  setDataMode('CACHED', 'أرشيف DONKI (مايو 2024) — مرجع مشروع APPS 2026');

  // start
  go('intro');
}
