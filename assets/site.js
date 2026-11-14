/* ============================================================================
   ZATHURA — project page behaviour
   No dependencies. Everything degrades to a readable static page.
   ========================================================================== */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------------------------------------------- language
     Arabic markup is the source of truth. Every translatable node carries
     data-en; the first toggle snapshots its Arabic HTML into data-ar.
  ------------------------------------------------------------------------- */
  var META = {
    ar: {
      title: 'ZATHURA — مدرّب مهمّات رائد الفضاء | NASA Space Apps Challenge 2026',
      desc: 'ZATHURA لعبة محاكاة فضائية تعليمية في المتصفح للأعمار ٧–١٢: تدير قاعدة على المريخ والقمر وعطارد بموارد حقيقية وجرعة إشعاع لا تُرجَع وبيانات NASA الفعلية.'
    },
    en: {
      title: 'ZATHURA — Junior Astronaut Mission Trainer | NASA Space Apps 2026',
      desc: 'A browser-based space mission trainer for ages 7–12: real resource budgets, a radiation dose that never resets, and actual NASA data behind every number. No install, no internet.'
    }
  };

  var nodes = document.querySelectorAll('[data-en]');
  var saved = false;

  function snapshot() {
    if (saved) return;
    for (var i = 0; i < nodes.length; i++) {
      nodes[i].setAttribute('data-ar', nodes[i].innerHTML);
    }
    saved = true;
  }

  function applyLang(lang) {
    snapshot();
    var isEn = lang === 'en';

    root.setAttribute('lang', isEn ? 'en' : 'ar');
    root.setAttribute('dir', isEn ? 'ltr' : 'rtl');

    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      var next = isEn ? el.getAttribute('data-en') : el.getAttribute('data-ar');
      if (next !== null) el.innerHTML = next;
    }

    document.title = isEn ? META.en.title : META.ar.title;

    var md = document.querySelector('meta[name="description"]');
    if (md) md.setAttribute('content', isEn ? META.en.desc : META.ar.desc);

    var buttons = document.querySelectorAll('[data-lang]');
    for (var j = 0; j < buttons.length; j++) {
      buttons[j].setAttribute('aria-pressed', String(buttons[j].getAttribute('data-lang') === (isEn ? 'en' : 'ar')));
    }

    try { localStorage.setItem('zathura.lang', isEn ? 'en' : 'ar'); } catch (e) {}
  }

  var params = new URLSearchParams(window.location.search);
  var initial = params.get('lang');
  try { initial = initial || localStorage.getItem('zathura.lang'); } catch (e) {}
  if (initial === 'en') applyLang('en');

  document.addEventListener('click', function (ev) {
    var btn = ev.target.closest ? ev.target.closest('[data-lang]') : null;
    if (!btn) return;
    applyLang(btn.getAttribute('data-lang'));
  });

  /* ---------------------------------------------------------------- starfield */
  var canvas = document.getElementById('stars');
  if (canvas && !reduce) {
    var ctx = canvas.getContext('2d');
    var stars = [];
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = 0, h = 0;

    function resize() {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      build();
    }

    function build() {
      var count = Math.min(150, Math.round((w * h) / 14000));
      stars = [];
      for (var i = 0; i < count; i++) {
        stars.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: Math.random() * 1.25 + 0.25,
          a: Math.random() * 0.55 + 0.15,
          vy: (Math.random() * 0.06 + 0.015),
          t: Math.random() * Math.PI * 2
        });
      }
    }

    var last = 0;
    function frame(now) {
      requestAnimationFrame(frame);
      if (now - last < 40) return;            // ~25fps, plenty for dust
      last = now;
      ctx.clearRect(0, 0, w, h);
      for (var i = 0; i < stars.length; i++) {
        var s = stars[i];
        s.y -= s.vy;
        s.t += 0.02;
        if (s.y < -4) { s.y = h + 4; s.x = Math.random() * w; }
        var tw = 0.72 + Math.sin(s.t) * 0.28;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, 6.2832);
        ctx.fillStyle = 'rgba(196,231,255,' + (s.a * tw).toFixed(3) + ')';
        ctx.fill();
      }
    }

    resize();
    window.addEventListener('resize', resize);
    requestAnimationFrame(frame);
  }

  /* ---------------------------------------------------------------- reveals */
  var revealables = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry, i) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        var delay = Math.min(i * 55, 240);
        setTimeout(function () { el.classList.add('in'); }, delay);
        io.unobserve(el);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    revealables.forEach(function (el) { io.observe(el); });
  } else {
    revealables.forEach(function (el) { el.classList.add('in'); });
  }

  /* ---------------------------------------------------------------- storm bars */
  var barsHost = document.querySelector('[data-bars]');
  function fillBars() {
    if (!barsHost) return;
    var fills = barsHost.querySelectorAll('.bar-fill');
    for (var i = 0; i < fills.length; i++) {
      var pct = Math.max(3, Math.min(100, parseFloat(fills[i].getAttribute('data-w')) || 0));
      fills[i].style.width = pct + '%';
    }
  }
  if (barsHost) {
    if ('IntersectionObserver' in window) {
      var bio = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (!e.isIntersecting) return;
          setTimeout(fillBars, 120);
          bio.disconnect();
        });
      }, { threshold: 0.25 });
      bio.observe(barsHost);
    } else {
      fillBars();
    }
  }

  /* ---------------------------------------------------------------- progress */
  var bar = document.getElementById('progress');
  function onScroll() {
    if (bar) {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      bar.style.transform = 'scaleX(' + p.toFixed(4) + ')';
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------------------------------------------------------------- copy */
  document.addEventListener('click', function (ev) {
    var btn = ev.target.closest ? ev.target.closest('[data-copy-text]') : null;
    if (!btn) return;
    var text = btn.getAttribute('data-copy-text');
    var done = function () {
      btn.classList.add('ok');
      btn.style.color = 'var(--green)';
      setTimeout(function () { btn.style.color = ''; btn.classList.remove('ok'); }, 1400);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, done);
    } else {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch (e) {}
      document.body.removeChild(ta);
      done();
    }
  });

})();
