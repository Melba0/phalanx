/* ==========================================================================
   UI 基础工具：图标 / 通知 / 弹窗 / 音效 / 存储
   ========================================================================== */
(function (LBQ) {
  'use strict';

  var ICONS = {
    learn: '<path d="M12 6.2C10 4.7 7 4.2 4 4.2v15c3 0 6 .5 8 2 2-1.5 5-2 8-2v-15c-3 0-6 .5-8 2Z"/><path d="M12 6.2v15"/>',
    play: '<path d="M3.5 20.5 20.5 3.5"/><path d="M14.5 3.5h6v6"/><path d="M9.5 20.5h-6v-6"/>',
    edit: '<path d="M4 20.2h4.2L20.5 7.9a2.9 2.9 0 0 0-4.1-4.1L4 16v4.2Z"/><path d="m14.6 5.6 3.8 3.8"/>',
    rules: '<path d="M6 4h9l4 4v12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z"/><path d="M14.5 4v4.5H19"/><path d="M9 12h6M9 15.5h6M9 8.5h2.5"/>',
    board: '<rect x="3.5" y="3.5" width="17" height="17" rx="1.5"/><path d="M9 3.5v17M15 3.5v17M3.5 9h17M3.5 15h17"/>',
    sound: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4Z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12"/>',
    mute: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4Z"/><path d="m16 9.5 5 5M21 9.5l-5 5"/>',
    undo: '<path d="M9.5 14.5 4 9l5.5-5.5"/><path d="M4 9h9.5a6.5 6.5 0 0 1 0 13H11"/>',
    redo: '<path d="M14.5 14.5 20 9l-5.5-5.5"/><path d="M20 9h-9.5a6.5 6.5 0 0 0 0 13H13"/>',
    flip: '<path d="M4 8h12l-3-3M20 16H8l3 3"/>',
    download: '<path d="M12 3.5v11"/><path d="m7.5 10.5 4.5 4.5 4.5-4.5"/><path d="M4.5 20.5h15"/>',
    upload: '<path d="M12 20.5v-11"/><path d="m7.5 13.5 4.5-4.5 4.5 4.5"/><path d="M4.5 3.5h15"/>',
    copy: '<rect x="8.5" y="8.5" width="12" height="12" rx="2"/><path d="M15.5 8.5v-3a2 2 0 0 0-2-2h-8a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h3"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>',
    check: '<path d="m4.5 12.5 5 5 10-11"/>',
    refresh: '<path d="M20 12a8 8 0 1 1-2.3-5.6"/><path d="M20 3.5V8h-4.5"/>',
    chevron: '<path d="m9 5 7 7-7 7"/>',
    sword: '<path d="M5 19 17.5 6.5"/><path d="M15 4h5v5"/><path d="m5 14 5 5M3.5 19.5 6 22"/>',
    target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="1.6"/><path d="M12 3.5v4M12 16.5v4M3.5 12h4M16.5 12h4"/>',
    spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4"/><path d="m6 6 2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18"/>',
    users: '<circle cx="9" cy="8.5" r="3"/><path d="M3.5 20a5.5 5.5 0 0 1 11 0"/><circle cx="17" cy="9.5" r="2.4"/><path d="M15.5 20a4.6 4.6 0 0 1 5-4.6"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    flag: '<path d="M5 21V4"/><path d="M5 4.5h13l-2.5 4 2.5 4H5"/>',
    key: '<circle cx="8" cy="15" r="4"/><path d="m11 12 8-8M16 7l2.5 2.5M18.5 4.5 21 7"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    trash: '<path d="M4.5 6.5h15M9 6.5V4h6v2.5M6.5 6.5l1 13h9l1-13"/>',
    arrowRight: '<path d="M4 12h15"/><path d="m13.5 6.5 6 5.5-6 5.5"/>',
    arrowLeft: '<path d="M20 12H5"/><path d="m10.5 6.5-6 5.5 6 5.5"/>',
    info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.6v.2"/>',
    crown: '<path d="M4 18h16l-1.5-9-4 4L12 5 9.5 13l-4-4L4 18Z"/><path d="M4 20.5h16"/>',
    pin: '<path d="M12 21s6.5-6 6.5-11a6.5 6.5 0 0 0-13 0C5.5 15 12 21 12 21Z"/><circle cx="12" cy="10" r="2.3"/>',
    github: '<path fill="currentColor" stroke="none" d="M12 .8a11.2 11.2 0 0 0-3.54 21.83c.56.1.77-.24.77-.54v-2.1c-3.12.68-3.78-1.32-3.78-1.32-.51-1.3-1.25-1.65-1.25-1.65-1.02-.7.08-.69.08-.69 1.13.08 1.72 1.16 1.72 1.16 1 .1.1.7 2.55 1.29.2-.92.39-1.5.71-1.84-2.49-.28-5.1-1.25-5.1-5.55 0-1.23.44-2.23 1.16-3.02-.12-.28-.5-1.43.11-2.98 0 0 .94-.3 3.08 1.15a10.7 10.7 0 0 1 5.6 0c2.14-1.45 3.08-1.15 3.08-1.15.61 1.55.23 2.7.11 2.98.72.79 1.16 1.79 1.16 3.02 0 4.31-2.62 5.27-5.11 5.55.4.35.76 1.03.76 2.08v3.09c0 .3.2.65.78.54A11.2 11.2 0 0 0 12 .8Z"/>',
    external: '<path d="M14 4h6v6"/><path d="M20 4 11 13"/><path d="M19 14.5V19a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 19V6.5A1.5 1.5 0 0 1 5 5h4.5"/>',
    database: '<ellipse cx="12" cy="5.5" rx="7.5" ry="3"/><path d="M4.5 5.5v13c0 1.66 3.36 3 7.5 3s7.5-1.34 7.5-3v-13"/><path d="M4.5 12c0 1.66 3.36 3 7.5 3s7.5-1.34 7.5-3"/>',
    lock: '<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>'
  };

  function icon(name, cls) {
    var p = ICONS[name] || '';
    return '<svg class="ico ' + (cls || '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>';
  }

  function escapeHTML(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  }

  /* ---------------------------------------------------------- 通知 */
  function toast(msg, type, ms) {
    var root = document.getElementById('toast-root');
    if (!root) return;
    var t = el('div', 'toast ' + (type || ''), escapeHTML(msg));
    root.appendChild(t);
    setTimeout(function () {
      t.classList.add('out');
      setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 240);
    }, ms || (type === 'warn' ? 3000 : 2200));
    while (root.children.length > 3) root.removeChild(root.firstChild);
  }

  /* ---------------------------------------------------------- 弹窗 */
  var modalStack = [];
  function openModal(opts) {
    opts = opts || {};
    var root = document.getElementById('modal-root');
    var backdrop = el('div', 'modal-backdrop');
    var box = el('div', 'modal');
    if (opts.width) box.style.width = opts.width;
    var head = el('div', 'modal-head');
    head.innerHTML = '<div><h3>' + (opts.title || '') + '</h3>' +
      (opts.subtitle ? '<p>' + opts.subtitle + '</p>' : '') + '</div>';
    var closeBtn = el('button', 'icon-btn modal-close', icon('close'));
    closeBtn.type = 'button';
    head.appendChild(closeBtn);
    var body = el('div', 'modal-body', opts.body || '');
    var foot = el('div', 'modal-foot');
    var api = {
      root: box, body: body, foot: foot,
      close: function () {
        if (backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
        modalStack = modalStack.filter(function (m) { return m !== api; });
        if (opts.onClose) opts.onClose();
      }
    };
    (opts.actions || []).forEach(function (a) {
      var b = el('button', 'btn ' + (a.cls || 'btn-quiet'), (a.icon ? icon(a.icon) : '') + (a.label || ''));
      b.type = 'button';
      b.addEventListener('click', function () {
        if (a.onClick) {
          var r = a.onClick(api);
          if (r === false) return;
        }
        if (a.close !== false) api.close();
      });
      foot.appendChild(b);
    });
    if (!opts.actions || !opts.actions.length) foot.style.display = 'none';
    box.appendChild(head);
    box.appendChild(body);
    if (foot.children.length) box.appendChild(foot);
    backdrop.appendChild(box);
    root.appendChild(backdrop);
    modalStack.push(api);
    closeBtn.addEventListener('click', api.close);
    backdrop.addEventListener('mousedown', function (e) { if (e.target === backdrop) api.close(); });
    var firstInput = box.querySelector('textarea, input');
    if (firstInput) setTimeout(function () { firstInput.focus(); }, 40);
    return api;
  }
  function closeTopModal() {
    if (modalStack.length) modalStack[modalStack.length - 1].close();
    return !!modalStack.length;
  }

  function confirmDialog(o) {
    return new Promise(function (resolve) {
      openModal({
        title: o.title || '确认',
        subtitle: o.subtitle || '',
        body: o.body || '',
        width: o.width,
        actions: [
          { label: o.cancelText || '取消', cls: 'btn-quiet', onClick: function () { resolve(false); } },
          {
            label: o.okText || '确定', cls: o.danger ? 'btn-primary' : 'btn-primary',
            onClick: function () { resolve(true); }
          }
        ],
        onClose: function () { resolve(false); }
      });
    });
  }

  /* ---------------------------------------------------------- 音效 */
  var audio = null;
  var soundOn = true;
  try {
    var saved = localStorage.getItem('phalanx.sound');
    if (saved === 'off') soundOn = false;
  } catch (e) { }
  function ensureAudio() {
    if (audio) { if (audio.state === 'suspended') audio.resume(); return audio; }
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    audio = new AC();
    return audio;
  }
  function blip(freq, dur, type, gain, slideTo) {
    var ctx = ensureAudio();
    if (!ctx) return;
    var o = ctx.createOscillator();
    var g = ctx.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, ctx.currentTime);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + dur);
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(gain || 0.05, ctx.currentTime + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    o.connect(g); g.connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + dur + 0.02);
  }
  function noise(dur, gain, freq) {
    var ctx = ensureAudio();
    if (!ctx) return;
    var len = Math.floor(ctx.sampleRate * dur);
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var data = buf.getChannelData(0);
    for (var i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.4);
    var src = ctx.createBufferSource();
    src.buffer = buf;
    var f = ctx.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.value = freq || 1200; f.Q.value = 0.9;
    var g = ctx.createGain(); g.gain.value = gain || 0.06;
    src.connect(f); f.connect(g); g.connect(ctx.destination);
    src.start();
  }
  var sound = {
    get enabled() { return soundOn; },
    setEnabled: function (v) {
      soundOn = !!v;
      try { localStorage.setItem('phalanx.sound', soundOn ? 'on' : 'off'); } catch (e) { }
      if (soundOn) { ensureAudio(); sound.play('pick'); }
    },
    play: function (name) {
      if (!soundOn) return;
      try {
        switch (name) {
          case 'pick': blip(520, .05, 'triangle', .028); break;
          case 'select': blip(660, .07, 'triangle', .04); blip(880, .05, 'sine', .02); break;
          case 'move': noise(.06, .04, 900); blip(190, .09, 'sine', .055, 140); break;
          case 'capture': noise(.12, .08, 500); blip(120, .16, 'sine', .075, 70); blip(300, .06, 'square', .02); break;
          case 'drop': blip(420, .05, 'triangle', .03, 340); noise(.04, .025, 1600); break;
          case 'promote': blip(660, .1, 'triangle', .035); setTimeout(function () { blip(880, .12, 'triangle', .035); }, 80); setTimeout(function () { blip(1320, .2, 'sine', .03); }, 170); break;
          case 'deny': blip(150, .12, 'square', .03, 110); break;
          case 'alert': blip(740, .07, 'triangle', .03); setTimeout(function () { blip(560, .1, 'triangle', .025); }, 70); break;
          case 'win': [523, 659, 784, 1047].forEach(function (f, i) { setTimeout(function () { blip(f, .35, 'sine', .04); }, i * 100); }); break;
          case 'lose': [440, 370, 294].forEach(function (f, i) { setTimeout(function () { blip(f, .3, 'sine', .04); }, i * 120); }); break;
        }
      } catch (e) { }
    }
  };

  /* ---------------------------------------------------------- 存储 */
  var store = {
    get: function (k, d) {
      try { var v = localStorage.getItem('phalanx.' + k); return v == null ? d : JSON.parse(v); }
      catch (e) { return d; }
    },
    set: function (k, v) {
      try { localStorage.setItem('phalanx.' + k, JSON.stringify(v)); } catch (e) { }
    }
  };

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).then(function () { return true; }).catch(function () { return fallbackCopy(text); });
    }
    return Promise.resolve(fallbackCopy(text));
  }
  function fallbackCopy(text) {
    try {
      var ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      var ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch (e) { return false; }
  }

  function revealAll(root) {
    var nodes = (root || document).querySelectorAll('[data-reveal]');
    if (!nodes.length) return;
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || !('IntersectionObserver' in window)) {
      Array.prototype.forEach.call(nodes, function (n) { n.classList.add('in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add('in');
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    Array.prototype.forEach.call(nodes, function (n) { io.observe(n); });
  }

  LBQ.icon = icon;
  LBQ.el = el;
  LBQ.escapeHTML = escapeHTML;
  LBQ.toast = toast;
  LBQ.openModal = openModal;
  LBQ.closeTopModal = closeTopModal;
  LBQ.confirm = confirmDialog;
  LBQ.sound = sound;
  LBQ.store = store;
  LBQ.copyText = copyText;
  LBQ.revealAll = revealAll;
})(window.LBQ = window.LBQ || {});


