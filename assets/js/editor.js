/* ==========================================================================
   棋盘编辑器
   ========================================================================== */
(function (LBQ) {
  'use strict';

  var ICON = LBQ.icon;
  var PIECE_LABEL = LBQ.PIECE_LABEL;
  var el, board;
  var refs = {};
  var state = {
    game: null, size: 9, tool: { t: 'R', p: 0 }, promo: false,
    turn: 0
  };

  function init() {
    el = document.getElementById('page-editor');
    el.innerHTML = '' +
      '<div class="wrap">' +
      '  <div class="page-head">' +
      '    <div>' +
      '      <div class="eyebrow">自由摆子 · 测试局面</div>' +
      '      <h1>棋盘编辑器</h1>' +
      '      <p class="page-desc">摆一个任意局面，设置行棋方与持棋台，然后直接进入本地对弈。' +
      '        棋子落在对方阵营会自动升变；升变是永久状态，也可以手动标记。</p>' +
      '    </div>' +
      '    <div class="page-head-side">' +
      '      <button class="btn btn-quiet" data-act="clear">' + ICON('trash') + '<span>清空</span></button>' +
      '      <button class="btn btn-quiet" data-act="standard">' + ICON('board') + '<span>初始布局</span></button>' +
      '      <button class="btn btn-quiet" data-act="code">' + ICON('copy') + '<span>局面代码</span></button>' +
      '      <button class="btn btn-quiet" data-act="make-puzzle">' + ICON('spark') + '<span>生成练习题</span></button>' +
      '      <button class="btn btn-primary" data-act="play" id="btn-play">' + ICON('play') + '<span>开始对弈</span></button>' +
      '    </div>' +
      '  </div>' +
      '  <div class="editor-grid">' +
      '    <div class="editor-board-col">' +
      '      <div class="board-stage" id="editor-board"></div>' +
      '      <div class="editor-hint" id="editor-hint">选择棋子，然后点击棋盘放置。右键擦除。</div>' +
      '      <div class="editor-status" id="editor-status"></div>' +
      '    </div>' +
      '    <aside class="editor-panel">' +
      '      <div class="panel">' +
      '        <div class="panel-head"><div class="panel-title">棋子</div><span class="panel-sub" id="tool-label">车 · 白</span></div>' +
      '        <div class="panel-body">' +
      '          <div class="palette" id="palette"></div>' +
      '          <div class="tool-row">' +
      '            <button class="tool-btn" data-tool="promo" id="tool-promo">' + ICON('spark') + '<span>升变标记</span></button>' +
      '            <button class="tool-btn" data-tool="erase" id="tool-erase">' + ICON('trash') + '<span>擦除</span></button>' +
      '          </div>' +
      '          <p class="hint">左键放置 / 替换，右键擦除。落在对方阵营（染色区）的棋子自动升变。</p>' +
      '        </div>' +
      '      </div>' +
      '      <div class="panel">' +
      '        <div class="panel-head"><div class="panel-title">行棋方与棋盘</div></div>' +
      '        <div class="panel-body">' +
      '          <div class="field"><label>轮到谁走</label><div class="seg-control" id="turn-control"></div></div>' +
      '          <div class="field"><label>棋盘规格</label><div class="seg-control" id="size-control"></div></div>' +
      '        </div>' +
      '      </div>' +
      '      <div class="panel">' +
      '        <div class="panel-head"><div class="panel-title">持棋台</div><span class="panel-sub">俘虏段 · 锁定方向</span></div>' +
      '        <div class="panel-body" id="tray-editor"></div>' +
      '      </div>' +
      '      <div class="panel">' +
      '        <div class="panel-head"><div class="panel-title">局面校验</div></div>' +
      '        <div class="panel-body" id="valid-box"></div>' +
      '      </div>' +
      '    </aside>' +
      '  </div>' +
      '</div>';

    refs = {
      boardHost: el.querySelector('#editor-board'),
      palette: el.querySelector('#palette'),
      turn: el.querySelector('#turn-control'),
      size: el.querySelector('#size-control'),
      tray: el.querySelector('#tray-editor'),
      valid: el.querySelector('#valid-box'),
      status: el.querySelector('#editor-status'),
      hint: el.querySelector('#editor-hint'),
      toolLabel: el.querySelector('#tool-label'),
      btnPlay: el.querySelector('#btn-play')
    };

    board = new LBQ.BoardView(refs.boardHost, {
      onEdit: onEdit
    });
    board.setMode('edit');
    board.setPalette(state.tool);

    buildPalette();
    buildTurn();
    buildSize();
    state.game = new LBQ.Game(9).setupStandard();
    state.turn = 0;
    refresh(true);

    el.addEventListener('click', function (e) {
      var b = e.target.closest('[data-act]');
      if (b) {
        var act = b.dataset.act;
        if (act === 'clear') {
          state.game.clearBoard();
          state.game.current = state.turn;
          state.game.resetRepeat();
          refresh(true);
          LBQ.toast('已清空棋盘');
        } else if (act === 'standard') {
          state.game = new LBQ.Game(state.size).setupStandard();
          state.turn = 0;
          refresh(true);
          LBQ.toast('已恢复 ' + state.size + ' 路初始布局');
        } else if (act === 'code') openCode();
        else if (act === 'make-puzzle') {
          if (LBQ.pages.practice && LBQ.pages.practice.openGenerator) {
            LBQ.pages.practice.openGenerator({ code: LBQ.encodePosition(state.game), title: '编辑器局面' });
          } else { LBQ.toast('练习题页面尚未就绪', 'warn'); }
        }
        else if (act === 'play') startPlay();
        return;
      }
      var pal = e.target.closest('[data-piece]');
      if (pal) {
        var p = pal.dataset.piece.split('-');
        state.tool = { t: p[0], p: +p[1] };
        state.promo = false;
        updatePromoTool();
        buildPalette();
        board.setPalette(state.tool);
        refs.toolLabel.textContent = PIECE_LABEL[state.tool.t] + ' · ' + (state.tool.p === 0 ? '白' : '黑');
        refs.hint.textContent = '已选择' + (state.tool.p === 0 ? '白' : '黑') + PIECE_LABEL[state.tool.t] + '，点击棋盘放置。';
        return;
      }
      var tool = e.target.closest('[data-tool]');
      if (tool) {
        var t = tool.dataset.tool;
        if (t === 'erase') {
          state.tool = 'erase';
          board.setPalette('erase');
          refs.toolLabel.textContent = '擦除';
        } else if (t === 'promo') {
          if (state.tool !== 'erase') {
            state.promo = !state.promo;
            refs.toolLabel.textContent = PIECE_LABEL[state.tool.t] + ' · ' + (state.promo ? '带升变' : '普通');
            refs.hint.textContent = state.promo ? '新放置的棋子会带升变金标。' : '新放置的棋子不带升变。';
          }
        }
        buildPalette();
        updatePromoTool();
        return;
      }
      var turn = e.target.closest('[data-turn]');
      if (turn) {
        state.turn = +turn.dataset.turn;
        state.game.current = state.turn;
        state.game.resetRepeat();
        buildTurn();
        refresh(false);
        return;
      }
      var sz = e.target.closest('[data-size]');
      if (sz) {
        var size = +sz.dataset.size;
        if (size === state.size) return;
        state.size = size;
        state.game = new LBQ.Game(size).clearBoard();
        state.game.current = state.turn;
        state.game.resetRepeat();
        buildSize();
        refresh(true);
        LBQ.toast('已切换到 ' + size + ' 路空盘');
        return;
      }
      var add = e.target.closest('[data-add-tray]');
      if (add) { openTrayEditor(+add.dataset.addTray); return; }
      var del = e.target.closest('[data-del-tray]');
      if (del) {
        var parts = del.dataset.delTray.split(':');
        state.game.tray[+parts[0]].splice(+parts[1], 1);
        state.game.resetRepeat();
        refresh(false);
        return;
      }
      var start = e.target.closest('[data-start]');
      if (start) startPlay();
    });
  }

  /* ---------------------------------------------------------------- 调色板 */
  function buildPalette() {
    var types = ['K', 'R', 'B', 'P'];
    var html = '';
    [0, 1].forEach(function (p) {
      html += '<div class="pal-row"><span class="pal-side">' + (p === 0 ? '白方' : '黑方') + '</span>';
      types.forEach(function (t) {
        var sel = state.tool !== 'erase' && state.tool.p === p && state.tool.t === t;
        html += '<button class="pal-btn' + (sel ? ' active' : '') + '" data-piece="' + t + '-' + p + '" title="' +
          (p === 0 ? '白' : '黑') + PIECE_LABEL[t] + '">' +
          '<span class="pal-pc">' + LBQ.pieceSVG(t, p) + '</span><em>' + PIECE_LABEL[t] + '</em></button>';
      });
      html += '</div>';
    });
    refs.palette.innerHTML = html;
    if (state.tool !== 'erase') {
      refs.toolLabel.textContent = PIECE_LABEL[state.tool.t] + ' · ' + (state.tool.p === 0 ? '白' : '黑') +
        (state.promo ? ' · 升' : '');
    }
    updatePromoTool();
  }

  function updatePromoTool() {
    var b = el.querySelector('#tool-promo');
    if (b) b.classList.toggle('active', !!state.promo && state.tool !== 'erase');
    var e = el.querySelector('#tool-erase');
    if (e) e.classList.toggle('active', state.tool === 'erase');
  }

  function buildTurn() {
    refs.turn.innerHTML = [0, 1].map(function (p) {
      return '<button class="seg-btn' + (state.turn === p ? ' active' : '') + '" data-turn="' + p + '">' +
        '<i class="side-orb' + (p === 1 ? ' black' : '') + '"></i>' + (p === 0 ? '白方' : '黑方') + '行棋</button>';
    }).join('');
  }

  function buildSize() {
    refs.size.innerHTML = LBQ.SIZES.map(function (s) {
      return '<button class="seg-btn' + (state.size === s ? ' active' : '') + '" data-size="' + s + '">' +
        s + ' × ' + s + '</button>';
    }).join('');
  }

  /* ---------------------------------------------------------------- 编辑 */
  function onEdit(pos, existing, eraseRight) {
    var game = state.game;
    var idx = game.idx(pos[0], pos[1]);
    var piece = game.cells[idx];
    if (eraseRight || state.tool === 'erase') {
      if (!piece) return;
      game.cells[idx] = null;
      afterEdit();
      return;
    }
    if (state.tool === 'promo') {
      if (!piece) return;
      if (game.inEnemyCamp(pos[0], pos[1], piece.p)) {
        piece.promo = true;
      } else {
        piece.promo = !piece.promo;
      }
      afterEdit();
      return;
    }
    var t = state.tool;
    if (piece && piece.p === t.p && piece.t === t.t) {
      game.cells[idx] = null;
    } else {
      var promo = state.promo || game.inEnemyCamp(pos[0], pos[1], t.p);
      game.cells[idx] = LBQ.makePiece(t.p, t.t, promo);
    }
    afterEdit();
  }

  function afterEdit() {
    var game = state.game;
    if (game.winner !== null || game.draw) { game.winner = null; game.draw = false; }
    game.current = state.turn;
    game.resetRepeat();
    board.setGame(game, { animate: false });
    refresh(false);
  }

  function refresh(resetBoard) {
    if (!state.game) return;
    if (resetBoard) board.setGame(state.game, { reset: true, animate: false });
    board.setMode('edit');
    board.setPalette(state.tool === 'erase' ? 'erase' : state.tool);
    buildTurn();
    buildSize();
    renderStatus();
    renderTrays();
    validate();
  }

  function renderStatus() {
    var game = state.game;
    var w = 0, b = 0, wk = 0, bk = 0, wp = 0, bp = 0;
    for (var i = 0; i < game.cells.length; i++) {
      var p = game.cells[i];
      if (!p) continue;
      if (p.p === 0) { w++; if (p.t === 'K') wk++; if (p.promo) wp++; }
      else { b++; if (p.t === 'K') bk++; if (p.promo) bp++; }
    }
    refs.status.innerHTML =
      '<span class="chip"><i class="dot white"></i>白 <b>' + w + '</b> 子 · 王 ' + wk + (wp ? ' · 升 ' + wp : '') + '</span>' +
      '<span class="chip"><i class="dot black"></i>黑 <b>' + b + '</b> 子 · 王 ' + bk + (bp ? ' · 升 ' + bp : '') + '</span>' +
      '<span class="chip gold">' + (state.turn === 0 ? '白方' : '黑方') + '先行</span>';
  }

  function validate() {
    var game = state.game;
    var wk = 0, bk = 0;
    for (var i = 0; i < game.cells.length; i++) {
      var p = game.cells[i];
      if (!p || p.t !== 'K') continue;
      if (p.p === 0) wk++; else bk++;
    }
    var ok = wk === 1 && bk === 1;
    var msgs = [];
    if (wk !== 1) msgs.push('白方需要恰好 1 枚王（当前 ' + wk + '）');
    if (bk !== 1) msgs.push('黑方需要恰好 1 枚王（当前 ' + bk + '）');
    if (ok) {
      refs.valid.innerHTML = '<div class="valid-ok">' + ICON('check') + '<div><b>局面可以开始</b>' +
        '<span>双方各有一枚王。点击「开始对弈」进入对弈页。</span></div></div>' +
        '<p class="hint">也可以先用「局面代码」保存这个局面，或在对弈中随时悔棋。</p>';
      refs.btnPlay.disabled = false;
    } else {
      refs.valid.innerHTML = '<div class="valid-bad">' + ICON('info') + '<div><b>还不能开始</b><span>' +
        msgs.join('；') + '。</span></div></div>';
      refs.btnPlay.disabled = true;
    }
    return ok;
  }

  /* ---------------------------------------------------------------- 持棋台 */
  function renderTrays() {
    var game = state.game;
    var html = '';
    [0, 1].forEach(function (side) {
      var segs = game.tray[side];
      html += '<div class="te-side">' +
        '<div class="te-head"><i class="side-orb' + (side === 1 ? ' black' : '') + '"></i>' +
        (side === 0 ? '白方' : '黑方') + '<span>' + segs.length + ' 段</span></div>';
      if (!segs.length) html += '<div class="te-empty">暂无俘虏段</div>';
      segs.forEach(function (seg, i) {
        html += '<div class="te-seg">' +
          '<span class="te-idx">#' + (i + 1) + '</span>' +
          '<span class="te-arrow" style="--rot:' + (LBQ.ARROW_ANGLE[seg.dir] || 0) + 'deg">' + LBQ.ARROW_PATH + '</span>' +
          '<span class="te-pcs">' + seg.pieces.map(function (t) {
            return '<span class="te-pc">' + LBQ.pieceSVG(t, side) + '</span>';
          }).join('') + '</span>' +
          '<button class="te-del" data-del-tray="' + side + ':' + i + '" title="删除">' + ICON('close') + '</button>' +
          '</div>';
      });
      html += '<button class="btn btn-sm btn-quiet te-add" data-add-tray="' + side + '">' + ICON('plus') + '添加俘虏段</button>' +
        '</div>';
    });
    refs.tray.innerHTML = html;
  }

  function openTrayEditor(side) {
    var seq = [];
    var dir = 'n';
    var dirs = ['nw', 'n', 'ne', 'w', 'e', 'sw', 's', 'se'];
    var modal = LBQ.openModal({
      title: '添加俘虏段 · ' + (side === 0 ? '白方' : '黑方'),
      subtitle: '点棋子按钮按“排头 → 排尾”的顺序排列。方向是锁定方向：打入时会从排头开始沿此方向依次排开。',
      body: '<div class="te-editor">' +
        '<div class="te-preview" id="te-preview"></div>' +
        '<div class="field"><label>添加棋子（顺序即队列）</label><div class="te-add-row" id="te-add-row">' +
        ['P', 'R', 'B'].map(function (t) {
          return '<button type="button" class="te-add-pc" data-add="' + t + '"><span>' + LBQ.pieceSVG(t, side) + '</span>' + PIECE_LABEL[t] + '</button>';
        }).join('') +
        '<button type="button" class="btn btn-sm btn-quiet" data-back>删除末位</button>' +
        '</div></div>' +
        '<div class="field"><label>锁定方向</label><div class="dir-grid" id="dir-grid">' +
        dirs.map(function (d) {
          return '<button type="button" class="dir-btn' + (d === dir ? ' active' : '') + '" data-dir="' + d + '">' +
            '<span class="dir-arrow" style="--rot:' + LBQ.ARROW_ANGLE[d] + 'deg">' + LBQ.ARROW_PATH + '</span>' +
            '<em>' + LBQ.DIR_LABEL[d] + '</em></button>';
        }).join('') + '</div></div>' +
        '<p class="hint">方向以“键盘方向键”表示：q w e / a · d / z x c。这里用箭头直观选择。</p>' +
        '</div>',
      width: 'min(560px, 100%)',
      actions: [
        { label: '取消', cls: 'btn-quiet' },
        {
          label: '添加', cls: 'btn-primary', close: false,
          onClick: function (api) {
            if (!seq.length) {
              LBQ.toast('至少添加一枚棋子', 'warn');
              return;
            }
            state.game.tray[side].push({ pieces: seq.slice(), dir: dir });
            state.game.resetRepeat();
            api.close();
            refresh(false);
            LBQ.toast('已添加俘虏段', 'ok');
          }
        }
      ]
    });
    function renderPreview() {
      var pv = modal.root.querySelector('#te-preview');
      if (!seq.length) {
        pv.innerHTML = '<span class="te-ph">还没有棋子</span>';
        return;
      }
      pv.innerHTML = '<span class="te-arrow big" style="--rot:' + LBQ.ARROW_ANGLE[dir] + 'deg">' + LBQ.ARROW_PATH + '</span>' +
        '<div class="te-pv-pcs">' + seq.map(function (t, i) {
          return '<span class="te-pv-pc"><span>' + LBQ.pieceSVG(t, side) + '</span><em>' + (i === 0 ? '排头' : i + 1) + '</em></span>';
        }).join('') + '<i class="te-pv-dir"></i></div>';
    }
    modal.root.addEventListener('click', function (e) {
      var a = e.target.closest('[data-add]');
      if (a) { if (seq.length < 8) seq.push(a.dataset.add); renderPreview(); return; }
      if (e.target.closest('[data-back]')) { seq.pop(); renderPreview(); return; }
      var d = e.target.closest('[data-dir]');
      if (d) {
        dir = d.dataset.dir;
        modal.root.querySelectorAll('.dir-btn').forEach(function (b) { b.classList.toggle('active', b === d); });
        renderPreview();
      }
    });
    renderPreview();
  }

  /* ---------------------------------------------------------------- 局面代码 */
  function openCode() {
    var code = LBQ.encodePosition(state.game);
    LBQ.openModal({
      title: '局面代码',
      subtitle: '复制这段代码保存局面；粘贴到下方后点「载入」，即可恢复棋盘、持棋台与行棋方。',
      width: 'min(620px, 100%)',
      body: '<div class="field"><label>局面代码</label>' +
        '<textarea class="textarea mono" id="code-text" spellcheck="false" style="min-height:120px">' +
        LBQ.escapeHTML(code) + '</textarea></div>' +
        '<p class="hint">代码只包含局面，不含历史走法。若要在对弈页导入完整棋谱，请使用对弈页的「记谱」功能。</p>' +
        '<div class="parse-msg" id="code-msg"></div>',
      actions: [
        {
          label: '复制', icon: 'copy', cls: 'btn-quiet', close: false,
          onClick: function () {
            LBQ.copyText(document.getElementById('code-text').value).then(function (ok) {
              LBQ.toast(ok ? '局面代码已复制' : '复制失败', ok ? 'ok' : 'warn');
            });
          }
        },
        {
          label: '载入', icon: 'upload', cls: 'btn-primary', close: false,
          onClick: function (api) {
            var v = document.getElementById('code-text').value;
            var dec = LBQ.decodePosition(v);
            if (dec.error) {
              document.getElementById('code-msg').textContent = dec.error;
              return;
            }
            state.game = dec.game;
            state.size = state.game.size;
            state.turn = state.game.current;
            api.close();
            refresh(true);
            LBQ.toast('已载入局面', 'ok');
          }
        }
      ]
    });
  }

  /* ---------------------------------------------------------------- 开始 */
  function startPlay() {
    var game = state.game;
    var wk = 0, bk = 0;
    for (var i = 0; i < game.cells.length; i++) {
      var p = game.cells[i];
      if (!p || p.t !== 'K') continue;
      if (p.p === 0) wk++; else bk++;
    }
    if (wk !== 1 || bk !== 1) {
      LBQ.toast('双方各需要恰好一枚王', 'warn');
      return;
    }
    game.current = state.turn;
    game.winner = null;
    game.draw = false;
    game.winReason = null;
    game.resetRepeat();
    var copy = game.clone();
    if (LBQ.pages.play && LBQ.pages.play.loadGame) {
      LBQ.pages.play.loadGame(copy);
      location.hash = '#/play';
    } else {
      LBQ.toast('对弈页尚未就绪', 'warn');
    }
  }

  LBQ.pages = LBQ.pages || {};
  LBQ.pages.editor = {
    init: init,
    onEnter: function () {
      if (board) {
        board._measure();
        board.setMode('edit');
      }
    }
  };
})(window.LBQ = window.LBQ || {});

