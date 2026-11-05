/* ==========================================================================
   练习题：由「局面 + 唯一解法棋谱」生成，按顺序校验
   ========================================================================== */
(function (LBQ) {
  'use strict';

  var ICON = LBQ.icon;
  var el, board, trayW, trayB;
  var refs = {};
  var state = {
    puzzle: null, game: null, startGame: null, step: 0, attempts: 0,
    solved: false, revealed: false, traySel: null, flip: false
  };
  var solvedStore = LBQ.store.get('puzzles.solved', {}) || {};
  var builtins = [];

  /* ---------------------------------------------------------------- 示例题 */
  var BUILTIN_DEFS = [
    {
      id: 'b-king',
      title: '一步擒王',
      intro: '白方先行。黑王就在敌段里——一步结束对局。',
      hint: '用 e3–e4 这条竖线向正前方冲撞。',
      setup: { size: 9, pieces: ['wK@a1', 'wR@e3,e4', 'bK@e5', 'bP@f5'] },
      solution: ['e3w2w']
    },
    {
      id: 'b-promo',
      title: '入阵升变',
      intro: '白方先行。把车送进黑方阵营，获得升变。',
      hint: 'e6 的车向上走一格。',
      setup: { size: 9, pieces: ['wK@e1', 'wR@e6', 'bK@a9'] },
      solution: ['e6w1w']
    },
    {
      id: 'b-diag',
      title: '斜线对撞',
      intro: '白方先行。沿斜线吃掉黑段：白方 2 象，黑方 1 象。',
      hint: '选中 c2–e4 的斜线，向右上冲撞。',
      setup: { size: 9, pieces: ['wK@a1', 'wB@c2,d3', 'wP@e4', 'bK@a9', 'bB@f5', 'bP@g6'] },
      solution: ['c2e3e']
    },
    {
      id: 'b-retreat',
      title: '整段后撤',
      intro: '白方先行。这条线段两枚棋子都已升变，试把它整段后退一格。',
      hint: '选中 e3–e4，向下走。',
      setup: { size: 9, pieces: ['wK@a1', 'wR@e4+', 'wP@e3+', 'bK@a9'] },
      solution: ['e3w2s']
    },
    {
      id: 'b-drop',
      title: '俘虏打入',
      intro: '白方先行。把持棋台上的整段 PR 打入 c4（方向向上）。',
      hint: '在白方持棋台点 P，再点 R，然后落到 c4。',
      setup: { size: 9, pieces: ['wK@a1', 'bK@a9'], trays: { w: ['PR:n'] } },
      solution: ['c4w2*1.1']
    }
  ];

  function buildBuiltins() {
    if (builtins.length) return builtins;
    BUILTIN_DEFS.forEach(function (d) {
      var built = LBQ.buildGame(d.setup);
      var game = built.game;
      builtins.push({
        id: d.id, title: d.title, intro: d.intro, hint: d.hint,
        code: LBQ.encodePosition(game),
        solution: d.solution.slice(),
        side: game.current, steps: d.solution.length, builtin: true
      });
    });
    return builtins;
  }

  /* ---------------------------------------------------------------- 结构 */
  function init() {
    el = document.getElementById('page-practice');
    el.classList.add('practice-page');
    el.innerHTML = '' +
      '<div class="wrap">' +
      '  <div class="page-head practice-head">' +
      '    <div>' +
      '      <div class="eyebrow">练习题 · 局面 + 唯一解法</div>' +
      '      <h1>练 习</h1>' +
      '      <p class="page-desc">每一题由「一个局面」和「一段唯一走法」生成。按顺序走出解法即可过关；题目保存在本机浏览器。</p>' +
      '    </div>' +
      '    <div class="page-head-side">' +
      '      <button class="btn btn-quiet" data-act="flip">' + ICON('flip') + '<span>翻转</span></button>' +
      '      <button class="btn btn-primary" data-act="generate">' + ICON('plus') + '<span>生成题目</span></button>' +
      '    </div>' +
      '  </div>' +
      '  <div class="practice-grid">' +
      '    <aside class="puzzle-list panel">' +
      '      <div class="puzzle-list-head"><div class="panel-title">题库</div><span id="puzzle-count"></span></div>' +
      '      <div class="puzzle-items" id="puzzle-items"></div>' +
      '      <div class="puzzle-list-foot">' +
      '        <button class="btn btn-sm btn-quiet" data-act="generate">' + ICON('plus') + '生成题目</button>' +
      '        <span class="hint">自建题目保存在本机浏览器</span>' +
      '      </div>' +
      '    </aside>' +
      '    <div class="puzzle-board-col">' +
      '      <div class="player-bar" data-side="1">' +
      '        <div class="player-who"><span class="side-orb black"></span><div class="player-name"><b>黑方</b><span data-sub="1">—</span></div></div>' +
      '        <div class="tray-host" data-tray="1"></div>' +
      '        <span class="turn-pip" data-pip="1">行棋</span>' +
      '      </div>' +
      '      <div class="board-stage-wrap"><div class="board-stage" id="practice-board"></div></div>' +
      '      <div class="player-bar" data-side="0">' +
      '        <div class="player-who"><span class="side-orb"></span><div class="player-name"><b>白方</b><span data-sub="0">—</span></div></div>' +
      '        <div class="tray-host" data-tray="0"></div>' +
      '        <span class="turn-pip" data-pip="0">行棋</span>' +
      '      </div>' +
      '      <div class="play-hint" id="practice-hint">从左侧选一道题开始。</div>' +
      '    </div>' +
      '    <aside class="puzzle-panel panel" id="puzzle-panel"></aside>' +
      '  </div>' +
      '</div>';

    refs = {
      items: el.querySelector('#puzzle-items'),
      count: el.querySelector('#puzzle-count'),
      boardHost: el.querySelector('#practice-board'),
      trayW: el.querySelector('[data-tray="0"]'),
      trayB: el.querySelector('[data-tray="1"]'),
      panel: el.querySelector('#puzzle-panel'),
      hint: el.querySelector('#practice-hint')
    };

    board = new LBQ.BoardView(refs.boardHost, {
      onAction: onAction,
      onProbe: function (info) { setFeedback(info.message, 'warn'); },
      onForeign: function () { setFeedback('这是对方的棋子。', 'warn'); },
      onDropMiss: function () { setFeedback('这里不是排头格：移到能放下整段的位置，出现紫色预览后再点击。', 'warn'); },
      onSelect: function () { if (state.traySel) { state.traySel = null; syncTrays(); } },
      onCancel: function () { if (state.traySel) { state.traySel = null; syncTrays(); } }
    });
    trayW = new LBQ.TrayView(refs.trayW, { onPick: function (ti, k) { onTrayPick(ti, k, 0); } });
    trayB = new LBQ.TrayView(refs.trayB, { onPick: function (ti, k) { onTrayPick(ti, k, 1); } });

    el.addEventListener('click', function (e) {
      var b = e.target.closest('[data-act]');
      if (b) {
        var act = b.dataset.act;
        if (act === 'generate') openGenerator({});
        else if (act === 'flip') { state.flip = !state.flip; board.setFlip(state.flip); }
        else if (act === 'retry') retry();
        else if (act === 'hint') showHint();
        else if (act === 'reveal') reveal();
        else if (act === 'next') nextPuzzle();
        return;
      }
      var del = e.target.closest('[data-del-puzzle]');
      if (del) {
        e.stopPropagation();
        deletePuzzle(del.dataset.delPuzzle);
        return;
      }
      var card = e.target.closest('[data-puzzle]');
      if (card) {
        var p = allPuzzles().find(function (x) { return x.id === card.dataset.puzzle; });
        if (p) loadPuzzle(p);
        return;
      }
    });
    document.addEventListener('lbq-escape', function () {
      if (state.traySel) { state.traySel = null; syncTrays(); }
      board.clearSelection();
    });

    buildBuiltins();
    renderList();
    var all = allPuzzles();
    if (all.length) loadPuzzle(all[0]);
    else renderPanel();
  }

  /* ---------------------------------------------------------------- 题库 */
  function loadUser() {
    var v = LBQ.store.get('puzzles', []);
    return Array.isArray(v) ? v : [];
  }
  function saveUser(list) { LBQ.store.set('puzzles', list); }
  function allPuzzles() { return loadUser().concat(buildBuiltins()); }

  function renderList() {
    var user = loadUser();
    var built = buildBuiltins();
    var html = '';
    html += '<div class="puzzle-section"><div class="ps-head">我的题目 <span>' + user.length + '</span></div>';
    if (!user.length) {
      html += '<div class="ps-empty">还没有自建题目。<br>点「生成题目」，用局面 + 唯一走法生成一道。</div>';
    } else {
      user.forEach(function (p) { html += puzzleCard(p, false); });
    }
    html += '</div>';
    html += '<div class="puzzle-section"><div class="ps-head">示例题 <span>' + built.length + '</span></div>';
    built.forEach(function (p) { html += puzzleCard(p, true); });
    html += '</div>';
    refs.items.innerHTML = html;
    refs.count.textContent = (user.length + built.length) + ' 题';
  }

  function puzzleCard(p, isBuiltin) {
    var solved = !!solvedStore[p.id];
    var active = state.puzzle && state.puzzle.id === p.id;
    return '<div class="puzzle-card' + (active ? ' active' : '') + (solved ? ' is-solved' : '') +
      '" data-puzzle="' + p.id + '" role="button" tabindex="0">' +
      '<div class="pc-top"><b>' + LBQ.escapeHTML(p.title) + '</b>' +
      (isBuiltin ? '<em class="pc-tag">示例</em>' : '<button class="pc-del" data-del-puzzle="' + p.id + '" title="删除">' + ICON('close') + '</button>') +
      '</div>' +
      '<div class="pc-meta"><span>' + (p.side === 1 ? '黑先' : '白先') + '</span><span>' + p.steps + ' 步</span>' +
      (solved ? '<span class="pc-solved">' + ICON('check') + '已解</span>' : '') + '</div>' +
      '</div>';
  }

  function deletePuzzle(id) {
    LBQ.confirm({
      title: '删除这道题？',
      body: '<p class="hint">只删除本机保存的题目，示例题不受影响。</p>',
      okText: '删除',
      danger: true
    }).then(function (ok) {
      if (!ok) return;
      var list = loadUser().filter(function (p) { return p.id !== id; });
      saveUser(list);
      delete solvedStore[id];
      LBQ.store.set('puzzles.solved', solvedStore);
      if (state.puzzle && state.puzzle.id === id) {
        state.puzzle = null;
        var all = allPuzzles();
        if (all.length) loadPuzzle(all[0]); else { board.setGame(new LBQ.Game(9).setupStandard(), { reset: true }); board.setMode('none'); renderPanel(); }
      }
      renderList();
      LBQ.toast('题目已删除', 'ok');
    });
  }

  /* ---------------------------------------------------------------- 出题 / 解题 */
  function loadPuzzle(p) {
    buildBuiltins();
    var dec = LBQ.decodePosition(p.code);
    if (dec.error) { LBQ.toast('题目局面损坏：' + dec.error, 'warn'); return; }
    state.puzzle = p;
    state.startGame = dec.game;
    state.game = dec.game.clone();
    state.step = 0;
    state.attempts = 0;
    state.solved = !!solvedStore[p.id];
    state.revealed = false;
    state.traySel = null;
    state.flip = false;
    feedbackText = ''; feedbackType = '';
    board.setFlip(false);
    board.setGame(state.game, { reset: true });
    board.setMode(state.solved ? 'none' : 'select');
    syncTrays();
    setHint(state.solved ? '已解 · 点「重试」可以重走一遍。' : '按题目的唯一解法走棋。');
    renderPanel();
    renderList();
  }

  function expectedAction() {
    if (!state.puzzle || state.step >= state.puzzle.solution.length) return null;
    return state.game.parseToken(state.puzzle.solution[state.step]);
  }

  function onAction(act) {
    if (!state.puzzle || state.solved) return;
    var exp = expectedAction();
    if (!exp || !exp.ok) {
      setFeedback('这道题的解法步无法执行：' + ((exp && exp.error) || '局面与解法不匹配'), 'warn');
      return;
    }
    if (!sameAction(act, exp)) {
      state.attempts++;
      setFeedback('不是这道题的解法。再想想：' + (state.attempts >= 2 ? '可以点「提示」。' : ''), 'warn');
      LBQ.sound.play('deny');
      return;
    }
    feedbackText = ''; feedbackType = '';
    var next = state.game.clone();
    next.apply(exp);
    state.game = next;
    state.step++;
    state.traySel = null;
    board.setGame(next, {
      animate: true,
      lastCells: pathOfAction(exp)
    });
    board.clearSelection(true);
    syncTrays();
    if (exp.type === 'capture' || exp.type === 'drop') LBQ.sound.play(exp.type === 'drop' ? 'drop' : 'capture');
    else LBQ.sound.play('move');
    if (state.step >= state.puzzle.solution.length) {
      success();
    } else {
      board.setMode('select');
      setHint('正确。还剩 ' + (state.puzzle.solution.length - state.step) + ' 步。');
      renderPanel();
      renderList();
    }
  }

  function sameAction(user, exp) {
    if (!user || !exp) return false;
    if (user.type !== exp.type || user.dir !== exp.dir) return false;
    if (exp.type === 'drop') {
      return user.ti === exp.ti && user.start === exp.start && user.len === exp.len &&
        user.head && user.head[0] === exp.head[0] && user.head[1] === exp.head[1];
    }
    if (!LBQ.sameCells(user.cells, exp.cells)) return false;
    if (exp.type === 'capture') return LBQ.sameCells(user.victim, exp.victim);
    return true;
  }

  function pathOfAction(act) {
    var out = [];
    if (!act) return out;
    if (act.type === 'capture') {
      act.cells.forEach(function (p) { out.push(p); });
      act.cells.forEach(function (p) { out.push([p[0] + act.shiftVec[0], p[1] + act.shiftVec[1]]); });
    } else if (act.type === 'move') {
      act.cells.forEach(function (p) { out.push(p); });
      if (act.to) act.to.forEach(function (p) { out.push(p); });
    } else if (act.cells) {
      act.cells.forEach(function (p) { out.push(p); });
    }
    return out;
  }

  function success() {
    state.solved = true;
    feedbackText = ''; feedbackType = '';
    if (!state.revealed) {
      solvedStore[state.puzzle.id] = true;
      LBQ.store.set('puzzles.solved', solvedStore);
    }
    board.setMode('none');
    board.setFocus([]);
    renderPanel();
    renderList();
    setHint('完成！这道题已经解出。');
    LBQ.sound.play(state.revealed ? 'alert' : 'win');
    LBQ.toast(state.revealed ? '已按答案走完（不计入已解）' : '解题成功', state.revealed ? '' : 'ok');
  }

  function retry() {
    if (!state.puzzle) return;
    feedbackText = ''; feedbackType = '';
    state.game = state.startGame.clone();
    state.step = 0;
    state.attempts = 0;
    state.solved = false;
    state.revealed = false;
    state.traySel = null;
    board.setGame(state.game, { reset: true });
    board.setMode('select');
    board.setFocus([]);
    syncTrays();
    renderPanel();
    renderList();
    setHint('重试：按唯一解法走棋。');
    LBQ.sound.play('pick');
  }

  function showHint() {
    if (!state.puzzle || state.solved) return;
    var exp = expectedAction();
    if (!exp || !exp.ok) return;
    if (exp.type === 'drop') {
      var seg = state.game.tray[state.game.current][exp.ti];
      board.setFocus([]);
      setFeedback('提示：从第 ' + (exp.ti + 1) + ' 段俘虏中截取第 ' + (exp.start + 1) + ' 子起的 ' + exp.len +
        ' 子，方向' + LBQ.DIR_LABEL[exp.dir] + '。', 'hint');
      if (seg) {
        state.traySel = { ti: exp.ti, start: exp.start, len: exp.len };
        syncTrays();
      }
    } else {
      board.setFocus(exp.cells);
      setFeedback('提示：选中高亮的 ' + exp.cells.length + ' 子线段，向' + LBQ.DIR_LABEL[exp.dir] +
        (exp.type === 'capture' ? '冲撞。' : '移动。'), 'hint');
    }
    LBQ.sound.play('pick');
  }

  function reveal() {
    if (!state.puzzle || state.solved) return;
    feedbackText = ''; feedbackType = '';
    state.revealed = true;
    state.solved = false;
    board.setMode('none');
    board.setFocus([]);
    renderPanel();
    setHint('已显示完整解法。');
  }

  function nextPuzzle() {
    var all = allPuzzles();
    if (!all.length) return;
    var idx = state.puzzle ? all.findIndex(function (p) { return p.id === state.puzzle.id; }) : -1;
    loadPuzzle(all[(idx + 1) % all.length]);
  }

  /* ---------------------------------------------------------------- 面板 */
  function renderPanel() {
    if (!state.puzzle) {
      refs.panel.innerHTML = '<div class="puzzle-empty">' +
        '<div class="pe-icon">' + ICON('target') + '</div>' +
        '<h2>还没有题目</h2>' +
        '<p>用「生成题目」把任意局面和一段唯一走法变成练习题。也可以直接用示例题。</p>' +
        '<button class="btn btn-primary" data-act="generate">' + ICON('plus') + '生成第一道题</button>' +
        '</div>';
      return;
    }
    var p = state.puzzle;
    var game = state.game;
    var ended = game.winner !== null || game.draw;
    var dots = '';
    for (var i = 0; i < p.solution.length; i++) {
      dots += '<i class="' + (i < state.step ? 'done' : (i === state.step ? 'current' : '')) + '"></i>';
    }
    var solvedNow = state.solved;
    var html = '' +
      '<div class="puzzle-head">' +
      '  <div class="puzzle-kind">' + (p.builtin ? '示例题' : '我的题目') + '</div>' +
      '  <h2>' + LBQ.escapeHTML(p.title) + '</h2>' +
      '  <p>' + LBQ.escapeHTML(p.intro || '按题目的唯一解法走棋。') + '</p>' +
      '</div>' +
      '<div class="puzzle-meta">' +
      '  <span class="chip">' + (p.side === 0 ? '白方' : '黑方') + '先行</span>' +
      '  <span class="chip">' + p.steps + ' 步解法</span>' +
      '  <span class="chip ' + (solvedNow ? 'jade' : '') + '">' + (solvedNow ? '已解' : '第 ' + (state.step + (solvedNow ? 0 : 1)) + ' / ' + p.steps + ' 步') + '</span>' +
      '</div>' +
      '<div class="puzzle-progress">' + dots + '</div>' +
      '<div class="puzzle-feedback" id="puzzle-feedback"></div>';
    if (solvedNow) {
      html += '<div class="puzzle-success">' + ICON('check') + '<div><b>完成</b><span>按唯一解法走完了这道题。</span></div></div>';
    } else if (state.revealed) {
      html += '<div class="puzzle-reveal"><b>完整解法</b><div class="mono">' + p.solution.map(function (t) { return LBQ.escapeHTML(t); }).join(' ') + '</div>' +
        '<span>已显示答案，本局不计入「已解」。</span></div>';
    } else if (ended) {
      html += '<div class="puzzle-warn">对局已结束，但解法还没有走完。点「重试」再试。</div>';
    }
    html += '<div class="puzzle-actions">' +
      '<button class="btn btn-sm btn-quiet" data-act="hint">' + ICON('spark') + '提示</button>' +
      '<button class="btn btn-sm btn-quiet" data-act="retry">' + ICON('refresh') + '重试</button>' +
      '<button class="btn btn-sm btn-quiet" data-act="reveal">' + ICON('key') + '看答案</button>' +
      '<button class="btn btn-sm btn-primary" data-act="next">下一题' + ICON('arrowRight') + '</button>' +
      '</div>' +
      (p.hint && !solvedNow ? '<div class="puzzle-hint" hidden>' + LBQ.escapeHTML(p.hint) + '</div>' : '');
    refs.panel.innerHTML = html;
    var fb = refs.panel.querySelector('#puzzle-feedback');
    if (feedbackText) {
      fb.className = 'puzzle-feedback ' + (feedbackType || '');
      fb.innerHTML = feedbackText;
    } else {
      fb.hidden = true;
    }
  }

  var feedbackText = '', feedbackType = '';
  function setFeedback(html, type) {
    feedbackText = html || '';
    feedbackType = type || '';
    var fb = refs.panel && refs.panel.querySelector('#puzzle-feedback');
    if (fb) {
      fb.hidden = !html;
      fb.className = 'puzzle-feedback ' + feedbackType;
      fb.innerHTML = html || '';
    }
  }

  function setHint(text, type) {
    if (!refs.hint) return;
    refs.hint.textContent = text;
    refs.hint.className = 'play-hint' + (type ? ' ' + type : '');
  }

  function syncTrays() {
    var game = state.game;
    if (!game) return;
    var ended = game.winner !== null || game.draw;
    trayW.set(game, 0, !ended && !state.solved && game.current === 0);
    trayB.set(game, 1, !ended && !state.solved && game.current === 1);
    if (state.traySel) {
      board.setTraySelection({ player: game.current, ti: state.traySel.ti, start: state.traySel.start, len: state.traySel.len });
      trayW.setSelection(game.current === 0 ? state.traySel : null);
      trayB.setSelection(game.current === 1 ? state.traySel : null);
    } else {
      board.setTraySelection(null);
      trayW.setSelection(null);
      trayB.setSelection(null);
    }
    updateBars();
  }

  function onTrayPick(ti, k, player) {
    var game = state.game;
    if (!game || state.solved || game.winner !== null || game.draw || game.current !== player) return;
    board.clearSelection(true);
    if (state.traySel && state.traySel.ti === ti && k >= state.traySel.start) {
      state.traySel = { ti: ti, start: state.traySel.start, len: k - state.traySel.start + 1 };
    } else {
      state.traySel = { ti: ti, start: k, len: 1 };
    }
    var seg = game.tray[player][ti];
    if (state.traySel.start + state.traySel.len > seg.pieces.length) state.traySel.len = seg.pieces.length - state.traySel.start;
    LBQ.sound.play('pick');
    syncTrays();
    setFeedback('已截取 ' + state.traySel.len + ' 子 · 移到空格预览紫色落点，点击放置。', 'hint');
  }

  function updateBars() {
    var game = state.game;
    if (!game) return;
    [0, 1].forEach(function (side) {
      var bar = el.querySelector('.player-bar[data-side="' + side + '"]');
      var mat = game.material()[side];
      var tray = game.trayCount(side);
      var onBoard = 0;
      for (var i = 0; i < game.cells.length; i++) {
        var p = game.cells[i];
        if (p && p.p === side) onBoard++;
      }
      bar.querySelector('[data-sub="' + side + '"]').innerHTML =
        '场上 <b>' + onBoard + '</b> · 台 <b>' + tray.pieces + '</b>' +
        (mat.promo ? ' · 升变 <b class="gold">' + mat.promo + '</b>' : '');
      var active = state.puzzle && !state.solved && game.winner === null && !game.draw && game.current === side;
      bar.classList.toggle('is-turn', !!active);
      bar.querySelector('[data-pip="' + side + '"]').hidden = !active;
    });
  }

  /* ---------------------------------------------------------------- 生成器 */
  function openGenerator(opts) {
    opts = opts || {};
    buildBuiltins();
    var isNew = !opts.code;
    var defaultTitle = opts.title || ('自建题目 ' + (loadUser().length + 1));
    var modal = LBQ.openModal({
      title: '生成练习题',
      subtitle: '输入一个局面（局面代码，留空则为 9 路标准开局）和它的唯一解法走法。保存后会加入「我的题目」。',
      width: 'min(700px, 100%)',
      body: '<div class="gen-form">' +
        '<div class="field"><label>题目名称</label><input class="input" id="gen-title" value="' + LBQ.escapeHTML(defaultTitle) + '" maxlength="40"></div>' +
        '<div class="field"><label>局面代码</label>' +
        '<textarea class="textarea mono" id="gen-code" spellcheck="false" style="min-height:80px" placeholder="LBQ1.…（留空 = 标准开局）">' + LBQ.escapeHTML(opts.code || '') + '</textarea>' +
        '<span class="hint">在编辑器或分析页点「局面代码 / 存为练习题」可生成。</span></div>' +
        '<div class="field"><label>唯一解法 · 走法序列</label>' +
        '<textarea class="textarea mono" id="gen-solution" spellcheck="false" style="min-height:72px" placeholder="e3w2w">' + LBQ.escapeHTML(opts.solution || '') + '</textarea>' +
        '<span class="hint">从该局面开始按顺序执行；用空格分隔，可带手数前缀。不接受括号变例。</span></div>' +
        '<div class="field"><label>题面说明（可选）</label><input class="input" id="gen-intro" value="' + LBQ.escapeHTML(opts.intro || '') + '" placeholder="白方先行。找出获胜的一步。"></div>' +
        '<div class="field"><label>提示（可选）</label><input class="input" id="gen-hint" value="' + LBQ.escapeHTML(opts.hint || '') + '"></div>' +
        '<div class="gen-msg" id="gen-msg"></div>' +
        '</div>',
      actions: [
        { label: '取消', cls: 'btn-quiet' },
        {
          label: '校验', cls: 'btn-quiet', close: false,
          onClick: function () {
            var r = validateForm();
            showGenMsg(r);
          }
        },
        {
          label: '保存并开始', cls: 'btn-primary', icon: 'check', close: false,
          onClick: function (api) {
            var r = validateForm();
            if (r.error) { showGenMsg(r); return; }
            var puzzle = {
              id: 'u' + Date.now() + '-' + Math.floor(Math.random() * 999),
              title: r.title,
              code: r.code,
              solution: r.canonical,
              intro: r.intro,
              hint: r.hint,
              side: r.side,
              steps: r.canonical.length,
              createdAt: Date.now(),
              builtin: false
            };
            var list = loadUser();
            list.unshift(puzzle);
            saveUser(list);
            api.close();
            if (location.hash !== '#/practice') location.hash = '#/practice';
            loadPuzzle(puzzle);
            LBQ.toast('题目已加入题库', 'ok');
          }
        }
      ]
    });

    function validateForm() {
      var title = (modal.root.querySelector('#gen-title').value || '').trim() || '未命名题目';
      var code = (modal.root.querySelector('#gen-code').value || '').trim();
      var solText = (modal.root.querySelector('#gen-solution').value || '').trim();
      var intro = (modal.root.querySelector('#gen-intro').value || '').trim();
      var hint = (modal.root.querySelector('#gen-hint').value || '').trim();
      if (!solText) return { error: '请填写唯一解法走法。', title: title, code: code, intro: intro, hint: hint };
      if (/[()]/.test(solText)) return { error: '练习题只接受一条连续解法，不支持括号变例。', title: title, code: code, intro: intro, hint: hint };
      var start;
      if (code) {
        var dec = LBQ.decodePosition(code);
        if (dec.error) return { error: '局面代码无效：' + dec.error, title: title, code: code, intro: intro, hint: hint };
        start = dec.game;
        code = LBQ.encodePosition(start);
      } else {
        start = new LBQ.Game(9).setupStandard();
        code = LBQ.encodePosition(start);
      }
      var wk = 0, bk = 0;
      for (var i = 0; i < start.cells.length; i++) {
        var pc = start.cells[i];
        if (!pc || pc.t !== 'K') continue;
        if (pc.p === 0) wk++; else bk++;
      }
      if (wk !== 1 || bk !== 1) return { error: '局面需要双方各恰好一枚王。', title: title, code: code, intro: intro, hint: hint };
      var tokens = solText.replace(/#.*$/gm, '').split(/\s+/).filter(Boolean);
      var game = start.clone();
      var canonical = [];
      for (var k = 0; k < tokens.length; k++) {
        var tok = tokens[k].replace(/^\d+\.+/, '');
        if (!tok || tok === '...' || tok === '…') continue;
        var act = game.parseToken(tok);
        if (!act || !act.ok) {
          return { error: '第 ' + (k + 1) + ' 步「' + tokens[k] + '」无法执行：' + ((act && act.error) || '不合规则'), title: title, code: code, intro: intro, hint: hint };
        }
        canonical.push(LBQ.formatAction(game, act));
        game.apply(act);
      }
      if (!canonical.length) return { error: '解法里没有有效走法。', title: title, code: code, intro: intro, hint: hint };
      return {
        title: title, code: code, intro: intro, hint: hint,
        canonical: canonical, side: start.current, steps: canonical.length,
        info: '共 ' + canonical.length + ' 步 · ' + (start.current === 0 ? '白方' : '黑方') + '先行 · ' + canonical.join(' ')
      };
    }
    function showGenMsg(r) {
      var box = modal.root.querySelector('#gen-msg');
      if (r.error) {
        box.className = 'gen-msg is-error';
        box.textContent = r.error;
      } else {
        box.className = 'gen-msg is-ok';
        box.textContent = '校验通过：' + r.info;
      }
    }
  }

  /* ---------------------------------------------------------------- 路由 */
  function onEnter() {
    if (board) board._measure();
    if (!state.puzzle) {
      var all = allPuzzles();
      if (all.length) loadPuzzle(all[0]); else { renderList(); renderPanel(); }
    }
    renderList();
  }

  LBQ.pages = LBQ.pages || {};
  LBQ.pages.practice = {
    init: init,
    onEnter: onEnter,
    openGenerator: openGenerator,
    loadPuzzle: loadPuzzle
  };
})(window.LBQ = window.LBQ || {});


