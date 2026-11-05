/* ==========================================================================
   棋盘视图 + 持棋台视图
   ========================================================================== */
(function (LBQ) {
  'use strict';

  var DIRS = LBQ.DIRS;
  var DIR_NAMES = LBQ.DIR_NAMES;
  var DIR_OF_KEY = LBQ.DIR_OF_KEY;
  var PIECE_LABEL = LBQ.PIECE_LABEL;
  var SIDE_LABEL = LBQ.SIDE_LABEL;

  var ARROW_ANGLE = { n: 0, ne: 45, e: 90, se: 135, s: 180, sw: 225, w: 270, nw: 315 };
  var ARROW_PATH = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.4 18.4 15H13.7v5.6h-3.4V15H5.6Z" fill="currentColor"/></svg>';

  function h(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  }
  function posKey(p) { return p[0] + ',' + p[1]; }
  function cellRect(n, dr, dc) {
    return 'left:' + (dc * 100 / n) + '%;top:' + (dr * 100 / n) +
      '%;width:' + (100 / n) + '%;height:' + (100 / n) + '%';
  }
  function sameCells(a, b) {
    if (!a || !b || a.length !== b.length) return false;
    var s = {};
    for (var i = 0; i < a.length; i++) s[a[i][0] + ',' + a[i][1]] = 1;
    for (var j = 0; j < b.length; j++) if (!s[b[j][0] + ',' + b[j][1]]) return false;
    return true;
  }

  function BoardView(root, opts) {
    opts = opts || {};
    this.root = root;
    this.opts = opts;
    this.game = null;
    this.flip = false;
    this.mode = 'select';
    this.palette = null;
    this.sel = null;
    this.traySel = null;
    this.focus = [];
    this.lastCells = [];
    this.hover = null;
    this.checkKing = null;
    this.pieceEls = new Map();
    this.promoSeen = new Map();
    this._timers = [];
    this._build();
  }

  BoardView.prototype._build = function () {
    var self = this;
    this.root.innerHTML = '';
    this.root.classList.add('board-stage');
    var mat = h('div', 'board-mat');
    this.mat = mat;
    this.ranksEl = h('div', 'ranks');
    this.filesEl = h('div', 'files');
    var board = h('div', 'board');
    this.board = board;
    this.squaresEl = h('div', 'squares');
    this.campsEl = h('div', 'camps');
    this.ovEl = h('div', 'ov');
    this.piecesEl = h('div', 'pieces');
    this.hoverPcEl = h('div', 'hover-pc');
    this.ghostEl = h('div', 'ov-ghost');
    board.appendChild(this.squaresEl);
    board.appendChild(this.campsEl);
    board.appendChild(this.ovEl);
    board.appendChild(this.piecesEl);
    board.appendChild(this.ghostEl);
    mat.appendChild(this.ranksEl);
    mat.appendChild(board);
    mat.appendChild(this.filesEl);
    var foot = h('div', 'board-foot');
    this.readoutEl = h('span', 'hover-readout', '—');
    var legend = h('span', 'camp-legend', '<i class="lg blue"></i>黑阵<i class="lg red"></i>白阵');
    this.sizeTagEl = legend;
    foot.appendChild(this.readoutEl);
    foot.appendChild(legend);
    this.root.appendChild(mat);
    this.root.appendChild(foot);

    if (window.ResizeObserver) {
      this._ro = new ResizeObserver(function () { self._measure(); });
      this._ro.observe(board);
    } else {
      window.addEventListener('resize', function () { self._measure(); });
    }

    board.addEventListener('click', function (e) { self._onClick(e); });
    board.addEventListener('contextmenu', function (e) {
      e.preventDefault();
      if (self.mode === 'edit') {
        var epos = self._cellFromEvent(e);
        if (epos) self.emit('onEdit', epos, self.game.atPos(epos), true);
        return;
      }
      self.clearSelection();
      self.emit('onCancel');
    });
    board.addEventListener('mousemove', function (e) { self._onMove(e); });
    board.addEventListener('mouseleave', function () { self._setHover(null); });
    this._buildGrid();
  };

  BoardView.prototype._buildGrid = function () {
    if (!this.game) return;
    var n = this.game.size;
    this.board.style.setProperty('--n', n);
    var cells = [];
    for (var r = 0; r < n; r++) {
      for (var c = 0; c < n; c++) {
        cells.push('<i class="sq ' + (((r + c) % 2) ? 'dk' : 'lt') + '"></i>');
      }
    }
    this.squaresEl.innerHTML = cells.join('');
    var dep = this.game.campDepth;
    var pct = dep * 100 / n;
    var blackTop = !this.flip;
    this.campsEl.innerHTML =
      '<i class="camp ' + (blackTop ? 'blue' : 'red') + ' top" style="height:' + pct + '%"></i>' +
      '<i class="camp ' + (blackTop ? 'red' : 'blue') + ' bottom" style="height:' + pct + '%"></i>' +
      '<i class="camp-line ' + (blackTop ? 'blue' : 'red') + '" style="top:' + pct + '%"></i>' +
      '<i class="camp-line ' + (blackTop ? 'red' : 'blue') + '" style="top:' + (100 - pct) + '%"></i>' +
      '<i class="midline"></i>';
    var files = [], ranks = [];
    for (var i = 0; i < n; i++) {
      var fileCh = String.fromCharCode(97 + (this.flip ? n - 1 - i : i));
      var rankNum = this.flip ? (i + 1) : (n - i);
      files.push('<i>' + fileCh + '</i>');
      ranks.push('<i>' + rankNum + '</i>');
    }
    this.filesEl.innerHTML = files.join('');
    this.ranksEl.innerHTML = ranks.join('');
    this._measure();
  };

  BoardView.prototype._measure = function () {
    if (!this.board) return;
    var n = (this.game && this.game.size) || 9;
    var w = this.board.clientWidth;
    if (w <= 0) return;
    var cell = w / n;
    if (Math.abs((this._lastCell || 0) - cell) < .3) return;
    this._lastCell = cell;
    this.board.style.setProperty('--cell', cell + 'px');
    if (this.game && this.ovEl) this.renderOverlay();
  };

  BoardView.prototype.setGame = function (game, o) {
    o = o || {};
    var sizeChanged = !this.game || this.game.size !== game.size || o.reset;
    this.game = game;
    if (sizeChanged) {
      this.pieceEls.forEach(function (rec) { if (rec.el.parentNode) rec.el.parentNode.removeChild(rec.el); });
      this.pieceEls.clear();
      this.promoSeen.clear();
      this.clearSelection(true);
      this._buildGrid();
      this.renderPieces(false);
    } else {
      this.renderPieces(o.animate !== false);
      if (this.sel) this.clearSelection(true);
      if (this.traySel && this.traySel.player !== game.current) this.traySel = null;
    }
    this.lastCells = o.lastCells || [];
    this.checkKing = null;
    if (this.game.winner === null && !this.game.draw) {
      var threats = this.game.kingThreats(this.game.current);
      if (threats.length) this.checkKing = this.game.kingPos(this.game.current);
    }
    this.renderOverlay();
    this._updateReadout();
  };

  BoardView.prototype.setFlip = function (flip) {
    if (this.flip === !!flip) return;
    this.flip = !!flip;
    this.clearSelection(true);
    this._buildGrid();
    this.renderPieces(false);
    this.renderOverlay();
  };

  BoardView.prototype.setMode = function (mode) {
    this.mode = mode;
    this.clearSelection(true);
    this.root.classList.toggle('is-edit', mode === 'edit');
    this.renderOverlay();
  };

  BoardView.prototype.setFocus = function (cells) {
    this.focus = cells || [];
    this.renderOverlay();
  };
  BoardView.prototype.setLastCells = function (cells) {
    this.lastCells = cells || [];
    this.renderOverlay();
  };
  BoardView.prototype.setPalette = function (piece) {
    this.palette = piece;
    this.renderOverlay();
  };

  BoardView.prototype._disp = function (r, c) {
    var n = this.game.size;
    return this.flip ? [n - 1 - r, n - 1 - c] : [r, c];
  };
  BoardView.prototype._actual = function (dr, dc) {
    var n = this.game.size;
    return this.flip ? [n - 1 - dr, n - 1 - dc] : [dr, dc];
  };

  /* ---------------------------------------------------------- 棋子渲染 */
  BoardView.prototype.renderPieces = function (animate) {
    if (!this.game) return;
    var self = this;
    var n = this.game.size;
    var seen = {};
    var dropped = [];
    for (var i = 0; i < this.game.cells.length; i++) {
      var p = this.game.cells[i];
      if (!p) continue;
      var r = Math.floor(i / n), c = i % n;
      seen[p.id] = true;
      var rec = this.pieceEls.get(p.id);
      var created = false;
      if (!rec) {
        var el = h('div', 'pc ' + (p.p === 0 ? 'pc-light' : 'pc-dark'));
        var inner = h('div', 'pc-inner');
        inner.innerHTML = LBQ.pieceSVG(p.t, p.p);
        el.appendChild(inner);
        el.appendChild(h('i', 'pc-gem'));
        el.dataset.t = p.t;
        el.__piece = p;
        this.piecesEl.appendChild(el);
        rec = { el: el, id: p.id, promo: !!p.promo, t: p.t, p: p.p };
        this.pieceEls.set(p.id, rec);
        created = true;
      }
      var d = this._disp(r, c);
      rec.el.style.setProperty('--r', d[0]);
      rec.el.style.setProperty('--c', d[1]);
      if (created) {
        if (animate) {
          rec.el.classList.add('is-in');
          this._after(260, function (e) { e.classList.remove('is-in'); }, rec.el);
          dropped.push(rec.el);
        }
      }
      if (!!p.promo !== rec.promo) {
        rec.el.classList.toggle('is-promoted', !!p.promo);
        if (p.promo) {
          rec.el.classList.add('promo-flash');
          this._after(900, function (e) { e.classList.remove('promo-flash'); }, rec.el);
          if (animate) this._burst(d[0], d[1], '升变');
        }
        rec.promo = !!p.promo;
      }
      rec.el.classList.toggle('is-promoted', !!p.promo);
      rec.el.classList.toggle('is-mine', !!(this.game.winner === null && !this.game.draw && p.p === this.game.current));
    }
    this.pieceEls.forEach(function (rec, id) {
      if (seen[id]) return;
      if (rec.el.parentNode) {
        rec.el.classList.add('is-out');
        var el = rec.el;
        setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 300);
      }
      self.pieceEls.delete(id);
    });
    this._applyPieceHover();
  };

  BoardView.prototype._burst = function (dr, dc, text) {
    var n = this.game.size;
    var b = h('div', 'burst', text);
    b.style.cssText = cellRect(n, dr, dc);
    b.style.width = (100 / n) + '%';
    this.ovEl.appendChild(b);
    this._after(1100, function () { if (b.parentNode) b.parentNode.removeChild(b); });
  };

  BoardView.prototype._after = function (ms, fn, arg) {
    var t = setTimeout(function () { fn(arg); }, ms);
    this._timers.push(t);
    if (this._timers.length > 60) this._timers.shift();
  };

  /* ---------------------------------------------------------- 高亮层 */
  BoardView.prototype.renderOverlay = function () {
    if (!this.game) return;
    var self = this;
    var n = this.game.size;
    var out = [];
    var sel = this.sel;

    this.lastCells.forEach(function (p) {
      var d = self._disp(p[0], p[1]);
      out.push('<i class="mk last" style="' + cellRect(n, d[0], d[1]) + '"></i>');
    });
    this.focus.forEach(function (p) {
      var d = self._disp(p[0], p[1]);
      out.push('<i class="mk focus" style="' + cellRect(n, d[0], d[1]) + '"></i>');
    });
    if (this.hover) {
      var hd = this._disp(this.hover[0], this.hover[1]);
      out.push('<i class="mk hover" style="' + cellRect(n, hd[0], hd[1]) + '"></i>');
    }

    if (this.traySel) {
      var ts = this.traySel;
      var targets = this.game.dropTargets(this.game.current, ts.ti, ts.start, ts.len);
      this.dropActions = {};
      targets.forEach(function (t) {
        var act = self.game.prepareDrop(ts.ti, ts.start, ts.len, t.head);
        if (act.ok) self.dropActions[posKey(t.head)] = act;
      });
      /* 刚截取时，所有可落点轻微闪烁一次 */
      if (this.dropHints) {
        this.dropHints = false;
        Object.keys(this.dropActions).forEach(function (k) {
          var p = k.split(',').map(Number);
          var d = self._disp(p[0], p[1]);
          out.push('<i class="mk drop-hint" style="' + cellRect(n, d[0], d[1]) + '"></i>');
        });
      }
      /* 悬停落点：只显示这一处的预览 */
      var hovAct = this.hover && this.dropActions[posKey(this.hover)];
      if (hovAct) {
        hovAct.cells.forEach(function (p, k) {
          var d = self._disp(p[0], p[1]);
          out.push('<div class="drop-pc" style="' + cellRect(n, d[0], d[1]) + '"><div class="pc-inner">' + LBQ.pieceSVG(hovAct.pieces[k], hovAct.player) + '</div></div>');
          out.push('<i class="mk ' + (k === 0 ? 'drop-head' : 'drop-ghost') + '" style="' + cellRect(n, d[0], d[1]) + '">' + (k === 0 ? '<b></b>' : '') + '</i>');
        });
      }
      this.board.classList.toggle('can-drop', !!hovAct);
    } else {
      this.board.classList.remove('can-drop');
    }

    if (sel && sel.cells) {
      sel.cells.forEach(function (p) {
        var d = self._disp(p[0], p[1]);
        out.push('<i class="mk sel" style="' + cellRect(n, d[0], d[1]) + '"></i>');
      });
      /* 平移幽灵与落点 */
      sel.actions.forEach(function (act) {
        if (act.type !== 'move') return;
        act.to.forEach(function (p) {
          var d = self._disp(p[0], p[1]);
          var inSelf = sel.cells.some(function (q) { return q[0] === p[0] && q[1] === p[1]; });
          out.push('<i class="mk ' + (inSelf ? 'ghost-self' : 'ghost') + '" style="' + cellRect(n, d[0], d[1]) + '"></i>');
        });
        act.entry.forEach(function (p) {
          if (sel.cells.length > 1) return;
          var d = self._disp(p[0], p[1]);
          out.push('<i class="mk dot" style="' + cellRect(n, d[0], d[1]) + '"><b></b></i>');
        });
      });
      /* 多子线段的方向箭头（静态棋盘不显示） */
      if (this.mode !== 'none') (sel.moveArrows || []).forEach(function (m, i) {
        var lbl = LBQ.DIR_LABEL[m.pos.dir] || '此方向';
        out.push('<button type="button" class="mv-arrow" data-ak="' + i + '" ' +
          'style="left:' + m.pos.left + '%;top:' + m.pos.top + '%;--rot:' + m.pos.angle + 'deg" ' +
          'aria-label="向' + lbl + '移动" title="向' + lbl + '移动">' +
          '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4.2 19 14.4h-4.4v5.4H9.4v-5.4H5Z" fill="currentColor"/></svg>' +
          '</button>');
      });
      /* 吃子 */
      sel.actions.forEach(function (act) {
        if (act.type !== 'capture') return;
        var ghost = act.cells.map(function (p) { return [p[0] + act.dirVec[0] * act.victim.length, p[1] + act.dirVec[1] * act.victim.length]; });
        ghost.forEach(function (p) {
          var d = self._disp(p[0], p[1]);
          out.push('<i class="mk cap-ghost" style="' + cellRect(n, d[0], d[1]) + '"></i>');
        });
        act.victim.forEach(function (p) {
          var d = self._disp(p[0], p[1]);
          out.push('<i class="mk cap" style="' + cellRect(n, d[0], d[1]) + '"></i>');
        });
        var c = centerOf(act.victim);
        var dd = self._disp(c[0], c[1]);
        out.push('<i class="cap-mark" style="left:' + ((dd[1] + .5) * 100 / n) + '%;top:' + ((dd[0] + .5) * 100 / n) + '%">⚔</i>');
        out.push(comparePill(act.compare, n, self._victimAnchor(act.victim), false));
      });
      /* 失败的吃子：显示原因 */
      sel.probeCaps.forEach(function (info) {
        info.victim.forEach(function (p) {
          var d = self._disp(p[0], p[1]);
          out.push('<i class="mk cap-fail" style="' + cellRect(n, d[0], d[1]) + '"></i>');
        });
        out.push(comparePill(info.compare, n, self._victimAnchor(info.victim), true));
      });
      /* 非法走法提示点（很淡） */
      if (this.mode !== 'none') sel.probeCells.forEach(function (p) {
        var d = self._disp(p[0], p[1]);
        out.push('<i class="mk probe" style="' + cellRect(n, d[0], d[1]) + '"></i>');
      });
      /* 线段信息胶囊 */
      var c2 = centerOf(sel.cells);
      var d2 = self._disp(c2[0], c2[1]);
      var counts = sel.counts;
      var label = sel.cells.length + ' 子' + (counts.R ? ' · 车' + counts.R : '') +
        (counts.B ? ' · 象' + counts.B : '') + (counts.promo ? ' · 升' + counts.promo : '');
      out.push('<i class="seg-pill" style="left:' + ((d2[1] + .5) * 100 / n) + '%;top:' + (d2[0] * 100 / n) + '%">' + label + '</i>');
    } else if (sel && sel.anchor) {
      /* 单子段的可走方向（先点棋子即可直接走） */
      if (sel.single) {
        sel.single.actions.forEach(function (act) {
          if (act.type === 'capture') {
            act.victim.forEach(function (p) {
              var d = self._disp(p[0], p[1]);
              out.push('<i class="mk cap" style="' + cellRect(n, d[0], d[1]) + '"></i>');
            });
            var cc = centerOf(act.victim);
            var cd = self._disp(cc[0], cc[1]);
            out.push('<i class="cap-mark" style="left:' + ((cd[1] + .5) * 100 / n) + '%;top:' + ((cd[0] + .5) * 100 / n) + '%">⚔</i>');
            out.push(comparePill(act.compare, n, self._victimAnchor(act.victim), false));
            act.cells.forEach(function (p) {
              var d = self._disp(p[0] + act.dirVec[0] * act.victim.length, p[1] + act.dirVec[1] * act.victim.length);
              out.push('<i class="mk cap-ghost" style="' + cellRect(n, d[0], d[1]) + '"></i>');
            });
          } else {
            act.entry.forEach(function (p) {
              var d = self._disp(p[0], p[1]);
              out.push('<i class="mk dot" style="' + cellRect(n, d[0], d[1]) + '"><b></b></i>');
            });
            act.to.forEach(function (p) {
              var d = self._disp(p[0], p[1]);
              out.push('<i class="mk ghost" style="' + cellRect(n, d[0], d[1]) + '"></i>');
            });
          }
        });
        Object.keys(sel.single.probeMap || {}).forEach(function (k) {
          var p = k.split(',').map(Number);
          var d = self._disp(p[0], p[1]);
          out.push('<i class="mk probe" style="' + cellRect(n, d[0], d[1]) + '"></i>');
        });
      }
      (sel.ends || []).forEach(function (p) {
        if (p[0] === sel.anchor[0] && p[1] === sel.anchor[1]) return;
        var d = self._disp(p[0], p[1]);
        out.push('<i class="mk enddot" style="' + cellRect(n, d[0], d[1]) + '"><b></b></i>');
      });
      var ad = self._disp(sel.anchor[0], sel.anchor[1]);
      out.push('<i class="mk anchor" style="' + cellRect(n, ad[0], ad[1]) + '"></i>');
    }

    if (this.checkKing) {
      var ck = this._disp(this.checkKing[0], this.checkKing[1]);
      out.push('<i class="check-ring" style="' + cellRect(n, ck[0], ck[1]) + '"></i>');
    }

    if (this.mode === 'edit' && this.palette && this.hover && this.palette !== 'erase') {
      var ph = this._disp(this.hover[0], this.hover[1]);
      var gp = h('div', 'pc-ghost' + (this.palette.promo ? ' is-promoted' : ''));
      gp.style.cssText = cellRect(n, ph[0], ph[1]);
      gp.innerHTML = '<div class="pc-inner">' + LBQ.pieceSVG(this.palette.t, this.palette.p) + '</div>';
      if (this.palette.promo) gp.innerHTML += '<i class="pc-gem"></i>';
      this.ghostEl.innerHTML = '';
      this.ghostEl.appendChild(gp);
    } else {
      this.ghostEl.innerHTML = '';
    }

    this.ovEl.innerHTML = out.join('');
    if (sel && sel.cells && sel.moveArrows && sel.moveArrows.length) {
      var arrows = sel.moveArrows;
      var self2 = this;
      this.ovEl.querySelectorAll('.mv-arrow').forEach(function (btn) {
        btn.addEventListener('click', function (ev) {
          ev.stopPropagation();
          ev.preventDefault();
          var i = +btn.dataset.ak;
          if (arrows[i]) self2.emit('onAction', arrows[i].act);
        });
      });
    }
    this._applyPieceHover();
  };

  function centerOf(cells) {
    var r = 0, c = 0;
    for (var i = 0; i < cells.length; i++) { r += cells[i][0]; c += cells[i][1]; }
    return [r / cells.length, c / cells.length];
  }
  BoardView.prototype._victimAnchor = function (cells) {
    var n = this.game.size;
    var self = this;
    var ds = cells.map(function (p) { return self._disp(p[0], p[1]); });
    var sum = 0, minR = 99, maxR = -1;
    ds.forEach(function (p) { sum += p[1]; minR = Math.min(minR, p[0]); maxR = Math.max(maxR, p[0]); });
    var below = minR < n * 0.2;
    return {
      left: Math.max(17, Math.min(83, (sum / ds.length + .5) * 100 / n)),
      top: below ? (maxR + 1) * 100 / n : minR * 100 / n,
      below: below
    };
  };

  function comparePill(cmp, n, a, bad) {
    if (!cmp) return '';
    var cls = cmp.ok && !bad ? 'good' : 'bad';
    var attrDecisive = cmp.mine !== cmp.theirs;
    var attrOk = cmp.mine > cmp.theirs;
    var lenOk = cmp.lenMine >= cmp.lenTheirs;
    var attrPart = '<b>' + PIECE_LABEL[cmp.attr] + '</b>' + cmp.mine +
      (attrDecisive
        ? '<em class="' + (attrOk ? 'ok' : 'no') + '">' + (attrOk ? '&gt;' : '&lt;') + '</em>' + cmp.theirs
        : '<em class="eq">=</em>' + cmp.theirs);
    var lenPart = '<b class="' + (attrDecisive ? 'soft' : '') + '">长</b>' +
      '<span class="' + (attrDecisive ? 'soft' : (lenOk ? 'ok-txt' : 'no-txt')) + '">' +
      cmp.lenMine + (lenOk ? '≥' : '&lt;') + cmp.lenTheirs + '</span>';
    var html = '<span class="cmp-pill ' + cls + '">' + attrPart + '<s></s>' + lenPart + '</span>';
    var tr = a.below ? 'translate(-50%, 9%)' : 'translate(-50%, -108%)';
    return '<i class="cmp-wrap" style="left:' + a.left + '%;top:' + a.top + '%;transform:' + tr + '">' + html + '</i>';
  }

  /* ---------------------------------------------------------- 交互 */
  BoardView.prototype._cellFromEvent = function (e) {
    var rect = this.board.getBoundingClientRect();
    var n = this.game.size;
    var x = e.clientX - rect.left, y = e.clientY - rect.top;
    if (x < 0 || y < 0 || x >= rect.width || y >= rect.height) return null;
    var dc = Math.min(n - 1, Math.floor(x / rect.width * n));
    var dr = Math.min(n - 1, Math.floor(y / rect.height * n));
    return this._actual(dr, dc);
  };

  BoardView.prototype._onMove = function (e) {
    var pos = this._cellFromEvent(e);
    this._setHover(pos);
  };

  BoardView.prototype._setHover = function (pos) {
    if ((this.hover && pos && this.hover[0] === pos[0] && this.hover[1] === pos[1]) ||
      (!this.hover && !pos)) return;
    this.hover = pos;
    this._updateReadout();
    this._applyPieceHover();
    this.renderOverlay();
  };

  BoardView.prototype._applyPieceHover = function () {
    var self = this;
    var selIds = {};
    if (this.sel && this.sel.cells) {
      this.sel.cells.forEach(function (p) {
        var pc = self.game.atPos(p);
        if (pc) selIds[pc.id] = true;
      });
    }
    var overMine = false;
    var hoverPiece = this.hover ? this.game.atPos(this.hover) : null;
    if (hoverPiece && hoverPiece.p === this.game.current &&
      this.game.winner === null && !this.game.draw &&
      (this.mode === 'select' || this.mode === 'click')) overMine = true;
    this.board.classList.toggle('can-pick', overMine);
    this.pieceEls.forEach(function (rec) {
      var isHover = false;
      if (self.hover) {
        var cur = self.game.atPos(self.hover);
        isHover = !!(cur && cur.id === rec.id);
      }
      rec.el.classList.toggle('is-hover', isHover);
      rec.el.classList.toggle('is-sel', !!selIds[rec.id]);
    });
  };

  BoardView.prototype._updateReadout = function () {
    if (!this.readoutEl) return;
    if (!this.hover || !this.game) { this.readoutEl.textContent = '—'; return; }
    var p = this.game.atPos(this.hover);
    var name = LBQ.squareName(this.game.size, this.hover[0], this.hover[1]);
    if (!p) { this.readoutEl.innerHTML = '<b>' + name + '</b> · 空格'; return; }
    this.readoutEl.innerHTML = '<b>' + name + '</b> · ' + SIDE_LABEL[p.p] + PIECE_LABEL[p.t] +
      (p.promo ? ' <em>已升变</em>' : '');
  };

  BoardView.prototype._onClick = function (e) {
    if (!this.game) return;
    var pos = this._cellFromEvent(e);
    if (!pos) return;
    var piece = this.game.atPos(pos);
    if (this.mode === 'none') return;
    if (this.mode === 'click') {
      this.emit('onCell', pos, piece);
      return;
    }
    if (this.mode === 'edit') {
      this.emit('onEdit', pos, piece, false);
      return;
    }
    var player = this.game.current;
    if (this.game.winner !== null || this.game.draw) return;

    /* 打入落点 */
    if (this.traySel) {
      if (this.dropActions && this.dropActions[posKey(pos)]) {
        this.emit('onAction', this.dropActions[posKey(pos)]);
        return;
      }
      if (!(piece && piece.p === player) && !this.sel) {
        this.emit('onDropMiss', pos);
        return;
      }
    }

    var sel = this.sel;
    if (sel && sel.cells) {
      if (sel.destMap[posKey(pos)]) {
        this.emit('onAction', sel.destMap[posKey(pos)]);
        return;
      }
      if (sel.probeMap[posKey(pos)]) {
        var info = sel.probeMap[posKey(pos)];
        LBQ.sound && LBQ.sound.play('deny');
        this.emit('onProbe', info);
        if (LBQ.toast && info && info.message) LBQ.toast(info.message, 'warn');
        return;
      }
      var inSeg = sel.cells.some(function (q) { return q[0] === pos[0] && q[1] === pos[1]; });
      if (inSeg) { this.clearSelection(); return; }
      this.clearSelection();
      if (piece && piece.p === player) this.selectAnchor(pos);
      return;
    }
    if (sel && sel.anchor) {
      if (sel.single && sel.single.destMap[posKey(pos)]) {
        this.emit('onAction', sel.single.destMap[posKey(pos)]);
        return;
      }
      if (sel.ends.some(function (q) { return q[0] === pos[0] && q[1] === pos[1]; })) {
        this.chooseSegment(pos);
        return;
      }
      if (sel.single && sel.single.probeMap[posKey(pos)]) {
        var pinfo = sel.single.probeMap[posKey(pos)];
        LBQ.sound && LBQ.sound.play('deny');
        this.emit('onProbe', pinfo);
        if (LBQ.toast && pinfo.message) LBQ.toast(pinfo.message, 'warn');
        return;
      }
      if (piece && piece.p === player) { this.selectAnchor(pos); return; }
      this.clearSelection();
      return;
    }
    if (piece && piece.p === player) {
      this.selectAnchor(pos);
    } else if (piece) {
      this.emit('onForeign', pos, piece);
    }
  };

  BoardView.prototype.selectAnchor = function (pos) {
    var piece = this.game.atPos(pos);
    if (!piece || piece.p !== this.game.current) return;
    this.traySel = null;
    var game = this.game;
    var actions = [], destMap = {}, probeMap = {};
    DIR_NAMES.forEach(function (dir) {
      var res = game.analyze([pos], dir);
      if (res.ok) {
        var act = game.prepare(res);
        act.entry = act.type === 'capture' ? act.victim.slice() : act.to.slice();
        actions.push(act);
        act.entry.forEach(function (p) { destMap[posKey(p)] = act; });
      } else {
        if (res.reason === 'weak' && res.victim) {
          var pi = probeInfo(res, dir);
          res.victim.forEach(function (p) { probeMap[posKey(p)] = pi; });
        } else {
          var d = DIRS[dir];
          var q = [pos[0] + d[0], pos[1] + d[1]];
          if (q[0] >= 0 && q[1] >= 0 && q[0] < game.size && q[1] < game.size && !game.atPos(q)) {
            probeMap[posKey(q)] = probeInfo(res, dir);
          }
        }
      }
    });
    this.sel = {
      anchor: [pos[0], pos[1]],
      ends: this.game.possibleEnds(pos),
      cells: null,
      single: { actions: actions, destMap: destMap, probeMap: probeMap }
    };
    LBQ.sound && LBQ.sound.play('pick');
    this.renderOverlay();
    this.emit('onSelect', { stage: 'anchor', cells: [[pos[0], pos[1]]], anchor: pos });
  };

  BoardView.prototype.chooseSegment = function (endPos) {
    if (!this.sel || !this.sel.anchor) return;
    var cells = this.game.segmentBetween(this.sel.anchor, endPos);
    if (!cells) { this.clearSelection(); return; }
    this.setSegment(cells);
  };

  BoardView.prototype.setSegment = function (cells) {
    var game = this.game;
    var actions = [], probes = [], probeCaps = [];
    var probeMap = {}, destMap = {};
    var counts = { R: 0, B: 0, P: 0, K: 0, promo: 0 };
    cells.forEach(function (p) {
      var pc = game.atPos(p);
      counts[pc.t]++;
      if (pc.promo) counts.promo++;
    });
    var self = this;
    var blockedByWeak = false;
    DIR_NAMES.forEach(function (dir) {
      var res = game.analyze(cells, dir);
      if (res.ok) {
        var act = game.prepare(res);
        if (act.type === 'capture') act.entry = act.victim.slice();
        else act.entry = act.to.filter(function (p) {
          return !cells.some(function (q) { return q[0] === p[0] && q[1] === p[1]; });
        });
        actions.push(act);
      } else {
        probes.push({ dir: dir, res: res });
      }
    });
    var selfCells = {};
    cells.forEach(function (p) { selfCells[posKey(p)] = 1; });
    var moveArrows = [];
    actions.forEach(function (act) {
      if (act.type === 'capture') {
        act.victim.forEach(function (p) { destMap[posKey(p)] = act; });
      } else if (cells.length === 1) {
        act.entry.forEach(function (p) { destMap[posKey(p)] = act; });
      } else {
        moveArrows.push({ act: act, pos: self._arrowAnchor(act) });
      }
    });
    probes.forEach(function (info) {
      var res = info.res;
      var msg;
      if (res.reason === 'weak' && res.compare) {
        probeCaps.push({ victim: res.victim, compare: res.compare, dir: info.dir });
        var pi = probeInfo(res, info.dir);
        res.victim.forEach(function (p) { probeMap[posKey(p)] = pi; });
        return;
      }
      msg = analyseMsg(res, info.dir);
      var d = DIRS[info.dir];
      var n = self.game.size;
      cells.forEach(function (p) {
        var q = [p[0] + d[0], p[1] + d[1]];
        if (q[0] < 0 || q[1] < 0 || q[0] >= n || q[1] >= n) return;
        if (selfCells[posKey(q)]) return;
        if (!probeMap[posKey(q)]) probeMap[posKey(q)] = probeInfo(res, info.dir);
      });
    });
    this.traySel = null;
    this.sel = {
      anchor: cells[0].slice(),
      cells: cells,
      actions: actions,
      probes: probes,
      probeCaps: probeCaps,
      probeMap: probeMap,
      destMap: destMap,
      moveArrows: moveArrows,
      counts: counts,
      probeCells: Object.keys(probeMap).map(function (k) { return k.split(',').map(Number); })
    };
    this.renderOverlay();
    var caps = actions.filter(function (a) { return a.type === 'capture'; });
    LBQ.sound && LBQ.sound.play(caps.length ? 'alert' : 'select');
    this.emit('onSelect', {
      stage: 'segment', cells: cells, counts: counts,
      moves: actions.filter(function (a) { return a.type === 'move'; }).length,
      captures: caps.length
    });
  };

  function probeInfo(res, dir) {
    return { reason: res.reason, dir: dir, compare: res.compare, victim: res.victim, message: analyseMsg(res, dir) };
  }

  BoardView.prototype._arrowAnchor = function (act) {
    var n = this.game.size;
    var self = this;
    var entry = (act.entry && act.entry.length) ? act.entry : (act.to || []);
    var ds = entry.map(function (p) { return self._disp(p[0], p[1]); });
    if (!ds.length) return { left: 50, top: 50, angle: 0 };
    var sr = 0, sc = 0;
    ds.forEach(function (p) { sr += p[0]; sc += p[1]; });
    var avgR = sr / ds.length, avgC = sc / ds.length;
    var d = act.dirVec || [0, 0];
    var dd = this.flip ? [-d[0], -d[1]] : [d[0], d[1]];
    var step = 100 / n * 0.58;
    var left = (avgC + .5) * 100 / n + dd[1] * step;
    var top = (avgR + .5) * 100 / n + dd[0] * step;
    var name = LBQ.dirNameOf(dd[0], dd[1]) || 'n';
    return {
      left: Math.max(6.5, Math.min(93.5, left)),
      top: Math.max(6.5, Math.min(93.5, top)),
      angle: ARROW_ANGLE[name] || 0,
      dir: name
    };
  };

  function analyseMsg(res, dir) {
    var where = LBQ.DIR_LABEL[dir] || dir;
    switch (res.reason) {
      case 'backward': return '不能向' + where + '后退：整段未全部升变';
      case 'edge': return '线段会越出棋盘';
      case 'blocked': return '向' + where + '的路线被阻挡';
      case 'weak':
        return '对撞失败：' + PIECE_LABEL[res.compare.attr] + ' ' + res.compare.mine + ' < ' +
          res.compare.theirs + '（长度 ' + res.compare.lenMine + ' : ' + res.compare.lenTheirs + '）';
      default: return '该方向不可行';
    }
  }

  BoardView.prototype.clearSelection = function (silent) {
    var had = !!this.sel;
    this.sel = null;
    if (!silent) {
      this.renderOverlay();
      if (had) this.emit('onSelect', { stage: 'none' });
    }
  };

  BoardView.prototype.setTraySelection = function (sel) {
    this.traySel = sel;
    this.sel = null;
    this.dropHints = !!sel;
    this.renderOverlay();
  };

  BoardView.prototype.emit = function (name) {
    var fn = this.opts[name];
    if (fn) fn.apply(this, [].slice.call(arguments, 1));
  };

  BoardView.prototype.destroy = function () {
    this._timers.forEach(clearTimeout);
    this.root.innerHTML = '';
  };

  /* ========================================================== 持棋台 */
  function TrayView(root, opts) {
    this.root = root;
    this.opts = opts || {};
    this.game = null;
    this.player = 0;
    this.interactive = false;
    this.sel = null;
    this._build();
  }
  TrayView.prototype._build = function () {
    var self = this;
    this.root.innerHTML = '';
    this.root.className = 'tray';
    this.headEl = h('div', 'tray-head');
    this.bodyEl = h('div', 'tray-body');
    this.root.appendChild(this.headEl);
    this.root.appendChild(this.bodyEl);
    this.bodyEl.addEventListener('click', function (e) {
      var chip = e.target.closest ? e.target.closest('.capture-chip') : null;
      if (!chip) return;
      if (!self.interactive) return;
      var ti = +chip.dataset.ti, k = +chip.dataset.k;
      self.opts.onPick && self.opts.onPick(ti, k, self.player);
    });
  };
  TrayView.prototype.set = function (game, player, interactive) {
    this.game = game;
    this.player = player;
    this.interactive = !!interactive;
    this.render();
  };
  TrayView.prototype.setSelection = function (sel) {
    this.sel = sel;
    this.render();
  };
  TrayView.prototype.render = function () {
    if (!this.game) return;
    var segs = this.game.tray[this.player];
    var total = segs.reduce(function (a, s) { return a + s.pieces.length; }, 0);
    var isEnemy = this.game.current !== this.player;
    this.headEl.innerHTML = '<span class="tray-title">俘虏</span>' +
      '<span class="tray-count">' + segs.length + ' 段 · ' + total + ' 子</span>';
    this.root.classList.toggle('is-live', this.interactive && !isEnemy);
    this.root.classList.toggle('is-empty', segs.length === 0);
    if (!segs.length) {
      this.bodyEl.innerHTML = '<span class="tray-empty">暂无俘虏</span>';
      return;
    }
    var html = '';
    for (var ti = 0; ti < segs.length; ti++) {
      var seg = segs[ti];
      var picked = this.sel && this.sel.ti === ti;
      html += '<div class="tray-seg' + (picked ? ' is-picked' : '') + '">' +
        '<span class="seg-dir" style="--rot:' + (ARROW_ANGLE[seg.dir] || 0) + 'deg" title="锁定方向">' +
        ARROW_PATH + '<em>#' + (ti + 1) + '</em></span>' +
        '<div class="seg-chips">';
      for (var k = 0; k < seg.pieces.length; k++) {
        var inCut = picked && k >= this.sel.start && k < this.sel.start + this.sel.len;
        var dim = picked && !inCut;
        html += '<button type="button" class="capture-chip' + (inCut ? ' in-cut' : '') + (dim ? ' dim' : '') +
          '" data-ti="' + ti + '" data-k="' + k + '" title="' +
          (inCut ? '截取中' : '点击选择截取起点') + '">' +
          '<span class="chip-pc">' + LBQ.pieceSVG(seg.pieces[k], this.player) + '</span></button>';
      }
      html += '</div></div>';
    }
    this.bodyEl.innerHTML = html;
  };

  LBQ.BoardView = BoardView;
  LBQ.TrayView = TrayView;
  LBQ.ARROW_PATH = ARROW_PATH;
  LBQ.ARROW_ANGLE = ARROW_ANGLE;
  LBQ.sameCells = sameCells;
})(window.LBQ = window.LBQ || {});











