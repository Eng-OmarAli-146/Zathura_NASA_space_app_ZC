#!/usr/bin/env node
/* ============================================================================
   build.js — يجمع src/ في ملف واحد شغّال (index.html)
   الهدف: يشتغل في معاينة sandboxed (مفيش شبكة) + لوحة المفاتيح + أوفلاين
   Usage: node build.js
   ==========================================================================*/
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, 'src');
const OUT = path.join(__dirname, 'play', 'game1.html');

/* ----------------------------------------------------------------------------
   QA hooks (window.__completeAll, Board, Return.skipTo, _grant …) live in src/
   between the @QA-BEGIN and @QA-END marker comments, so they stay available
   while developing but never ship to players.

   Default build  → QA blocks removed   (this is the file we commit & serve)
   --dev          → QA blocks kept      (local debugging only)
   -------------------------------------------------------------------------- */
const DEV = process.argv.includes('--dev');
const QA_BEGIN = '/* @QA-BEGIN */';
const QA_END = '/* @QA-END */';

function stripQA(source) {
  const out = [];
  let inside = false;
  for (const line of source.split('\n')) {
    const t = line.trim();
    if (t === QA_BEGIN) { inside = true; continue; }
    if (t === QA_END) { inside = false; continue; }
    if (inside && !DEV) continue;
    out.push(line);
  }
  return out.join('\n');
}

const JS_ORDER = [
  'missiondata.js',
  'core.js',
  'render.js',
  'quests.js',
  'screens_intro.js',
  'screens_hq.js',
  'screens_launch.js',
  'screens_outpost.js',
  'screens_return.js',
  'screens_result.js'
];

function read(f) {
  const p = path.join(SRC, f);
  if (!fs.existsSync(p)) throw new Error('missing src file: ' + f);
  return fs.readFileSync(p, 'utf8');
}

const css = read('styles.css');
const js = JS_ORDER.map(f => `\n/* ══════════════════ ${f} ══════════════════ */\n` + read(f)).join('\n');

// حماية: لو ظهر </script> جوه الكود يكسر الحقن
const safeJs = stripQA(js).replace(/<\/script>/gi, '<\\/script>');

const html = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#05070c">
<title>ZATHURA — مدرّب مهمّات رائد الفضاء</title>
<link rel="icon" type="image/png" href="data:image/png;base64,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">
<meta name="description" content="ZATHURA — لعبة تعليمية لإدارة قاعدة فضائية — مشروع NASA Space Apps Challenge 2026. محاكاة موارد واقعية على المريخ والقمر والوجهات الجديدة، للأعمار ٧–١٢.">
<style>${css}</style>
</head>
<body>
<div id="app">

  <!-- ============================ SCREENS ============================ -->
  <section class="screen" id="screen-intro"></section>
  <section class="screen" id="screen-hq"></section>
  <section class="screen" id="screen-destinations"></section>
  <section class="screen" id="screen-craft"></section>
  <section class="screen" id="screen-boarding"></section>
  <section class="screen" id="screen-launch"></section>
  <section class="screen" id="screen-outpost"></section>
  <section class="screen" id="screen-return"></section>
  <section class="screen" id="screen-result"></section>

  <!-- ============================ MODALS ============================ -->
  <div class="modal" id="modal-sources" role="dialog" aria-modal="true" aria-label="NASA Data Sources">
    <div class="modal-card">
      <div class="row" style="justify-content:space-between;align-items:flex-start;margin-bottom:6px">
        <div>
          <div class="eyebrow" style="font-size:9.5px">SOURCE ATTRIBUTION</div>
          <div class="h2" style="margin-top:8px;font-size:22px">NASA Data Sources</div>
        </div>
        <button class="icon-btn" data-close="modal-sources" aria-label="إغلاق">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>
      <div class="sub" style="font-size:12px;margin-bottom:6px">
        المصادر الرسمية المستخدمة في هذه التجربة. كل رابط بيوصل لصفحة NASA الأصلية.
      </div>
      <div class="src-body"></div>
    </div>
  </div>


  <div class="modal" id="modal-menu" role="dialog" aria-modal="true" aria-label="القائمة الرئيسية">
    <div class="modal-card" style="width:min(440px,100%);text-align:center">
      <img src="data:image/jpeg;base64,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" alt="ZATHURA" width="96" height="96" style="border-radius:22%;margin:2px auto 14px;display:block;box-shadow:0 10px 40px rgba(77,217,255,.25)">
      <div class="eyebrow" style="font-size:9.5px">ZATHURA · MAIN MENU</div>
      <div class="h2" style="margin:10px 0 6px;font-size:22px">القائمة الرئيسية</div>
      <p style="font-size:12px;line-height:1.8;color:var(--dim);margin:0 0 16px">تقدّم المهمة الحالية محفوظ في الذاكرة — رجوعك للرئيسية مش بيمسحه.<br><span style="color:var(--dim2)">(تحديث الصفحة بيمسح المهمة الجارية — خلص المهمة الأول!)</span></p>
      <div style="display:flex;gap:10px">
        <button class="btn wide" id="menu-resume" style="flex:1">استئناف المهمة</button>
        <button class="btn ghost wide" id="menu-quit" style="flex:1;color:#ffb3bb;border-color:rgba(255,95,109,.4)">رجوع للرئيسية</button>
      </div>
    </div>
  </div>
  <div class="modal" id="modal-howto" role="dialog" aria-modal="true" aria-label="كيف تلعب">
    <div class="modal-card" style="width:min(560px,100%)">
      <div class="row" style="justify-content:space-between;align-items:flex-start;margin-bottom:14px">
        <div>
          <div class="eyebrow" style="font-size:9.5px">HOW TO PLAY</div>
          <div class="h2" style="margin-top:8px;font-size:22px">كيف تلعب 🚀</div>
        </div>
        <button class="icon-btn" data-close="modal-howto" aria-label="إغلاق">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>
      <div style="font-size:12.5px;line-height:2.05;color:#b8c6dd">
        <p style="margin:0 0 10px"><b style="color:var(--cyan)">🎯 مهمتك:</b> تبني قاعدة فضائية وتعيش فيها و<b>تنجح بالرجوع للأرض</b> بطلًا! مفيش حد هينجحك — قراراتك هي اللي بتفرق.</p>
        <div style="display:grid;gap:8px">
          <div class="card tight" style="padding:10px 12px"><b style="color:var(--amber)">١. قبل الإقلاع 🚀</b> — اختار كوكبك، وافحص المركبة مع أرضي، وبعدين دوس <b>START</b> مطوّلًا لحد ما ينفجر الصاروخ!</div>
          <div class="card tight" style="padding:10px 12px"><b style="color:var(--amber)">٢. كل يوم ☀️</b> — وزّع طاقة النهار على: الأكل، الزرع، العلم، الدرع، والدفء. الشمس بتنفع بس في النهار — بالليل المفاجآت!</div>
          <div class="card tight" style="padding:10px 12px"><b style="color:var(--amber)">٣. فتّش واجمع 🔍</b> — امشِ بالأسهم أو WASD، واضغط <b>E</b> جنب أي حاجة عشان تتعامل معاها. الإشعاع بيتراكم — الدرع صاحبك!</div>
          <div class="card tight" style="padding:10px 12px"><b style="color:var(--amber)">٤. ثلج = نجاة 💧</b> — احفر الثلج وحوله لماء وأكسجين للتنفس — متعتمدش على شحن الأرض!</div>
          <div class="card tight" style="padding:10px 12px"><b style="color:var(--amber)">٥. الرجوع للبيت 🌍</b> — لما تخلص مهامك، أقلع واضبط المسار، وعدّي الخطرين، وانزل بالمظلة <b>بين 2.2 و4.5 كم</b>!</div>
        </div>
        <p style="margin:12px 0 0;font-size:11px;color:var(--dim2)">Esc يقفل أي شاشة · <b>Space مطوّل = إحراق</b> · زويل كوكب خيالي — الشفق الليلي بتاعه بيضيء الثلج ✦</p>
      </div>
      <button class="btn wide" style="margin-top:16px" data-close="modal-howto">فهمت — يلا بينا! 🚀</button>
    </div>
  </div>

  <div class="modal" id="modal-ach" role="dialog" aria-modal="true" aria-label="الإنجازات">
    <div class="modal-card" style="width:min(560px,100%)">
      <div class="row" style="justify-content:space-between;align-items:flex-start;margin-bottom:6px">
        <div>
          <div class="eyebrow" style="font-size:9.5px">PLAYER PROGRESS</div>
          <div class="h2" style="margin-top:8px;font-size:22px">🏆 الإنجازات</div>
        </div>
        <button class="icon-btn" data-close="modal-ach" aria-label="إغلاق">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>
      <div class="row gap8" style="margin:4px 0 14px">
        <span class="pill ok" style="font-size:10.5px"><b id="ach-count">0/8</b> إنجاز</span>
        <span class="pill" style="font-size:10.5px"><b id="ach-stars">0</b> ★ أفضل النجوم</span>
        <span class="pill" style="font-size:10.5px"><b id="ach-launches">0</b> إقلاع</span>
      </div>
      <div id="ach-list" style="display:grid;gap:8px;max-height:52vh;overflow-y:auto;padding-inline-end:4px"></div>
      <button class="btn wide" style="margin-top:16px" data-close="modal-ach">تم</button>
    </div>
  </div>

  <div class="modal" id="modal-upg" role="dialog" aria-modal="true" aria-label="ترقية المركبة">
    <div class="modal-card" style="width:min(560px,100%)">
      <div class="row" style="justify-content:space-between;align-items:flex-start;margin-bottom:6px">
        <div>
          <div class="eyebrow" style="font-size:9.5px">VEHICLE UPGRADES</div>
          <div class="h2" style="margin-top:8px;font-size:22px">🚀 ترقية المركبة</div>
        </div>
        <button class="icon-btn" data-close="modal-upg" aria-label="إغلاق">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>
      <div class="row gap8" style="margin:4px 0 12px">
        <span class="pill ok" style="font-size:10.5px"><b id="upg-credits">0</b> ⚛ رصيد العلم</span>
        <span class="pill" style="font-size:10px">نقطة عِلم = ⚛ عند إكمال مهمة</span>
      </div>
      <p class="sub" style="font-size:11px;margin:0 0 12px">الترقيات دائمة وتنطبق من المهمة القادمة. ثلاثة مستويات لكل مسار — لا شيء هنا بلا أثر حقيقي على اللعب.</p>
      <div id="upg-list" style="display:grid;gap:8px;max-height:52vh;overflow-y:auto;padding-inline-end:4px"></div>
      <button class="btn wide" style="margin-top:16px" data-close="modal-upg">تم</button>
    </div>
  </div>

  <div id="exit-overlay" aria-hidden="true" style="position:fixed;inset:0;z-index:200;display:none;place-items:center;background:radial-gradient(ellipse at 50% 40%,#0a1220,#02040a 75%);text-align:center">
    <div>
      <div class="mono" style="font-size:10px;letter-spacing:6px;color:#5f8db8">SESSION ENDED</div>
      <div class="h1" style="margin:14px 0 8px;font-size:clamp(26px,4.6vw,44px)">شكرًا للعب <span style="color:var(--cyan)">ZATHURA</span></div>
      <p class="sub" style="font-size:12.5px">تقدمك محفوظ محليًا على هذا الجهاز — يمكنك إغلاق التبويب الآن.</p>
      <button class="btn" id="exit-again" style="margin-top:20px">↻ العب مرة أخرى</button>
    </div>
  </div>

  <div class="modal" id="modal-settings" role="dialog" aria-modal="true" aria-label="الإعدادات">
    <div class="modal-card" style="width:min(520px,100%)">
      <div class="row" style="justify-content:space-between;align-items:flex-start;margin-bottom:18px">
        <div>
          <div class="eyebrow" style="font-size:9.5px">OPTIONS</div>
          <div class="h2" style="margin-top:8px;font-size:22px">الإعدادات</div>
        </div>
        <button class="icon-btn" data-close="modal-settings" aria-label="إغلاق">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>

      <div class="stat" style="padding:14px 0">
        <span class="k">🔊 المؤثرات الصوتية</span>
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
          <input type="checkbox" id="set-sound" style="width:18px;height:18px;accent-color:#4dd9ff;cursor:pointer">
          <span style="font-size:11.5px;color:var(--dim)">تشغيل</span>
        </label>
      </div>

      <div style="padding:14px 0;border-bottom:1px solid rgba(255,255,255,.06)">
        <div class="row" style="justify-content:space-between;margin-bottom:8px">
          <span class="k" style="font-size:12.5px;color:var(--dim)">🔉 مستوى الصوت</span>
          <span class="mono" id="set-vol-txt" style="font-size:12px;color:var(--cyan)">55%</span>
        </div>
        <input type="range" id="set-vol" min="0" max="100" value="55"
          style="width:100%;-webkit-appearance:none;appearance:none;height:6px;border-radius:9px;
            background:rgba(255,255,255,.12);accent-color:#4dd9ff;outline:none">
      </div>

      <div class="stat" style="padding:14px 0">
        <span class="k">🎬 تقليل الحركة</span>
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
          <input type="checkbox" id="set-motion" style="width:18px;height:18px;accent-color:#4dd9ff;cursor:pointer">
          <span style="font-size:11.5px;color:var(--dim)">للأجهزة الضعيفة</span>
        </label>
      </div>

      <div style="padding:14px 0;border-top:1px solid rgba(255,255,255,.06)">
        <div class="row" style="justify-content:space-between;margin-bottom:8px">
          <span class="k" style="font-size:12.5px;color:var(--dim)">🖼️ جودة الرسوم</span>
          <span class="mono" id="set-gfx-txt" style="font-size:12px;color:var(--cyan)">عالية</span>
        </div>
        <input type="range" id="set-gfx" min="0" max="1" step="1" value="0"
          style="width:100%;-webkit-appearance:none;appearance:none;height:6px;border-radius:9px;
            background:rgba(255,255,255,.12);accent-color:#4dd9ff;outline:none">
      </div>

      <div class="stat" style="padding:14px 0">
        <span class="k">🔍 خط أكبر (قراءة أوضح)</span>
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
          <input type="checkbox" id="set-text" style="width:18px;height:18px;accent-color:#4dd9ff;cursor:pointer">
          <span style="font-size:11.5px;color:var(--dim)">يكبّر كل النصوص</span>
        </label>
      </div>

      <div class="stat" style="padding:14px 0">
        <span class="k">⛶ ملء الشاشة</span>
        <button class="btn ghost sm" id="set-fullscreen" style="padding:8px 14px">تبديل ملء الشاشة</button>
      </div>

      <div class="card tight" style="margin-top:14px;background:rgba(77,217,255,.05);border-color:rgba(77,217,255,.22)">
        <div style="font-size:11px;line-height:1.8;color:#a8c6e0">
          <b style="color:var(--cyan)">تنبيه:</b> ضغطات المفاتيح تُستخدم للتحكم في اللعبة فقط.
          لا يتم إرسال أي بيانات خارج المتصفح. التقدم يُحفظ محليًا على جهازك.
        </div>
      </div>

      <button class="btn wide" style="margin-top:18px" data-close="modal-settings">تم</button>
    </div>
  </div>

  <!-- notifications -->
  <div id="toasts"></div>

  <!-- watermark -->
  <div class="watermark">
    ZATHURA · مشروع تعليمي غير رسمي · لا يمثل NASA
  </div>
</div>

<script>
${safeJs}

/* ---------------- bootstrap ---------------- */
document.addEventListener('DOMContentLoaded', () => {
  // إخفاء الشبكة وبدء التطبيق
  bootGame();
});
</script>
</body>
</html>`;

fs.writeFileSync(OUT, html, 'utf8');
const kb = (Buffer.byteLength(html) / 1024).toFixed(1);
console.log('✓ built', path.relative(process.cwd(), OUT), `(${kb} KB)`);
console.log('  js files:', JS_ORDER.length, '· css:', (css.length / 1024).toFixed(1) + ' KB', '·', DEV ? 'dev build (QA hooks kept)' : 'submission build (QA hooks stripped)');
