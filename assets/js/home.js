/* ==========================================================================
   首页：英雄区 + 自演示棋局 + 特性
   ========================================================================== */
(function (LBQ) {
  'use strict';

  var ICON = LBQ.icon;
  var el, board, hero;
  var baseSetup = {
    size: 9,
    pieces: [
      'wK@e1', 'wR@c2', 'wP@c3', 'wB@c4', 'wR@g2', 'wB@f2', 'wP@b2',
      'bK@e9', 'bP@c6,c7', 'bR@f7', 'bB@h8', 'bP@g7,h7', 'bR@a7'
    ]
  };
  var plans = [
    {
      cells: ['c2', 'c3', 'c4'], dir: 'n',
      title: '整段平移',
      sub: '同一直线上连续的三枚棋子，作为一条线段一起前进一格'
    },
    {
      cells: ['c3', 'c4', 'c5'], dir: 'n',
      title: '顶头对撞',
      sub: '正交比车数：1 &gt; 0。敌段排头阵亡，其余编成俘虏进入持棋台'
    },
    {
      cells: ['c5', 'c6', 'c7'], dir: 'n',
      title: '入阵升变',
      sub: '踏入对方阵营的前卫立刻获得金色标记，从此可以后退'
    },
    {
      cells: ['c6', 'c7', 'c8'], dir: 'n',
      title: '全段升变',
      sub: '整条线段都升变后，才能整段后撤或向后冲撞'
    }
  ];
  var demo = null, timer = null, planIndex = 0;

  function init() {
    el = document.getElementById('page-home');
    el.innerHTML = '' +
      '<div class="hero">' +
      '  <div class="hero-glow"></div>' +
      '  <div class="wrap hero-grid">' +
      '    <div class="hero-copy">' +
      '      <div class="eyebrow">无随机 · 完全信息 · 抽象策略</div>' +
      '      <h1 class="hero-title"><span>PHALANX</span></h1>' +
      '      <div class="hero-sub"><em>连 兵 棋 · 兵 线 会 战</em><i></i><span>整段推进 · 顶头对撞 · 入阵升变</span></div>' +
      '      <p class="hero-lead">两支冷兵器方阵在棋盘上整段推进、正面互撞。吃掉敌阵，俘虏编入麾下，再择机投入战场。' +
      '        深入敌阵的棋子将获得荣誉升变，赢得向后转身的资格。</p>' +
      '      <div class="hero-cta">' +
      '        <a class="btn btn-primary" href="#/learn">' + ICON('learn') + '开始交互教程</a>' +
      '        <a class="btn btn-ghost" href="#/play">' + ICON('play') + '直接对弈</a>' +
      '        <a class="text-link" href="#/rules">先读规则' + ICON('arrowRight') + '</a>' +
      '      </div>' +
      '      <div class="hero-meta">' +
      '        <div><b>3</b><span>种棋盘<br>9 / 11 / 13 路</span></div>' +
      '        <div><b>4</b><span>类棋子<br>王 · 车 · 象 · 兵</span></div>' +
      '        <div><b>0</b><span>随机与 AI<br>纯本地双人</span></div>' +
      '      </div>' +
      '    </div>' +
      '    <div class="hero-board-col">' +
      '      <div class="hero-board-card">' +
      '        <div class="board-stage" id="hero-board"></div>' +
      '        <div class="hero-caption">' +
      '          <div class="hc-step"><span id="hc-num">01</span><em>/ 04</em></div>' +
      '          <div class="hc-body"><b id="hc-title">整段平移</b><span id="hc-sub">三枚棋子沿直线一起前进一格</span></div>' +
      '        </div>' +
      '        <div class="hc-dots" id="hc-dots"></div>' +
      '      </div>' +
      '      <div class="hero-float hf-a"><i></i>整段推进</div>' +
      '    </div>' +
      '  </div>' +
      '  <div class="hero-watermark">兵</div>' +
      '</div>' +

      '<section class="section">' +
      '  <div class="wrap">' +
      '    <div class="section-head">' +
      '      <div><div class="eyebrow">五件事，一次做全</div><h2>从看懂规则，到亲手落子</h2></div>' +
      '      <p>没有账号、没有联网、没有 AI。棋盘、教程、对弈与分析，都在一个静态页面里。</p>' +
      '    </div>' +
      '    <div class="feature-grid">' +
      feature('learn', '交互教程', '十个短课从线段讲到胜负。走错时，规则会告诉你为什么不行。', '#/learn', '进入教程') +
      feature('sword', '本地对弈', '同一块棋盘轮流落子。悔棋、重做、翻转、记谱，一样不少。', '#/play', '开始对弈') +
      feature('target', '树形分析', '棋谱树、变例、兵力与对撞机会，只看客观数据，不含 AI。', '#/analysis', '打开分析') +
      feature('spark', '练习题', '由局面 + 唯一解法生成题目，按顺序校验，保存在本机。', '#/practice', '去练习') +
      feature('edit', '棋盘编辑器', '摆任意局面，设置持棋台与行棋方，直接进入对弈。', '#/editor', '打开编辑器') +
      '    </div>' +
      '  </div>' +
      '</section>' +

      '<section class="section section-rule-strip">' +
      '  <div class="wrap">' +
      '    <div class="rule-strip">' +
      '      <div class="rs-head"><div class="eyebrow">一局怎么走</div><h2>四步，就懂这盘棋</h2></div>' +
      '      <ol class="rs-steps">' +
      '        <li><span>01</span><b>选一条线段</b><p>同一直线上连续的己方棋子，整段是一个整体。</p></li>' +
      '        <li><span>02</span><b>整段平移一格</b><p>八个方向都可，但未升变的白方不可向下、黑方不可向上。</p></li>' +
      '        <li><span>03</span><b>顶头对撞</b><p>正交比车数，斜线比象数；相等再比段长。≥ 即可吃。</p></li>' +
      '        <li><span>04</span><b>俘虏打入 · 入阵升变</b><p>排头阵亡，其余入台；落入敌阵的俘虏立即升变。</p></li>' +
      '      </ol>' +
      '    </div>' +
      '  </div>' +
      '</section>' +

      '<section class="section">' +
      '  <div class="wrap">' +
      '    <div class="cta-band">' +
      '      <div>' +
      '        <div class="eyebrow">纯静态 · 打开即用</div>' +
      '        <h2>棋盘已经摆好，就等你落子。</h2>' +
      '        <p>三分钟学会走法，一杯茶下完一局。</p>' +
      '      </div>' +
      '      <div class="cta-actions">' +
      '        <a class="btn btn-primary" href="#/play">' + ICON('play') + '开始本地对弈</a>' +
      '        <a class="btn btn-quiet" href="#/editor">' + ICON('edit') + '摆一个局面</a>' +
      '      </div>' +
      '    </div>' +
      '  </div>' +
      '</section>';

    board = new LBQ.BoardView(el.querySelector('#hero-board'), {});
    board.setMode('none');
    hero = new LBQ.HeroDemo();
    renderDots(-1);
    LBQ.pages.home._board = board;
  }

  function feature(icon, title, desc, href, cta) {
    var ico = (icon === 'sword' || icon === 'target' || icon === 'edit' || icon === 'learn')
      ? '<span class="feature-ico">' + ICON(icon) + '</span>'
      : '<span class="feature-ico">' + ICON(icon) + '</span>';
    return '<a class="feature" href="' + href + '">' +
      ico +
      '<h3>' + title + '</h3><p>' + desc + '</p>' +
      '<span class="feature-link">' + cta + ICON('arrowRight') + '</span>' +
      '</a>';
  }

  function renderDots(active) {
    var d = el && el.querySelector('#hc-dots');
    if (!d) return;
    d.innerHTML = plans.map(function (_, i) {
      return '<i class="' + (i === active ? 'on' : '') + '"></i>';
    }).join('');
  }

  function caption(i) {
    var p = plans[Math.min(i, plans.length - 1)];
    var num = el.querySelector('#hc-num');
    var title = el.querySelector('#hc-title');
    var sub = el.querySelector('#hc-sub');
    if (!num) return;
    num.textContent = i < 0 ? '—' : ('0' + Math.min(i + 1, plans.length));
    title.textContent = i < 0 ? '整段推进' : p.title;
    sub.innerHTML = i < 0 ? '三枚棋子沿同一条直线一起前进一格' : p.sub;
    title.classList.remove('fade');
    sub.classList.remove('fade');
    void title.offsetWidth;
    title.classList.add('fade');
    sub.classList.add('fade');
  }

  function clearTimer() {
    if (timer) { clearTimeout(timer); timer = null; }
  }

  function resetDemo() {
    clearTimer();
    demo = LBQ.buildGame(baseSetup).game;
    planIndex = 0;
    board.setGame(demo, { reset: true });
    renderDots(-1);
    caption(-1);
    timer = setTimeout(stepDemo, 1500);
  }

  function stepDemo() {
    if (!demo) return;
    if (planIndex >= plans.length) return;
    var plan = plans[planIndex];
    var cells = plan.cells.map(function (s) { return LBQ.parseSquare(9, s); });
    demo.current = 0;
    demo.winner = null;
    demo.draw = false;
    var next = demo.clone();
    next.current = 0;
    var act = next.actionFor(cells, plan.dir);
    if (!act.ok) { resetDemo(); return; }
    next.apply(act);
    demo = next;
    demo.current = 0;
    demo.winner = null;
    demo.draw = false;
    var last = [];
    act.cells.forEach(function (p) { last.push(p); });
    if (act.to) act.to.forEach(function (p) { last.push(p); });
    board.setGame(demo, { animate: true, lastCells: last });
    renderDots(planIndex);
    caption(planIndex);
    planIndex++;
    if (planIndex >= plans.length) {
      timer = setTimeout(resetDemo, 3000);
    } else {
      timer = setTimeout(stepDemo, 1900);
    }
  }

  function onEnter() {
    if (!board) return;
    board._measure();
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      if (!demo) {
        demo = LBQ.buildGame(baseSetup).game;
        board.setGame(demo, { reset: true });
      }
      return;
    }
    if (!timer && (!demo || planIndex >= plans.length)) resetDemo();
    else if (!timer) timer = setTimeout(stepDemo, 400);
  }

  LBQ.HeroDemo = function () { };
  LBQ.pages = LBQ.pages || {};
  LBQ.pages.home = {
    init: function () { init(); },
    onEnter: onEnter
  };
})(window.LBQ = window.LBQ || {});




