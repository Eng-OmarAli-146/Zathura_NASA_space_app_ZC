/* ============================================================================
   quests.js — محرّك قائمة المهام (To-Do Chain) للمهمة
   - القائمة بتظهر فوق الشاشة طول الوقت
   - إنجاز مهمة ⇒ علامة صح ببوب + نغمة + تظهر المهمة اللي بعدها
   - دعم تقدّم اختياري (2/6)
   - الضغط على المهمة النشطة الأخيرة (زرار الإقلاع) بيبدأ الرحلة
   ==========================================================================*/
'use strict';

const Quest = (() => {
  const state = {
    items: [],        // [{id,t,max,cur,done}]
    idx: 0,           // المهمة النشطة
    el: null,         // الحاوية
    title: '',
    launchId: null,   // آخر مهمة (العودة) = زرار الإقلاع
    onLaunch: null,
    allDoneCb: null
  };

  /* حفظ/استعادة حالة القائمة (لنظام الاستئناف) */
  function serialize() {
    return { items: state.items.map(q => ({ ...q })), idx: state.idx };
  }
  function restore(d) {
    if (!d || !Array.isArray(d.items) || !d.items.length) return false;
    state.items = d.items.map(q => ({ cur: 0, done: false, ...q }));
    state.idx = clamp(d.idx || 0, 0, state.items.length - 1);
    if (state.el) render();
    return true;
  }

  function reset(items) {
    state.items = items.map(q => ({ cur: 0, done: false, ...q }));
    state.idx = 0;
    state.launchId = null;
    state.onLaunch = null;
    state.allDoneCb = null;
  }

  /* mount: يرسم القائمة داخل الحاوية */
  function mount(containerEl, title, opts = {}) {
    if (!containerEl) return;
    state.el = containerEl;
    state.title = title || '';
    state.launchId = opts.launchId || null;
    state.onLaunch = opts.onLaunch || null;
    state.allDoneCb = opts.allDoneCb || null;
    render();
  }

  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function rowHTML(q, i) {
    const done = q.done;
    const active = i === state.idx && !done;
    const locked = i > state.idx && !done;
    const cls = 'quest' + (done ? ' done' : active ? ' current' : ' locked');
    const prog = q.max > 1 ? `<span class="qp mono">${Math.min(q.cur, q.max)}/${q.max}</span>` : '';
    const tick = done
      ? '<span class="tick"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#052012" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg></span>'
      : `<span class="tick">${locked ? '<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 018 0v3"/></svg>' : `<i class="mono">${i + 1}</i>`}</span>`;
    return `<div class="${cls}" data-id="${esc(q.id)}">${tick}<span class="qt">${esc(q.t)}</span>${prog}</div>`;
  }

  function render() {
    if (!state.el) return;
    const doneCount = state.items.filter(q => q.done).length;
    const launchReady = state.launchId && state.idx === state.items.length - 1 &&
      !state.items[state.items.length - 1].done &&
      state.items.slice(0, -1).every(q => q.done);

    state.el.innerHTML =
      `<div class="quest-head"><span class="quest-kicker">مهمتي 📋</span><span class="quest-title">${esc(state.title)}</span>` +
      `<span class="quest-count mono">${doneCount}/${state.items.length}</span></div>` +
      `<div class="quest-items">${state.items.map(rowHTML).join('')}</div>` +
      (launchReady
        ? `<button class="quest-launch" id="quest-launch">🚀 أقلع الآن — العودة إلى الأرض</button>`
        : '');

    const lb = state.el.querySelector('#quest-launch');
    if (lb) lb.addEventListener('click', () => { if (state.onLaunch) state.onLaunch(); });
  }

  function complete(id) {
    const i = state.items.findIndex(q => q.id === id);
    if (i === -1 || state.items[i].done) return false;
    state.items[i].done = true;
    state.items[i].cur = state.items[i].max || 1;
    // تفعيل التالية قبل الرسم
    const next = state.items.findIndex(q => !q.done);
    state.idx = next === -1 ? state.items.length - 1 : next;
    Audio.quest();
    render();
    const row = state.el && state.el.querySelector(`.quest[data-id="${id}"]`);
    if (row) row.classList.add('pop');
    if (state.items.every(q => q.done) && state.allDoneCb) state.allDoneCb();
    return true;
  }

  function setProgress(id, cur) {
    const q = state.items.find(x => x.id === id);
    if (!q || q.done) return;
    q.cur = Math.max(q.cur, cur);
    if (q.max && q.cur >= q.max) { complete(id); return; }
    if (state.el) {
      const row = state.el.querySelector(`.quest[data-id="${id}"] .qp`);
      if (row) row.textContent = `${Math.min(q.cur, q.max)}/${q.max}`;
    }
  }

  function isDone(id) { const q = state.items.find(x => x.id === id); return !!(q && q.done); }
  function activeId() { const q = state.items[state.idx]; return q && !q.done ? q.id : null; }
  function allDone() { return state.items.length > 0 && state.items.every(q => q.done); }
  function markMissed() {
    state.items.forEach(q => { if (!q.done) q.missed = true; });
    render();
  }

/* @QA-BEGIN */
  /* @QA — أدوات الاختبار */
  function __completeAll() { state.items.slice(0, -1).forEach(q => { q.done = true; }); state.idx = state.items.length - 1; render(); }
/* @QA-END */

  return {
    serialize,
    restore,
    reset, mount, complete, setProgress, isDone, activeId, allDone, markMissed,
/* @QA-BEGIN */
    __completeAll,
/* @QA-END */
    get items() { return state.items; }
  };
})();
if (typeof window !== 'undefined') window.Quest = Quest;
