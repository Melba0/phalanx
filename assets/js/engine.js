/* ==========================================================================
   连兵棋 · 兵线会战  —  规则引擎
   --------------------------------------------------------------------------
   棋盘坐标：内部 (r,c)，r=0 为最上一排，c=0 为最左一列。
   记谱坐标：a1 = 左下角（白方底线），横坐标为字母 a..m，纵坐标为数字 1..n。
   棋子：{ p: 0=白 / 1=黑, t: 'K'|'R'|'B'|'P', promo: bool, id: number }
   ========================================================================== */
(function (LBQ) {
  'use strict';

  var SIZES = [9, 11, 13];
  var CAMP_DEPTH = { 9: 3, 11: 4, 13: 5 };

  var AXES = [[0, 1], [1, 0], [1, 1], [1, -1]];

  var DIR_NAMES = ['nw', 'n', 'ne', 'w', 'e', 'sw', 's', 'se'];
  var DIRS = {
    nw: [-1, -1], n: [-1, 0], ne: [-1, 1],
    w: [0, -1], e: [0, 1],
    sw: [1, -1], s: [1, 0], se: [1, 1]
  };
  var DIR_VEC = {
    nw: [-1, -1], n: [-1, 0], ne: [-1, 1],
    w: [0, -1], e: [0, 1],
    sw: [1, -1], s: [1, 0], se: [1, 1]
  };
  var KEY_OF_DIR = { q: 'nw', w: 'n', e: 'ne', a: 'w', d: 'e', z: 'sw', x: 's', c: 'se' };
  var DIR_OF_KEY = { nw: 'q', n: 'w', ne: 'e', w: 'a', e: 'd', sw: 'z', s: 'x', se: 'c' };
  var DIR_LABEL = {
    nw: '左上', n: '上', ne: '右上', w: '左', e: '右',
    sw: '左下', s: '下', se: '右下'
  };

  var LAYOUTS = {
    9: [
      'BRRBKBRRB',
      'BRPPPPPRB',
      'PPPPPPPPP'
    ],
    11: [
      'BRRBPKPBRRB',
      'BRRBPPPBRRB',
      'BRPPPPPPPRB',
      'PPPPPPPPPPP'
    ],
    13: [
      'BRBRRBKBRRBRB',
      'BRPPBRPRBPPRB',
      'BRPPBRPRBPPRB',
      'BRPPPPPPPPPRB',
      'PPPPPPPPPPPPP'
    ]
  };

  var PIECE_LABEL = { K: '王', R: '车', B: '象', P: '兵' };
  var SIDE_LABEL = ['白方', '黑方'];

  var nextId = 1;

  function sign(x) { return (x > 0) - (x < 0); }
  function inBounds(size, r, c) { return r >= 0 && r < size && c >= 0 && c < size; }
  function dirNameOf(dr, dc) {
    for (var i = 0; i < DIR_NAMES.length; i++) {
      var d = DIRS[DIR_NAMES[i]];
      if (d[0] === dr && d[1] === dc) return DIR_NAMES[i];
    }
    return null;
  }
  function proj(pos, d) { return pos[0] * d[0] + pos[1] * d[1]; }

  /* ---------------------------------------------------------------- 坐标 */
  function squareName(size, r, c) {
    return String.fromCharCode(97 + c) + (size - r);
  }
  function parseSquare(size, text) {
    if (typeof text !== 'string') return null;
    var m = /^([a-m])([1-9]|1[0-3])$/i.exec(text.trim());
    if (!m) return null;
    var c = m[1].toLowerCase().charCodeAt(0) - 97;
    var r = size - parseInt(m[2], 10);
    if (!inBounds(size, r, c)) return null;
    return [r, c];
  }

  /* ---------------------------------------------------------------- 棋子 */
  function makePiece(p, t, promo) {
    return { p: p, t: t, promo: !!promo, id: nextId++ };
  }
  function clonePiece(p) { return { p: p.p, t: p.t, promo: p.promo, id: p.id }; }

  /* ================================================================ Game */
  function Game(size) {
    this.size = size;
    this.campDepth = CAMP_DEPTH[size] || Math.ceil(size / 4);
    this.cells = new Array(size * size).fill(null);
    this.tray = [[], []];
    this.current = 0;
    this.winner = null;
    this.draw = false;
    this.winReason = null;
    this.repeat = Object.create(null);
    this.plies = 0;
    this.lastKey = null;
  }

  Game.prototype.idx = function (r, c) { return r * this.size + c; };
  Game.prototype.rc = function (i) { return [Math.floor(i / this.size), i % this.size]; };
  Game.prototype.at = function (r, c) {
    if (!inBounds(this.size, r, c)) return null;
    return this.cells[r * this.size + c];
  };
  Game.prototype.atPos = function (pos) { return this.at(pos[0], pos[1]); };
  Game.prototype.isEmpty = function (r, c) { return this.at(r, c) === null; };
  Game.prototype.emptyCount = function () {
    var n = 0;
    for (var i = 0; i < this.cells.length; i++) if (!this.cells[i]) n++;
    return n;
  };

  /* ---------------------------------------------------------- 初始布局 */
  Game.prototype.setupStandard = function () {
    var size = this.size;
    this.cells = new Array(size * size).fill(null);
    var layout = LAYOUTS[size];
    for (var k = 0; k < layout.length; k++) {
      var row = layout[k];
      for (var c = 0; c < size; c++) {
        var ch = row.charAt(c);
        this.cells[this.idx(k, c)] = makePiece(1, ch, false);
        this.cells[this.idx(size - 1 - k, c)] = makePiece(0, ch, false);
      }
    }
    this.tray = [[], []];
    this.current = 0;
    this.winner = null;
    this.draw = false;
    this.winReason = null;
    this.plies = 0;
    this.repeat = Object.create(null);
    this.lastKey = null;
    this.autoPromoteAll();
    this.recordPosition();
    return this;
  };

  Game.prototype.clearBoard = function () {
    this.cells = new Array(this.size * this.size).fill(null);
    this.tray = [[], []];
    this.current = 0;
    this.winner = null;
    this.draw = false;
    this.winReason = null;
    this.plies = 0;
    this.repeat = Object.create(null);
    this.lastKey = null;
    return this;
  };

  Game.prototype.resetRepeat = function () {
    this.repeat = Object.create(null);
    this.lastKey = null;
    this.recordPosition();
  };

  /* ---------------------------------------------------------- 阵营升变 */
  Game.prototype.inEnemyCamp = function (r, c, player) {
    return player === 0 ? r < this.campDepth : r >= this.size - this.campDepth;
  };
  Game.prototype.isBackward = function (d, player) {
    return player === 0 ? d[0] > 0 : d[0] < 0;
  };
  Game.prototype.allPromoted = function (cells) {
    for (var i = 0; i < cells.length; i++) {
      var p = this.atPos(cells[i]);
      if (!p || !p.promo) return false;
    }
    return true;
  };
  Game.prototype.promoteInCamp = function (player) {
    for (var i = 0; i < this.cells.length; i++) {
      var p = this.cells[i];
      if (!p || p.p !== player || p.promo) continue;
      var rc = this.rc(i);
      if (this.inEnemyCamp(rc[0], rc[1], player)) p.promo = true;
    }
  };
  Game.prototype.autoPromoteAll = function () {
    for (var i = 0; i < this.cells.length; i++) {
      var p = this.cells[i];
      if (!p) continue;
      var rc = this.rc(i);
      if (this.inEnemyCamp(rc[0], rc[1], p.p)) p.promo = true;
    }
  };

  /* ---------------------------------------------------------- 线段工具 */
  Game.prototype.possibleEnds = function (pos) {
    var p = this.atPos(pos);
    if (!p) return [];
    var player = p.p;
    var out = { };
    var key = function (q) { return q[0] + ',' + q[1]; };
    out[key(pos)] = pos;
    for (var a = 0; a < AXES.length; a++) {
      var dr = AXES[a][0], dc = AXES[a][1];
      for (var s = 1; s >= -1; s -= 2) {
        var r = pos[0] + dr * s, c = pos[1] + dc * s;
        while (inBounds(this.size, r, c)) {
          var q = this.at(r, c);
          if (!q || q.p !== player) break;
          out[key([r, c])] = [r, c];
          r += dr * s; c += dc * s;
        }
      }
    }
    return Object.keys(out).map(function (k) { return out[k]; });
  };

  Game.prototype.segmentBetween = function (a, b) {
    if (a[0] === b[0] && a[1] === b[1]) return [a];
    var dr = sign(b[0] - a[0]), dc = sign(b[1] - a[1]);
    if (dr !== 0 && dc !== 0 && Math.abs(b[0] - a[0]) !== Math.abs(b[1] - a[1])) return null;
    if (dr === 0 && dc === 0) return null;
    var start = this.atPos(a);
    if (!start) return null;
    var cells = [], r = a[0], c = a[1];
    while (true) {
      if (!inBounds(this.size, r, c)) return null;
      var p = this.at(r, c);
      if (!p || p.p !== start.p) return null;
      cells.push([r, c]);
      if (r === b[0] && c === b[1]) break;
      r += dr; c += dc;
      if (cells.length > this.size) return null;
    }
    return cells;
  };

  Game.prototype.segmentAxis = function (cells) {
    if (!cells || cells.length < 2) return null;
    for (var i = 1; i < cells.length; i++) {
      var dr = cells[i][0] - cells[i - 1][0];
      var dc = cells[i][1] - cells[i - 1][1];
      if (Math.abs(dr) > 1 || Math.abs(dc) > 1 || (dr === 0 && dc === 0)) return null;
      if (i === 1) {
        if (!dirNameOf(sign(dr), sign(dc))) return null;
      } else {
        var pd = cells[i - 1][0] - cells[i - 2][0];
        var pc = cells[i - 1][1] - cells[i - 2][1];
        if (sign(pd) !== sign(dr) || sign(pc) !== sign(dc)) return null;
      }
    }
    return [sign(cells[1][0] - cells[0][0]), sign(cells[1][1] - cells[0][1])];
  };

  Game.prototype.countType = function (cells, t) {
    var n = 0;
    for (var i = 0; i < cells.length; i++) {
      var p = this.atPos(cells[i]);
      if (p && p.t === t) n++;
    }
    return n;
  };

  Game.prototype.collectEnemy = function (head, d) {
    var player = this.atPos(head).p;
    var out = [], r = head[0] + d[0], c = head[1] + d[1];
    while (inBounds(this.size, r, c)) {
      var p = this.at(r, c);
      if (!p || p.p === player) break;
      out.push([r, c]);
      r += d[0]; c += d[1];
    }
    return out;
  };

  /* ---------------------------------------------------------- 走法分析 */
  /*
    返回：
      { ok:true, type:'move',    cells, dir, player, to }
      { ok:true, type:'capture', cells, dir, player, head, victim, compare, shift }
      { ok:false, reason, ... }
    reason: 'bad' | 'backward' | 'edge' | 'blocked' | 'weak'
  */
  Game.prototype.analyze = function (cells, dirName) {
    var d = DIRS[dirName];
    if (!d || !cells || !cells.length) return { ok: false, reason: 'bad' };
    var size = this.size;
    var first = this.atPos(cells[0]);
    if (!first) return { ok: false, reason: 'bad' };
    var player = first.p;
    /* 校验：连续直线、全为己方 */
    var prev = null, axis = null;
    for (var i = 0; i < cells.length; i++) {
      var p = this.atPos(cells[i]);
      if (!p || p.p !== player) return { ok: false, reason: 'bad' };
      if (!inBounds(size, cells[i][0], cells[i][1])) return { ok: false, reason: 'bad' };
      if (prev) {
        var dr = cells[i][0] - prev[0], dc = cells[i][1] - prev[1];
        if (Math.abs(dr) > 1 || Math.abs(dc) > 1 || (dr === 0 && dc === 0)) return { ok: false, reason: 'bad' };
        if (axis && (sign(dr) !== axis[0] || sign(dc) !== axis[1])) return { ok: false, reason: 'bad' };
        axis = [sign(dr), sign(dc)];
      }
      prev = cells[i];
    }
    var len = cells.length;
    var ordered = cells.slice().sort(function (a, b) { return proj(a, d) - proj(b, d); });
    var resDirVec = d.slice();

    /* 后撤限制（移动与吃子同样适用） */
    if (this.isBackward(d, player) && !this.allPromoted(cells)) {
      return { ok: false, reason: 'backward', cells: ordered, dir: dirName, player: player };
    }

    var parallel = (len === 1) || (axis && ((axis[0] === d[0] && axis[1] === d[1]) || (axis[0] === -d[0] && axis[1] === -d[1])));
    var head = null;
    if (len === 1) head = cells[0];
    else if (parallel) head = ordered[ordered.length - 1];

    if (head) {
      var hr = head[0] + d[0], hc = head[1] + d[1];
      var target = this.at(hr, hc);
      if (target && target.p !== player && inBounds(size, hr, hc)) {
        var T = this.collectEnemy(head, d);
        var attr = (d[0] === 0 || d[1] === 0) ? 'R' : 'B';
        var mine = this.countType(cells, attr);
        var theirs = this.countType(T, attr);
        var ok = mine > theirs || (mine === theirs && len >= T.length);
        var compare = {
          attr: attr, mine: mine, theirs: theirs,
          lenMine: len, lenTheirs: T.length, ok: ok, byAttr: mine > theirs
        };
        if (ok) {
          return {
            ok: true, type: 'capture', cells: ordered, dir: dirName, player: player,
            dirVec: resDirVec,
            head: head, victim: T, compare: compare, shift: T.length,
            shiftVec: [d[0] * T.length, d[1] * T.length],
            to: [T[T.length - 1][0], T[T.length - 1][1]]
          };
        }
        return {
          ok: false, reason: 'weak', cells: ordered, dir: dirName, player: player,
          head: head, victim: T, compare: compare
        };
      }
    }

    /* 平移 */
    var to = [], edge = false, blocked = false;
    var self = {};
    for (var k = 0; k < cells.length; k++) self[cells[k][0] + ',' + cells[k][1]] = true;
    for (var j = 0; j < cells.length; j++) {
      var nr = cells[j][0] + d[0], nc = cells[j][1] + d[1];
      if (!inBounds(size, nr, nc)) { edge = true; break; }
      var occ = this.at(nr, nc);
      if (occ && !self[nr + ',' + nc]) { blocked = true; break; }
      to.push([nr, nc]);
    }
    if (!edge && !blocked) {
      return {
        ok: true, type: 'move', cells: cells.slice(), dir: dirName, player: player,
        dirVec: resDirVec, to: to
      };
    }
    return {
      ok: false, reason: edge ? 'edge' : 'blocked',
      cells: ordered, dir: dirName, player: player
    };
  };

  Game.prototype.explain = function (res) {
    if (!res) return '不合规则';
    if (res.ok) return '';
    switch (res.reason) {
      case 'backward': return '未全段升变的线段不能后退（白方不可向下，黑方不可向上）';
      case 'edge': return '线段会越出棋盘';
      case 'blocked': return '前方被其他棋子阻挡';
      case 'weak':
        if (res.compare) {
          return '对撞失败：' + PIECE_LABEL[res.compare.attr] + ' ' + res.compare.mine +
            ' < ' + res.compare.theirs + '，或长度不足';
        }
        return '对撞失败';
      default: return '这不是一条可行动线段';
    }
  };

  /* ---------------------------------------------------------- 全部走法 */
  Game.prototype.allActions = function (player, opts) {
    opts = opts || {};
    var actions = [], seen = Object.create(null);
    var self = this;
    function push(cells, dirName) {
      var res = self.analyze(cells, dirName);
      if (!res.ok) return;
      var key = res.type + '|' + cells.map(function (p) { return p[0] * 100 + p[1]; }).sort().join(',') + '|' + dirName;
      if (seen[key]) return;
      seen[key] = true;
      actions.push(res);
    }
    for (var r = 0; r < this.size; r++) {
      for (var c = 0; c < this.size; c++) {
        var p = this.at(r, c);
        if (!p || p.p !== player) continue;
        for (var a = 0; a < AXES.length; a++) {
          var dr = AXES[a][0], dc = AXES[a][1];
          var cells = [[r, c]];
          for (var dn = 0; dn < DIR_NAMES.length; dn++) push(cells, DIR_NAMES[dn]);
          var rr = r + dr, cc = c + dc;
          while (inBounds(this.size, rr, cc)) {
            var q = this.at(rr, cc);
            if (!q || q.p !== player) break;
            cells.push([rr, cc]);
            // 需要按轴顺序复制后分析
            var copy = cells.slice();
            for (var dn2 = 0; dn2 < DIR_NAMES.length; dn2++) push(copy, DIR_NAMES[dn2]);
            rr += dr; cc += dc;
          }
        }
      }
    }
    return actions;
  };

  /* 可打入的落点（按 台号/截取段/落点 展开，用于提示与计数） */
  Game.prototype.dropPlacements = function (player, opts) {
    opts = opts || {};
    var list = [];
    var segs = this.tray[player];
    var empties = [];
    for (var r = 0; r < this.size; r++) {
      for (var c = 0; c < this.size; c++) if (!this.at(r, c)) empties.push([r, c]);
    }
    for (var ti = 0; ti < segs.length; ti++) {
      var seg = segs[ti];
      var d = DIRS[seg.dir];
      var n = seg.pieces.length;
      for (var len = 1; len <= n; len++) {
        for (var start = 0; start + len <= n; start++) {
          for (var e = 0; e < empties.length; e++) {
            var h = empties[e];
            if (this.dropFits(h, len, d)) {
              list.push({ ti: ti, start: start, len: len, head: h, dir: seg.dir });
              if (opts.first) return list;
            }
          }
        }
      }
    }
    return list;
  };

  Game.prototype.hasAnyAction = function (player) {
    var acts = this.allActions(player, { drops: false });
    if (acts.length) return true;
    if (!this.tray[player].length) return false;
    return this.emptyCount() > 0;
  };

  Game.prototype.legalCount = function (player) {
    var acts = this.allActions(player, { drops: false });
    var n = acts.length;
    if (this.tray[player].length && this.emptyCount()) n++;
    return n;
  };

  /* ---------------------------------------------------------- 应用走法 */
  Game.prototype.apply = function (action) {
    var player = this.current;
    if (!action || !action.ok) return { error: 'invalid' };
    var self = this;
    var info = {
      type: action.type, player: player, cells: action.cells, dir: action.dir,
      victim: action.victim, compare: action.compare,
      kingKilled: false, promoted: []
    };
    function place(piece, r, c) {
      var before = piece.promo;
      self.cells[self.idx(r, c)] = { p: piece.p, t: piece.t, promo: piece.promo, id: piece.id };
      if (!before) info.promoted.push([r, c]);
    }
    if (action.type === 'move') {
      var moved = [];
      for (var i = 0; i < action.cells.length; i++) {
        var from = action.cells[i];
        var piece = this.atPos(from);
        this.cells[this.idx(from[0], from[1])] = null;
        moved.push([piece, from[0] + action.dirVec[0], from[1] + action.dirVec[1]]);
      }
      for (var m = 0; m < moved.length; m++) place(moved[m][0], moved[m][1], moved[m][2]);
    } else if (action.type === 'capture') {
      var T = action.victim;
      var captives = [];
      for (var t = 0; t < T.length; t++) {
        var vp = this.atPos(T[t]);
        if (vp && vp.t === 'K') info.kingKilled = true;
        if (vp && t > 0) captives.push(vp.t);   // 排头阵亡不入台，其余按原序入台
      }
      for (var t2 = 0; t2 < T.length; t2++) {
        this.cells[this.idx(T[t2][0], T[t2][1])] = null;
      }
      var own = [];
      for (var c2 = 0; c2 < action.cells.length; c2++) {
        var pos = action.cells[c2];
        var pc = this.atPos(pos);
        this.cells[this.idx(pos[0], pos[1])] = null;
        own.push([pc, pos[0] + action.shiftVec[0], pos[1] + action.shiftVec[1]]);
      }
      for (var o = 0; o < own.length; o++) place(own[o][0], own[o][1], own[o][2]);
      if (captives.length) {
        this.tray[player].push({ pieces: captives, dir: action.dir });
      }
      info.captives = captives;
    } else if (action.type === 'drop') {
      var seg = this.tray[player][action.ti];
      if (!seg) return { error: 'invalid' };
      var dir = DIRS[seg.dir];
      var sub = seg.pieces.slice(action.start, action.start + action.len);
      for (var s = 0; s < sub.length; s++) {
        var rr = action.head[0] + dir[0] * s;
        var cc = action.head[1] + dir[1] * s;
        var pnew = makePiece(player, sub[s], false);
        this.cells[this.idx(rr, cc)] = pnew;
      }
      var before = seg.pieces.slice(0, action.start);
      var after = seg.pieces.slice(action.start + action.len);
      this.tray[player].splice(action.ti, 1);
      if (before.length) this.tray[player].push({ pieces: before, dir: seg.dir });
      if (after.length) this.tray[player].push({ pieces: after, dir: seg.dir });
      info.dropped = sub;
    } else {
      return { error: 'invalid' };
    }

    this.promoteInCamp(player);
    this.plies++;

    if (info.kingKilled) {
      this.winner = player;
      this.winReason = 'king';
      this.recordPosition();
      info.ended = true;
      return info;
    }

    this.current = 1 - player;
    var key = this.recordPosition();
    if (this.repeat[key] >= 3) {
      this.draw = true;
      this.winReason = 'repeat';
      info.ended = true;
      info.draw = true;
      return info;
    }
    if (!this.hasAnyAction(this.current)) {
      this.winner = player;
      this.winReason = 'stalemate';
      info.ended = true;
      return info;
    }
    return info;
  };

  /* 把 analyze 的结果补上 dirVec / shiftVec，便于 apply */
  Game.prototype.prepare = function (res) {
    if (!res || !res.ok) return res;
    res.dirVec = DIRS[res.dir].slice();
    if (res.type === 'capture') {
      res.shiftVec = res.dirVec.slice(); // 位移由 apply 用 victim.length 计算
      res.shiftVec = [res.dirVec[0] * res.victim.length, res.dirVec[1] * res.victim.length];
      var last = res.victim[res.victim.length - 1];
      res.to = [last[0], last[1]];
    } else if (res.type === 'move') {
      res.to = res.to || res.cells.map(function (p) {
        return [p[0] + res.dirVec[0], p[1] + res.dirVec[1]];
      });
    }
    return res;
  };

  Game.prototype.actionFor = function (cells, dirName) {
    return this.prepare(this.analyze(cells, dirName));
  };

  /* ---------------------------------------------------------- 局面记录 */
  Game.prototype.stateKey = function () {
    var parts = [];
    for (var i = 0; i < this.cells.length; i++) {
      var p = this.cells[i];
      if (p) parts.push(i + ':' + p.p + p.t + (p.promo ? '+' : ''));
    }
    var trayKeys = [];
    for (var s = 0; s < 2; s++) {
      var arr = this.tray[s].map(function (seg) { return seg.dir + seg.pieces.join(''); });
      arr.sort();
      trayKeys.push(arr.join('/'));
    }
    return parts.join(';') + '|' + trayKeys[0] + '|' + trayKeys[1] + '|' + this.current;
  };
  Game.prototype.recordPosition = function () {
    var key = this.stateKey();
    this.repeat[key] = (this.repeat[key] || 0) + 1;
    this.lastKey = key;
    return key;
  };
  Game.prototype.repeatCount = function () {
    return this.repeat[this.stateKey()] || 0;
  };

  Game.prototype.clone = function () {
    var g = Object.create(Game.prototype);
    g.size = this.size;
    g.campDepth = this.campDepth;
    g.cells = this.cells.map(function (p) { return p ? clonePiece(p) : null; });
    g.tray = this.tray.map(function (segs) {
      return segs.map(function (s) { return { pieces: s.pieces.slice(), dir: s.dir }; });
    });
    g.current = this.current;
    g.winner = this.winner;
    g.draw = this.draw;
    g.winReason = this.winReason;
    g.repeat = Object.assign(Object.create(null), this.repeat);
    g.plies = this.plies;
    g.lastKey = this.lastKey;
    return g;
  };

  /* ---------------------------------------------------------- 打入 */
  Game.prototype.dropFits = function (head, len, dirVec) {
    for (var k = 0; k < len; k++) {
      var r = head[0] + dirVec[0] * k;
      var c = head[1] + dirVec[1] * k;
      if (!inBounds(this.size, r, c)) return false;
      if (this.at(r, c)) return false;
    }
    return true;
  };

  Game.prototype.dropTargets = function (player, ti, start, len) {
    var seg = this.tray[player][ti];
    if (!seg) return [];
    var d = DIRS[seg.dir];
    var out = [];
    for (var r = 0; r < this.size; r++) {
      for (var c = 0; c < this.size; c++) {
        if (!this.at(r, c) && this.dropFits([r, c], len, d)) {
          out.push({ head: [r, c], ti: ti, start: start, len: len, dir: seg.dir });
        }
      }
    }
    return out;
  };

  Game.prototype.prepareDrop = function (ti, start, len, head) {
    var seg = this.tray[this.current][ti];
    if (!seg) return { ok: false, reason: 'bad', message: '持棋台上没有这一段' };
    if (len < 1 || start < 0 || start + len > seg.pieces.length) {
      return { ok: false, reason: 'bad', message: '截取范围超出俘虏线段' };
    }
    var d = DIRS[seg.dir];
    if (!this.dropFits(head, len, d)) {
      return { ok: false, reason: 'blocked', message: '落点放不下（需沿锁定方向的连续空格）' };
    }
    return {
      ok: true, type: 'drop', player: this.current, ti: ti, start: start, len: len,
      head: head, dir: seg.dir, dirVec: d.slice(),
      cells: Array.from({ length: len }, function (_, k) { return [head[0] + d[0] * k, head[1] + d[1] * k]; }),
      pieces: seg.pieces.slice(start, start + len)
    };
  };

  /* ---------------------------------------------------------- 王 / 胜负 */
  Game.prototype.kingPos = function (player) {
    for (var i = 0; i < this.cells.length; i++) {
      var p = this.cells[i];
      if (p && p.p === player && p.t === 'K') return this.rc(i);
    }
    return null;
  };

  Game.prototype.kingThreats = function (player) {
    var kp = this.kingPos(player);
    if (!kp) return [];
    var out = [];
    var acts = this.allActions(1 - player, { drops: false });
    for (var i = 0; i < acts.length; i++) {
      var a = acts[i];
      if (a.type !== 'capture') continue;
      for (var j = 0; j < a.victim.length; j++) {
        if (a.victim[j][0] === kp[0] && a.victim[j][1] === kp[1]) { out.push(a); break; }
      }
    }
    return out;
  };
  Game.prototype.isKingThreatened = function (player) {
    return this.kingThreats(player).length > 0;
  };

  /* ---------------------------------------------------------- 统计 */
  Game.prototype.material = function () {
    var res = [
      { K: 0, R: 0, B: 0, P: 0, promo: 0, total: 0 },
      { K: 0, R: 0, B: 0, P: 0, promo: 0, total: 0 }
    ];
    for (var i = 0; i < this.cells.length; i++) {
      var p = this.cells[i];
      if (!p) continue;
      res[p.p][p.t]++;
      if (p.promo) res[p.p].promo++;
      res[p.p].total++;
    }
    for (var s = 0; s < 2; s++) {
      for (var t = 0; t < this.tray[s].length; t++) {
        var seg = this.tray[s][t];
        for (var k = 0; k < seg.pieces.length; k++) {
          res[s][seg.pieces[k]]++;
          res[s].total++;
        }
      }
    }
    return res;
  };

  Game.prototype.segmentStats = function (player) {
    var seen = Object.create(null), count = 0, maxLen = 0;
    for (var r = 0; r < this.size; r++) {
      for (var c = 0; c < this.size; c++) {
        var p = this.at(r, c);
        if (!p || p.p !== player) continue;
        for (var a = 0; a < AXES.length; a++) {
          var dr = AXES[a][0], dc = AXES[a][1];
          // 只从线段起点开始（反向一格不能是己方）
          var pr = r - dr, pc = c - dc;
          var prevPiece = this.at(pr, pc);
          if (prevPiece && prevPiece.p === player) continue;
          var len = 0, rr = r, cc = c;
          var sig = [];
          while (inBounds(this.size, rr, cc)) {
            var q = this.at(rr, cc);
            if (!q || q.p !== player) break;
            len++; sig.push(rr + ',' + cc);
            rr += dr; cc += dc;
          }
          if (len > 0) {
            var key = sig.join('|');
            if (!seen[key]) {
              seen[key] = true;
              count++;
              if (len > maxLen) maxLen = len;
            }
          }
        }
      }
    }
    return { count: count, maxLen: maxLen };
  };

  Game.prototype.trayCount = function (player) {
    var segs = this.tray[player].length, pieces = 0;
    for (var i = 0; i < this.tray[player].length; i++) pieces += this.tray[player][i].pieces.length;
    return { segments: segs, pieces: pieces };
  };

  /* ============================================================ 记谱 */
  var TOKEN_MOVE = /^([a-m])([1-9]|1[0-3])([qweadzxc])([1-9]|1[0-3])([qweadzxc])$/i;
  var TOKEN_DROP = /^([a-m])([1-9]|1[0-3])([qweadzxc])([1-9]|1[0-3])\*([1-9]\d*)\.([1-9]\d*)$/i;

  Game.prototype.parseToken = function (token) {
    if (typeof token !== 'string') return { error: '空记谱' };
    var text = token.trim().toLowerCase();
    if (!text) return { error: '空记谱' };
    var m = TOKEN_DROP.exec(text);
    if (m) {
      var head = parseSquare(this.size, m[1] + m[2]);
      if (!head) return { error: '起点 ' + m[1] + m[2] + ' 不在棋盘内' };
      var key = m[3];
      var len = parseInt(m[4], 10);
      var ti = parseInt(m[5], 10) - 1;
      var start = parseInt(m[6], 10) - 1;
      var seg = this.tray[this.current][ti];
      if (!seg) return { error: '持棋台上没有第 ' + (ti + 1) + ' 段俘虏' };
      if (DIR_OF_KEY[seg.dir] !== key) {
        return { error: '第 ' + (ti + 1) + ' 段俘虏的锁定方向是 ' + key.toUpperCase() + '（' + DIR_LABEL[seg.dir] + '），不是 ' + key.toUpperCase() };
      }
      var res = this.prepareDrop(ti, start, len, head);
      if (!res.ok) return { error: res.message };
      return res;
    }
    m = TOKEN_MOVE.exec(text);
    if (m) {
      var startPos = parseSquare(this.size, m[1] + m[2]);
      if (!startPos) return { error: '起点 ' + m[1] + m[2] + ' 不在棋盘内' };
      var extDir = KEY_OF_DIR[m[3]];
      var length = parseInt(m[4], 10);
      var moveDir = KEY_OF_DIR[m[5]];
      var vec = DIRS[extDir];
      var cells = [];
      for (var k = 0; k < length; k++) {
        var r = startPos[0] + vec[0] * k;
        var c = startPos[1] + vec[1] * k;
        if (!inBounds(this.size, r, c)) return { error: '线段延伸超出棋盘' };
        cells.push([r, c]);
      }
      var firstPiece = this.atPos(cells[0]);
      if (!firstPiece) return { error: '起点没有棋子' };
      for (var i = 0; i < cells.length; i++) {
        var p = this.atPos(cells[i]);
        if (!p) return { error: '线段不连续：' + squareName(this.size, cells[i][0], cells[i][1]) + ' 是空格' };
        if (p.p !== firstPiece.p) return { error: '线段中混有对方棋子' };
      }
      if (firstPiece.p !== this.current) {
        return { error: '现在轮到' + SIDE_LABEL[this.current] + '行棋' };
      }
      var res2 = this.actionFor(cells, moveDir);
      if (!res2.ok) {
        var msg = this.explain(res2);
        if (res2.reason === 'weak' && res2.compare) {
          msg = '对撞失败：' + PIECE_LABEL[res2.compare.attr] + ' ' + res2.compare.mine +
            ' vs ' + res2.compare.theirs + '，长度 ' + res2.compare.lenMine +
            ' vs ' + res2.compare.lenTheirs;
        }
        return { error: msg, analysis: res2 };
      }
      res2.notation = token;
      return res2;
    }
    return { error: '无法识别的记谱“' + token + '”' };
  };

  function formatAction(game, action) {
    if (action.type === 'drop') {
      return squareName(game.size, action.head[0], action.head[1]) +
        DIR_OF_KEY[action.dir] + action.len + '*' + (action.ti + 1) + '.' + (action.start + 1);
    }
    var cells = action.cells;
    var d = DIRS[action.dir];
    var len = cells.length;
    var ordered = cells.slice().sort(function (a, b) { return proj(a, d) - proj(b, d); });
    var start, other;
    var axis = game.segmentAxis(ordered);
    var parallel = len === 1 || (axis && ((axis[0] === d[0] && axis[1] === d[1]) || (axis[0] === -d[0] && axis[1] === -d[1])));
    if (len === 1) {
      start = cells[0];
      return squareName(game.size, start[0], start[1]) + DIR_OF_KEY[action.dir] + '1' + DIR_OF_KEY[action.dir];
    }
    if (parallel) {
      start = ordered[0];               // 尾端
      other = ordered[ordered.length - 1];
    } else {
      var sorted = cells.slice().sort(function (a, b) { return (a[0] - b[0]) || (a[1] - b[1]); });
      start = sorted[0];
      // 取线段另一端
      other = sorted[sorted.length - 1];
      // 若 sort 顺序与线段顺序不一致，则另一端取与 start 相邻延伸到的端点
      var far = sorted.reduce(function (best, p) {
        var dd = Math.abs(p[0] - start[0]) + Math.abs(p[1] - start[1]);
        var bd = Math.abs(best[0] - start[0]) + Math.abs(best[1] - start[1]);
        return dd > bd ? p : best;
      }, start);
      other = far;
    }
    var extDirName = dirNameOf(sign(other[0] - start[0]), sign(other[1] - start[1]));
    return squareName(game.size, start[0], start[1]) +
      DIR_OF_KEY[extDirName] + len + DIR_OF_KEY[action.dir];
  }

  function describeAction(game, action) {
    var cells = action.cells || [];
    var names = cells.map(function (p) { return squareName(game.size, p[0], p[1]); });
    if (action.type === 'move') {
      return names[0] + (names.length > 1 ? '…' + names[names.length - 1] : '') +
        ' 向' + DIR_LABEL[action.dir] + '平移';
    }
    if (action.type === 'capture') {
      var v = action.victim.map(function (p) { return squareName(game.size, p[0], p[1]); });
      var cmp = action.compare;
      return '吃 ' + v[0] + (v.length > 1 ? '…' + v[v.length - 1] : '') +
        '（' + PIECE_LABEL[cmp.attr] + cmp.mine + ':' + cmp.theirs + ' · 长' + cmp.lenMine + ':' + cmp.lenTheirs + '）';
    }
    if (action.type === 'drop') {
      return '打入 ' + action.len + ' 子（第' + (action.ti + 1) + '段 · 向' + DIR_LABEL[action.dir] + '）';
    }
    return '';
  }

  /* 由 action 生成人类可读标题 */
  function actionLabel(action) {
    if (!action) return '';
    if (action.type === 'move') return '平移';
    if (action.type === 'capture') return '吃子';
    if (action.type === 'drop') return '打入';
    return '';
  }

  /* ============================================================ 局面构建 */
  /*
    setup = {
      size: 9,
      pieces: ['wK@e1', 'wR@a1,b1', 'bP@d7,d8', 'wR@e4+'],
      trays: { w: ['PR:n'], b: [] },
      turn: 'w' | 'b'
    }
  */
  function buildGame(setup) {
    var size = setup && setup.size || 9;
    var g = new Game(size);
    g.clearBoard();
    var list = setup && setup.pieces || [];
    var errors = [];
    for (var i = 0; i < list.length; i++) {
      var spec = String(list[i]).trim();
      var m = /^([wb])([KRBP])@(.+?)(\+?)$/i.exec(spec);
      if (!m) { errors.push(spec); continue; }
      var side = m[1].toLowerCase() === 'w' ? 0 : 1;
      var type = m[2].toUpperCase();
      var promo = !!m[4];
      var squares = m[3].split(',');
      for (var s = 0; s < squares.length; s++) {
        var pos = parseSquare(size, squares[s].trim());
        if (!pos) { errors.push(spec); continue; }
        g.cells[g.idx(pos[0], pos[1])] = makePiece(side, type, promo);
      }
    }
    if (setup && setup.trays) {
      ['w', 'b'].forEach(function (sideKey) {
        var player = sideKey === 'w' ? 0 : 1;
        var arr = (setup.trays[sideKey] || []);
        for (var t = 0; t < arr.length; t++) {
          var item = arr[t];
          var pieces, dirName;
          if (typeof item === 'string') {
            var parts = item.split(':');
            pieces = parts[0].split('');
            dirName = parts[1] || 'n';
          } else {
            pieces = String(item.pieces).split('');
            dirName = item.dir || 'n';
          }
          if (!DIRS[dirName]) dirName = 'n';
          g.tray[player].push({ pieces: pieces, dir: dirName });
        }
      });
    }
    if (setup && setup.turn === 'b') g.current = 1;
    g.autoPromoteAll();
    g.resetRepeat();
    return { game: g, errors: errors };
  }

  /* ---------------------------------------------------------- 局面代码 */
  function encodePosition(game) {
    var pieces = [];
    for (var i = 0; i < game.cells.length; i++) {
      var p = game.cells[i];
      if (!p) continue;
      var rc = game.rc(i);
      pieces.push((p.p === 0 ? 'w' : 'b') + p.t + '@' + squareName(game.size, rc[0], rc[1]) + (p.promo ? '+' : ''));
    }
    var trays = game.tray.map(function (segs) {
      return segs.map(function (s) { return s.pieces.join('') + ':' + s.dir; });
    });
    var obj = { v: 1, size: game.size, turn: game.current, pieces: pieces, trays: trays };
    var json = JSON.stringify(obj);
    var b64 = btoa(unescape(encodeURIComponent(json)))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    return 'LBQ1.' + b64;
  }

  function decodePosition(text) {
    var m = /LBQ1\.([A-Za-z0-9_-]+)/.exec(String(text || ''));
    if (!m) return { error: '没有找到以 LBQ1. 开头的局面代码' };
    try {
      var b = m[1].replace(/-/g, '+').replace(/_/g, '/');
      while (b.length % 4) b += '=';
      var obj = JSON.parse(decodeURIComponent(escape(atob(b))));
      if (!obj || !obj.size) return { error: '局面代码内容无效' };
      var trays = { w: [], b: [] };
      (obj.trays || []).forEach(function (arr, idx) {
        var key = idx === 0 ? 'w' : 'b';
        (arr || []).forEach(function (s) {
          var parts = String(s).split(':');
          var dir = parts[1] || 'n';
          if (!DIRS[dir]) dir = 'n';
          trays[key].push(parts[0] + ':' + dir);
        });
      });
      var built = buildGame({
        size: obj.size,
        pieces: obj.pieces || [],
        trays: trays,
        turn: obj.turn === 1 ? 'b' : 'w'
      });
      return { game: built.game, errors: built.errors };
    } catch (e) {
      return { error: '局面代码解析失败' };
    }
  }

  /* ---------------------------------------------------------- 常量导出 */
  LBQ.encodePosition = encodePosition;
  LBQ.decodePosition = decodePosition;
  LBQ.SIZES = SIZES;
  LBQ.CAMP_DEPTH = CAMP_DEPTH;
  LBQ.DIRS = DIRS;
  LBQ.DIR_NAMES = DIR_NAMES;
  LBQ.KEY_OF_DIR = KEY_OF_DIR;
  LBQ.DIR_OF_KEY = DIR_OF_KEY;
  LBQ.DIR_LABEL = DIR_LABEL;
  LBQ.LAYOUTS = LAYOUTS;
  LBQ.PIECE_LABEL = PIECE_LABEL;
  LBQ.SIDE_LABEL = SIDE_LABEL;
  LBQ.Game = Game;
  LBQ.buildGame = buildGame;
  LBQ.makePiece = makePiece;
  LBQ.squareName = squareName;
  LBQ.parseSquare = parseSquare;
  LBQ.formatAction = formatAction;
  LBQ.describeAction = describeAction;
  LBQ.actionLabel = actionLabel;
  LBQ.dirNameOf = dirNameOf;
  LBQ.inBounds = inBounds;
  LBQ.sign = sign;
})(window.LBQ = window.LBQ || {});
