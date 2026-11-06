/* ==========================================================================
   练习题：题库由 GitHub 托管（Melba0/phalanxpuzzle），解题按唯一解法校验
   ========================================================================== */
(function (LBQ) {
  'use strict';

  var ICON = LBQ.icon;
  var el, board, trayW, trayB;
  var refs = {};
  var state = {
    puzzle: null, game: null, startGame: null, step: 0, attempts: 0,
    solved: false, revealed: false, traySel: null, flip: false,
    puzzles: [], loading: false, error: null, cached: false, at: 0,
    invalid: 0, fetchedAt: 0, tokenIssue: false, uploading: false
  };
  var solvedStore = LBQ.store.get('puzzles.solved', {}) || {};
  var pendingPuzzle = null;
  var feedbackText = '', feedbackType = '';

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
      '      <p class="page-desc">题库由 GitHub 托管：每一题是一个局面加一段唯一走法，按顺序走完即过关。生成的题目会直接写入 Melba0/phalanxpuzzle。</p>' +
      '    </div>' +
      '    <div class="page-head-side">' +
      '      <button class="btn btn-quiet" data-act="flip">' + ICON('flip') + '<span>翻转</span></button>' +
      '      <button class="btn btn-primary" data-act="generate">' + ICON('plus') + '<span>生成题目</span></button>' +
      '    </div>' +
      '  </div>' +
      '  <div class="db-bar" id="db-bar">' +
      '    <div class="db-left">' +
      '      <span class="db-ico">' + ICON('github') + '</span>' +
      '      <div class="db-meta"><b>GitHub 题库 <i class="db-dot" id="db-dot"></i></b><span id="db-info">正在读取…</span></div>' +
      '    </div>' +
      '    <div class="db-right">' +
      '      <a class="db-repo" href="' + LBQ.puzzles.REPO_URL + '" target="_blank" rel="noopener">' + ICON('external') + 'Melba0/phalanxpuzzle</a>' +
      '      <button class="icon-btn db-refresh" data-act="db-refresh" title="刷新题库">' + ICON('refresh') + '</button>' +
      '      <button class="btn btn-sm btn-quiet" data-act="db-connect" id="db-connect">连接</button>' +
      '    </div>' +
      '  </div>' +
      '  <div class="practice-grid">' +
      '    <aside class="puzzle-list panel">' +
      '      <div class="puzzle-list-head"><div class="panel-title">题库</div><span id="puzzle-count">—</span></div>' +
      '      <div class="puzzle-items" id="puzzle-items"></div>' +
      '      <div class="puzzle-list-foot">' +
      '        <button class="btn btn-sm btn-quiet" data-act="generate">' + ICON('plus') + '生成题目</button>' +
      '        <a class="db-link" href="' + LBQ.puzzles.REPO_URL + '" target="_blank" rel="noopener">在 GitHub 查看题库 ' + ICON('external') + '</a>' +
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
      '      <div class="play-hint" id="practice-hint">正在读取 GitHub 题库…</div>' +
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
      hint: el.querySelector('#practice-hint'),
      dbInfo: el.querySelector('#db-info'),
      dbDot: el.querySelector('#db-dot'),
      dbConnect: el.querySelector('#db-connect'),
      dbRefresh: el.querySelector('.db-refresh')
    };

    board = new LBQ.BoardView(refs.boardHost, {
      onAction: onAction,
      onProbe: function (info) { setFeedback(LBQ.escapeHTML(info.message), 'warn'); },
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
        else if (act === 'db-refresh') refreshPuzzles({ show: true });
        else if (act === 'db-connect') openConnect({ onDone: function () { renderDbBar(); refreshPuzzles(); } });
        else if (act === 'puzzle-delete') deletePuzzle();
        return;
      }
      var card = e.target.closest('[data-puzzle]');
      if (card) {
        var p = state.puzzles.find(function (x) { return x.id === card.dataset.puzzle; });
        if (p) loadPuzzle(p);
        return;
      }
    });
    document.addEventListener('lbq-escape', function () {
      if (state.traySel) { state.traySel = null; syncTrays(); }
      board.clearSelection();
    });

    // 先用缓存渲染，再静默拉取 GitHub
    var cache = LBQ.puzzles.cacheGet();
    if (cache && cache.puzzles && cache.puzzles.length) {
      state.puzzles = cache.puzzles.map(LBQ.puzzles.normalize).filter(Boolean);
      state.at = cache.at || 0;
      state.cached = true;
      if (state.puzzles.length) loadPuzzle(state.puzzles[0]); else emptyBoard();
      renderList();
      renderDbBar();
    } else {
      emptyBoard();
      renderList();
      renderDbBar();
    }
    refreshPuzzles();
  }

  /* ---------------------------------------------------------------- 题库同步 */
  function refreshPuzzles(opts) {
    opts = opts || {};
    if (state.loading) return Promise.resolve();
    state.loading = true;
    state.error = null;
    renderDbBar();
    if (!state.puzzles.length) renderList();
    if (!state.puzzle) { renderPanel(); setHint('正在读取 GitHub 题库…'); }
    return LBQ.puzzles.load().then(function (r) {
      state.loading = false;
      state.fetchedAt = Date.now();
      state.cached = !!r.cached;
      state.error = r.error || null;
      state.invalid = r.invalid || 0;
      state.at = r.at || 0;
      state.tokenIssue = !!r.tokenIssue;
      state.puzzles = r.puzzles || [];
      renderDbBar();
      if (state.puzzle) {
        var cur = state.puzzles.find(function (p) { return p.id === state.puzzle.id; });
        if (cur) state.puzzle = cur;
        else if (state.puzzles.length) loadPuzzle(state.puzzles[0]);
        else emptyBoard();
      } else if (state.puzzles.length) {
        loadPuzzle(state.puzzles[0]);
      } else {
        renderPanel();
      }
      if (!state.puzzle) {
        setHint(state.error ? '题库读取失败 · 点刷新重试' : '题库为空 · 点「生成题目」上传第一道题');
      }
      renderList();
      renderDbBar();
      if (r.error) LBQ.toast('题库读取：' + r.error, 'warn', 4000);
      if (r.invalid) LBQ.toast('跳过 ' + r.invalid + ' 道无法执行的题目', 'warn', 3600);
    }, function (err) {
      state.loading = false;
      state.fetchedAt = Date.now();
      state.error = err.message || String(err);
      renderDbBar();
      renderList();
      if (!state.puzzle) {
        renderPanel();
        setHint('题库读取失败 · 点刷新重试');
      }
      LBQ.toast('题库读取失败：' + state.error, 'warn', 4400);
    });
  }

  function applyPuzzles(list) {
    state.puzzles = list || [];
    if (state.puzzle) {
      var cur = state.puzzles.find(function (p) { return p.id === state.puzzle.id; });
      state.puzzle = cur || null;
    }
    renderList();
    renderDbBar();
  }

  function renderDbBar() {
    if (!refs.dbInfo) return;
    var a = LBQ.puzzles.auth();
    var connected = !!a;
    var n = state.puzzles.length;
    var cls = 'db-dot';
    var text;
    if (state.loading) {
      cls += ' is-loading'; text = '正在读取题库…';
    } else if (state.error) {
      cls += ' is-error'; text = (state.cached ? '离线缓存' : '读取失败') + ' · ' + state.error;
    } else if (connected && a.push === false) {
      cls += ' is-read'; text = '只读连接 · ' + n + ' 题';
    } else if (connected) {
      cls += ' is-live'; text = '已连接 · ' + n + ' 题' + (state.at ? ' · ' + LBQ.puzzles.ago(state.at) : '');
    } else {
      cls += ' is-read'; text = '公开读取 · ' + n + ' 题 · 连接后可上传';
    }
    if (!state.loading && state.invalid) text += ' · 跳过 ' + state.invalid;
    refs.dbInfo.textContent = text;
    refs.dbInfo.title = text;
    refs.dbDot.className = cls;
    refs.dbConnect.textContent = connected ? '设置' : '连接';
    refs.dbRefresh.disabled = state.loading;
    refs.dbRefresh.classList.toggle('is-spinning', state.loading);
  }

  /* ---------------------------------------------------------------- 列表 */
  function renderList() {
    if (!refs.items) return;
    var n = state.puzzles.length;
    refs.count.textContent = state.loading && !n ? '…' : (n + ' 题');
    if (!n) {
      if (state.loading) {
        refs.items.innerHTML = '<div class="puzzle-skel"><i></i><i></i><i></i></div>';
        return;
      }
      if (state.error) {
        refs.items.innerHTML = '<div class="db-empty">' +
          '<span class="dbe-icon">' + ICON('info') + '</span>' +
          '<b>题库暂时不可用</b><p>' + LBQ.escapeHTML(state.error) + '</p>' +
          '<button class="btn btn-sm btn-quiet" data-act="db-refresh">' + ICON('refresh') + '重试</button>' +
          '<a class="db-link" href="' + LBQ.puzzles.REPO_URL + '" target="_blank" rel="noopener">去 GitHub 查看</a>' +
          '</div>';
        return;
      }
      refs.items.innerHTML = '<div class="db-empty is-compact">' +
        '<b>题库为空</b><p>还没有题目，点下方「生成题目」上传第一道。</p>' +
        '</div>';
      return;
    }
    refs.items.innerHTML = '<div class="puzzle-section"><div class="ps-head">题库 <span>' + n + '</span></div>' +
      state.puzzles.map(puzzleCard).join('') + '</div>';
  }

  function puzzleCard(p) {
    var solved = !!solvedStore[p.id];
    var active = state.puzzle && state.puzzle.id === p.id;
    return '<button type="button" class="puzzle-card' + (active ? ' active' : '') + (solved ? ' is-solved' : '') +
      '" data-puzzle="' + LBQ.escapeHTML(p.id) + '">' +
      '<span class="pc-top"><b>' + LBQ.escapeHTML(p.title) + '</b>' +
      (p.author ? '<em class="pc-author">' + LBQ.escapeHTML(p.author) + '</em>' : '') + '</span>' +
      '<span class="pc-meta"><span>' + (p.side === 1 ? '黑先' : '白先') + '</span><span>' + p.steps + ' 步</span>' +
      (solved ? '<span class="pc-solved">' + ICON('check') + '已解</span>' : '') + '</span>' +
      '</button>';
  }

  /* ---------------------------------------------------------------- 解题 */
  function loadPuzzle(p) {
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
    board.setFocus([]);
    syncTrays();
    setHint(state.solved ? '已解 · 点「重试」可以重走一遍。' : '按题目的唯一解法走棋。');
    renderPanel();
    renderList();
    renderDbBar();
  }

  function emptyBoard() {
    state.puzzle = null;
    state.startGame = null;
    state.game = new LBQ.Game(9).setupStandard();
    state.step = 0;
    state.attempts = 0;
    state.solved = false;
    state.revealed = false;
    state.traySel = null;
    feedbackText = ''; feedbackType = '';
    board.setFlip(false);
    board.setGame(state.game, { reset: true });
    board.setMode('none');
    board.setFocus([]);
    trayW.set(state.game, 0, false);
    trayB.set(state.game, 1, false);
    board.setTraySelection(null);
    updateBars();
    setHint(state.loading ? '正在读取 GitHub 题库…' : '题库为空 · 点「生成题目」上传第一道题');
    renderPanel();
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
    board.setGame(next, { animate: true, lastCells: pathOfAction(exp) });
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
      board.setFocus([]);
      setFeedback('提示：从第 ' + (exp.ti + 1) + ' 段俘虏中截取第 ' + (exp.start + 1) + ' 子起的 ' + exp.len +
        ' 子，方向' + LBQ.DIR_LABEL[exp.dir] + '。', 'hint');
      state.traySel = { ti: exp.ti, start: exp.start, len: exp.len };
      syncTrays();
    } else {
      board.setFocus(exp.cells);
      setFeedback('提示：选中高亮的 ' + exp.cells.length + ' 子线段，向' + LBQ.DIR_LABEL[exp.dir] +
        (exp.type === 'capture' ? '冲撞。' : '移动。'), 'hint');
    }
    LBQ.sound.play('pick');
  }

  function reveal() {
    if (!state.puzzle || state.solved) return;
    state.revealed = true;
    state.solved = false;
    feedbackText = ''; feedbackType = '';
    board.setMode('none');
    board.setFocus([]);
    renderPanel();
    setHint('已显示完整解法。');
  }

  function nextPuzzle() {
    if (!state.puzzles.length) { LBQ.toast('题库里还没有题目', 'warn'); return; }
    var idx = state.puzzle ? state.puzzles.findIndex(function (p) { return p.id === state.puzzle.id; }) : -1;
    loadPuzzle(state.puzzles[(idx + 1) % state.puzzles.length]);
  }

  function deletePuzzle() {
    if (!state.puzzle) return;
    if (!LBQ.puzzles.hasToken()) {
      LBQ.toast('连接 GitHub 题库后才能删除', 'warn');
      openConnect({ onDone: deletePuzzle });
      return;
    }
    var p = state.puzzle;
    LBQ.confirm({
      title: '从题库删除这道题？',
      body: '<p class="hint">会从 GitHub 的 puzzles.json 中移除《' + LBQ.escapeHTML(p.title) + '》，所有访客都将看不到它。</p>',
      okText: '删除',
      danger: true
    }).then(function (ok) {
      if (!ok) return;
      LBQ.toast('正在从题库删除…');
      LBQ.puzzles.remove(p.id).then(function (res) {
        applyPuzzles(res.puzzles);
        if (state.puzzles.length) loadPuzzle(state.puzzles[0]);
        else emptyBoard();
        if (res.noop) LBQ.toast('这道题已经不在题库里了', '');
        else LBQ.toast('已从 GitHub 题库删除', 'ok');
      }).catch(function (err) {
        LBQ.toast('删除失败：' + err.message, 'warn', 4400);
      });
    });
  }

  /* ---------------------------------------------------------------- 面板 */
  function renderPanel() {
    if (!state.puzzle) {
      var loading = state.loading;
      var err = state.error;
      refs.panel.innerHTML = '<div class="puzzle-empty">' +
        '<div class="pe-icon">' + ICON(loading ? 'clock' : (err ? 'info' : 'target')) + '</div>' +
        '<h2>' + (loading ? '正在读取题库' : (err ? '题库暂时不可用' : '题库还是空的')) + '</h2>' +
        '<p>' + (loading ? '正在从 GitHub 同步题目…' : (err ? LBQ.escapeHTML(err) : '题库由 GitHub 托管。生成第一道题并上传，所有访客都能看到。')) + '</p>' +
        (!loading ? '<button class="btn btn-primary" data-act="generate">' + ICON('plus') + '生成题目</button>' : '') +
        (!loading && !err && !LBQ.puzzles.hasToken() ? '<button class="btn btn-quiet" data-act="db-connect">' + ICON('lock') + '连接题库</button>' : '') +
        (err ? '<button class="btn btn-quiet" data-act="db-refresh">' + ICON('refresh') + '重试</button>' : '') +
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
      '  <div class="puzzle-head-row">' +
      '    <span class="puzzle-kind">GitHub 题库' + (p.author ? ' · ' + LBQ.escapeHTML(p.author) : '') + '</span>' +
      '    <button class="puzzle-del" data-act="puzzle-delete" title="从 GitHub 题库删除">' + ICON('trash') + '</button>' +
      '  </div>' +
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
      '</div>';
    refs.panel.innerHTML = html;
    var fb = refs.panel.querySelector('#puzzle-feedback');
    if (feedbackText) {
      fb.className = 'puzzle-feedback ' + (feedbackType || '');
      fb.innerHTML = feedbackText;
    } else {
      fb.hidden = true;
    }
  }

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
    var playable = !!state.puzzle && !state.solved && !ended;
    trayW.set(game, 0, playable && game.current === 0);
    trayB.set(game, 1, playable && game.current === 1);
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
    if (!game || !state.puzzle || state.solved || game.winner !== null || game.draw || game.current !== player) return;
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
      var active = !!state.puzzle && !state.solved && game.winner === null && !game.draw && game.current === side;
      bar.classList.toggle('is-turn', !!active);
      bar.querySelector('[data-pip="' + side + '"]').hidden = !active;
    });
  }

  /* ---------------------------------------------------------------- 生成器 */
  function openGenerator(opts) {
    opts = opts || {};
    pendingPuzzle = null;
    var defaultTitle = opts.title || ('自建题目 ' + (state.puzzles.length + 1));
    var modal = LBQ.openModal({
      title: '生成练习题',
      subtitle: '输入一个局面（局面代码，留空则为 9 路标准开局）和它的唯一解法走法。上传后会直接写入 GitHub 题库。',
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
          onClick: function () { showGenMsg(validateForm()); }
        },
        {
          label: '上传到题库', cls: 'btn-primary', icon: 'upload', close: false,
          onClick: function (api) { savePuzzle(api); }
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

    function savePuzzle(api) {
      var r = validateForm();
      if (r.error) { showGenMsg(r); return; }
      pendingPuzzle = {
        id: 'u' + Date.now() + '-' + Math.floor(Math.random() * 999),
        title: r.title,
        code: r.code,
        solution: r.canonical,
        intro: r.intro,
        hint: r.hint,
        author: LBQ.puzzles.name() || LBQ.puzzles.login(),
        createdAt: Date.now(),
        side: r.side,
        steps: r.steps,
        builtin: false
      };
      if (!LBQ.puzzles.hasToken()) {
        showGenMsg({ error: '还没有连接 GitHub 题库。连接成功后会自动继续上传。' });
        openConnect({ onDone: function () { uploadPuzzle(api); } });
        return;
      }
      uploadPuzzle(api);
    }

    function uploadPuzzle(api) {
      if (!pendingPuzzle || state.uploading) return;
      var btn = modal.foot.querySelector('.btn-primary');
      var old = btn.innerHTML;
      state.uploading = true;
      btn.disabled = true;
      btn.textContent = '上传中…';
      LBQ.puzzles.upload(pendingPuzzle).then(function (res) {
        state.uploading = false;
        btn.disabled = false;
        btn.innerHTML = old;
        api.close();
        var fresh = (res.puzzles || []).find(function (p) { return p.id === pendingPuzzle.id; }) || pendingPuzzle;
        pendingPuzzle = null;
        applyPuzzles(res.puzzles);
        loadPuzzle(fresh);
        if (location.hash !== '#/practice') location.hash = '#/practice';
        LBQ.toast('已上传到 GitHub 题库', 'ok');
      }, function (err) {
        state.uploading = false;
        btn.disabled = false;
        btn.innerHTML = old;
        showGenMsg({ error: '上传失败：' + err.message });
      });
    }
  }

  /* ---------------------------------------------------------------- GitHub 连接 */
  function openConnect(opts) {
    opts = opts || {};
    var a = LBQ.puzzles.auth();
    var connected = !!a;
    var builtin = !!(a && a.builtin);
    var currentName = a && a.name ? a.name : (a && a.login ? a.login : '');
    var modal = LBQ.openModal({
      title: '连接 GitHub 题库',
      subtitle: '题库文件在 Melba0/phalanxpuzzle 的 main 分支。连接后，网站里生成的题目会直接写入这个仓库。',
      width: 'min(680px, 100%)',
      body: '<div class="gh-conn">' +
        '<a class="gh-repo" href="' + LBQ.puzzles.REPO_URL + '" target="_blank" rel="noopener">' +
        '  <span class="gh-repo-ico">' + ICON('github') + '</span>' +
        '  <span class="gh-repo-meta"><b>Melba0/phalanxpuzzle</b><em>main · puzzles.json · 公开仓库</em></span>' +
        '  <span class="gh-repo-open">' + ICON('external') + '</span>' +
        '</a>' +
        '<div class="gh-status">' + (builtin
          ? '<span class="gh-badge">默认 Token</span><span>站点内置，可直接上传/删除。</span>'
          : (connected
            ? '<span class="gh-badge">' + (a.push === false ? '已连接（只读）' : '已连接') + '</span><span>Token 已保存在本机。</span>'
            : '<span class="gh-badge is-off">未连接</span><span>读取公开题库不需要 Token；上传/删除需要。</span>')) + '</div>' +
        '<ol class="gh-guide">' +
        '  <li>打开 <a href="' + LBQ.puzzles.TOKEN_URL + '" target="_blank" rel="noopener">GitHub · Fine-grained tokens</a>，新建一个 Token。</li>' +
        '  <li>Repository access 只选 <b>Melba0/phalanxpuzzle</b>。</li>' +
        '  <li>Permissions → <b>Contents</b> 设为 <b>Read and write</b>。</li>' +
        '  <li>生成后粘贴到下面；Token 只保存在本机浏览器。</li>' +
        '</ol>' +
        '<div class="field"><label>GitHub Token</label>' +
        '<div class="gh-token"><input class="input mono" id="gh-token" type="password" autocomplete="off" spellcheck="false" placeholder="' +
        (builtin ? '默认 Token 已内置 · 留空保持不变' : (connected ? '已保存 · 留空保持不变' : 'github_pat_…')) + '"><button type="button" class="gh-eye" id="gh-eye">显示</button></div></div>' +
        '<div class="field"><label>显示名（可选）</label><input class="input" id="gh-name" value="' + LBQ.escapeHTML(currentName) + '" placeholder="例如：Melba0" maxlength="40"></div>' +
        '<div class="gh-msg" id="gh-msg"></div>' +
        '<div class="gh-note">' + ICON('lock') + (builtin
          ? '默认 Token 内置于站点，所有拿到这个页面的人都能上传/删除题库。只应把它用于这个公开题库仓库。'
          : 'Token 只保存在本机 localStorage，只会发往 api.github.com。请勿在公用电脑上使用；可随时在 GitHub 撤销。') + '</div>' +
        (connected && !builtin ? '<button type="button" class="gh-disconnect" id="gh-disconnect">断开连接</button>' : '') +
        '</div>',
      actions: [
        { label: '取消', cls: 'btn-quiet' },
        {
          label: connected ? '重新验证' : '连接并测试', cls: 'btn-primary', icon: 'github', close: false,
          onClick: function (api) { saveConnect(api); }
        }
      ]
    });

    var eye = modal.root.querySelector('#gh-eye');
    if (eye) eye.addEventListener('click', function () {
      var input = modal.root.querySelector('#gh-token');
      if (input.type === 'password') { input.type = 'text'; eye.textContent = '隐藏'; }
      else { input.type = 'password'; eye.textContent = '显示'; }
    });
    var disc = modal.root.querySelector('#gh-disconnect');
    if (disc) disc.addEventListener('click', function () {
      LBQ.puzzles.clearAuth();
      LBQ.toast('已断开 GitHub 题库', '');
      modal.close();
      renderDbBar();
      refreshPuzzles();
    });

    function ghMsg(text, type) {
      var m = modal.root.querySelector('#gh-msg');
      if (!m) return;
      m.className = 'gh-msg' + (type ? ' is-' + type : '');
      m.textContent = text || '';
    }

    function saveConnect(api) {
      var input = modal.root.querySelector('#gh-token');
      var nameInput = modal.root.querySelector('#gh-name');
      var tok = (input.value || '').trim() || (a ? a.token : '');
      var nm = (nameInput.value || '').trim();
      var btn = api.foot.querySelector('.btn-primary');
      if (!tok) { ghMsg('请填写 GitHub Token。', 'error'); return; }
      var old = btn.innerHTML;
      btn.disabled = true;
      btn.textContent = '验证中…';
      ghMsg('正在验证 Token 与仓库权限…', 'busy');
      LBQ.puzzles.testToken(tok).then(function (r) {
        btn.disabled = false;
        btn.innerHTML = old;
        if (!r.ok) { ghMsg(r.message, 'error'); return; }
        if (!r.push) {
          ghMsg('这个 Token 没有 Contents: Read and write 权限，无法上传。请修改 Token 权限后重试。', 'error');
          return;
        }
        LBQ.puzzles.setAuth({ token: tok, name: nm || r.login || '', login: r.login || '', push: true });
        LBQ.toast('已连接 GitHub 题库', 'ok');
        api.close();
        renderDbBar();
        if (opts.onDone) opts.onDone();
      }, function (err) {
        btn.disabled = false;
        btn.innerHTML = old;
        ghMsg('验证失败：' + err.message, 'error');
      });
    }
  }

  /* ---------------------------------------------------------------- 路由 */
  function onEnter() {
    if (board) board._measure();
    if (!state.puzzle && state.puzzles.length) loadPuzzle(state.puzzles[0]);
    if (!state.fetchedAt || Date.now() - state.fetchedAt > 60000) refreshPuzzles();
    renderDbBar();
    renderList();
    if (board) board._measure();
  }

  LBQ.pages = LBQ.pages || {};
  LBQ.pages.practice = {
    init: init,
    onEnter: onEnter,
    openGenerator: openGenerator,
    openConnect: openConnect,
    loadPuzzle: loadPuzzle,
    refresh: refreshPuzzles
  };
})(window.LBQ = window.LBQ || {});
