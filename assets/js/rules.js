/* ==========================================================================
   规则速查（含小棋盘图解）
   ========================================================================== */
(function (LBQ) {
  'use strict';

  var ICON = LBQ.icon;
  var el;
  var diagrams = [];
  var spyRaf = 0;

  function updateSpy() {
    if (!el) return;
    var secs = TOC.map(function (t) { return document.getElementById('rule-' + t[0]); }).filter(Boolean);
    if (!secs.length) return;
    var cur = secs[0];
    secs.forEach(function (s) { if (s.getBoundingClientRect().top <= 150) cur = s; });
    var id = cur.id.replace('rule-', '');
    el.querySelectorAll('[data-rule-go]').forEach(function (b) {
      b.classList.toggle('active', b.dataset.ruleGo === id);
    });
  }

  function onScroll() {
    if (spyRaf) return;
    spyRaf = requestAnimationFrame(function () { spyRaf = 0; updateSpy(); });
  }

  var TOC = [
    ['gear', '一 · 器具'],
    ['setup', '二 · 开局'],
    ['turn', '三 · 行棋次序'],
    ['move', '四 · 移动'],
    ['capture', '五 · 吃子'],
    ['drop', '六 · 打入'],
    ['win', '七 · 胜负与和棋'],
    ['notation', '八 · 记谱']
  ];

  function init() {
    el = document.getElementById('page-rules');
    el.innerHTML = '' +
      '<div class="wrap">' +
      '  <div class="page-head rules-head">' +
      '    <div>' +
      '      <div class="eyebrow">Phalanx · 官方规则 · 升变版</div>' +
      '      <h1>规 则 速 查</h1>' +
      '      <p class="page-desc">一款无随机、完全信息的抽象策略棋。两支冷兵器方阵在棋盘上整段推进、正面互撞：' +
      '        吃掉敌阵，俘虏编入麾下，再择机投入战场。深入敌阵的棋子将获得荣誉升变，赢得向后转身的资格。</p>' +
      '    </div>' +
      '    <div class="rules-badge">' +
      '      <span>规则版本</span><b>v3 · 升变</b>' +
      '      <a class="mini-link" href="#/learn">改用交互教程学 →</a>' +
      '    </div>' +
      '  </div>' +
      '  <div class="rules-grid">' +
      '    <nav class="rules-toc" aria-label="规则目录">' +
      TOC.map(function (t) {
        return '<button class="' + (TOC.indexOf(t) === 0 ? 'active' : '') + '" data-rule-go="' + t[0] + '">' + t[1] + '</button>';
      }).join('') +
      '    </nav>' +
      '    <article class="rules-article">' +
      rulesHTML() +
      '    </article>' +
      '  </div>' +
      '</div>';

    el.addEventListener('click', function (e) {
      var b = e.target.closest('[data-rule-go]');
      if (!b) return;
      var target = el.querySelector('#rule-' + b.dataset.ruleGo);
      if (target) {
        var top = target.getBoundingClientRect().top + window.scrollY - 90;
        window.scrollTo({ top: top, behavior: 'smooth' });
        el.querySelectorAll('[data-rule-go]').forEach(function (x) {
          x.classList.toggle('active', x === b);
        });
      }
    });

    mountDiagrams();
    window.addEventListener('scroll', onScroll, { passive: true });
    updateSpy();
  }

  function rulesHTML() {
    return '' +
      '<section class="rule-sec" id="rule-gear">' +
      '  <h2><span>一</span>器具</h2>' +
      '  <h3>1.1 棋盘</h3>' +
      '  <p>正方形棋盘，分为 <b>9 × 9</b>、<b>11 × 11</b>、<b>13 × 13</b> 三种规格，双方商定其一。' +
      '    每方阵营为其初始布局所占的 <b>n 排</b>：9 路 3 排、11 路 4 排、13 路 5 排。' +
      '    白方阵营在棋盘下方，黑方阵营在棋盘上方。</p>' +
      '  <div class="rule-callout"><b>阵营即升变区。</b>己方棋子到达对方阵营内任意一格，立即升变（永久，以金色标记表示）。</div>' +
      '  <h3>1.2 棋子</h3>' +
      '  <p>每方四种子。数量随棋盘规格变化：</p>' +
      '  <table class="rule-table piece-table">' +
      '    <thead><tr><th>棋子</th><th>9 路</th><th>11 路</th><th>13 路</th><th>作用</th></tr></thead>' +
      '    <tbody>' +
      pieceRow('K', '王', [1, 1, 1], '不能阵亡的兵；无特殊走法') +
      pieceRow('R', '车', [6, 10, 16], '正交对撞的属性') +
      pieceRow('B', '象', [6, 10, 16], '斜线对撞的属性') +
      pieceRow('P', '兵', [14, 23, 32], '只贡献段长') +
      '    </tbody>' +
      '  </table>' +
      '  <p class="rule-note">王不分大小、不吃子、无特殊走法——它只是一个不能阵亡的兵。本棋没有除升变外的其他进阶（车、象、王之间不互变）。</p>' +
      '  <h3>1.3 持棋台</h3>' +
      '  <p>棋盘外，每方各自拥有一块持棋台，用于存放俘虏。开局时双方持棋台为空。吃子后，俘虏按原队形进入持棋台；' +
      '    打入时从台上取用。</p>' +
      '</section>' +

      '<section class="rule-sec" id="rule-setup">' +
      '  <h2><span>二</span>开局</h2>' +
      '  <p>王位于底线正中，其余棋子按下列布局从底线向前排满（黑方上下镜像）。白方先行。</p>' +
      '  <div class="rule-two-col">' +
      '    <div>' +
      '      <h4>9 × 9（后 3 排）</h4>' +
      layoutRows(9) +
      '      <h4>11 × 11（后 4 排）</h4>' +
      layoutRows(11) +
      '      <h4>13 × 13（后 5 排）</h4>' +
      layoutRows(13) +
      '    </div>' +
      '    <figure class="rule-figure">' +
      '      <div class="diagram-board" data-diagram="standard"></div>' +
      '      <figcaption>9 路标准开局。上方蓝色为黑方阵营，下方暖色为白方阵营，虚线是阵营边界。</figcaption>' +
      '    </figure>' +
      '  </div>' +
      '</section>' +

      '<section class="rule-sec" id="rule-turn">' +
      '  <h2><span>三</span>行棋次序</h2>' +
      '  <p>白方先行，之后双方轮流各走一步。每回合必须走一步，不允许放弃行棋。</p>' +
      '  <p>一步棋只能是下列三种之一：<b>移动</b>、<b>吃子</b>、<b>打入</b>。</p>' +
      '</section>' +

      '<section class="rule-sec" id="rule-move">' +
      '  <h2><span>四</span>移动（整段平移）</h2>' +
      '  <h3>4.1 线段</h3>' +
      '  <p><b>线段</b>：同一方若干枚棋子沿横、竖、斜任一直线连续且无空隙排成的一段。单枚棋子视为长度为 1 的线段。' +
      '    线段内棋子的种类可以任意混杂。</p>' +
      '  <h3>4.2 移动方法</h3>' +
      '  <p>选择己方一条线段，将整条线段朝 8 个方向之一平移 <b>1 格</b>。平移后每枚棋子必须仍在棋盘内，且不得与任何棋子重叠。</p>' +
      '  <p class="rule-note">注意：是整段一起走 1 格，不是每枚子各走 1 格，也不能只抽走段中的某一枚。</p>' +
      '  <h3>4.3 后退限制与升变（重点）</h3>' +
      '  <ul class="rule-list">' +
      '    <li>白方不可向<b>下</b>移动，黑方不可向<b>上</b>移动（横向移动不受限制）——除非该线段已满足升变资格。</li>' +
      '    <li><b>升变</b>：己方任意棋子到达对方阵营内（对方初始 n 排中的任意格）时，该棋子立即升变。升变为永久状态。</li>' +
      '    <li>升变棋子获得向后移动的能力：一条线段若其全部棋子均已升变，则可向后平移（方向、格数规则不变）。</li>' +
      '    <li>升变棋子移出对方阵营、移回己方阵营均不失去升变。</li>' +
      '    <li>打入落入对方阵营的棋子，落下后立即升变。</li>' +
      '    <li>棋子被俘时卸除升变，以普通棋子状态进入持棋台；再打入时按普通规则重新升变。</li>' +
      '  </ul>' +
      '  <div class="rule-callout warn"><b>整段判定。</b>后撤资格看整条线段：只要段内还有一枚未升变的棋子，整段就不能后退，也不能向后吃子。</div>' +
      '  <figure class="rule-figure wide">' +
      '    <div class="diagram-board" data-diagram="promotion"></div>' +
      '    <figcaption>e7 的车已升变（金色标记），它现在可以后退；但它若与一枚未升变的兵组成线段，整段仍不能后撤。</figcaption>' +
      '  </figure>' +
      '</section>' +

      '<section class="rule-sec" id="rule-capture">' +
      '  <h2><span>五</span>吃子（顶头对撞）</h2>' +
      '  <h3>5.1 发生条件</h3>' +
      '  <p>己方线段沿其<b>排头方向</b>的正前方一格紧贴着一条敌方线段（两段头尾相接、同一直线）时，可以发起吃子。</p>' +
      '  <div class="rule-two-col">' +
      '    <div>' +
      '      <h3>5.2 强弱判定</h3>' +
      '      <table class="rule-table">' +
      '        <thead><tr><th>方向</th><th>第一优先：比属性</th><th>平手时：比长度</th></tr></thead>' +
      '        <tbody>' +
      '          <tr><td>正交（横 / 竖）</td><td>己方段内<b>车</b>数 ≥ 敌方段内车数</td><td>己方段长 ≥ 敌方段长</td></tr>' +
      '          <tr><td>斜线</td><td>己方段内<b>象</b>数 ≥ 敌方段内象数</td><td>己方段长 ≥ 敌方段长</td></tr>' +
      '        </tbody>' +
      '      </table>' +
      '      <p>兵与王不计入属性，只贡献长度。属性相等且长度相等时可以吃（≥ 即可）。</p>' +
      '    </div>' +
      '    <figure class="rule-figure">' +
      '      <div class="diagram-board" data-diagram="capture"></div>' +
      '      <figcaption>正交对撞：白方 2 车对黑方 1 车，属性直接胜出，与长度无关。</figcaption>' +
      '    </figure>' +
      '  </div>' +
      '  <h3>5.3 后向吃子</h3>' +
      '  <p>升变线段（全段升变）向后方向发起吃子同样合法，判定与结果同上。</p>' +
      '  <h3>5.4 吃子的结果</h3>' +
      '  <ul class="rule-list">' +
      '    <li><b>突进</b>：己方整段沿吃子方向前进，占据敌方线段让出的位置。</li>' +
      '    <li><b>排头阵亡</b>：敌方线段中紧贴己方的第一枚棋子被移出游戏，不入持棋台。</li>' +
      '    <li><b>其余被俘</b>：敌方线段中排头之后的全部棋子，按被俘时的排列顺序与方向，整段编成俘虏线段送入己方持棋台（卸除升变）。</li>' +
      '    <li>突进后按 4.3 结算己方升变。</li>' +
      '  </ul>' +
      '  <figure class="rule-figure wide">' +
      '    <div class="diagram-board" data-diagram="capture2"></div>' +
      '    <figcaption>斜线对撞：白方 2 象对黑方 1 象。吃掉后，白段突进并占据 f5、g6；排头阵亡，其余入台。</figcaption>' +
      '  </figure>' +
      '  <h3>5.5 王的规则</h3>' +
      '  <p>若排头阵亡的是王，或被俘棋子中包含王——王即失陷，立即判负。</p>' +
      '</section>' +

      '<section class="rule-sec" id="rule-drop">' +
      '  <h2><span>六</span>打入（俘虏投入战场）</h2>' +
      '  <h3>6.1 俘虏线段</h3>' +
      '  <p>持棋台上每条俘虏线段记录棋子序列与方向（被俘时的队列朝向）。方向永久锁定，打入时不得改变、不得翻转。</p>' +
      '  <h3>6.2 打入方法</h3>' +
      '  <ul class="rule-list">' +
      '    <li>选择己方持棋台上的一条俘虏线段。</li>' +
      '    <li>从中截取一段连续子段（长度可以为 1 至整段，不可跳选）。</li>' +
      '    <li>从截取子段的排头开始，沿锁定方向依次排开，放入棋盘的连续空格中，不得压子或越出棋盘。</li>' +
      '    <li>从一条俘虏线段的中间截取后，剩余部分断开为两条独立线段，按原方向留在持棋台上。</li>' +
      '    <li>打入无次数限制、无点数消耗；打入只是放置，不产生吃子。</li>' +
      '    <li>打入后按 4.3 结算升变。</li>' +
      '  </ul>' +
      '  <div class="rule-example"><b>例</b><code>e5d2*1.2</code> 表示：从第 1 段俘虏的第 2 子起截取 2 子，排头落在 e5，沿方向 d（右）依次排开。' +
      '    <code>*</code> 后为台号与截起（均从 1 开始）。</div>' +
      '</section>' +

      '<section class="rule-sec" id="rule-win">' +
      '  <h2><span>七</span>胜负与和棋</h2>' +
      '  <div class="win-grid">' +
      '    <div class="win-card"><span class="wc-ico">' + ICON('crown') + '</span><b>擒王胜</b><p>使对方王阵亡或被俘，立即获胜。</p></div>' +
      '    <div class="win-card"><span class="wc-ico">' + ICON('target') + '</span><b>困毙胜</b><p>轮到对方行棋时，对方无合法移动、无合法吃子、且无法打入，判对方负。</p></div>' +
      '    <div class="win-card"><span class="wc-ico">' + ICON('refresh') + '</span><b>三现和棋</b><p>同一局面（棋盘 + 升变 + 双方持棋台 + 行棋方）第三次出现时判和。</p></div>' +
      '  </div>' +
      '  <p class="rule-note">没有“将军必须应将”的强制规则。王受威胁只是一个警告：如果你不处理，对方下一手就可以擒王。' +
      '    困毙与三现的判定都包含持棋台内容。</p>' +
      '</section>' +

      '<section class="rule-sec" id="rule-notation">' +
      '  <h2><span>八</span>记谱</h2>' +
      '  <p>格式：<b>起点 | 延伸方向 | 延伸长度 | 移动方向</b>。起点如 <code>a1</code>；' +
      '    方向使用键盘上围绕 S 的八个按键。延伸长度是线段所占的格数（1 表示单枚棋子）。</p>' +
      '  <div class="keymap">' +
      '    <div class="keymap-grid">' +
      '      <kbd>q</kbd><kbd>w</kbd><kbd>e</kbd><kbd>a</kbd><kbd class="s">s</kbd><kbd>d</kbd><kbd>z</kbd><kbd>x</kbd><kbd>c</kbd>' +
      '    </div>' +
      '    <div class="keymap-labels">左上 · 上 · 右上 · 左 · 中 · 右 · 左下 · 下 · 右下</div>' +
      '  </div>' +
      '  <div class="rule-example"><b>例</b><code>a1d5d</code> 表示：从 a1 出发、向右延伸 5 格（a1–e1）的线段，向右平移一格。' +
      '    如果正前方紧贴敌段，同一个方向就表示吃子。</div>' +
      '  <div class="rule-example"><b>例</b><code>e5d2*1.2</code> 表示打入：落点 e5，沿锁定方向右排开 2 子，取自第 1 段俘虏的第 2 子起。</div>' +
      '  <p>读谱时，本站在对弈页按顺序重放走法；遇到非法走法会指出具体步数。以 <code>#</code> 开头的行是注释，' +
      '    手数前缀（如 <code>1.</code>）会被忽略。自定义开局会把 <code>LBQ1.</code> 局面代码写在注释里，自动还原。</p>' +
      '  <div class="rule-callout"><b>一页速查。</b>选线段整段平移 1 格；未升变者不得后退；入敌阵即升变；' +
      '    同线头顶敌段即可对撞（正交比车、斜线比象，平手比长）；吃子 = 突进 + 排头阵亡 + 其余入台；' +
      '    打入 = 截取连续一段沿锁定方向放置；王失陷即输，无棋可动即输，三现即和。</div>' +
      '</section>' +
      '<div class="rules-foot">' +
      '  <a class="btn btn-primary" href="#/learn">用交互教程学一遍' + ICON('arrowRight') + '</a>' +
      '  <a class="btn btn-quiet" href="#/play">直接开始对弈</a>' +
      '</div>';
  }

  function pieceRow(t, name, counts, note) {
    return '<tr><td class="pt-name">' +
      '<span class="pt-pair"><span>' + LBQ.pieceSVG(t, 0) + '</span><span>' + LBQ.pieceSVG(t, 1) + '</span></span>' +
      '<b>' + name + '</b></td>' +
      '<td>' + counts[0] + '</td><td>' + counts[1] + '</td><td>' + counts[2] + '</td>' +
      '<td class="pt-note">' + note + '</td></tr>';
  }

  function layoutRows(size) {
    var rows = LBQ.LAYOUTS[size];
    var html = '<div class="layout-block">';
    rows.forEach(function (row, i) {
      var n = rows.length;
      html += '<div class="layout-row"><span class="lr-no">第 ' + (i + 1) + ' 排' +
        (i === 0 ? '（底线）' : (i === n - 1 ? '（最前）' : '')) + '</span>' +
        '<span class="lr-pcs">' + row.split('').map(function (ch) {
          return '<span class="lr-pc" title="' + LBQ.PIECE_LABEL[ch] + '">' + LBQ.pieceSVG(ch, 0) + '</span>';
        }).join('') + '</span></div>';
    });
    html += '</div>';
    return html;
  }

  /* ---------------------------------------------------------------- 图解 */
  function mountDiagrams() {
    var hosts = el.querySelectorAll('[data-diagram]');
    hosts.forEach(function (host) {
      var kind = host.dataset.diagram;
      var board = new LBQ.BoardView(host, {});
      var setup, cells;
      if (kind === 'standard') {
        board.setGame(new LBQ.Game(9).setupStandard(), {});
      } else if (kind === 'promotion') {
        setup = { size: 9, pieces: ['wK@e1', 'wR@e7+', 'wP@e6', 'bK@a9'] };
      } else if (kind === 'capture') {
        setup = {
          size: 9,
          pieces: ['wK@a1', 'wR@e2,e3', 'wP@e4', 'bK@a9', 'bP@e5', 'bR@e6', 'bB@e7']
        };
        cells = ['e2', 'e3', 'e4'];
      } else if (kind === 'capture2') {
        setup = {
          size: 9,
          pieces: ['wK@a1', 'wB@c2,d3', 'wP@e4', 'bK@a9', 'bB@f5', 'bP@g6']
        };
        cells = ['c2', 'd3', 'e4'];
      }
      if (setup) {
        var built = LBQ.buildGame(setup);
        board.setGame(built.game, {});
      }
      board.setMode('none');
      if (cells) {
        board.setSegment(cells.map(function (s) { return LBQ.parseSquare(9, s); }));
      }
      diagrams.push(board);
    });
  }

  LBQ.pages = LBQ.pages || {};
  LBQ.pages.rules = {
    init: init,
    onEnter: function () {
      diagrams.forEach(function (b) { b._measure(); });
      updateSpy();
    }
  };
})(window.LBQ = window.LBQ || {});




