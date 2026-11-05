/* ==========================================================================
   对弈页：本地双人、记谱、分析（无 AI）
   ========================================================================== */
(function (LBQ) {
  'use strict';

  var ICON = LBQ.icon;
  var SIZES = LBQ.SIZES;

  var el, board, trayW, trayB;
  var refs = {};
  var infoCache = typeof WeakMap !== 'undefined' ? new WeakMap() : null;

  function stateInfo(game) {
    if (infoCache) { var c = infoCache.get(game); if (c) return c; }
    var moves = game.allActions(game.current);
    var canDrop = game.tray[game.current].length > 0 && game.emptyCount() > 0;
    var info = {
      moves: moves,
      caps: moves.filter(function (m) { return m.type === 'capture'; }),
      threats: (game.winner === null && !game.draw) ? game.kingThreats(game.current) : [],
      legal: moves.length + (canDrop ? 1 : 0)
    };
    if (infoCache) infoCache.set(game, info);
    return info;
  }
  var g = {
    states: [], history: [], view: 0, redos: [],
    traySel: null, custom: false, startSide: 0, initialCode: null,
    startMobility: 0, lastCells: [], animate: false, needReset: true,
    flip: false, tab: 'log', selInfo: null
  };

  /* ---------------------------------------------------------------- 结构 */
  function init() {
    el = document.getElementById('page-play');
    el.classList.add('play-page');
    el.innerHTML = '' +
      '<div class="wrap">' +
      '  <div class="page-head">' +
      '    <div>' +
      '      <div class="eyebrow">同一棋盘 · 轮流落子</div>' +
      '      <h1>对 弈</h1>' +
      '      <p class="page-desc">白方先行。点选己方线段与另一端，再点金色落点；持棋台上的俘虏可随时打入。</p>' +
      '    </div>' +
      '    <div class="page-head-side">' +
      '      <button class="btn btn-quiet" data-act="flip" title="翻转棋盘">' + ICON('flip') + '<span>翻转</span></button>' +
      '      <button class="btn btn-ghost" data-act="notation">' + ICON('download') + '<span>记谱</span></button>' +
      '      <button class="btn btn-primary" data-act="new">' + ICON('plus') + '<span>新局</span></button>' +
      '    </div>' +
      '  </div>' +
      '  <div class="play-grid">' +
      '    <div class="board-col">' +
      '      <div class="player-bar" data-side="1">' +
      '        <div class="player-who"><span class="side-orb black"></span>' +
      '          <div class="player-name"><b>黑方</b><span data-sub="1">—</span></div></div>' +
      '        <div class="tray-host" data-tray="1"></div>' +
      '        <span class="turn-pip" data-pip="1">行棋</span>' +
      '      </div>' +
      '      <div class="board-stage-wrap">' +
      '        <div class="board-stage" id="play-board"></div>' +
      '        <div class="result-veil" id="result-veil" hidden>' +
      '          <div class="result-card">' +
      '            <div class="result-icon" id="result-icon"></div>' +
      '            <div class="result-side" id="result-side"></div>' +
      '            <div class="result-reason" id="result-reason"></div>' +
      '            <div class="result-actions">' +
      '              <button class="btn btn-sm btn-quiet" data-act="dismiss-result">复盘</button>' +
      '              <button class="btn btn-sm btn-primary" data-act="new">再来一局</button>' +
      '            </div>' +
      '          </div>' +
      '        </div>' +
      '      </div>' +
      '      <div class="player-bar" data-side="0">' +
      '        <div class="player-who"><span class="side-orb"></span>' +
      '          <div class="player-name"><b>白方</b><span data-sub="0">—</span></div></div>' +
      '        <div class="tray-host" data-tray="0"></div>' +
      '        <span class="turn-pip" data-pip="0">行棋</span>' +
      '      </div>' +
      '      <div class="play-hint" id="play-hint">选择己方棋子开始。</div>' +
      '    </div>' +
      '    <aside class="side-panel">' +
      '      <div class="panel status-panel">' +
      '        <div class="status-top">' +
      '          <span class="side-orb big" id="turn-orb"></span>' +
      '          <div class="status-text"><span class="kicker">轮到行棋</span><b id="turn-side">白方</b></div>' +
      '          <span class="status-move" id="turn-move">第 1 手</span>' +
      '        </div>' +
      '        <div class="status-chips" id="status-chips"></div>' +
      '        <div class="alert-box" id="alert-box" hidden></div>' +
      '        <div class="status-tools">' +
      '          <button class="btn btn-sm btn-quiet" data-act="undo" id="btn-undo">' + ICON('undo') + '<span>悔棋</span></button>' +
      '          <button class="btn btn-sm btn-quiet" data-act="redo" id="btn-redo">' + ICON('redo') + '<span>重做</span></button>' +
      '          <button class="btn btn-sm btn-quiet" data-act="flip">' + ICON('flip') + '<span>翻转</span></button>' +
      '          <button class="btn btn-sm btn-quiet" data-act="notation">' + ICON('rules') + '<span>记谱</span></button>' +
      '        </div>' +
      '      </div>' +
      '      <div class="panel log-panel">' +
      '        <div class="log-head">' +
      '          <div class="tabs" role="tablist">' +
      '            <button class="tab active" data-tab="log" role="tab">记谱</button>' +
      '            <button class="tab" data-tab="analysis" role="tab">分析</button>' +
      '          </div>' +
      '          <button class="icon-btn" data-act="notation" title="导入 / 导出记谱">' + ICON('download') + '</button>' +
      '        </div>' +
      '        <div class="log-body">' +
      '          <div class="log-pane" data-pane="log">' +
      '            <div class="moves-head"><span>#</span><span>白方</span><span>黑方</span></div>' +
      '            <div class="moves" id="moves-list"></div>' +
      '          </div>' +
      '          <div class="log-pane" data-pane="analysis" id="analysis-pane" hidden></div>' +
      '        </div>' +
      '        <div class="log-foot">' +
      '          <button class="btn btn-sm btn-quiet" data-act="export">' + ICON('download') + '<span>导出</span></button>' +
      '          <button class="btn btn-sm btn-quiet" data-act="import">' + ICON('upload') + '<span>读谱</span></button>' +
      '          <button class="btn btn-sm btn-quiet" data-act="copy">' + ICON('copy') + '<span>复制</span></button>' +
      '        </div>' +
      '      </div>' +
      '      <div class="side-note">' +
      '        <b>提示</b>：选中线段后，金色方向箭头是落子方向，红色区域是可对撞的敌段；单子线段直接点金色圆点。' +
      '        两段头尾相接时，按住右键或 Esc 可取消选择。' +
      '      </div>' +
      '    </aside>' +
      '  </div>' +
      '</div>';

    refs = {
      boardHost: el.querySelector('#play-board'),
      trayB: el.querySelector('[data-tray="1"]'),
      trayW: el.querySelector('[data-tray="0"]'),
      hint: el.querySelector('#play-hint'),
      turnOrb: el.querySelector('#turn-orb'),
      turnSide: el.querySelector('#turn-side'),
      turnMove: el.querySelector('#turn-move'),
      chips: el.querySelector('#status-chips'),
      alert: el.querySelector('#alert-box'),
      moves: el.querySelector('#moves-list'),
      analysis: el.querySelector('#analysis-pane'),
      resultVeil: el.querySelector('#result-veil'),
      resultSide: el.querySelector('#result-side'),
      resultReason: el.querySelector('#result-reason'),
      resultIcon: el.querySelector('#result-icon'),
      btnUndo: el.querySelector('#btn-undo'),
      btnRedo: el.querySelector('#btn-redo')
    };

    board = new LBQ.BoardView(refs.boardHost, {
      onAction: handleAction,
      onProbe: function (info) { setHint(info.message, 'warn'); },
      onForeign: function () { setHint('这是对方的棋子。', 'warn'); },
      onDropMiss: function () {
        setHint('这里不是排头格：移到能放下整段的位置，出现紫色预览后再点击。', 'warn');
        LBQ.toast('请把鼠标移到紫色预览的排头格再放置', 'warn');
      },
      onSelect: function (info) {
        if (g.traySel) clearTraySel();
        g.selInfo = info;
        updateHint();
      },
      onCancel: function () {
        if (g.traySel) clearTraySel();
        g.selInfo = null;
        updateHint();
      }
    });
    trayW = new LBQ.TrayView(refs.trayW, { onPick: onTrayPick });
    trayB = new LBQ.TrayView(refs.trayB, { onPick: onTrayPick });

    el.addEventListener('click', function (e) {
      var b = e.target.closest('[data-act]');
      if (b) {
        var act = b.dataset.act;
        if (act === 'new') openNew();
        else if (act === 'flip') { g.flip = !g.flip; board.setFlip(g.flip); }
        else if (act === 'undo') undo();
        else if (act === 'redo') redo();
        else if (act === 'notation') openNotation();
        else if (act === 'export') openNotation('export');
        else if (act === 'import') openNotation('import');
        else if (act === 'copy') copyNotation();
        else if (act === 'dismiss-result') { refs.resultVeil.hidden = true; g.resultShown = false; }
        else if (act === 'to-analysis') { LBQ.handoff = { text: exportText() }; location.hash = '#/analysis'; }
        return;
      }
      var tab = e.target.closest('[data-tab]');
      if (tab) { setTab(tab.dataset.tab); return; }
      var mv = e.target.closest('[data-ply]');
      if (mv) { goTo(+mv.dataset.ply); return; }
      var jump = e.target.closest('[data-jump]');
      if (jump) {
        goTo(jump.dataset.jump === 'live' ? g.states.length - 1 : +jump.dataset.jump);
        return;
      }
      var sel = e.target.closest('[data-select-cell]');
      if (sel) {
        if (!isLive()) { goTo(g.states.length - 1); }
        var cells = sel.dataset.selectCell.split(';').map(function (s) { return s.split(',').map(Number); });
        board.setSegment(cells);
        document.querySelector('.board-stage-wrap').scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
    });

    document.addEventListener('lbq-escape', function () {
      if (g.traySel) clearTraySel();
      board.clearSelection();
      g.selInfo = null;
      updateHint();
    });

    newGame(9);
  }

  /* ---------------------------------------------------------------- 状态 */
  function current() { return g.states[g.view]; }
  function live() { return g.states[g.states.length - 1]; }
  function isLive() { return g.view === g.states.length - 1; }
  function ended(game) { return game.winner !== null || game.draw; }

  function newGame(size) {
    var game = new LBQ.Game(size).setupStandard();
    loadGame(game, { custom: false, code: null });
    setTab('log');
  }

  function loadGame(game, opts) {
    g.states = [game.clone()];
    g.history = [];
    g.view = 0;
    g.redos = [];
    g.traySel = null;
    g.custom = !!(opts && opts.custom);
    g.initialCode = opts && opts.code || null;
    g.startSide = game.current;
    g.startMobility = stateInfo(game).legal;
    g.lastCells = [];
    g.animate = false;
    g.needReset = true;
    g.selInfo = null;
    g.flip = false;
    g.resultShown = false;
    board.setFlip(false);
    refs.resultVeil.hidden = true;
    render();
  }

  function pushState(game, action, before) {
    var notation = LBQ.formatAction(before, action);
    var desc = LBQ.describeAction(before, action);
    g.states.push(game);
    g.history.push({
      notation: notation, desc: desc, side: before.current,
      type: action.type, action: action,
      mobility: stateInfo(game).legal,
      ended: game.winner !== null || game.draw
    });
    g.view = g.states.length - 1;
    g.lastCells = actionPath(action);
    g.animate = true;
    g.redos = [];
    g.traySel = null;
  }

  function actionPath(act) {
    if (!act) return [];
    var out = [];
    if (act.type === 'capture') {
      act.cells.forEach(function (p) { out.push(p); });
      act.cells.forEach(function (p) { out.push([p[0] + act.shiftVec[0], p[1] + act.shiftVec[1]]); });
    } else if (act.type === 'move') {
      act.cells.forEach(function (p) { out.push(p); });
      act.to.forEach(function (p) { out.push(p); });
    } else {
      (act.cells || []).forEach(function (p) { out.push(p); });
    }
    var seen = {}, uniq = [];
    out.forEach(function (p) { var k = p[0] + ',' + p[1]; if (!seen[k]) { seen[k] = 1; uniq.push(p); } });
    return uniq;
  }

  function handleAction(act) {
    if (!isLive()) { LBQ.toast('正在回看历史局面，先回到当前。', 'warn'); return; }
    var before = current();
    if (ended(before)) return;
    if (act && act.player !== undefined && act.player !== before.current) return;
    var game = before.clone();
    var info;
    try {
      info = game.apply(act);
    } catch (err) {
      LBQ.toast('无法执行该走法', 'warn');
      return;
    }
    pushState(game, act, before);
    g.selInfo = null;
    g.traySel = null;
    board.clearSelection(true);
    if (info && info.kingKilled) LBQ.sound.play('capture');
    else if (act.type === 'capture') LBQ.sound.play('capture');
    else if (act.type === 'drop') LBQ.sound.play('drop');
    else LBQ.sound.play('move');
    if (info && info.promoted && info.promoted.length) {
      setTimeout(function () { LBQ.sound.play('promote'); }, 180);
    }
    render();
    if (info && info.ended) showResult();
  }

  /* ---------------------------------------------------------------- 渲染 */
  function render() {
    var game = current();
    board.setGame(game, {
      animate: g.animate,
      lastCells: g.lastCells,
      reset: g.needReset
    });
    g.animate = false;
    g.needReset = false;
    board.setMode(isLive() && !ended(game) ? 'select' : 'none');

    var active = !ended(game) && isLive();
    trayW.set(game, 0, active && game.current === 0);
    trayB.set(game, 1, active && game.current === 1);
    if (g.traySel && isLive() && !ended(game)) {
      board.setTraySelection({
        player: game.current, ti: g.traySel.ti, start: g.traySel.start, len: g.traySel.len
      });
      trayW.setSelection(game.current === 0 ? g.traySel : null);
      trayB.setSelection(game.current === 1 ? g.traySel : null);
    } else {
      g.traySel = null;
      trayW.setSelection(null);
      trayB.setSelection(null);
    }

    renderBars(game);
    renderStatus(game);
    renderMoves(game);
    renderAnalysis(game);
    updateHint();
    if (!ended(game)) { refs.resultVeil.hidden = true; g.resultShown = false; }
  }

  function renderBars(game) {
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
      bar.classList.toggle('is-turn', !ended(game) && game.current === side && isLive());
      var pip = bar.querySelector('[data-pip="' + side + '"]');
      pip.hidden = !( !ended(game) && game.current === side && isLive());
    });
  }

  function renderStatus(game) {
    var isEnd = ended(game);
    refs.turnOrb.className = 'side-orb big' + (game.current === 1 ? ' black' : '');
    refs.turnSide.textContent = isEnd
      ? (game.winner !== null ? (game.winner === 0 ? '白方获胜' : '黑方获胜') : '和棋')
      : (game.current === 0 ? '白方' : '黑方');
    refs.turnSide.classList.toggle('is-gold', isEnd);
    refs.turnMove.textContent = isEnd ? (game.plies + ' 手') : ('第 ' + (game.plies + 1) + ' 手');
    var tray = game.trayCount(game.current);
    var info = stateInfo(game);
    var legal = info.legal;
    var rep = game.repeatCount();
    refs.chips.innerHTML =
      '<span class="chip">' + ICON('target') + '合法 <b>' + legal + '</b></span>' +
      '<span class="chip">' + ICON('sword') + '可吃 <b>' + info.caps.length + '</b></span>' +
      '<span class="chip' + (tray.pieces ? ' violet' : '') + '">' + ICON('users') + '俘虏 <b>' + tray.pieces + '</b></span>' +
      '<span class="chip' + (rep >= 2 ? ' crimson' : '') + '">' + ICON('refresh') + '重现 <b>' + rep + '</b></span>';

    var alerts = [];
    if (isEnd) {
      alerts.push({ html: '<b>' + (game.draw ? '和棋' : ((game.winner === 0 ? '白方' : '黑方') + '获胜')) + '</b> · ' + reasonText(game), cls: 'is-end' });
    } else {
      var threats = info.threats;
      if (threats.length) {
        alerts.push({ html: '<b>⚠ ' + (game.current === 0 ? '白' : '黑') + '王受威胁</b> · 对方下一手可擒王，必须应对。', cls: 'is-check' });
      }
      if (rep >= 2) {
        alerts.push({ html: '<b>局面将三现</b> · 同一局面已出现 ' + rep + ' 次，再出现一次即判和。', cls: 'is-draw' });
      }
    }
    if (g.view !== g.states.length - 1) {
      alerts.push({
        html: '<b>回看第 ' + g.view + ' 手后的局面</b> · 棋盘为只读。' +
          '<button class="mini-link" data-jump="live">返回当前</button>', cls: 'is-view'
      });
    }
    if (alerts.length) {
      refs.alert.hidden = false;
      refs.alert.className = 'alert-box ' + alerts[0].cls;
      refs.alert.innerHTML = alerts[0].html;
    } else {
      refs.alert.hidden = true;
    }

    refs.btnUndo.disabled = g.history.length === 0;
    refs.btnRedo.disabled = g.redos.length === 0;
  }

  function reasonText(game) {
    if (game.draw) return '同一局面第三次出现';
    if (game.winReason === 'king') return '擒王胜';
    if (game.winReason === 'stalemate') return '困毙胜 · 对方无合法走法';
    return '';
  }

  function renderMoves(game) {
    if (!g.history.length) {
      refs.moves.innerHTML = '<div class="moves-empty">还没有走子。<br><span>白方先行，从底线开始整段推进。</span></div>';
      return;
    }
    var rows = [];
    g.history.forEach(function (h, i) {
      var num = Math.floor(i / 2) + 1;
      var side = (i + g.startSide) % 2;
      var row = rows[num - 1];
      if (!row) { row = { num: num, w: null, b: null }; rows[num - 1] = row; }
      row[side === 0 ? 'w' : 'b'] = { h: h, ply: i };
    });
    var html = '';
    rows.forEach(function (row) {
      if (!row) return;
      html += '<div class="mv-row"><span class="mv-no">' + row.num + '</span>' +
        cell(row.w, row.num, 'w') + cell(row.b, row.num, 'b') + '</div>';
    });
    refs.moves.innerHTML = html;
    var active = refs.moves.querySelector('.mv.active');
    if (active) {
      var box = refs.moves;
      var top = active.offsetTop - box.clientHeight / 2 + active.offsetHeight / 2;
      box.scrollTop = Math.max(0, top);
    }

    function cell(entry, num, side) {
      if (!entry) return '<span class="mv empty"></span>';
      var h = entry.h;
      var isActive = g.view === entry.ply + 1;
      var glyph = h.type === 'capture' ? '⚔' : (h.type === 'drop' ? '↓' : '→');
      return '<button class="mv ' + h.type + (isActive ? ' active' : '') + '" data-ply="' + (entry.ply + 1) + '" title="' +
        LBQ.escapeHTML(h.desc) + '">' +
        '<span class="mv-token mono">' + LBQ.escapeHTML(h.notation) + '</span>' +
        '<span class="mv-glyph">' + glyph + '</span></button>';
    }
  }

  function renderAnalysis(game) {
    var mat = game.material();
    var sinfo = stateInfo(game);
    var caps = sinfo.caps;
    var threats = sinfo.threats;
    var series = [g.startMobility].concat(g.history.map(function (h) { return h.mobility; }));
    var maxM = Math.max.apply(null, series.concat([1]));
    var W = 300, H = 62, pad = 6;
    var pts = series.map(function (v, i) {
      var x = pad + (W - pad * 2) * (series.length <= 1 ? .5 : i / (series.length - 1));
      var y = H - pad - (H - pad * 2) * (v / maxM);
      return [x, y];
    });
    var line = pts.map(function (p, i) { return (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' ');
    var area = line + ' L' + pts[pts.length - 1][0].toFixed(1) + ' ' + (H - pad) + ' L' + pts[0][0].toFixed(1) + ' ' + (H - pad) + ' Z';
    var curPt = pts[Math.min(g.view, pts.length - 1)];
    var svg = '<svg class="spark" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none">' +
      '<defs><linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="#e2b569" stop-opacity=".38"/><stop offset="1" stop-color="#e2b569" stop-opacity="0"/>' +
      '</linearGradient></defs>' +
      '<path d="' + area + '" fill="url(#sparkFill)"/>' +
      '<path d="' + line + '" fill="none" stroke="#e2b569" stroke-width="1.6" stroke-linejoin="round"/>' +
      '<circle cx="' + curPt[0].toFixed(1) + '" cy="' + curPt[1].toFixed(1) + '" r="3.2" fill="#ffe6b0" stroke="#a97a35"/>' +
      '</svg>';
    var matRows = [
      ['王', 'K'], ['车', 'R'], ['象', 'B'], ['兵', 'P'], ['升变', 'promo'], ['俘虏', 'tray']
    ].map(function (r) {
      var w = r[1] === 'tray' ? game.trayCount(0).pieces : mat[0][r[1]];
      var b = r[1] === 'tray' ? game.trayCount(1).pieces : mat[1][r[1]];
      return '<tr><th>' + r[0] + '</th><td class="' + (w > b ? 'lead' : '') + '">' + w + '</td><td class="' + (b > w ? 'lead' : '') + '">' + b + '</td></tr>';
    }).join('');
    var totalW = mat[0].total, totalB = mat[1].total;
    var pct = totalW + totalB ? totalW / (totalW + totalB) * 100 : 50;

    var capHtml = '';
    if (!caps.length) {
      capHtml = '<div class="an-empty">当前没有可对撞的敌段。</div>';
    } else {
      capHtml = caps.slice(0, 5).map(function (a) {
        var c = a.compare;
        return '<button class="threat" ' + (isLive() ? 'data-select-cell="' + a.cells.map(function (p) { return p[0] + ',' + p[1]; }).join(';') + '"' : '') + '>' +
          '<span class="threat-dot"></span>' +
          '<span class="threat-text"><b class="mono">' + cellNames(game, a.cells) + '</b>' +
          '<em>' + LBQ.PIECE_LABEL[c.attr] + ' ' + c.mine + ':' + c.theirs + ' · 长 ' + c.lenMine + ':' + c.lenTheirs + '</em></span>' +
          '<span class="threat-ok">可吃</span></button>';
      }).join('');
    }

    var threatHtml = '';
    if (threats.length) {
      var t = threats[0];
      threatHtml = '<div class="threat warn"><span class="threat-dot"></span>' +
        '<span class="threat-text"><b>王受威胁</b><em>敌段 ' + cellNames(game, t.cells) + ' 可擒王</em></span></div>';
    }

    refs.analysis.innerHTML =
      '<div class="analysis-jump"><button class="mini-link" data-act="to-analysis">在分析页打开树形棋谱 →</button></div>' +
      '<section class="an-sec">' +
      '  <div class="an-head"><span>机动性</span><em>当前 ' + series[Math.min(g.view, series.length - 1)] + ' 种走法</em></div>' +
      '  <div class="an-spark">' + svg + '</div>' +
      '  <div class="an-foot"><span>开局 ' + series[0] + '</span><span>峰值 ' + maxM + '</span><span>共 ' + (series.length - 1) + ' 手</span></div>' +
      '</section>' +
      '<section class="an-sec">' +
      '  <div class="an-head"><span>双方兵力</span><em>王 · 车 · 象 · 兵</em></div>' +
      '  <table class="mat-table"><thead><tr><th></th><th>白</th><th>黑</th></tr></thead><tbody>' + matRows + '</tbody></table>' +
      '  <div class="mat-bar"><i style="width:' + pct.toFixed(1) + '%"></i></div>' +
      '  <div class="an-foot"><span>白方 ' + totalW + ' 子</span><span>黑方 ' + totalB + ' 子</span></div>' +
      '</section>' +
      '<section class="an-sec">' +
      '  <div class="an-head"><span>对撞机会</span><em>' + caps.length + ' 处</em></div>' +
      threatHtml + capHtml +
      '  <p class="an-tip">正交比车数，斜线比象数；相等再比段长。兵与王只贡献长度。</p>' +
      '</section>';
  }

  function cellNames(game, cells) {
    var a = LBQ.squareName(game.size, cells[0][0], cells[0][1]);
    if (cells.length === 1) return a;
    return a + '–' + LBQ.squareName(game.size, cells[cells.length - 1][0], cells[cells.length - 1][1]);
  }

  function updateHint() {
    if (!el) return;
    var game = current();
    if (!isLive()) { setHint('回看模式 · 点击「返回当前」继续对局。'); return; }
    if (ended(game)) { setHint('对局结束 · ' + reasonText(game)); return; }
    if (g.traySel) {
      var targets = game.dropTargets(game.current, g.traySel.ti, g.traySel.start, g.traySel.len);
      setHint('已截取 ' + g.traySel.len + ' 子 · 移到空格预览紫色落点，点击放置（Esc 取消）', 'gold');
      return;
    }
    if (g.selInfo && g.selInfo.stage === 'segment') {
      setHint('已选 ' + g.selInfo.cells.length + ' 子线段 · 平移 ' + g.selInfo.moves +
        ' · 可吃 ' + g.selInfo.captures + ' · 点金色方向箭头落子 / 点红色敌段吃子');
      return;
    }
    if (g.selInfo && g.selInfo.stage === 'anchor') {
      setHint('已选起点 · 沿同一直线点选线段另一端（点回自己 = 单子段）');
      return;
    }
    if (g.history.length === 0) setHint('选择己方棋子开始。白方不可后退——除非棋子已升变。');
    else setHint('轮到' + (game.current === 0 ? '白方' : '黑方') + ' · 选择己方线段开始行棋。');
  }

  function setHint(text, type) {
    if (!refs.hint) return;
    refs.hint.textContent = text;
    refs.hint.className = 'play-hint' + (type ? ' ' + type : '');
  }

  /* ---------------------------------------------------------------- 结果 */
  function showResult() {
    var game = live();
    if (!ended(game)) return;
    g.resultShown = true;
    refs.resultVeil.hidden = false;
    refs.resultIcon.innerHTML = ICON(game.draw ? 'refresh' : 'crown');
    refs.resultSide.textContent = game.draw ? '和棋' : ((game.winner === 0 ? '白方' : '黑方') + '获胜');
    refs.resultReason.textContent = reasonText(game) + ' · 共 ' + game.plies + ' 手';
    if (game.draw) LBQ.sound.play('alert');
    else LBQ.sound.play('win');
  }

  /* ---------------------------------------------------------------- 持棋台 */
  function onTrayPick(ti, k, player) {
    if (!isLive()) { LBQ.toast('回看模式 · 先返回当前', 'warn'); return; }
    var game = current();
    if (ended(game) || game.current !== player) return;
    if (!game.tray[player][ti]) return;
    board.clearSelection(true);
    g.selInfo = null;
    if (g.traySel && g.traySel.ti === ti && k >= g.traySel.start) {
      g.traySel = { ti: ti, start: g.traySel.start, len: k - g.traySel.start + 1 };
    } else {
      g.traySel = { ti: ti, start: k, len: 1 };
    }
    LBQ.sound.play('pick');
    render();
  }

  function clearTraySel() {
    g.traySel = null;
    board.setTraySelection(null);
    trayW.setSelection(null);
    trayB.setSelection(null);
    updateHint();
  }

  /* ---------------------------------------------------------------- 悔棋 */
  function undo() {
    if (!g.states.length || g.history.length === 0) return;
    if (!isLive()) goTo(g.states.length - 1);
    if (!g.history.length) return;
    var h = g.history.pop();
    g.states.pop();
    g.redos.push(h);
    g.view = g.states.length - 1;
    g.lastCells = g.view > 0 ? actionPath(g.history[g.view - 1].action) : [];
    g.animate = false;
    g.needReset = false;
    g.traySel = null;
    g.selInfo = null;
    refs.resultVeil.hidden = true;
    g.resultShown = false;
    LBQ.sound.play('pick');
    render();
  }

  function redo() {
    if (!g.redos.length || !isLive()) return;
    var h = g.redos.pop();
    var before = current();
    var game = before.clone();
    game.apply(h.action);
    g.states.push(game);
    g.history.push(h);
    g.view = g.states.length - 1;
    g.lastCells = actionPath(h.action);
    g.animate = true;
    g.traySel = null;
    g.selInfo = null;
    LBQ.sound.play('move');
    render();
    if (h.ended) showResult();
  }

  function goTo(pos) {
    pos = Math.max(0, Math.min(g.states.length - 1, pos));
    if (pos === g.view) return;
    g.view = pos;
    g.animate = false;
    g.needReset = false;
    g.traySel = null;
    g.selInfo = null;
    g.lastCells = pos > 0 ? actionPath(g.history[pos - 1].action) : [];
    board.clearSelection(true);
    render();
  }

  function setTab(name) {
    g.tab = name;
    el.querySelectorAll('[data-tab]').forEach(function (b) {
      b.classList.toggle('active', b.dataset.tab === name);
    });
    el.querySelectorAll('.log-pane').forEach(function (p) {
      p.hidden = p.dataset.pane !== name;
    });
  }

  /* ---------------------------------------------------------------- 记谱 */
  function exportText() {
    var start = g.states[0];
    var lines = [];
    lines.push('# 连兵棋 · 兵线会战');
    lines.push('# 棋盘 ' + start.size + '×' + start.size + ' · ' + (g.startSide === 0 ? '白方' : '黑方') + '先行');
    if (g.initialCode) lines.push('# 局面: ' + g.initialCode);
    var rows = [];
    g.history.forEach(function (h, i) {
      var num = Math.floor(i / 2) + 1;
      var side = (i + g.startSide) % 2;
      var row = rows[num - 1];
      if (!row) { row = { num: num, w: null, b: null }; rows[num - 1] = row; }
      row[side === 0 ? 'w' : 'b'] = h;
    });
    rows.forEach(function (row) {
      if (!row) return;
      var s = row.num + '.';
      if (!row.w) s += ' ...';
      else s += ' ' + row.w.notation;
      if (row.b) s += ' ' + row.b.notation;
      lines.push(s);
    });
    var last = live();
    if (last.winner !== null) lines.push('# 结果: ' + (last.winner === 0 ? '白方' : '黑方') + '胜 · ' + reasonText(last));
    else if (last.draw) lines.push('# 结果: 和棋 · 三现重复');
    return lines.join('\n');
  }

  function copyNotation() {
    LBQ.copyText(exportText()).then(function (ok) {
      LBQ.toast(ok ? '记谱已复制到剪贴板' : '复制失败，请手动选择文本', ok ? 'ok' : 'warn');
    });
  }

  function openNotation(mode) {
    var text = exportText();
    var modal = LBQ.openModal({
      title: '记谱 · 读谱 / 写谱',
      subtitle: '一步棋 = 起点 + 延伸方向 + 长度 + 移动方向。吃子只需把移动方向指向敌段；打入在末尾追加 <code>*台号.截起</code>。',
      width: 'min(680px, 100%)',
      body: '<div class="notation-panel">' +
        '<div class="notation-help">' +
        '<div class="nh-row"><b>方向键</b><span class="keys">' +
        '<kbd>q</kbd><kbd>w</kbd><kbd>e</kbd><kbd>a</kbd><kbd>s</kbd><kbd>d</kbd><kbd>z</kbd><kbd>x</kbd><kbd>c</kbd>' +
        '</span><span>左上 / 上 / 右上 / 左 / 中 / 右 / 左下 / 下 / 右下</span></div>' +
        '<div class="nh-row"><b>示例</b><code>a1d5d</code><span>a1 向右延伸 5 格的线段，向右平移（若正前方是敌段则为吃子）</span></div>' +
        '<div class="nh-row"><b>打入</b><code>e5d2*1.2</code><span>落点 e5、沿方向右放 2 子，取自第 1 段俘虏的第 2 子起</span></div>' +
        '</div>' +
        '<textarea class="textarea mono" id="ntext" spellcheck="false">' + LBQ.escapeHTML(text) + '</textarea>' +
        '<div class="parse-msg" id="parse-msg"></div>' +
        '<details class="notation-more"><summary>读谱规则与容错</summary><p>以 <code>#</code> 开头的行是注释；手数前缀 <code>1.</code> 会被忽略；也可以用空白分隔、不写手数。' +
        '自定义开局会把 <code>LBQ1.</code> 局面代码写在注释里，读谱时会自动还原。走法按顺序从开局重放，任何一步非法都会指出具体位置。</p></details>' +
        '</div>',
      actions: [
        {
          label: '复制', icon: 'copy', cls: 'btn-quiet', close: false,
          onClick: function () {
            LBQ.copyText(document.getElementById('ntext').value).then(function (ok) {
              LBQ.toast(ok ? '已复制' : '复制失败', ok ? 'ok' : 'warn');
            });
          }
        },
        {
          label: '从文本载入', icon: 'upload', cls: 'btn-primary', close: false,
          onClick: function (api) {
            var v = document.getElementById('ntext').value;
            var err = importText(v);
            if (!err) { api.close(); LBQ.toast('读谱完成', 'ok'); }
          }
        }
      ]
    });
    if (mode === 'export') setTimeout(function () {
      var ta = document.getElementById('ntext');
      ta.focus(); ta.select();
    }, 60);
  }

  function importText(text) {
    var msg = document.getElementById('parse-msg');
    var codeMatch = /LBQ1\.[A-Za-z0-9_-]+/.exec(text);
    var start = null;
    if (codeMatch) {
      var dec = LBQ.decodePosition(codeMatch[0]);
      if (dec.error) return fail(dec.error);
      start = dec.game;
    } else {
      var sm = /(\d+)\s*[×xX]\s*(\d+)/.exec(text);
      var size = 9;
      if (sm && +sm[1] === +sm[2] && SIZES.indexOf(+sm[1]) >= 0) size = +sm[1];
      start = new LBQ.Game(size).setupStandard();
    }
    var cleaned = text.replace(/LBQ1\.[A-Za-z0-9_-]+/g, ' ')
      .split(/\r?\n/).map(function (line) { return line.replace(/#.*$/, ''); }).join(' ')
      .replace(/\d+\s*\.(?!\d)/g, ' ');
    var tokens = cleaned.split(/[\s,;，；]+/).filter(function (t) {
      return t && t !== '...' && t !== '…' && t !== '—' && t !== '-';
    });
    if (!tokens.length) return fail('没有读到任何走法。');
    var game = start.clone();
    var states = [game.clone()];
    var history = [];
    for (var i = 0; i < tokens.length; i++) {
      var act = game.parseToken(tokens[i]);
      if (!act || !act.ok) {
        return fail('第 ' + (i + 1) + ' 步「' + tokens[i] + '」无法执行：' + ((act && act.error) || '不合规则'));
      }
      var before = game;
      var side = game.current;
      var desc = LBQ.describeAction(game, act);
      var notation = LBQ.formatAction(game, act);
      var info = game.apply(act);
      if (info.error) return fail('第 ' + (i + 1) + ' 步「' + tokens[i] + '」无法执行');
      states.push(game.clone());
      history.push({
        notation: notation, desc: desc, side: side, type: act.type, action: act,
        mobility: stateInfo(game).legal, ended: game.winner !== null || game.draw
      });
      if (game.winner !== null || game.draw) break;
    }
    g.states = states;
    g.history = history;
    g.view = states.length - 1;
    g.redos = [];
    g.traySel = null;
    g.selInfo = null;
    g.custom = !!codeMatch;
    g.initialCode = codeMatch ? codeMatch[0] : null;
    g.startSide = states[0].current;
    g.startMobility = stateInfo(states[0]).legal;
    g.lastCells = history.length ? actionPath(history[history.length - 1].action) : [];
    g.animate = false;
    g.needReset = true;
    g.flip = false;
    board.setFlip(false);
    if (g.states[g.states.length - 1].winner !== null || g.states[g.states.length - 1].draw) { }
    render();
    if (ended(live())) showResult();
    return null;

    function fail(m) {
      if (msg) msg.textContent = m;
      LBQ.toast(m, 'warn', 3600);
      return m;
    }
  }

  /* ---------------------------------------------------------------- 新局 */
  function openNew() {
    var pick = current().size;
    var body = '<div class="size-picker" id="size-picker">' + SIZES.map(function (s) {
      return '<button type="button" class="size-card' + (s === pick ? ' active' : '') + '" data-size="' + s + '">' +
        '<b>' + s + ' × ' + s + '</b><span>每方 ' + LBQ.CAMP_DEPTH[s] + ' 排阵营</span>' +
        '<em>' + (s === 9 ? '紧凑 · 快节奏' : (s === 11 ? '标准 · 中盘厚' : '宏大 · 长线战')) + '</em></button>';
    }).join('') + '</div>' +
      '<p class="hint" style="margin-top:14px">当前对局' + (g.history.length ? '有 ' + g.history.length + ' 手记录，' : '') +
      '将被清空。尺寸决定阵营深度：9 路 3 排、11 路 4 排、13 路 5 排。</p>';
    var modal = LBQ.openModal({
      title: '开始新对局',
      subtitle: '选择棋盘规格。白方先行，双方在同一设备上轮流落子。',
      body: body,
      actions: [
        { label: '取消', cls: 'btn-quiet' },
        {
          label: '开始对局', cls: 'btn-primary', icon: 'play',
          onClick: function () {
            var active = document.querySelector('#size-picker .size-card.active');
            var size = active ? +active.dataset.size : pick;
            newGame(size);
            LBQ.toast(size + ' 路新对局已开始', 'ok');
          }
        }
      ]
    });
    modal.root.querySelectorAll('.size-card').forEach(function (b) {
      b.addEventListener('click', function () {
        modal.root.querySelectorAll('.size-card').forEach(function (x) { x.classList.remove('active'); });
        b.classList.add('active');
      });
    });
  }

  /* ---------------------------------------------------------------- 路由 */
  function onEnter() {
    if (g.states.length && board) render();
  }

  /* ---------------------------------------------------------------- 对外 */
  LBQ.pages = LBQ.pages || {};
  LBQ.pages.play = {
    init: init,
    onEnter: onEnter,
    loadGame: function (game) {
      loadGame(game, { custom: true, code: LBQ.encodePosition(game) });
      LBQ.toast('已载入编辑器局面 · ' + game.size + ' 路', 'ok');
    }
  };
})(window.LBQ = window.LBQ || {});








