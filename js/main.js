/* ============================================================
   endfield-portfolio · main.js
   ============================================================ */
(function () {
  'use strict';

  var d = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var works = window.WORKS || [];
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };

  /* ---------- 启动屏 ---------- */
  (function boot() {
    var el = document.getElementById('boot');
    if (!el) return;
    var bar = el.querySelector('.boot-track i');
    var pct = el.querySelector('.boot-s b');
    var txt = el.querySelector('[data-boot]');
    var msgs = ['READING OPERATOR ID', 'DECODING ZILIN HUANG', 'ASSEMBLING ARCHIVE', 'READY / LINDEN'];

    function done() {
      el.classList.add('is-done');
      d.classList.add('is-ready');
      el.setAttribute('aria-hidden', 'true');
      setTimeout(function () { el.style.display = 'none'; }, 700);
    }
    if (reduce) {
      bar.style.width = '100%'; pct.textContent = '100%'; txt.textContent = msgs[3];
      setTimeout(done, 100);
      return;
    }
    var p = 0;
    var timer = setInterval(function () {
      p = Math.min(100, p + Math.random() * 10 + 5);
      bar.style.width = p + '%';
      pct.textContent = String(Math.floor(p)).padStart(3, '0') + '%';
      txt.textContent = msgs[Math.min(3, Math.floor(p / 26))];
      if (p >= 100) { clearInterval(timer); setTimeout(done, 200); }
    }, 100);
  })();
  // 兜底：即便启动屏被跳过，首屏也要落位
  setTimeout(function () { d.classList.add('is-ready'); }, 1800);

  /* ---------- 顶栏时钟 ---------- */
  (function clock() {
    var el = document.getElementById('clock');
    if (!el) return;
    function tick() {
      var n = new Date();
      el.textContent = [n.getHours(), n.getMinutes(), n.getSeconds()]
        .map(function (v) { return String(v).padStart(2, '0'); }).join(':');
    }
    tick();
    setInterval(tick, 1000);
  })();

  /* ---------- 主题 · 信号色 ---------- */
  (function theming() {
    var btn = document.getElementById('themeBtn');
    var label = btn && btn.querySelector('.ibtn-txt');
    function sync() { if (label) label.textContent = d.dataset.theme === 'dark' ? 'DARK' : 'LIGHT'; }
    sync();
    if (btn) {
      btn.addEventListener('click', function () {
        var next = d.dataset.theme === 'dark' ? 'light' : 'dark';
        d.dataset.theme = next;
        store.set('efl-theme', next);
        sync();
      });
    }
    var picker = document.querySelectorAll('.signal-picker button');
    function syncPicker() {
      picker.forEach(function (b) {
        b.classList.toggle('is-on', b.dataset.signal === d.dataset.signal);
      });
    }
    syncPicker();
    picker.forEach(function (b) {
      b.addEventListener('click', function () {
        d.dataset.signal = b.dataset.signal;
        store.set('efl-signal', b.dataset.signal);
        syncPicker();
        var flash = document.getElementById('flash');
        if (flash && !reduce) {
          flash.classList.remove('is-on');
          void flash.offsetWidth;
          flash.classList.add('is-on');
        }
      });
    });
  })();

  /* ---------- 移动端抽屉 ---------- */
  (function drawer() {
    var btn = document.getElementById('menuBtn');
    var panel = document.getElementById('drawer');
    if (!btn || !panel) return;
    function close() {
      panel.classList.remove('is-open');
      btn.setAttribute('aria-expanded', 'false');
    }
    btn.addEventListener('click', function () {
      var open = panel.classList.toggle('is-open');
      btn.setAttribute('aria-expanded', String(open));
    });
    panel.addEventListener('click', function (e) {
      if (e.target.closest('a')) close();
    });
    window.addEventListener('scroll', close, { passive: true });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
  })();

  /* ---------- 作品渲染 ---------- */
  var grid = document.getElementById('workGrid');
  var filterBtns = Array.prototype.slice.call(document.querySelectorAll('.filter'));
  var currentFilter = 'all';

  function cardHTML(w) {
    return '' +
      '<article class="wcard reveal" data-cat="' + w.cat + '" data-no="' + w.no + '">' +
        '<div class="wcard-media">' +
          '<img src="' + w.img + '" alt="' + w.title + ' 作品封面" class="' + (w.fit === 'contain' ? 'is-top' : '') + '" loading="lazy" decoding="async" />' +
          '<span class="wcard-no">' + w.no + '</span>' +
          '<span class="wcard-cat">' + w.catName + '</span>' +
          '<span class="wcard-go" aria-hidden="true">↗</span>' +
        '</div>' +
        '<div class="wcard-body">' +
          '<h3>' + w.title + '</h3>' +
          '<p class="wcard-en">' + w.en + '</p>' +
          '<div class="wcard-rows"><span>' + w.year + '</span><span>' + w.spec[1][1] + '</span></div>' +
        '</div>' +
        '<button class="wcard-hit" type="button" data-open="' + w.no + '" aria-label="查看作品：' + w.title + '"></button>' +
      '</article>';
  }

  if (grid) {
    grid.innerHTML = works.map(cardHTML).join('');
  }

  function applyFilter(cat) {
    currentFilter = cat;
    Array.prototype.forEach.call(grid.querySelectorAll('.wcard'), function (card) {
      var hide = cat !== 'all' && card.dataset.cat !== cat;
      card.classList.toggle('is-hidden', hide);
      if (!hide) {
        card.classList.remove('is-in');
        void card.offsetWidth;
        card.classList.add('is-in');
      }
    });
    filterBtns.forEach(function (b) {
      var on = b.dataset.filter === cat;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-pressed', String(on));
    });
  }

  filterBtns.forEach(function (b) {
    b.addEventListener('click', function () { applyFilter(b.dataset.filter); });
  });

  function visibleWorks() {
    return works.filter(function (w) { return currentFilter === 'all' || w.cat === currentFilter; });
  }

  /* ---------- 作品弹窗 ---------- */
  (function modal() {
    var el = document.getElementById('modal');
    if (!el) return;
    var mNo = document.getElementById('mNo');
    var mCat = document.getElementById('mCat');
    var mImg = document.getElementById('mImg');
    var mTitle = document.getElementById('mTitle');
    var mEn = document.getElementById('mEn');
    var mDesc = document.getElementById('mDesc');
    var mSpec = document.getElementById('mSpec');
    var mCount = document.getElementById('mCount');
    var list = [];
    var idx = 0;
    var lastFocus = null;

    function paint() {
      var w = list[idx];
      if (!w) return;
      mNo.textContent = w.no;
      mCat.textContent = w.catName;
      mImg.src = w.img;
      mImg.alt = w.title + ' 作品图';
      mImg.className = w.fit === 'contain' ? 'is-contain' : '';
      mTitle.textContent = w.title;
      mEn.textContent = w.en + ' · ' + w.year;
      mDesc.textContent = w.desc;
      mSpec.innerHTML = w.spec.map(function (row) {
        return '<div><dt>' + row[0] + '</dt><dd>' + row[1] + '</dd></div>';
      }).join('');

      var mv = document.getElementById('mVideo');
      var mvWrap = document.getElementById('mVideoWrap');
      var mg = document.getElementById('mGallery');
      if (mv) mv.pause();
      if (w.video && mvWrap && mv) {
        mvWrap.hidden = false;
        if (mv.getAttribute('src') !== w.video) mv.src = w.video;
        if (w.videoPoster) mv.poster = w.videoPoster;
      } else if (mvWrap) {
        mvWrap.hidden = true;
        if (mv) { mv.pause(); mv.removeAttribute('src'); }
      }
      if (mg) {
        if (w.gallery && w.gallery.length) {
          mg.innerHTML = w.gallery.map(function (g) {
            return '<figure><img src="' + g.src + '" alt="' + w.title + ' 作品片段" loading="lazy" />' +
              '<figcaption>' + g.cap + '</figcaption></figure>';
          }).join('');
          mg.hidden = false;
        } else {
          mg.innerHTML = '';
          mg.hidden = true;
        }
      }
      mCount.textContent = w.no + ' / ' + String(works.length).padStart(2, '0');
    }

    function open(no) {
      list = visibleWorks();
      var i = -1;
      for (var k = 0; k < list.length; k++) { if (list[k].no === no) { i = k; break; } }
      if (i < 0) { list = works.slice(); i = 0; }
      idx = i;
      lastFocus = document.activeElement;
      paint();
      el.classList.add('is-open');
      el.setAttribute('aria-hidden', 'false');
      document.body.classList.add('is-locked');
      var closeBtn = el.querySelector('.m-close');
      if (closeBtn) closeBtn.focus();
    }

    function close() {
      var mv = document.getElementById('mVideo');
      if (mv) mv.pause();
      el.classList.remove('is-open');
      el.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('is-locked');
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    function step(n) {
      if (!list.length) return;
      idx = (idx + n + list.length) % list.length;
      paint();
    }

    document.addEventListener('click', function (e) {
      var opener = e.target.closest('[data-open]');
      if (opener) { open(opener.dataset.open); return; }
      if (e.target.closest('[data-close]')) close();
      var nav = e.target.closest('[data-step]');
      if (nav) step(Number(nav.dataset.step));
    });

    var first = document.querySelector('[data-open-first]');
    if (first) {
      first.addEventListener('click', function () {
        var list0 = visibleWorks();
        if (list0.length) open(list0[0].no);
      });
    }

    document.addEventListener('keydown', function (e) {
      if (!el.classList.contains('is-open')) return;
      var lb = document.getElementById('lightbox');
      if (lb && lb.classList.contains('is-open')) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') step(1);
      if (e.key === 'ArrowLeft') step(-1);
    });
  })();

  /* ---------- 揭示动效 ---------- */
  var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      var t = en.target;
      t.classList.add('is-in');
      if (t.classList.contains('capbar')) t.classList.add('is-in');
      io.unobserve(t);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' }) : null;

  function observe(selector) {
    var els = document.querySelectorAll(selector);
    Array.prototype.forEach.call(els, function (el) {
      if (io) io.observe(el); else el.classList.add('is-in');
    });
  }
  observe('.reveal');
  observe('.capbar');

  /* ---------- 数字滚动 ---------- */
  (function counters() {
    var box = document.querySelector('.stats');
    if (!box) return;
    var targets = box.querySelectorAll('[data-count]');
    function run(el) {
      var raw = el.innerHTML;
      var m = raw.match(/^(\d+)([\s\S]*)$/);
      if (!m) return;
      var end = Number(m[1]);
      var pad = m[1].length;
      var tail = m[2];
      if (reduce) return;
      var t0 = null;
      function frame(ts) {
        if (!t0) t0 = ts;
        var k = Math.min(1, (ts - t0) / 900);
        var v = Math.round(end * (1 - Math.pow(1 - k, 3)));
        el.innerHTML = String(v).padStart(pad, '0') + tail;
        if (k < 1) requestAnimationFrame(frame);
      }
      el.innerHTML = String(0).padStart(pad, '0') + tail;
      requestAnimationFrame(frame);
    }
    var seen = false;
    var obs = 'IntersectionObserver' in window ? new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting && !seen) {
          seen = true;
          Array.prototype.forEach.call(targets, run);
          obs.disconnect();
        }
      });
    }, { threshold: 0.4 }) : null;
    if (obs) obs.observe(box);
  })();

  /* ---------- 侧边导航高亮 · 进度条 ---------- */
  (function nav() {
    var hero = document.querySelector('.hero');
    var secs = [{ id: 'top', el: hero }];
    Array.prototype.forEach.call(document.querySelectorAll('main .sec[id]'), function (el) {
      secs.push({ id: el.id, el: el });
    });
    var links = document.querySelectorAll('#railNav a');
    var railNo = document.getElementById('railNo');
    var barEl = document.getElementById('progressBar');
    var depthEl = document.getElementById('coordDepth');
    var hudEl = document.querySelector('.coord-hud');
    var ticking = false;

    function update() {
      ticking = false;
      var y = window.scrollY + window.innerHeight * 0.36;
      var cur = secs[0];
      secs.forEach(function (s) {
        if (!s.el) return;
        var top = s.el.getBoundingClientRect().top + window.scrollY;
        if (top <= y) cur = s;
      });
      Array.prototype.forEach.call(links, function (a) {
        a.classList.toggle('is-on', a.dataset.sec === cur.id);
      });
      if (railNo) railNo.textContent = (cur.id === 'top' ? '00' : '0' + (secs.findIndex(function (s) { return s.id === cur.id; })));

      if (barEl) {
        var h = document.body.scrollHeight - window.innerHeight;
        var pct = h > 0 ? Math.min(100, (window.scrollY / h) * 100) : 0;
        barEl.style.width = pct + '%';
        if (depthEl) depthEl.textContent = 'DEPTH ' + String(Math.round(pct)).padStart(3, '0') + '%';
      }
      if (hudEl) hudEl.classList.toggle('is-visible', window.scrollY > window.innerHeight * .55);
    }
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    update();
  })();

  /* ---------- 准星光标 · 坐标读数 ---------- */
  (function xhair() {
    var el = document.getElementById('xhair');
    var coordXY = document.getElementById('coordXY');
    var hudXY = document.getElementById('hudXY');
    if (!el) return;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches || reduce) return;
    var raf = null, x = 0, y = 0;
    function fmt(v) { return String(Math.max(0, Math.round(v))).padStart(4, '0'); }
    window.addEventListener('pointermove', function (e) {
      x = e.clientX; y = e.clientY;
      if (raf) return;
      raf = requestAnimationFrame(function () {
        raf = null;
        el.style.setProperty('--x', x + 'px');
        el.style.setProperty('--y', y + 'px');
        el.classList.add('is-on');
        var s = 'X ' + fmt(x) + ' · Y ' + fmt(y);
        if (hudXY) hudXY.textContent = s;
        if (coordXY) coordXY.textContent = s;
      });
    }, { passive: true });
    document.addEventListener('pointerover', function (e) {
      el.classList.toggle('is-hot', !!e.target.closest('a, button, .wcard'));
    }, { passive: true });
    document.addEventListener('pointerleave', function () { el.classList.remove('is-on'); });
  })();

  /* ---------- 微信复制 ---------- */
  (function copy() {
    var trigger = document.querySelector('[data-copy]');
    if (!trigger) return;
    trigger.addEventListener('click', function (e) {
      e.preventDefault();
      var text = trigger.dataset.copy;
      var label = trigger.querySelector('span');
      var old = label.textContent;
      var done = function () {
        label.textContent = '已复制 / COPIED ✓';
        setTimeout(function () { label.textContent = old; }, 1600);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, done);
      } else {
        done();
      }
    });
  })();

  /* ---------- 文字解码（haoqi 式 scramble） ---------- */
  (function scramble() {
    if (reduce) return;
    var GLYPHS = '01<>/\\[]{}#*+=%&@ABCDEFGHKLMNPRSTUVWXYZ';
    var els = Array.prototype.slice.call(document.querySelectorAll('[data-scramble]'));
    if (!els.length) return;
    function decode(el) {
      if (el.dataset.done) return;
      el.dataset.done = '1';
      var final = el.textContent;
      var frames = Math.max(14, Math.min(30, Math.round(final.length * 1.8)));
      var t = 0;
      el.classList.add('is-decoding');
      // 兜底：无论动画帧是否被节流，1.4s 后一定是最终文本
      setTimeout(function () { el.textContent = final; el.classList.remove('is-decoding'); }, 1400);
      (function tick() {
        t++;
        var reveal = (t / frames) * final.length;
        var out = '';
        for (var i = 0; i < final.length; i++) {
          var ch = final[i];
          out += (i < reveal - 1 || ch === ' ' || ch === '·' || ch === '/') ? ch : GLYPHS[(Math.random() * GLYPHS.length) | 0];
        }
        el.textContent = out;
        if (t < frames) requestAnimationFrame(tick);
        else { el.textContent = final; el.classList.remove('is-decoding'); }
      })();
    }
    var so = 'IntersectionObserver' in window ? new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { decode(en.target); so.unobserve(en.target); }
      });
    }, { threshold: 0.4 }) : null;
    els.forEach(function (el) { if (so) so.observe(el); else decode(el); });
  })();

  /* ---------- 磁吸按钮 ---------- */
  (function magnetic() {
    if (reduce || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    Array.prototype.forEach.call(document.querySelectorAll('.btn, .ibtn, .filter'), function (el) {
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        var dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
        var dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
        el.style.setProperty('--mx', (dx * 12).toFixed(1) + 'px');
        el.style.setProperty('--my', (dy * 9).toFixed(1) + 'px');
      }, { passive: true });
      el.addEventListener('pointerleave', function () {
        el.style.setProperty('--mx', '0px');
        el.style.setProperty('--my', '0px');
      });
    });
  })();

  /* ---------- 作品卡 · 光标追踪光晕 ---------- */
  (function cardPointer() {
    if (!grid || reduce || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    grid.addEventListener('pointermove', function (e) {
      var card = e.target.closest('.wcard');
      if (!card) return;
      var r = card.getBoundingClientRect();
      card.style.setProperty('--mx', (((e.clientX - r.left) / r.width) * 100).toFixed(1) + '%');
      card.style.setProperty('--my', (((e.clientY - r.top) / r.height) * 100).toFixed(1) + '%');
    }, { passive: true });
  })();

  /* ---------- 主视觉视差 ---------- */
  (function heroParallax() {
    var hero = document.querySelector('.hero');
    if (!hero || reduce || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    var arc = hero.querySelector('.hero-arc');
    var br = hero.querySelector('.brackets');
    var h1 = hero.querySelector('.h1');
    var raf = null, x = 0, y = 0;
    hero.addEventListener('pointermove', function (e) {
      x = e.clientX / window.innerWidth - 0.5;
      y = e.clientY / window.innerHeight - 0.5;
      if (raf) return;
      raf = requestAnimationFrame(function () {
        raf = null;
        if (arc) arc.style.transform = 'translate(' + (x * -46).toFixed(1) + 'px,' + (y * -30).toFixed(1) + 'px)';
        if (br) br.style.transform = 'translate(' + (x * 20).toFixed(1) + 'px,' + (y * 14).toFixed(1) + 'px)';
        if (h1) h1.style.transform = 'translate(' + (x * -16).toFixed(1) + 'px,' + (y * -10).toFixed(1) + 'px)';
      });
    }, { passive: true });
    hero.addEventListener('pointerleave', function () {
      [arc, br, h1].forEach(function (el2) { if (el2) el2.style.transform = ''; });
    });
  })();

  /* ---------- 交互音效（参考 haoqi.design 的 SOUND 状态） ---------- */
  (function sound() {
    var btn = document.getElementById('soundBtn');
    if (!btn) return;
    var on = false;
    var ctx = null;
    var last = 0;
    function beep(freq, dur, type, vol) {
      if (!on) return;
      try {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        ctx = ctx || new AC();
        if (ctx.state === 'suspended') ctx.resume();
        var o = ctx.createOscillator();
        var g = ctx.createGain();
        o.type = type || 'sine';
        o.frequency.value = freq;
        g.gain.setValueAtTime(vol || .02, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(.0001, ctx.currentTime + dur);
        o.connect(g);
        g.connect(ctx.destination);
        o.start();
        o.stop(ctx.currentTime + dur);
      } catch (e) {}
    }
    btn.addEventListener('click', function () {
      on = !on;
      btn.setAttribute('aria-pressed', String(on));
      btn.setAttribute('aria-label', on ? '关闭交互音效' : '开启交互音效');
      btn.innerHTML = 'SOUND <b>[' + (on ? '▮▮' : '|') + ']</b>';
      beep(720, .1, 'square', .035);
    });
    document.addEventListener('pointerover', function (e) {
      var now = Date.now();
      if (now - last < 45) return;
      last = now;
      if (e.target.closest('a, button, .wcard')) beep(960, .035, 'sine', .014);
    }, { passive: true });
    document.addEventListener('pointerdown', function () { beep(220, .08, 'square', .026); }, { passive: true });
  })();

  /* ---------- 背景音乐：Web Audio 实时合成，无外部音频文件 ---------- */
  (function music() {
    var btn = document.getElementById('musicBtn');
    if (!btn) return;
    var on = false;
    var ctx = null;
    var master = null;
    var pref = store.get('efl-music');
    var vol = Number(store.get('efl-music-vol') || 45);
    var volInputs = Array.prototype.slice.call(document.querySelectorAll('[data-music-vol]'));

    function syncVol() {
      volInputs.forEach(function (inp) {
        inp.value = String(vol);
        var b = inp.parentNode && inp.parentNode.querySelector('b');
        if (b) b.textContent = String(vol);
      });
      if (ctx && master && on) {
        master.gain.cancelScheduledValues(ctx.currentTime);
        master.gain.setTargetAtTime((vol / 100) * .18, ctx.currentTime, .12);
      }
    }
    volInputs.forEach(function (inp) {
      inp.addEventListener('input', function () {
        vol = Number(inp.value);
        store.set('efl-music-vol', String(vol));
        syncVol();
      });
    });

    function label() {
      btn.setAttribute('aria-pressed', String(on));
      btn.setAttribute('aria-label', on ? '关闭背景音乐' : '开启背景音乐');
      btn.innerHTML = 'MUSIC <b>[' + (on ? '▮▮' : '|') + ']</b>';
    }

    function build() {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      try { ctx = new AC(); } catch (e) { return false; }
      master = ctx.createGain();
      master.gain.value = 0;
      master.connect(ctx.destination);

      var lp = ctx.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 380; lp.Q.value = .8;
      lp.connect(master);

      // 低频漂移底噪：A1 - E2 - A2
      [55, 82.41, 110].forEach(function (f, i) {
        var o = ctx.createOscillator();
        var g = ctx.createGain();
        o.type = i === 0 ? 'sine' : 'triangle';
        o.frequency.value = f;
        g.gain.value = i === 0 ? .24 : .07;
        o.connect(g); g.connect(lp); o.start();
      });

      // 极慢的滤波扫描，让底噪呼吸
      var lfo = ctx.createOscillator();
      var lg = ctx.createGain();
      lfo.frequency.value = .045; lg.gain.value = 150;
      lfo.connect(lg); lg.connect(lp.frequency); lfo.start();

      // 稀疏五声音阶点缀 + 回声
      var delay = ctx.createDelay(1);
      var fb = ctx.createGain();
      var wet = ctx.createGain();
      delay.delayTime.value = .42; fb.gain.value = .3; wet.gain.value = .35;
      delay.connect(fb); fb.connect(delay); delay.connect(wet); wet.connect(master);
      var scale = [220, 261.63, 293.66, 329.63, 392, 440];
      setInterval(function () {
        if (!on || !ctx || ctx.state !== 'running' || Math.random() < .38) return;
        var f = scale[(Math.random() * scale.length) | 0];
        var o = ctx.createOscillator();
        var g = ctx.createGain();
        var t = ctx.currentTime;
        o.type = 'sine'; o.frequency.value = f;
        g.gain.setValueAtTime(.0001, t);
        g.gain.exponentialRampToValueAtTime(.075, t + .04);
        g.gain.exponentialRampToValueAtTime(.0001, t + 2.1);
        o.connect(g); g.connect(master); g.connect(delay);
        o.start(t); o.stop(t + 2.2);
      }, 2600);
      return true;
    }

    function start() {
      if (!ctx && !build()) return;
      if (ctx.state === 'suspended') ctx.resume();
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setTargetAtTime((vol / 100) * .18, ctx.currentTime, 1.4);
      on = true;
      label();
    }

    function stop() {
      on = false;
      label();
      if (!ctx) return;
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setTargetAtTime(0, ctx.currentTime, .4);
    }

    btn.addEventListener('click', function () {
      if (on) { stop(); store.set('efl-music', 'off'); }
      else { start(); store.set('efl-music', 'on'); }
    });
    label();
    syncVol();

    // 浏览器要求手势后才能播放音频：首次点击/按键时淡入，除非用户曾明确关闭
    if (pref !== 'off') {
      function kick(e) {
        if (e.target && e.target.closest && e.target.closest('#musicBtn')) return;
        document.removeEventListener('pointerdown', kick);
        document.removeEventListener('keydown', kick);
        start();
      }
      document.addEventListener('pointerdown', kick, { passive: true });
      document.addEventListener('keydown', kick);
    }
  })();

  /* ---------- 可交互三维信号核心 ---------- */
  (function signalCore() {
    var stage = document.getElementById('coreStage');
    var canvas = document.getElementById('coreCanvas');
    var tip = document.getElementById('coreTip');
    var read = document.getElementById('coreRead');
    if (!stage || !canvas || !canvas.getContext) return;
    var ctx = canvas.getContext('2d');
    var V = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
    var names = [
      '信息可视化 / DATA VIZ', '视觉与版式 / VISUAL', '交互与生成 / INTERACTIVE',
      '三维与空间 / SPATIAL', '编程 / CODE', '作品档案 / ARCHIVE'
    ];
    var bars = document.querySelectorAll('.capbar');
    var edges = [];
    for (var i = 0; i < V.length; i++) {
      for (var j = i + 1; j < V.length; j++) if ((i ^ 1) !== j) edges.push([i, j]);
    }
    var rx = -.42, ry = .62, vx = 0, vy = 0;
    var dragging = false, moved = 0, lastX = 0, lastY = 0;
    var hover = -1, raf = null, visible = true, W = 0, H = 0, dpr = 1, R = 0;
    var pts = [];

    function cssVar(n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); }
    function rgba(hex, a) {
      var h = (hex || '#f1f0ea').replace('#', '');
      if (h.length === 3) h = h.split('').map(function (c) { return c + c; }).join('');
      var n = parseInt(h, 16);
      return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
    }
    function ink(a) { return rgba(cssVar('--ink'), a); }
    function signal() { return cssVar('--signal') || '#dff21a'; }

    function resize() {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      W = stage.clientWidth; H = stage.clientHeight;
      R = Math.min(W, H) * .42;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (reduce) draw();
    }

    function project(v) {
      var cy = Math.cos(ry), sy = Math.sin(ry);
      var cx = Math.cos(rx), sx = Math.sin(rx);
      var x = v[0] * cy - v[2] * sy;
      var z = v[0] * sy + v[2] * cy;
      var y = v[1] * cx - z * sx;
      z = v[1] * sx + z * cx;
      var s = 3.4 / (3.4 + z);
      return { x: W / 2 + x * s * R, y: H / 2 + y * s * R, z: z, s: s };
    }

    function draw() {
      if (!W || !H) return;
      ctx.clearRect(0, 0, W, H);
      pts = V.map(project);
      ctx.lineWidth = 1;
      ctx.save();
      ctx.setLineDash([2, 5]);
      ctx.strokeStyle = ink(.16);
      [[0, 1], [2, 3], [4, 5]].forEach(function (e) {
        ctx.beginPath(); ctx.moveTo(pts[e[0]].x, pts[e[0]].y); ctx.lineTo(pts[e[1]].x, pts[e[1]].y); ctx.stroke();
      });
      ctx.restore();

      // 轨道参考线
      ctx.strokeStyle = ink(.1);
      ctx.beginPath(); ctx.ellipse(W / 2, H / 2, R * 1.18, R * .38, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(W / 2, H / 2, R * .38, R * 1.18, 0, 0, Math.PI * 2); ctx.stroke();

      // 内层小八面体，制造纵深
      var inner = V.map(function (v) { return project([v[0] * .46, v[1] * .46, v[2] * .46]); });
      edges.forEach(function (e) {
        var a = inner[e[0]], b = inner[e[1]];
        ctx.strokeStyle = ink(.24);
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      });

      // 半透明三角面：让线框读起来像一个实体核心
      var F = [[0, 2, 4], [2, 1, 4], [1, 3, 4], [3, 0, 4], [2, 0, 5], [1, 2, 5], [3, 1, 5], [0, 3, 5]];
      F.forEach(function (f) {
        var dep = (pts[f[0]].z + pts[f[1]].z + pts[f[2]].z) / 3;
        ctx.fillStyle = f.indexOf(hover) >= 0 ? rgba(signal(), .3) : ink(.14 + .12 * (dep + 1) / 2);
        ctx.beginPath();
        ctx.moveTo(pts[f[0]].x, pts[f[0]].y);
        ctx.lineTo(pts[f[1]].x, pts[f[1]].y);
        ctx.lineTo(pts[f[2]].x, pts[f[2]].y);
        ctx.closePath(); ctx.fill();
      });

      edges.forEach(function (e) {
        var a = pts[e[0]], b = pts[e[1]];
        var hotEdge = e[0] === hover || e[1] === hover;
        ctx.strokeStyle = hotEdge ? rgba(signal(), .95) : ink(.55 + .4 * ((a.z + b.z) / 2 + 1) / 2);
        ctx.lineWidth = hotEdge ? 2.6 : 2;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      });
      pts.forEach(function (p, i) {
        var hot = i === hover;
        var r = Math.max(2.5, (hot ? 7.5 : 4.6) * p.s);
        ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fillStyle = hot ? signal() : ink(.85); ctx.fill();
        if (hot) {
          ctx.strokeStyle = signal();
          ctx.beginPath(); ctx.arc(p.x, p.y, 13 * p.s, 0, Math.PI * 2); ctx.stroke();
        }
        ctx.font = '10px ui-monospace, monospace';
        ctx.fillStyle = ink(.62);
        ctx.fillText(String(i + 1).padStart(2, '0'), p.x + 9 * p.s, p.y - 8 * p.s);
      });
      if (read) read.textContent = 'RX ' + (rx * 57.3).toFixed(1).padStart(5, ' ') + ' / RY ' + (ry * 57.3).toFixed(1).padStart(5, ' ');
      if (hover >= 0 && tip && tip.classList.contains('is-on')) {
        tip.style.left = pts[hover].x + 'px';
        tip.style.top = pts[hover].y + 'px';
      }
    }

    function loop() {
      if (!visible) { raf = null; return; }
      if (!dragging) {
        ry += .004 + vy;
        rx = Math.max(-1.2, Math.min(1.2, rx + vx * .4));
        vy *= .94; vx *= .94;
      }
      draw();
      raf = requestAnimationFrame(loop);
    }

    function setHover(i, hx, hy) {
      if (i !== hover) {
        Array.prototype.forEach.call(bars, function (b) { b.classList.remove('is-hot'); });
        if (i >= 0 && i < bars.length) bars[i].classList.add('is-hot');
        hover = i;
      }
      if (!tip) return;
      if (i >= 0) {
        tip.textContent = String(i + 1).padStart(2, '0') + ' / ' + names[i];
        tip.style.left = (hx == null ? pts[i].x : hx) + 'px';
        tip.style.top = (hy == null ? pts[i].y : hy) + 'px';
        tip.classList.add('is-on');
      } else {
        tip.classList.remove('is-on');
      }
      if (reduce) draw();
    }

    function activate(i) {
      if (i >= bars.length) {
        var w = document.getElementById('works');
        if (w) w.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
        return;
      }
      var b = bars[i];
      b.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
      b.classList.remove('is-pulse');
      void b.offsetWidth;
      b.classList.add('is-pulse');
    }

    stage.addEventListener('pointerdown', function (e) {
      dragging = true; moved = 0;
      lastX = e.clientX; lastY = e.clientY;
      stage.classList.add('is-drag');
      if (stage.setPointerCapture) stage.setPointerCapture(e.pointerId);
    });
    stage.addEventListener('pointermove', function (e) {
      var r = stage.getBoundingClientRect();
      if (dragging) {
        var dx = e.clientX - lastX, dy = e.clientY - lastY;
        lastX = e.clientX; lastY = e.clientY;
        moved += Math.abs(dx) + Math.abs(dy);
        vy = dx * .006; vx = dy * .006;
        ry += vy;
        rx = Math.max(-1.2, Math.min(1.2, rx + vx * .4));
        setHover(-1);
      } else {
        var hx = e.clientX - r.left, hy = e.clientY - r.top;
        var best = -1, bd = 20;
        pts.forEach(function (p, i) {
          var d = Math.sqrt((p.x - hx) * (p.x - hx) + (p.y - hy) * (p.y - hy));
          if (d < bd) { bd = d; best = i; }
        });
        setHover(best, hx, hy);
      }
      if (reduce) draw();
    });
    stage.addEventListener('pointerup', function () {
      if (!dragging) return;
      dragging = false;
      stage.classList.remove('is-drag');
      if (moved < 8 && hover >= 0) activate(hover);
    });
    stage.addEventListener('pointerleave', function () { if (!dragging) setHover(-1); });
    window.addEventListener('resize', resize);

    resize();
    if (reduce) { draw(); }
    else {
      loop();
      if ('IntersectionObserver' in window) {
        var io = new IntersectionObserver(function (en) {
          visible = en[0].isIntersecting;
          if (!visible && raf) { cancelAnimationFrame(raf); raf = null; }
          if (visible && !raf) loop();
        }, { threshold: .02 });
        io.observe(stage);
      }
    }
  })();

  /* ---------- 图片放大预览 ---------- */
  (function lightbox() {
    var el = document.getElementById('lightbox');
    if (!el) return;
    var img = document.getElementById('lbImg');
    var cap = document.getElementById('lbCap');
    var count = document.getElementById('lbCount');
    var list = [];
    var idx = 0;
    var trigger = null;

    function paint() {
      var cur = list[idx];
      if (!cur) return;
      img.src = cur.src;
      img.alt = cur.cap || '作品图';
      cap.textContent = cur.cap || '';
      count.textContent = String(idx + 1).padStart(2, '0') + ' / ' + String(list.length).padStart(2, '0');
    }

    function open(src, caption, triggerEl) {
      list = Array.prototype.slice.call(document.querySelectorAll('.m-media img')).map(function (im) {
        return { src: im.getAttribute('src'), cap: im.alt };
      });
      if (!list.length) list = [{ src: src, cap: caption }];
      idx = 0;
      for (var i = 0; i < list.length; i++) { if (list[i].src === src) { idx = i; break; } }
      trigger = triggerEl || document.activeElement;
      paint();
      el.classList.add('is-open');
      el.setAttribute('aria-hidden', 'false');
    }

    function close() {
      el.classList.remove('is-open');
      el.setAttribute('aria-hidden', 'true');
      if (trigger && trigger.focus) trigger.focus();
    }

    function step(n) {
      if (!list.length) return;
      idx = (idx + n + list.length) % list.length;
      paint();
    }

    document.addEventListener('click', function (e) {
      if (!el.classList.contains('is-open')) {
        var im = e.target.closest('.m-media img');
        if (im) { open(im.getAttribute('src'), im.alt, im); return; }
      }
      if (e.target.closest('[data-lb-close]')) { close(); return; }
      var nav = e.target.closest('[data-lb-step]');
      if (nav) { step(Number(nav.dataset.lbStep)); return; }
      if (e.target === el) close();
    });

    document.addEventListener('keydown', function (e) {
      if (!el.classList.contains('is-open')) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') step(1);
      if (e.key === 'ArrowLeft') step(-1);
    });
  })();

  /* ---------- 点击回波 ---------- */
  (function ping() {
    if (reduce) return;
    document.addEventListener('pointerdown', function (e) {
      var b = document.createElement('span');
      b.className = 'ping';
      b.style.left = e.clientX + 'px';
      b.style.top = e.clientY + 'px';
      document.body.appendChild(b);
      setTimeout(function () { if (b.parentNode) b.parentNode.removeChild(b); }, 560);
    }, { passive: true });
  })();
})();
