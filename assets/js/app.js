/* ==========================================================================
   路由与启动
   ========================================================================== */
(function (LBQ) {
  'use strict';

  var ORDER = ['home', 'learn', 'play', 'analysis', 'practice', 'editor', 'rules'];
  var TITLES = {
    home: '首页', learn: '交互教程', play: '本地对弈', analysis: '棋谱分析', practice: '练习题', editor: '棋盘编辑器', rules: '规则速查'
  };
  var current = null;

  function parseHash() {
    var raw = (location.hash || '#/').replace(/^#\/?/, '');
    var parts = raw.split('/');
    var name = parts[0] || 'home';
    if (ORDER.indexOf(name) < 0) name = 'home';
    return { name: name, sub: parts[1] || null };
  }

  function route() {
    var r = parseHash();
    document.querySelectorAll('.page').forEach(function (p) {
      p.classList.toggle('active', p.dataset.page === r.name);
    });
    document.querySelectorAll('[data-nav]').forEach(function (a) {
      a.classList.toggle('active', a.dataset.nav === r.name);
    });
    var page = LBQ.pages[r.name];
    if (page && page.onEnter) {
      try { page.onEnter(r.sub); } catch (err) { console.error('page enter failed', err); }
    }
    if (current !== r.name) {
      try { window.scrollTo({ top: 0, behavior: 'auto' }); } catch (e) { window.scrollTo(0, 0); }
    }
    current = r.name;
    setTimeout(updateProgress, 40);
    var extra = '';
    if (r.name === 'learn' && r.sub) {
      var L = LBQ.lessonById(r.sub);
      if (L) extra = ' · ' + L.title;
    }
    document.title = (TITLES[r.name] || '连兵棋') + extra + ' — Phalanx · 连兵棋';
  }

  function updateProgress() {
    var bar = document.getElementById('scroll-progress');
    if (!bar) return;
    var max = document.documentElement.scrollHeight - window.innerHeight;
    var p = max > 4 ? window.scrollY / max : 0;
    bar.style.transform = 'scaleX(' + Math.min(1, Math.max(0, p)).toFixed(4) + ')';
  }

  function boot() {
    document.body.insertAdjacentHTML('afterbegin', LBQ.pieceGradients);

    var st = document.getElementById('sound-toggle');
    function paintSound() {
      if (!st) return;
      st.innerHTML = LBQ.icon(LBQ.sound.enabled ? 'sound' : 'mute');
      st.classList.toggle('is-on', LBQ.sound.enabled);
      st.setAttribute('aria-label', LBQ.sound.enabled ? '关闭音效' : '开启音效');
      st.title = LBQ.sound.enabled ? '音效：开' : '音效：关';
    }
    if (st) {
      paintSound();
      st.addEventListener('click', function () {
        LBQ.sound.setEnabled(!LBQ.sound.enabled);
        paintSound();
        LBQ.toast(LBQ.sound.enabled ? '音效已开启' : '音效已关闭', 'ok', 1400);
      });
    }

    ORDER.forEach(function (name) {
      var page = LBQ.pages[name];
      if (!page) return;
      try {
        if (page.init) page.init();
      } catch (err) {
        console.error('page init failed: ' + name, err);
        LBQ.toast('页面初始化失败：' + name + '（详见控制台）', 'warn', 5000);
      }
    });

    window.addEventListener('hashchange', route);
    window.addEventListener('scroll', updateProgress, { passive: true });
    window.addEventListener('resize', updateProgress);
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      if (LBQ.closeTopModal()) return;
      document.dispatchEvent(new CustomEvent('lbq-escape'));
    });
    route();
    updateProgress();
    setTimeout(updateProgress, 80);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(window.LBQ = window.LBQ || {});


