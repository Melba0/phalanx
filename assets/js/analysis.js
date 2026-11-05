/* ==========================================================================
   棋谱分析页：树形棋谱 + 局面分析（无 AI）
   ========================================================================== */
(function (LBQ) {
  'use strict';

  var ICON = LBQ.icon;
  var el, board, trayW, trayB;
  var refs = {};
  var state = {
    root: null, current: null, nextId: 1, flip: false, traySel: null, custom: false
  };
  var cache = typeof WeakMap !== 'undefined' ? new WeakMap() : null;

  /* ---------------------------------------------------------------- 结构 */
  function init() {
    el = document.getElementById('page-analysis');
    el.classList.add('analysis-page');
    el.innerHTML = '' +
      '<div class="wrap">' +
      '  <div class="page-head analysis-head">' +
      '    <div>' +
      '      <div class="eyebrow">棋谱树 · 局面分析 · 无 AI</div>' +
      '      <h1>分 析</h1>' +
      '      <p class="page-desc">导入棋谱或局面代码，在任意节点上继续走子就会分出变例。点击树中的任一手回看，或把它设为主线。</p>' +
      '    </div>' +
      '    <div class="page-head-side">' +
      '      <button class="btn btn-quiet" data-act="import">' + ICON('upload') + '<span>导入</span></button>' +
      '      <button class="btn btn-quiet" data-act="export">' + ICON('download') + '<span>导出树</span></button>' +
            '      <button class="btn btn-ghost" data-act="new">' + ICON('refresh') + '<span>新分析</span></button>' +
      '      <button class="btn btn-primary" data-act="make-puzzle">' + ICON('spark') + '<span>存为练习题</span></button>' +
      '    </div>' +
      '  </div>' +
      '  <div class="analysis-grid">' +
      '    <div class="analysis-board-col">' +
      '      <div class="player-bar" data-side="1">' +
      '        <div class="player-who"><span class="side-orb black"></span>' +
      '          <div class="player-name"><b>黑方</b><span data-sub="1">—</span></div></div>' +
      '        <div class="tray-host" data-tray="1"></div>' +
      '        <span class="turn-pip" data-pip="1">行棋</span>' +
      '      </div>' +
      '      <div class="board-stage-wrap"><div class="board-stage" id="analysis-board"></div></div>' +
      '      <div class="player-bar" data-side="0">' +
      '        <div class="player-who"><span class="side-orb"></span>' +
      '          <div class="player-name"><b>白方</b><span data-sub="0">—</span></div></div>' +
      '        <div class="tray-host" data-tray="0"></div>' +
      '        <span class="turn-pip" data-pip="0">行棋</span>' +
      '      </div>' +
      '      <div class="play-hint" id="analysis-hint">点击树中的任一手回看；在棋盘上走一步会创建新分支。</div>' +
      '    </div>' +
      '    <aside class="analysis-side">' +
      '      <div class="panel tree-panel">' +
      '        <div class="tree-head">' +
      '          <div class="panel-title">棋谱树</div>' +
      '          <div class="tree-tools">' +
      '            <button class="icon-btn" data-act="flip" title="翻转棋盘">' + ICON('flip') + '</button>' +
            '<button class="icon-btn" data-act="tree-root" title="回到开局">' + ICON('undo') + '</button>' +
      '            <button class="icon-btn" data-act="tree-prev" title="上一步">' + ICON('arrowLeft') + '</button>' +
      '            <button class="icon-btn" data-act="tree-main" title="设为主线">' + ICON('flag') + '</button>' +
      '            <button class="icon-btn" data-act="tree-delete" title="删除当前分支">' + ICON('trash') + '</button>' +
      '          </div>' +
      '        </div>' +
      '        <div class="tree-body" id="tree-body"></div>' +
      '        <div class="tree-foot"><span id="tree-count"></span><span class="dim">点击节点回看</span></div>' +
      '      </div>' +
      '      <div class="panel analysis-stats-panel" id="analysis-stats"></div>' +
      '    </aside>' +
      '  </div>' +
      '</div>';

    refs = {
      boardHost: el.querySelector('#analysis-board'),
      trayW: el.querySelector('[data-tray="0"]'),
      trayB: el.querySelector('[data-tray="1"]'),
      tree: el.querySelector('#tree-body'),
      count: el.querySelector('#tree-count'),
      stats: el.querySelector('#analysis-stats'),
      hint: el.querySelector('#analysis-hint')
    };

    board = new LBQ.BoardView(refs.boardHost, {
      onAction: function (act) { playAction(act); },
      onProbe: function (info) { setHint(info.message, 'warn'); },
      onForeign: function () { setHint('这是对方的棋子。', 'warn'); },
      onDropMiss: function () { setHint('这里不是排头格：移到能放下整段的位置，出现紫色预览后再点击。', 'warn'); },
      onSelect: function () {
        if (state.traySel) { state.traySel = null; syncTrays(); }
      },
      onCancel: function () {
        if (state.traySel) { state.traySel = null; syncTrays(); }
      }
    });
    trayW = new LBQ.TrayView(refs.trayW, { onPick: function (ti, k, p) { onTrayPick(ti, k, 0); } });
    trayB = new LBQ.TrayView(refs.trayB, { onPick: function (ti, k, p) { onTrayPick(ti, k, 1); } });

    el.addEventListener('click', function (e) {
      var b = e.target.closest('[data-act]');
      if (b) {
        var act = b.dataset.act;
        if (act === 'import') openImport();
        else if (act === 'export') openExport();
        else if (act === 'flip') { state.flip = !state.flip; board.setFlip(state.flip); }
        else if (act === 'new') openNew();
        else if (act === 'make-puzzle') makePuzzle();
        else if (act === 'tree-root') navigate(state.root);
        else if (act === 'tree-prev') { if (state.current.parent) navigate(state.current.parent); }
        else if (act === 'tree-main') setMainLine();
        else if (act === 'tree-delete') deleteCurrent();
        return;
      }
      var node = e.target.closest('[data-node]');
      if (node) {
        var n = findNode(node.dataset.node);
        if (n) navigate(n);
        return;
      }
      var cells = e.target.closest('[data-select-cell]');
      if (cells) {
        board.setSegment(cells.dataset.selectCell.split(';').map(function (s) { return s.split(',').map(Number); }));
        el.querySelector('.analysis-board-col').scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
    document.addEventListener('lbq-escape', function () {
      if (state.traySel) { state.traySel = null; syncTrays(); }
      board.clearSelection();
    });

    newAnalysis(new LBQ.Game(9).setupStandard(), false);
  }

  /* ---------------------------------------------------------------- 树 */
  function makeRoot(game, custom) {
    return {
      id: 'n0', game: game.clone(), parent: null, children: [], action: null,
      notation: '开局', desc: '', ply: 0, side: game.current, custom: !!custom
    };
  }

  function addChild(parent, game, act, notation, desc) {
    for (var i = 0; i < parent.children.length; i++) {
      if (parent.children[i].notation === notation) return parent.children[i];
    }
    var node = {
      id: 'n' + (state.nextId++), game: game.clone(), parent: parent, children: [],
      action: act, notation: notation, desc: desc,
      ply: parent.ply + 1, side: parent.game.current
    };
    parent.children.push(node);
    return node;
  }

  function findNode(id) {
    var found = null;
    (function walk(n) {
      if (found) return;
      if (n.id === id) { found = n; return; }
      n.children.forEach(walk);
    })(state.root);
    return found;
  }

  function pathOf(node) {
    var arr = [];
    while (node) { arr.push(node); node = node.parent; }
    return arr.reverse();
  }

  function newAnalysis(game, custom) {
    state.root = makeRoot(game, custom);
    state.current = state.root;
    state.nextId = 1;
    state.traySel = null;
    state.custom = !!custom;
    render(false, true);
  }

  function playAction(act) {
    var node = state.current;
    if (!node) return;
    var game = node.game;
    if (game.winner !== null || game.draw) return;
    var notation = LBQ.formatAction(game, act);
    for (var i = 0; i < node.children.length; i++) {
      if (node.children[i].notation === notation) {
        state.current = node.children[i];
        state.traySel = null;
        render(false, false);
        return;
      }
    }
    var next = game.clone();
    var info = next.apply(act);
    var child = addChild(node, next, act, notation, LBQ.describeAction(game, act));
    state.current = child;
    state.traySel = null;
    render(true, false);
    if (act.type === 'capture') LBQ.sound.play('capture');
    else if (act.type === 'drop') LBQ.sound.play('drop');
    else LBQ.sound.play('move');
    if (info.promoted && info.promoted.length) setTimeout(function () { LBQ.sound.play('promote'); }, 180);
    if (info.ended) setTimeout(function () { LBQ.sound.play(info.draw ? 'alert' : 'win'); }, 200);
  }

  function navigate(node) {
    if (!node) return;
    state.current = node;
    state.traySel = null;
    board.clearSelection(true);
    render(false, false);
  }

  function setMainLine() {
    var n = state.current;
    if (!n.parent) { LBQ.toast('开局没有主线可设', 'warn'); return; }
    var sibs = n.parent.children;
    if (sibs[0] === n) { LBQ.toast('这已经是主线', ''); return; }
    n.parent.children = [n].concat(sibs.filter(function (c) { return c !== n; }));
    render(false, false);
    LBQ.toast('已把当前变例设为该节点的主线', 'ok');
  }

  function deleteCurrent() {
    var n = state.current;
    if (!n.parent) { LBQ.toast('开局节点不能删除', 'warn'); return; }
    LBQ.confirm({
      title: '删除当前分支？',
      body: '<p class="hint">将删除当前节点及其之后的所有变例。其他分支不受影响。</p>',
      okText: '删除',
      danger: true
    }).then(function (ok) {
      if (!ok) return;
      var parent = n.parent;
      parent.children = parent.children.filter(function (c) { return c !== n; });
      state.current = parent;
      state.traySel = null;
      render(false, false);
      LBQ.toast('分支已删除', 'ok');
    });
  }

  /* ---------------------------------------------------------------- 渲染 */
  function render(animate, reset) {
    var node = state.current;
    var game = node.game;
    var ended = game.winner !== null || game.draw;
    board.setGame(game, {
      animate: !!animate, reset: !!reset,
      lastCells: node.action ? actionPath(node.action) : []
    });
    board.setMode(ended ? 'none' : 'select');
    board.setFlip(state.flip);
    trayW.set(game, 0, !ended && game.current === 0);
    trayB.set(game, 1, !ended && game.current === 1);
    syncTrays();
    renderTree();
    renderStats();
    updateBars();
    setHint(ended
      ? (game.draw ? '和棋 · 三现重复' : ((game.winner === 0 ? '白方' : '黑方') + '获胜 · ' + (game.winReason === 'king' ? '擒王' : '困毙')))
      : '轮到' + (game.current === 0 ? '白方' : '黑方') + ' · 在棋盘上走一步会创建新分支；点击树中的节点回看。');
  }

  function actionPath(act) {
    var out = [];
    if (!act) return out;
    if (act.type === 'capture') {
      act.cells.forEach(function (p) { out.push(p); });
      act.cells.forEach(function (p) { out.push([p[0] + act.shiftVec[0], p[1] + act.shiftVec[1]]); });
    } else if (act.type === 'move') {
      act.cells.forEach(function (p) { out.push(p); });
      act.to.forEach(function (p) { out.push(p); });
    } else if (act.cells) {
      act.cells.forEach(function (p) { out.push(p); });
    }
    var seen = {}, uniq = [];
    out.forEach(function (p) { var k = p[0] + ',' + p[1]; if (!seen[k]) { seen[k] = 1; uniq.push(p); } });
    return uniq;
  }

  function updateBars() {
    var game = state.current.game;
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
      bar.classList.toggle('is-turn', game.winner === null && !game.draw && game.current === side);
      bar.querySelector('[data-pip="' + side + '"]').hidden = !(game.winner === null && !game.draw && game.current === side);
    });
  }

  function renderTree() {
    var path = pathOf(state.current);
    var pathIds = {};
    path.forEach(function (n) { pathIds[n.id] = true; });
    var rows = [];
    rows.push(rowHTML(state.root, 0, false, pathIds, true));
    (function walk(node, depth) {
      if (!node.children.length) return;
      var main = node.children[0];
      rows.push(rowHTML(main, depth, false, pathIds, false));
      for (var i = 1; i < node.children.length; i++) {
        var v = node.children[i];
        rows.push(rowHTML(v, depth + 1, true, pathIds, false));
        walk(v, depth + 1);
      }
      walk(main, depth);
    })(state.root, 0);
    refs.tree.innerHTML = rows.join('');

    var moves = 0, variations = 0;
    (function count(n) {
      n.children.forEach(function (c) {
        moves++;
        if (n.children.length > 1) variations += (c === n.children[0] ? 0 : 1);
        count(c);
      });
    })(state.root);
    refs.count.textContent = moves + ' 手 · ' + variations + ' 条变例';

    var active = refs.tree.querySelector('.tree-move.is-active');
    if (active) {
      var top = active.offsetTop - refs.tree.clientHeight / 2 + active.offsetHeight / 2;
      refs.tree.scrollTop = Math.max(0, top);
    }
  }

  function rowHTML(node, depth, isVariation, pathIds, isRoot) {
    var cls = 'tree-move' + (node.id === state.current.id ? ' is-active' : '') +
      (pathIds[node.id] ? ' in-path' : '') + (isVariation ? ' is-variation' : '') +
      (isRoot ? ' is-root' : '');
    var indent = 'padding-left:' + (10 + depth * 18) + 'px';
    if (isRoot) {
      var custom = isStandardRoot(state.root.game) ? '标准开局' : '自定义局面';
      return '<button type="button" class="' + cls + '" data-node="' + node.id + '" style="' + indent + '">' +
        '<span class="tm-root-mark">' + ICON('flag') + '</span>' +
        '<span class="tm-token">开局</span><span class="tm-tag">' + custom + '</span></button>';
    }
    var glyph = node.action ? (node.action.type === 'capture' ? '⚔' : (node.action.type === 'drop' ? '↓' : '→')) : '·';
    var num = Math.floor((node.ply - 1 + state.root.game.current) / 2) + 1;
    var label = node.side === 0 ? (num + '.') : (num + '…');
    return '<button type="button" class="' + cls + ' ' + (node.action ? node.action.type : '') + '" data-node="' + node.id +
      '" style="' + indent + '" title="' + LBQ.escapeHTML(node.desc || '') + '">' +
      '<span class="tm-label">' + label + '</span>' +
      '<span class="tm-token mono">' + LBQ.escapeHTML(node.notation) + '</span>' +
      '<span class="tm-glyph">' + glyph + '</span></button>';
  }

  function isStandardRoot(game) {
    try {
      var std = new LBQ.Game(game.size).setupStandard();
      return std.stateKey() === game.stateKey();
    } catch (e) { return false; }
  }

  function infoOf(node) {
    if (cache) {
      var c = cache.get(node);
      if (c) return c;
    }
    var game = node.game;
    var moves = game.allActions(game.current);
    var canDrop = game.tray[game.current].length > 0 && game.emptyCount() > 0;
    var info = {
      moves: moves,
      caps: moves.filter(function (m) { return m.type === 'capture'; }),
      threats: (game.winner === null && !game.draw) ? game.kingThreats(game.current) : [],
      legal: moves.length + (canDrop ? 1 : 0)
    };
    if (cache) cache.set(node, info);
    return info;
  }

  function renderStats() {
    var node = state.current;
    var game = node.game;
    var info = infoOf(node);
    var mat = game.material();
    var ended = game.winner !== null || game.draw;
    var line = pathOf(node).slice(1).map(function (n) { return n.notation; });
    var lineText = line.length ? line.join(' ') : '（开局）';
    if (lineText.length > 110) lineText = '…' + lineText.slice(-110);
    var matRows = [['王', 'K'], ['车', 'R'], ['象', 'B'], ['兵', 'P'], ['升变', 'promo'], ['俘虏', 'tray']].map(function (r) {
      var w = r[1] === 'tray' ? game.trayCount(0).pieces : mat[0][r[1]];
      var b = r[1] === 'tray' ? game.trayCount(1).pieces : mat[1][r[1]];
      return '<tr><th>' + r[0] + '</th><td class="' + (w > b ? 'lead' : '') + '">' + w + '</td><td class="' + (b > w ? 'lead' : '') + '">' + b + '</td></tr>';
    }).join('');
    var totalW = mat[0].total, totalB = mat[1].total;
    var pct = totalW + totalB ? totalW / (totalW + totalB) * 100 : 50;
    var caps = info.caps;
    var capHtml = caps.length ? caps.slice(0, 4).map(function (a) {
      var c = a.compare;
      return '<button class="threat" data-select-cell="' + a.cells.map(function (p) { return p[0] + ',' + p[1]; }).join(';') + '">' +
        '<span class="threat-dot"></span><span class="threat-text"><b class="mono">' + cellNames(game, a.cells) + '</b>' +
        '<em>' + LBQ.PIECE_LABEL[c.attr] + ' ' + c.mine + ':' + c.theirs + ' · 长 ' + c.lenMine + ':' + c.lenTheirs + '</em></span>' +
        '<span class="threat-ok">可吃</span></button>';
    }).join('') : '<div class="an-empty">当前没有可对撞的敌段。</div>';
    var threat = info.threats.length
      ? '<div class="threat warn"><span class="threat-dot"></span><span class="threat-text"><b>王受威胁</b><em>对方下一手可擒王</em></span></div>'
      : '';
    refs.stats.innerHTML =
      '<div class="stats-status">' +
      '  <div class="stats-turn"><span class="side-orb' + (game.current === 1 ? ' black' : '') + '"></span>' +
      '    <b>' + (ended ? (game.draw ? '和棋' : (game.winner === 0 ? '白方获胜' : '黑方获胜')) : ('轮到' + (game.current === 0 ? '白方' : '黑方'))) + '</b>' +
      '    <span>第 ' + (node.ply + (ended ? 0 : 1)) + ' 手</span></div>' +
      '  <div class="status-chips analysis-chips">' +
      '    <span class="chip">' + ICON('target') + '合法 <b>' + info.legal + '</b></span>' +
      '    <span class="chip">' + ICON('sword') + '可吃 <b>' + caps.length + '</b></span>' +
      '  </div>' +
      '</div>' +
      threat +
      '<div class="an-sec"><div class="an-head"><span>当前主线</span><em>' + (line.length) + ' 手</em></div>' +
      '<div class="stats-line mono">' + LBQ.escapeHTML(lineText) + '</div></div>' +
      '<div class="an-sec"><div class="an-head"><span>双方兵力</span><em>王 · 车 · 象 · 兵</em></div>' +
      '<table class="mat-table"><thead><tr><th></th><th>白</th><th>黑</th></tr></thead><tbody>' + matRows + '</tbody></table>' +
      '<div class="mat-bar"><i style="width:' + pct.toFixed(1) + '%"></i></div>' +
      '<div class="an-foot"><span>白方 ' + totalW + ' 子</span><span>黑方 ' + totalB + ' 子</span></div></div>' +
      '<div class="an-sec"><div class="an-head"><span>对撞机会</span><em>' + caps.length + ' 处</em></div>' + capHtml + '</div>';
  }

  function cellNames(game, cells) {
    var a = LBQ.squareName(game.size, cells[0][0], cells[0][1]);
    if (cells.length === 1) return a;
    return a + '–' + LBQ.squareName(game.size, cells[cells.length - 1][0], cells[cells.length - 1][1]);
  }

  function syncTrays() {
    var game = state.current.game;
    if (state.traySel) {
      board.setTraySelection({ player: game.current, ti: state.traySel.ti, start: state.traySel.start, len: state.traySel.len });
      trayW.setSelection(game.current === 0 ? state.traySel : null);
      trayB.setSelection(game.current === 1 ? state.traySel : null);
    } else {
      board.setTraySelection(null);
      trayW.setSelection(null);
      trayB.setSelection(null);
    }
  }

  function onTrayPick(ti, k, player) {
    var game = state.current.game;
    if (game.winner !== null || game.draw || game.current !== player) return;
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
    setHint('已截取 ' + state.traySel.len + ' 子 · 移到空格预览紫色落点，点击放置（Esc 取消）', 'gold');
  }

  function setHint(text, type) {
    refs.hint.textContent = text;
    refs.hint.className = 'play-hint' + (type ? ' ' + type : '');
  }

  /* ---------------------------------------------------------------- 导入 / 导出 */
  function openImport() {
    var modal = LBQ.openModal({
      title: '导入棋谱 / 局面',
      subtitle: '支持局面代码、线性记谱，以及用括号表示变例的树形棋谱。手数前缀会被忽略。',
      width: 'min(720px, 100%)',
      body: '<div class="notation-panel">' +
        '<div class="notation-help">' +
        '<div class="nh-row"><b>局面</b><code>LBQ1.…</code><span>由编辑器/分析页「局面代码」生成，可单独导入</span></div>' +
        '<div class="nh-row"><b>线性</b><code>1. a3w1w a7x1x</code><span>一行一行的主变</span></div>' +
        '<div class="nh-row"><b>树形</b><code>1. a3w1w (1... d7x1x) 1... a7x1x</code><span>括号内是变例，可嵌套</span></div>' +
        '</div>' +
        '<textarea class="textarea mono" id="import-text" spellcheck="false" style="min-height:220px" placeholder="# Phalanx · 棋谱&#10;1. a3w1w a7x1x"></textarea>' +
        '<div class="parse-msg" id="import-msg"></div>' +
        '</div>',
      actions: [
        { label: '取消', cls: 'btn-quiet' },
        {
          label: '载入', cls: 'btn-primary', icon: 'upload', close: false,
          onClick: function (api) {
            var text = document.getElementById('import-text').value;
            var err = importText(text);
            if (err) {
              document.getElementById('import-msg').textContent = err;
              return;
            }
            api.close();
            LBQ.toast('棋谱已载入', 'ok');
          }
        }
      ]
    });
    var ta = document.getElementById('import-text');
    setTimeout(function () { ta.focus(); }, 50);
  }

  function openExport() {
    var text = exportText();
    var modal = LBQ.openModal({
      title: '导出树形棋谱',
      subtitle: '括号表示变例；把这个文本重新导入即可还原整棵树。',
      width: 'min(720px, 100%)',
      body: '<div class="notation-panel"><textarea class="textarea mono" id="export-text" spellcheck="false" style="min-height:260px">' +
        LBQ.escapeHTML(text) + '</textarea></div>',
      actions: [
        {
          label: '复制', icon: 'copy', cls: 'btn-primary', close: false,
          onClick: function () {
            LBQ.copyText(document.getElementById('export-text').value).then(function (ok) {
              LBQ.toast(ok ? '树形棋谱已复制' : '复制失败', ok ? 'ok' : 'warn');
            });
          }
        },
        { label: '关闭', cls: 'btn-quiet' }
      ]
    });
  }

  function exportText() {
    var root = state.root;
    var size = root.game.size;
    var out = ['# Phalanx · 棋谱树'];
    out.push('# 棋盘 ' + size + '×' + size + ' · ' + (root.game.current === 0 ? '白方' : '黑方') + '先行');
    if (!isStandardRoot(root.game)) out.push('# 局面: ' + LBQ.encodePosition(root.game));
    var tokens = [];
    emitLine(root, tokens);
    if (tokens.length) out.push(tokens.join(' '));
    return out.join('\n');
  }

  function labelOf(node) {
    var num = Math.floor((node.ply - 1 + state.root.game.current) / 2) + 1;
    return node.side === 0 ? (num + '.') : (num + '...');
  }

  function emitLine(pos, tokens) {
    if (!pos.children.length) return;
    var main = pos.children[0];
    tokens.push(labelOf(main) + ' ' + main.notation);
    for (var i = 1; i < pos.children.length; i++) {
      var alt = pos.children[i];
      var sub = [labelOf(alt) + ' ' + alt.notation];
      emitLine(alt, sub);
      tokens.push('(' + sub.join(' ') + ')');
    }
    emitLine(main, tokens);
  }

  function importText(text, opts) {
    opts = opts || {};
    var codeMatch = /LBQ1\.[A-Za-z0-9_-]+/.exec(text || '');
    var rootGame = null, custom = false;
    if (codeMatch) {
      var dec = LBQ.decodePosition(codeMatch[0]);
      if (dec.error) return dec.error;
      rootGame = dec.game;
      custom = true;
    } else {
      var sm = /(\d+)\s*[×xX]\s*(\d+)/.exec(text || '');
      var size = 9;
      if (sm && +sm[1] === +sm[2] && LBQ.SIZES.indexOf(+sm[1]) >= 0) size = +sm[1];
      rootGame = new LBQ.Game(size).setupStandard();
    }
    var cleaned = (text || '').replace(/LBQ1\.[A-Za-z0-9_-]+/g, ' ')
      .replace(/^\s*\[.*\]\s*$/gm, '')
      .split(/\r?\n/).map(function (line) { return line.replace(/#.*$/, ''); }).join(' ');
    var tokens = cleaned.match(/[()]|[^\s()]+/g) || [];
    state.nextId = 1;
    var root = makeRoot(rootGame, custom);
    var cur = root, lastParent = null, stack = [];
    var moveCount = 0;
    for (var i = 0; i < tokens.length; i++) {
      var tok = tokens[i];
      if (tok === '(') {
        if (!lastParent) return '第 ' + (i + 1) + ' 个记号：变例前没有可替换的走法';
        stack.push({ resume: cur });
        cur = lastParent;
        continue;
      }
      if (tok === ')') {
        if (!stack.length) return '括号不匹配';
        cur = stack.pop().resume;
        continue;
      }
      var t = tok.replace(/^\d+\.+/, '').trim();
      if (!t || t === '...' || t === '…' || t === '—') continue;
      var game = cur.game.clone();
      var act = game.parseToken(t);
      if (!act || !act.ok) {
        return '第 ' + (moveCount + 1) + ' 步「' + tok + '」无法执行：' + ((act && act.error) || '不合规则');
      }
      var notation = LBQ.formatAction(cur.game, act);
      var desc = LBQ.describeAction(cur.game, act);
      var nextGame = cur.game.clone();
      nextGame.apply(act);
      var parent = cur;
      var child = addChild(parent, nextGame, act, notation, desc);
      lastParent = parent;
      cur = child;
      moveCount++;
    }
    state.root = root;
    state.current = cur;
    state.custom = custom;
    state.traySel = null;
    render(false, true);
    return null;
  }

  function openNew() {
    var pick = state.root ? state.root.game.size : 9;
    var modal = LBQ.openModal({
      title: '新建分析',
      subtitle: '以标准开局开始一棵新的棋谱树。',
      body: '<div class="size-picker">' + LBQ.SIZES.map(function (s) {
        return '<button type="button" class="size-card' + (s === pick ? ' active' : '') + '" data-size="' + s + '">' +
          '<b>' + s + ' × ' + s + '</b><span>每方 ' + LBQ.CAMP_DEPTH[s] + ' 排阵营</span></button>';
      }).join('') + '</div>',
      actions: [
        { label: '取消', cls: 'btn-quiet' },
        {
          label: '开始', cls: 'btn-primary',
          onClick: function () {
            var active = document.querySelector('.modal .size-card.active');
            var size = active ? +active.dataset.size : pick;
            newAnalysis(new LBQ.Game(size).setupStandard(), false);
            LBQ.toast(size + ' 路新分析', 'ok');
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

  function makePuzzle() {
    if (!LBQ.pages.practice || !LBQ.pages.practice.openGenerator) {
      LBQ.toast('练习题页面尚未就绪', 'warn');
      return;
    }
    var code = LBQ.encodePosition(state.current.game);
    LBQ.pages.practice.openGenerator({
      code: code,
      title: '来自分析 · ' + (state.current.ply + 1) + ' 手局面',
      intro: '找出这一局面的唯一走法。'
    });
  }

  /* ---------------------------------------------------------------- 路由 */
  function onEnter() {
    if (board) board._measure();
    if (LBQ.handoff && LBQ.handoff.text) {
      var text = LBQ.handoff.text;
      LBQ.handoff = null;
      var err = importText(text);
      if (err) {
        LBQ.toast('对弈棋谱载入失败：' + err, 'warn', 4200);
        if (!state.root) newAnalysis(new LBQ.Game(9).setupStandard(), false);
      } else {
        LBQ.toast('已从对弈页载入棋谱树', 'ok');
      }
    } else if (!state.root) {
      newAnalysis(new LBQ.Game(9).setupStandard(), false);
    }
    if (board) board._measure();
  }

  LBQ.pages = LBQ.pages || {};
  LBQ.pages.analysis = {
    init: init,
    onEnter: onEnter,
    importText: importText,
    newAnalysis: newAnalysis
  };
})(window.LBQ = window.LBQ || {});



