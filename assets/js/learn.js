/* ==========================================================================
   交互教程
   ========================================================================== */
(function (LBQ) {
  'use strict';

  var ICON = LBQ.icon;
  var el, board, trayW, trayB;
  var refs = {};
  var progress = LBQ.store.get('learn', {}) || {};
  var state = {
    li: 0, si: 0, game: null, stepStart: null,
    completed: false, finished: false, traySel: null, maxStep: 0
  };

  var LEGEND_COUNT = { K: 1, R: 6, B: 6, P: 14 };
  var PIECE_LABEL = LBQ.PIECE_LABEL;

  function init() {
    el = document.getElementById('page-learn');
    el.innerHTML = '' +
      '<div class="wrap">' +
      '  <div class="page-head learn-head">' +
      '    <div>' +
      '      <div class="eyebrow">从零开始 · 一步一步</div>' +
      '      <h1>学 习 走 法</h1>' +
      '      <p class="page-desc">十个短课，覆盖线段、平移、后退、升变、对撞、吃子结果、打入与胜负。' +
      '        每一步都在棋盘上亲手完成，做错了规则会告诉你原因。</p>' +
      '    </div>' +
      '    <div class="learn-progress">' +
      '      <div class="lp-ring" id="lp-ring"><span id="lp-done">0</span><em>/ 10</em></div>' +
      '      <div><b>课程进度</b><span id="lp-label">尚未开始</span></div>' +
      '    </div>' +
      '  </div>' +
      '  <div class="learn-grid">' +
      '    <aside class="lesson-list panel">' +
      '      <div class="lesson-list-head"><span>课程目录</span><em>10 课</em></div>' +
      '      <div class="lesson-items" id="lesson-items"></div>' +
      '      <div class="lesson-list-foot">' +
      '        <a href="#/rules" class="mini-link">完整规则 →</a>' +
      '      </div>' +
      '    </aside>' +
      '    <div class="lesson-board-col">' +
      '      <div class="lesson-board-top">' +
      '        <span class="lesson-crumb" id="lesson-crumb">第 1 课 · 入门</span>' +
      '        <div class="step-dots" id="step-dots"></div>' +
      '      </div>' +
      '      <div class="lesson-trays" id="lesson-trays" hidden>' +
      '        <div class="lesson-tray" id="lesson-tray-w" hidden>' +
      '          <span class="lt-label"><i class="side-orb"></i>白方持棋台</span>' +
      '          <div class="lt-host" id="lt-w"></div>' +
      '        </div>' +
      '        <div class="lesson-tray" id="lesson-tray-b" hidden>' +
      '          <span class="lt-label"><i class="side-orb black"></i>黑方持棋台</span>' +
      '          <div class="lt-host" id="lt-b"></div>' +
      '        </div>' +
      '      </div>' +
      '      <div class="board-stage" id="lesson-board"></div>' +
      '    </div>' +
      '    <aside class="lesson-panel panel" id="lesson-panel">' +
      '      <div class="lp-body" id="lp-body">' +
      '        <div class="lesson-chapter" id="lesson-tag">第 1 课 · 入门</div>' +
      '        <h2 id="lesson-title">棋盘与棋子</h2>' +
      '        <div class="step-meta"><span id="step-label">步骤 1 / 4</span></div>' +
      '        <div class="step-lead" id="step-lead"></div>' +
      '        <div class="step-text" id="step-text"></div>' +
      '        <div id="step-legend"></div>' +
      '        <div class="task-card" id="task-card">' +
      '          <div class="task-label">你的任务</div>' +
      '          <div class="task-text" id="task-text"></div>' +
      '          <div class="quiz-options" id="quiz-options"></div>' +
      '        </div>' +
      '        <div class="feedback" id="feedback" hidden></div>' +
      '        <div class="after-card" id="after-card" hidden>' +
      '          <div class="after-label">' + ICON('check') + '看懂了</div>' +
      '          <div class="after-text" id="after-text"></div>' +
      '        </div>' +
      '        <div class="lesson-actions">' +
      '          <button class="btn btn-sm btn-quiet" data-act="hint">' + ICON('spark') + '提示</button>' +
      '          <button class="btn btn-sm btn-quiet" data-act="reset">' + ICON('refresh') + '重来</button>' +
      '          <button class="btn btn-primary" data-act="next" id="btn-next" disabled>继续' + ICON('arrowRight') + '</button>' +
      '        </div>' +
      '        <div class="lesson-nav">' +
      '          <button class="link-btn" data-act="prev-lesson">' + ICON('arrowLeft') + '上一课</button>' +
      '          <span id="lesson-index">1 / 10</span>' +
      '          <button class="link-btn" data-act="next-lesson">下一课' + ICON('arrowRight') + '</button>' +
      '        </div>' +
      '      </div>' +
      '      <div class="finish-card" id="finish-card" hidden></div>' +
      '    </aside>' +
      '  </div>' +
      '</div>';

    refs = {
      items: el.querySelector('#lesson-items'),
      dots: el.querySelector('#step-dots'),
      boardHost: el.querySelector('#lesson-board'),
      crumb: el.querySelector('#lesson-crumb'),
      tag: el.querySelector('#lesson-tag'),
      title: el.querySelector('#lesson-title'),
      stepLabel: el.querySelector('#step-label'),
      lead: el.querySelector('#step-lead'),
      text: el.querySelector('#step-text'),
      legend: el.querySelector('#step-legend'),
      taskCard: el.querySelector('#task-card'),
      taskText: el.querySelector('#task-text'),
      quiz: el.querySelector('#quiz-options'),
      feedback: el.querySelector('#feedback'),
      after: el.querySelector('#after-card'),
      afterText: el.querySelector('#after-text'),
      btnNext: el.querySelector('#btn-next'),
      lessonIndex: el.querySelector('#lesson-index'),
      lpDone: el.querySelector('#lp-done'),
      lpLabel: el.querySelector('#lp-label'),
      lpRing: el.querySelector('#lp-ring'),
      trays: el.querySelector('#lesson-trays'),
      trayWRow: el.querySelector('#lesson-tray-w'),
      trayBRow: el.querySelector('#lesson-tray-b'),
      panel: el.querySelector('#lesson-panel'),
      lpBody: el.querySelector('#lp-body'),
      finish: el.querySelector('#finish-card')
    };

    board = new LBQ.BoardView(refs.boardHost, {
      onAction: onAction,
      onProbe: onProbe,
      onCell: onCell,
      onSelect: function () {
        if (state.traySel) { state.traySel = null; syncTrays(); }
      },
      onDropMiss: function () {
        setFeedback('这里不是排头格：移到能放下整段的位置，出现紫色预览后再点击。', 'warn');
      },
      onForeign: function () {
        setFeedback('这是对方的棋子，本步要操作的是白方（或黑方）棋子。', 'warn');
      },
      onCancel: function () { }
    });
    trayW = new LBQ.TrayView(el.querySelector('#lt-w'), {
      onPick: function (ti, k) { onTrayPick(ti, k, 0); }
    });
    trayB = new LBQ.TrayView(el.querySelector('#lt-b'), {
      onPick: function (ti, k) { onTrayPick(ti, k, 1); }
    });
    LBQ.pages.learn.board = board;

    el.addEventListener('click', function (e) {
      var b = e.target.closest('[data-act]');
      if (b) {
        var act = b.dataset.act;
        if (act === 'next') nextStep();
        else if (act === 'reset') resetStep();
        else if (act === 'hint') showHint();
        else if (act === 'prev-lesson') goLesson(state.li - 1);
        else if (act === 'next-lesson') goLesson(state.li + 1);
        else if (act === 'restart-lesson') { state.game = null; loadLesson(state.li); }
        return;
      }
      var item = e.target.closest('[data-lesson]');
      if (item) { goLesson(+item.dataset.lesson); return; }
      var q = e.target.closest('[data-quiz]');
      if (q) { answerQuiz(+q.dataset.quiz); return; }
      var fin = e.target.closest('[data-finish]');
      if (fin) {
        if (fin.dataset.finish === 'next') goLesson(state.li + 1);
        else if (fin.dataset.finish === 'play') location.hash = '#/play';
        return;
      }
    });

    document.addEventListener('lbq-escape', function () {
      if (state.traySel) { state.traySel = null; syncTrays(); }
      board.clearSelection();
    });

    renderList();
  }

  function lesson() { return LBQ.lessons[state.li]; }
  function step() { return lesson().steps[state.si]; }

  /* ---------------------------------------------------------------- 课程列表 */
  function renderList() {
    if (!refs.items) return;
    var html = '';
    LBQ.lessons.forEach(function (L, i) {
      var done = !!progress[L.id];
      var iconHtml = L.icon.t === 'sword' ? ICON('sword') :
        '<span class="li-pc">' + LBQ.pieceSVG(L.icon.t, L.icon.p) + '</span>';
      html += '<button class="lesson-item' + (i === state.li ? ' active' : '') + (done ? ' done' : '') + '" data-lesson="' + i + '">' +
        '<span class="li-icon">' + iconHtml + '</span>' +
        '<span class="li-body"><span class="li-num">第 ' + (i + 1) + ' 课 · ' + L.tag + '</span>' +
        '<b>' + L.title + '</b><em>' + L.desc + '</em></span>' +
        '<span class="li-check">' + (done ? ICON('check') : '') + '</span>' +
        '</button>';
    });
    refs.items.innerHTML = html;
    var doneCount = LBQ.lessons.filter(function (L) { return progress[L.id]; }).length;
    refs.lpDone.textContent = doneCount;
    refs.lpLabel.textContent = doneCount === 0 ? '尚未开始' :
      (doneCount >= LBQ.lessons.length ? '全部完成' : '已完成 ' + doneCount + ' 课');
    if (refs.lpRing) refs.lpRing.style.setProperty('--p', (doneCount / LBQ.lessons.length * 360) + 'deg');
  }

  /* ---------------------------------------------------------------- 载入课程 */
  function goLesson(i) {
    i = Math.max(0, Math.min(LBQ.lessons.length - 1, i));
    if (i === state.li && state.game) return;
    var target = '#/learn/' + LBQ.lessons[i].id;
    if (location.hash !== target) location.hash = target;
    else loadLesson(i);
  }

  function loadLesson(i) {
    state.li = Math.max(0, Math.min(LBQ.lessons.length - 1, i));
    state.si = 0;
    state.finished = false;
    state.game = null;
    state.traySel = null;
    var first = lesson().steps[0];
    state.game = makeGame(first.setup);
    state.stepStart = state.game.clone();
    renderList();
    loadStep(0, true);
    if (location.hash.indexOf('#/learn/') === 0 && location.hash !== '#/learn/' + lesson().id) {
      history.replaceState(null, '', '#/learn/' + lesson().id);
    }
  }

  function makeGame(setup) {
    if (!setup) return new LBQ.Game(9).setupStandard();
    if (setup.standard) return new LBQ.Game(setup.size || 9).setupStandard();
    var built = LBQ.buildGame(setup);
    if (built.errors && built.errors.length) console.warn('lesson setup errors', built.errors);
    return built.game;
  }

  function loadStep(si, reset) {
    var L = lesson();
    var s = L.steps[si];
    state.si = si;
    state.completed = false;
    state.finished = false;
    state.traySel = null;
    if (reset || s.setup) {
      if (s.setup) state.game = makeGame(s.setup);
      else if (!state.game) state.game = makeGame(L.steps[0].setup);
    }
    if (!state.game) state.game = makeGame(L.steps[0].setup);
    if (state.game.winner === null && !state.game.draw) {
      state.game.current = s.actor === 1 ? 1 : 0;
    }
    if (reset || s.setup) {
      board.setGame(state.game, { reset: true });
    } else {
      board.setGame(state.game, { animate: false, reset: false });
    }
    state.stepStart = state.game.clone();
    board.setMode(s.task.kind === 'click' ? 'click' :
      (s.task.kind === 'free' || s.task.kind === 'quiz' ? 'none' : 'select'));
    board.setFocus(s.focus || []);
    board.clearSelection(true);
    if (s.task.kind === 'free') state.completed = true;
    renderPanel();
    syncTrays();
    if (reset) {
      refs.panel.scrollTop = 0;
      window.setTimeout(function () { board._measure(); }, 30);
    }
  }

  /* ---------------------------------------------------------------- 面板 */
  function renderPanel() {
    var L = lesson();
    var s = L.steps[state.si];
    refs.lpBody.hidden = false;
    refs.finish.hidden = true;
    refs.tag.textContent = '第 ' + (state.li + 1) + ' 课 · ' + L.tag;
    refs.title.textContent = L.title;
    refs.crumb.textContent = '第 ' + (state.li + 1) + ' 课 · ' + L.tag + ' · ' + L.title;
    refs.lessonIndex.textContent = (state.li + 1) + ' / ' + LBQ.lessons.length;
    refs.stepLabel.textContent = '步骤 ' + (state.si + 1) + ' / ' + L.steps.length;
    refs.lead.textContent = s.lead || '';
    refs.text.innerHTML = s.text || '';
    refs.legend.innerHTML = s.legend ? legendHTML() : '';
    refs.legend.hidden = !s.legend;

    refs.taskText.innerHTML = s.task.text || defaultTaskText(s.task);
    refs.taskCard.hidden = false;
    refs.quiz.innerHTML = '';
    refs.quiz.hidden = true;
    if (s.task.kind === 'quiz') {
      refs.quiz.hidden = false;
      refs.quiz.innerHTML = (s.task.options || []).map(function (o, i) {
        return '<button class="quiz-opt" data-quiz="' + i + '"><span class="qk">' + 'ABCD'[i] + '</span>' + o.label + '</button>';
      }).join('');
    }
    if (s.task.kind === 'free') {
      refs.taskCard.hidden = true;
    }

    refs.feedback.hidden = true;
    refs.feedback.innerHTML = '';
    refs.after.hidden = true;
    refs.afterText.innerHTML = '';
    refs.btnNext.disabled = s.task.kind !== 'free';
    refs.btnNext.innerHTML = (state.si === L.steps.length - 1 ? '完成本课' : '继续') + ICON('arrowRight');

    var dots = '';
    for (var i = 0; i < L.steps.length; i++) {
      var cls = i === state.si ? 'current' : (i < state.si || (i === state.si && state.completed) ? 'done' : '');
      dots += '<i class="' + cls + '"></i>';
    }
    refs.dots.innerHTML = dots;
  }

  function defaultTaskText(task) {
    if (!task) return '';
    if (task.kind === 'action') return '在棋盘上完成这一步。';
    if (task.kind === 'probe') return '试着违反规则，观察结果。';
    if (task.kind === 'click') return '点击棋盘上的目标。';
    if (task.kind === 'free') return '读完这段说明后继续。';
    return '';
  }

  function legendHTML() {
    var order = [
      { t: 'K', name: '王', n: 1, note: '不能阵亡的兵' },
      { t: 'R', name: '车', n: 6, note: '正交属性' },
      { t: 'B', name: '象', n: 6, note: '斜线属性' },
      { t: 'P', name: '兵', n: 14, note: '只贡献长度' }
    ];
    return '<div class="piece-legend">' + order.map(function (x) {
      return '<div class="pl-item">' +
        '<span class="pl-pair"><span>' + LBQ.pieceSVG(x.t, 0) + '</span><span>' + LBQ.pieceSVG(x.t, 1) + '</span></span>' +
        '<span class="pl-text"><b>' + x.name + '</b><em>' + x.n + ' 枚 · ' + x.note + '</em></span>' +
        '</div>';
    }).join('') + '</div>';
  }

  /* ---------------------------------------------------------------- 交互 */
  function onAction(act) {
    var s = step();
    if (state.completed || s.task.kind !== 'action') return;
    if (!matchTask(s.task, act)) {
      wrong('这不是本步的目标走法。' + (s.task.hint ? '' : '先读一遍任务说明。'));
      return;
    }
    var game = state.game.clone();
    game.apply(act);
    state.game = game;
    state.completed = true;
    state.traySel = null;
    board.setFocus([]);
    var path = act.cells ? act.cells.slice() : [];
    if (act.type === 'move') path = path.concat(act.to);
    if (act.type === 'capture') {
      act.cells.forEach(function (p) { path.push([p[0] + act.shiftVec[0], p[1] + act.shiftVec[1]]); });
    }
    board.setGame(state.game, { animate: true, lastCells: path });
    board.setMode('none');
    board.clearSelection(true);
    syncTrays();
    showAfter(s);
    LBQ.sound.play(act.type === 'capture' ? 'capture' : (act.type === 'drop' ? 'drop' : 'move'));
    if (act.type === 'capture' || act.type === 'drop') {
      setTimeout(function () { LBQ.sound.play('select'); }, 200);
    }
    if (state.game.winner !== null || state.game.draw) {
      setTimeout(function () { LBQ.sound.play(state.game.draw ? 'alert' : 'win'); }, 240);
    }
  }

  function onProbe(info) {
    var s = step();
    if (state.completed || s.task.kind !== 'probe') return;
    var want = s.task.reason;
    if (info.reason !== want) {
      wrong('有反应，但这还不是本步要验证的规则：' + info.message);
      return;
    }
    state.completed = true;
    board.setMode('none');
    board.setFocus([]);
    showAfter(s);
    LBQ.sound.play('alert');
  }

  function onCell(pos, piece) {
    var s = step();
    if (state.completed || s.task.kind !== 'click') return;
    var ok = false;
    if (s.task.cell) {
      ok = LBQ.squareName(state.game.size, pos[0], pos[1]) === s.task.cell;
    } else if (s.task.test) {
      ok = !!s.task.test(state.game, pos, piece);
    }
    if (!ok) {
      wrong(s.task.wrong || '不是这一格，再试试。');
      return;
    }
    state.completed = true;
    board.setFocus([]);
    board.setMode('none');
    showAfter(s);
    LBQ.sound.play('select');
  }

  function onTrayPick(ti, k, player) {
    var s = step();
    if (state.completed || s.task.kind !== 'action') return;
    var game = state.game;
    if (game.current !== player || !game.tray[player][ti]) return;
    board.clearSelection(true);
    if (state.traySel && state.traySel.ti === ti && k >= state.traySel.start) {
      state.traySel = { ti: ti, start: state.traySel.start, len: k - state.traySel.start + 1 };
    } else {
      state.traySel = { ti: ti, start: k, len: 1 };
    }
    var segs = game.tray[player];
    var seg = segs[ti];
    if (state.traySel.start + state.traySel.len > seg.pieces.length) state.traySel.len = seg.pieces.length - state.traySel.start;
    syncTrays();
    setFeedback('已从第 ' + (ti + 1) + ' 段截取 ' + state.traySel.len + ' 子 · 移到空格预览紫色落点，点击放置。', 'hint');
    LBQ.sound.play('pick');
  }

  function syncTrays() {
    var game = state.game;
    if (!game) return;
    var hasW = game.tray[0].length > 0;
    var hasB = game.tray[1].length > 0;
    refs.trays.hidden = !(hasW || hasB);
    refs.trayWRow.hidden = !hasW;
    refs.trayBRow.hidden = !hasB;
    var s = step();
    var dropTask = s && s.task && s.task.kind === 'action' && s.task.match && s.task.match.type === 'drop';
    trayW.set(game, 0, !!dropTask && !state.completed && game.current === 0);
    trayB.set(game, 1, !!dropTask && !state.completed && game.current === 1);
    trayW.setSelection(state.traySel && game.current === 0 ? state.traySel : null);
    trayB.setSelection(state.traySel && game.current === 1 ? state.traySel : null);
    if (state.traySel) {
      board.setTraySelection({
        player: game.current, ti: state.traySel.ti,
        start: state.traySel.start, len: state.traySel.len
      });
    } else {
      board.setTraySelection(null);
    }
  }

  /* ---------------------------------------------------------------- 判定 */
  function matchTask(task, act) {
    if (!task || task.kind !== 'action') return false;
    var m = task.match;
    if (!m) return true;
    if (typeof m === 'function') return !!m(act, state.game);
    if (m.type && act.type !== m.type) return false;
    if (m.dir && act.dir !== m.dir) return false;
    if (m.cells) {
      var want = m.cells.map(function (s) { return LBQ.parseSquare(state.game.size, s); });
      if (!LBQ.sameCells(act.cells, want)) return false;
    }
    if (m.head) {
      if (!act.head) return false;
      if (LBQ.squareName(state.game.size, act.head[0], act.head[1]) !== m.head) return false;
    }
    if (m.ti != null && act.ti !== m.ti) return false;
    if (m.start != null && act.start !== m.start) return false;
    if (m.len != null && act.len !== m.len) return false;
    return true;
  }

  function wrong(msg) {
    setFeedback(msg, 'warn');
    LBQ.sound.play('deny');
    refs.boardHost.classList.remove('shake');
    void refs.boardHost.offsetWidth;
    refs.boardHost.classList.add('shake');
    setTimeout(function () { refs.boardHost.classList.remove('shake'); }, 450);
  }

  function setFeedback(html, type) {
    refs.feedback.hidden = false;
    refs.feedback.className = 'feedback ' + (type || 'hint');
    refs.feedback.innerHTML = (type === 'warn' ? ICON('info') : ICON('spark')) + '<span>' + html + '</span>';
  }

  function showAfter(s) {
    if (s.after) {
      refs.after.hidden = false;
      refs.afterText.innerHTML = s.after;
    }
    refs.btnNext.disabled = false;
    refs.btnNext.innerHTML = (state.si === lesson().steps.length - 1 ? '完成本课' : '继续') + ICON('arrowRight');
    var dots = '';
    for (var i = 0; i < lesson().steps.length; i++) {
      var cls = i < state.si || (i === state.si && state.completed) ? 'done' : (i === state.si ? 'current' : '');
      dots += '<i class="' + cls + '"></i>';
    }
    refs.dots.innerHTML = dots;
  }

  function showHint() {
    var s = step();
    var text = s.hint || '先读任务说明：' + (s.task.text || defaultTaskText(s.task));
    setFeedback(text, 'hint');
    if (s.focus && s.focus.length) {
      board.setFocus(s.focus);
      LBQ.sound.play('pick');
    }
    LBQ.toast(text, '', 3200);
  }

  function resetStep() {
    state.game = state.stepStart.clone();
    state.completed = false;
    state.traySel = null;
    var s = step();
    board.setGame(state.game, { reset: true });
    board.setMode(s.task.kind === 'click' ? 'click' :
      (s.task.kind === 'free' || s.task.kind === 'quiz' ? 'none' : 'select'));
    board.setFocus(s.focus || []);
    board.clearSelection(true);
    if (s.task.kind === 'free') state.completed = true;
    refs.feedback.hidden = true;
    refs.after.hidden = true;
    refs.afterText.innerHTML = '';
    refs.btnNext.disabled = s.task.kind !== 'free' && s.task.kind !== 'quiz';
    refs.btnNext.innerHTML = (state.si === lesson().steps.length - 1 ? '完成本课' : '继续') + ICON('arrowRight');
    refs.quiz.querySelectorAll('.quiz-opt').forEach(function (b) {
      b.classList.remove('correct', 'wrong');
      b.disabled = false;
    });
    syncTrays();
  }

  function answerQuiz(i) {
    var s = step();
    if (state.completed || s.task.kind !== 'quiz') return;
    var opt = s.task.options[i];
    if (!opt) return;
    if (!opt.ok) {
      var b = refs.quiz.querySelector('[data-quiz="' + i + '"]');
      if (b) b.classList.add('wrong');
      setFeedback('不对。' + (s.task.explain ? '' : '再想想规则的优先级。'), 'warn');
      LBQ.sound.play('deny');
      return;
    }
    state.completed = true;
    refs.quiz.querySelectorAll('.quiz-opt').forEach(function (b) {
      b.disabled = true;
      if (b.dataset.quiz === String(i)) b.classList.add('correct');
    });
    setFeedback(s.task.explain || '正确。', 'ok');
    refs.btnNext.disabled = false;
    refs.btnNext.innerHTML = (state.si === lesson().steps.length - 1 ? '完成本课' : '继续') + ICON('arrowRight');
    LBQ.sound.play('select');
  }

  function nextStep() {
    var L = lesson();
    var s = step();
    if (!state.completed && s.task.kind !== 'free') {
      setFeedback('先完成这一步，再继续。', 'warn');
      LBQ.sound.play('deny');
      return;
    }
    if (state.si < L.steps.length - 1) {
      loadStep(state.si + 1, false);
      refs.panel.scrollTop = 0;
      LBQ.sound.play('pick');
    } else {
      finishLesson();
    }
  }

  function finishLesson() {
    var L = lesson();
    progress[L.id] = true;
    LBQ.store.set('learn', progress);
    renderList();
    state.finished = true;
    refs.lpBody.hidden = true;
    refs.finish.hidden = false;
    var next = LBQ.lessons[state.li + 1];
    refs.finish.innerHTML =
      '<div class="finish-icon">' + ICON('check') + '</div>' +
      '<div class="finish-eyebrow">第 ' + (state.li + 1) + ' 课完成</div>' +
      '<h2>' + L.title + '</h2>' +
      '<p>' + (next ? '下一课：<b>' + next.title + '</b>。' : '全部课程已完成。去对弈中检验一下吧。') + '</p>' +
      '<div class="finish-actions">' +
      (next
        ? '<button class="btn btn-primary" data-finish="next">下一课' + ICON('arrowRight') + '</button>' +
          '<button class="btn btn-quiet" data-finish="play">去对弈</button>'
        : '<button class="btn btn-primary" data-finish="play">去对弈' + ICON('arrowRight') + '</button>') +
      '</div>' +
      '<button class="link-btn finish-back" data-act="restart-lesson">重做本课</button>';
    LBQ.sound.play('win');
    LBQ.toast('第 ' + (state.li + 1) + ' 课完成', 'ok');
  }

  /* ---------------------------------------------------------------- 路由 */
  function onEnter(sub) {
    if (board) board._measure();
    if (sub) {
      var idx = -1;
      for (var i = 0; i < LBQ.lessons.length; i++) if (LBQ.lessons[i].id === sub) { idx = i; break; }
      if (idx >= 0 && (idx !== state.li || !state.game)) loadLesson(idx);
    } else if (!state.game) loadLesson(0);
    renderList();
  }

  LBQ.pages = LBQ.pages || {};
  LBQ.pages.learn = {
    init: init,
    onEnter: onEnter
  };
})(window.LBQ = window.LBQ || {});




