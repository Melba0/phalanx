/* ==========================================================================
   交互教程内容
   ========================================================================== */
(function (LBQ) {
  'use strict';

  LBQ.lessons = [
    /* ---------------------------------------------------------------- 1 */
    {
      id: 'basics',
      title: '棋盘与棋子',
      tag: '入门',
      desc: '棋盘、阵营、四类棋子与王的位置。',
      icon: { t: 'K', p: 0 },
      steps: [
        {
          lead: '这是 9 × 9 的棋盘。',
          text: '白方在下方，黑方在上方。外沿的字母 <code>a–i</code> 与数字 <code>1–9</code> 用来标记格子：' +
            '<code>a1</code> 是左下角，<code>i9</code> 是右上角。<br>先找到白方的王。',
          setup: { standard: true },
          task: { kind: 'click', cell: 'e1', text: '点击白方的王。', wrong: '再找找：白方的王在底线正中。' },
          hint: '王在棋盘最下面一排的正中间。',
          after: '白王在 <code>e1</code>。它不分大小、不吃子、没有特殊走法——它只是一个不能阵亡的兵。'
        },
        {
          lead: '黑王在另一头。',
          text: '点击黑方的王。',
          task: { kind: 'click', cell: 'e9', text: '点击黑方的王。', wrong: '黑方在最上方一排，王同样在正中。' },
          hint: '最上面一排的正中间。',
          after: '黑王在 <code>e9</code>。双方的王都从底线正中开始。'
        },
        {
          lead: '染色区就是对方阵营。',
          text: '棋盘上下各有一段染色区，那是对方的初始阵营（9 路棋盘各占 3 排）。' +
            '点击黑方阵营内的任意一格。',
          task: {
            kind: 'click',
            test: function (g, pos) { return pos[0] < g.campDepth; },
            text: '点击黑方阵营内的任意一格。',
            wrong: '黑方阵营在棋盘最上面 3 排（第 7–9 排）。'
          },
          hint: '顶部 3 排，蓝色染色区。',
          after: '己方棋子只要进入对方阵营就立即<b>升变</b>：永久获得金色标记，并从此可以后退。'
        },
        {
          lead: '四类棋子。',
          text: '每方只有四种棋子。数量随棋盘大小变化：9 路为 1 王 / 6 车 / 6 象 / 14 兵，' +
            '11 路为 1 / 10 / 10 / 23，13 路为 1 / 16 / 16 / 32。<br><br>' +
            '棋子是长度与属性的载体：<b>车</b>决定正交对撞，<b>象</b>决定斜线对撞，<b>兵与王</b>只贡献长度。' +
            '王不分大小，也不能被吃掉。',
          legend: true,
          task: { kind: 'free', text: '读完这段说明，继续。' },
          after: ''
        }
      ]
    },

    /* ---------------------------------------------------------------- 2 */
    {
      id: 'segments',
      title: '线段：整段平移',
      tag: '移动',
      desc: '同一直线上连续的一段棋子，就是一个整体。',
      icon: { t: 'R', p: 0 },
      steps: [
        {
          lead: '线段 = 同一直线上连续的一段己方棋子。',
          text: '横、竖、斜都可以；一条线段里可以混着不同种类的棋子。' +
            '整条线段一起走，子力之间的相对位置永远不变。<br><br>' +
            '把 <code>c4–e4</code> 这条横线整段向<b>右</b>平移一格。',
          setup: { size: 9, pieces: ['wK@e1', 'wP@c4,d4,e4', 'bK@e9', 'bP@g7'] },
          focus: ['c4', 'd4', 'e4'],
          actor: 0,
          task: {
            kind: 'action', text: '整段向右平移一格。',
            match: { type: 'move', dir: 'e', cells: ['c4', 'd4', 'e4'] }
          },
          hint: '点 c4，再点 e4 选中整段；然后点右侧的金色方向箭头。',
          after: '整条线段一起走：三枚棋子同时右移一格，队形完全不变。一步棋只能是整段平移 <b>1 格</b>。'
        },
        {
          lead: '单枚棋子也是线段。',
          text: '一枚棋子 = 长度为 1 的线段。它同样可以沿 8 个方向走一格，包括斜线。<br><br>' +
            '把 <code>g4</code> 的车向左上斜移一格。',
          setup: { size: 9, pieces: ['wK@e1', 'wR@g4', 'bK@e9'] },
          focus: ['g4'],
          task: {
            kind: 'action', text: '把 g4 的车向左上走一格。',
            match: { type: 'move', dir: 'nw', cells: ['g4'] }
          },
          hint: '点 g4 选中它，再点左上方的 f5。',
          after: '单子线段同样遵守整段平移的规则。注意：白方可以向上、向两侧、也可以斜着走，但不能向下——那是后退。'
        },
        {
          lead: '斜线也可以是线段。',
          text: '棋子沿斜线连续排列时，同样是一条线段。把 <code>c3–e5</code> 这条斜线整段向<b>右</b>平移一格。',
          setup: { size: 9, pieces: ['wK@e1', 'wB@c3,d4,e5', 'bK@e9', 'bP@g7'] },
          focus: ['c3', 'd4', 'e5'],
          task: {
            kind: 'action', text: '把斜线 c3–e5 整段向右平移一格。',
            match: { type: 'move', dir: 'e', cells: ['c3', 'd4', 'e5'] }
          },
          hint: '点 c3，再点 e5 选中斜线；然后点右侧的金色方向箭头。',
          after: '斜线段的平移方向不必和线段本身的方向一致。整段只移动 1 格，不能一次滑很远。'
        },
        {
          lead: '一步 = 一格。',
          text: '每次行棋只能把一条线段平移 <b>1 格</b>，不能连续滑行，也不能只移动线段中的一枚棋子。' +
            '线段内棋子的顺序和间距始终锁定。',
          task: { kind: 'free', text: '明白之后，继续学习后退限制。' },
          after: ''
        }
      ]
    },

    /* ---------------------------------------------------------------- 3 */
    {
      id: 'backward',
      title: '不能后退',
      tag: '限制',
      desc: '白方不可向下、黑方不可向上——除非已经升变。',
      icon: { t: 'P', p: 0 },
      steps: [
        {
          lead: '先试着违反它。',
          text: '选中 <code>c3–e3</code> 这条线段，然后点击它<b>下方</b>的格子。' +
            '看看规则会怎么回答你。',
          setup: { size: 9, pieces: ['wK@e1', 'wP@c3,d3,e3', 'bK@e9'] },
          focus: ['c3', 'd3', 'e3'],
          task: { kind: 'probe', reason: 'backward', text: '让这条线段向后退一格（向下）。' },
          hint: '点 c3，再点 e3 选中整段，然后点 c2 / d2 / e2 中任意一格。',
          after: '被拒绝了。白方不能向下移动，黑方不能向上移动——横向不受限制。' +
            '想要后退，必须先让整条线段都升变。'
        },
        {
          lead: '向前是合法的。',
          text: '现在把 <code>c3–e3</code> 整段向<b>上</b>平移一格。',
          task: {
            kind: 'action', text: '把 c3–e3 整段向上平移一格。',
            match: { type: 'move', dir: 'n', cells: ['c3', 'd3', 'e3'] }
          },
          hint: '点 c3，再点 e3；然后点向上的金色方向箭头。',
          after: '向前与横向都自由。后退限制只在“向自己的后方”时生效。'
        },
        {
          lead: '横向也不受限制。',
          text: '现在线段在 c4–e4。把它整段向<b>右</b>平移一格。',
          task: {
            kind: 'action', text: '把 c4–e4 整段向右平移一格。',
            match: { type: 'move', dir: 'e', cells: ['c4', 'd4', 'e4'] }
          },
          hint: '然后点向右的金色方向箭头。',
          after: '横向移动不受任何方向限制。'
        },
        {
          lead: '黑方是镜像的。',
          text: '现在换成黑方。选中 <code>c7–e7</code>，试着让它向<b>上</b>走一格。',
          setup: { size: 9, pieces: ['wK@e1', 'bK@e9', 'bP@c7,d7,e7'] },
          focus: ['c7', 'd7', 'e7'],
          actor: 1,
          task: { kind: 'probe', reason: 'backward', text: '让黑方线段向上退一格。' },
          hint: '黑方在上方，它的“后退”是向上。',
          after: '黑方镜像：不可向上。白方不可向下。横向永远自由。'
        }
      ]
    },

    /* ---------------------------------------------------------------- 4 */
    {
      id: 'promotion',
      title: '入阵升变',
      tag: '升变',
      desc: '进入对方阵营，赢得向后转身的资格。',
      icon: { t: 'R', p: 0 },
      steps: [
        {
          lead: '把棋子送进敌阵。',
          text: '黑方阵营是第 7–9 排。白车在 <code>e6</code>，正前方就是敌阵。<br><br>' +
            '把它向上走一格，进入黑方阵营。',
          setup: { size: 9, pieces: ['wK@e1', 'wR@e6', 'bK@a9'] },
          focus: ['e6'],
          task: {
            kind: 'action', text: '把 e6 的车向上走一格，进入敌阵。',
            match: { type: 'move', dir: 'n', cells: ['e6'] }
          },
          hint: '点 e6，再点 e7。',
          after: '入阵即升变：棋子出现金色标记。升变是<b>永久</b>状态。'
        },
        {
          lead: '升变后可以后退。',
          text: '再向上走一格，深入敌阵；然后向下走回来。升变的车已经获得后退资格。',
          task: {
            kind: 'action', text: '把升变的车再向上走一格。',
            match: { type: 'move', dir: 'n', cells: ['e7'] }
          },
          hint: '点 e7，再点 e8。',
          after: '升变棋子可以向后走、也可以向后吃子。未升变的线段仍然不能后退。'
        },
        {
          lead: '金标不会消失。',
          text: '现在把车向<b>下</b>走回 <code>e7</code>。',
          task: {
            kind: 'action', text: '让升变的车向后退一格。',
            match: { type: 'move', dir: 's', cells: ['e8'] }
          },
          hint: '点 e8，再点 e7。',
          after: '后退成功。升变是永久状态。'
        },
        {
          lead: '离开敌阵也不会失去升变。',
          text: '继续向下走一格，离开黑方阵营。观察车上的金色标记。',
          task: {
            kind: 'action', text: '继续向后退一格，走出敌阵。',
            match: { type: 'move', dir: 's', cells: ['e7'] }
          },
          hint: '点 e7，再点 e6。',
          after: '即使离开敌阵，升变也不会消失。只有被俘时才会卸除升变，以普通棋子身份进入持棋台。' +
            '<br><br>任何棋子进入对方阵营都会升变，打入的棋子落入敌阵同样立即升变。'
        }
      ]
    },

    /* ---------------------------------------------------------------- 5 */
    {
      id: 'retreat',
      title: '整段后撤',
      tag: '升变',
      desc: '整段后退，要求段内每一枚棋子都已升变。',
      icon: { t: 'B', p: 0 },
      steps: [
        {
          lead: '一枚升变，不等于整段能退。',
          text: '这条线段由已升变的车 <code>e4</code> 和未升变的兵 <code>e3</code> 组成。' +
            '选中它，试着向<b>下</b>退一格。',
          setup: { size: 9, pieces: ['wK@a1', 'wR@e4+', 'wP@e3', 'bK@a9'] },
          focus: ['e3', 'e4'],
          task: { kind: 'probe', reason: 'backward', text: '让混编线段向后退一格。' },
          hint: '点 e3，再点 e4，然后点 e2。',
          after: '虽然车已升变，但段内还有未升变的兵，所以整段不能后退。后撤资格按<b>整段</b>判定。'
        },
        {
          lead: '全段升变，才能整段后撤。',
          text: '现在这条线段的两枚棋子都已升变。把它整段向<b>下</b>退一格。',
          setup: { size: 9, pieces: ['wK@a1', 'wR@e4+', 'wP@e3+', 'bK@a9'] },
          focus: ['e3', 'e4'],
          task: {
            kind: 'action', text: '把全升变线段向下退一格。',
            match: { type: 'move', dir: 's', cells: ['e3', 'e4'] }
          },
          hint: '点 e3，再点 e4；然后点向下的金色方向箭头。',
          after: '整段后撤需要段内<b>全部</b>棋子升变。后向吃子也遵守同一条规则。'
        },
        {
          lead: '单枚升变子可以自由后退。',
          text: '这枚车单独成段。把它向后退一格。',
          setup: { size: 9, pieces: ['wK@a1', 'wR@e4+', 'wP@d3', 'bK@a9'] },
          focus: ['e4'],
          task: {
            kind: 'action', text: '让单枚升变车向后退一格。',
            match: { type: 'move', dir: 's', cells: ['e4'] }
          },
          hint: '点 e4，再点 e3。',
          after: '单枚升变子可以自由后退。升变后即使走回己方阵营，金标也不会消失。'
        },
        {
          lead: '记住这条判定。',
          text: '后撤 = 向自己的底线方向移动（白方向下、黑方向上）。' +
            '判定对象是<b>整条线段</b>：只要段内还有一枚未升变的棋子，整段就不能后退，也不能向后吃子。',
          task: { kind: 'free', text: '继续学习对撞。' },
          after: ''
        }
      ]
    },

    /* ---------------------------------------------------------------- 6 */
    {
      id: 'capture-ortho',
      title: '顶头对撞：比车数',
      tag: '吃子',
      desc: '正交对撞先比车数，平手再比段长。',
      icon: { t: 'R', p: 1 },
      steps: [
        {
          lead: '两段头尾相接，才能对撞。',
          text: '白段 <code>e2–e4</code> 的排头 <code>e4</code> 正前方紧贴着黑段 <code>e5–e6</code>。' +
            '选中白段，向上冲撞。<br><br>正交（横 / 竖）先比<b>车</b>的数量：白方 2 车，黑方 0 车。',
          setup: { size: 9, pieces: ['wK@a1', 'wR@e2,e3', 'wP@e4', 'bK@a9', 'bP@e5,e6'] },
          focus: ['e2', 'e3', 'e4'],
          task: {
            kind: 'action', text: '让白段向上冲撞黑段。',
            match: { type: 'capture', dir: 'n', cells: ['e2', 'e3', 'e4'] }
          },
          hint: '点 e2，再点 e4；然后点红色敌段。',
          after: '2 车 &gt; 0 车，对撞成立。白段整段突进 2 格，占据敌段让出的位置。'
        },
        {
          lead: '属性平手时，比长度。',
          text: '白段 2 子（1 车），黑段 3 子（1 车）。车数相等，就要比段长：2 &lt; 3。' +
            '选中白段，试着冲撞红段。',
          setup: { size: 9, pieces: ['wK@a1', 'wR@e4', 'wP@e3', 'bK@a9', 'bR@e5', 'bP@e6,e7'] },
          focus: ['e3', 'e4'],
          task: { kind: 'probe', reason: 'weak', text: '试着用短段冲撞长段。' },
          hint: '点 e3，再点 e4，然后点红段。',
          after: '对撞失败。属性相等、长度更短，就不能吃。记住：先比属性，平手再比长度。'
        },
        {
          lead: '相等也可以吃。',
          text: '白段 3 子（1 车），黑段 3 子（1 车）：车数相等，长度也相等。' +
            '规则要求“≥ 即可”，所以这次可以吃。',
          setup: { size: 9, pieces: ['wK@a1', 'wR@e3', 'wP@e2,e4', 'bK@a9', 'bR@e5', 'bP@e6,e7'] },
          focus: ['e2', 'e3', 'e4'],
          task: {
            kind: 'action', text: '在属性与长度都相等时发起对撞。',
            match: { type: 'capture', dir: 'n', cells: ['e2', 'e3', 'e4'] }
          },
          hint: '点 e2，再点 e4；然后点红段。',
          after: '车 1 = 1，长度 3 = 3，可以吃。相等时判定为“不弱于”，所以冲撞成立。'
        },
        {
          lead: '兵与王只贡献长度。',
          text: '正交看车数，斜线看象数。兵与王不计入属性，只贡献段长。' +
            '所以一条全是兵的长段，可能靠长度赢过一条短的车段；反过来，车多的短段也能吃掉兵多的长段。',
          task: { kind: 'free', text: '继续学习斜线对撞。' },
          after: ''
        }
      ]
    },

    /* ---------------------------------------------------------------- 7 */
    {
      id: 'capture-diag',
      title: '斜线对撞：比象数',
      tag: '吃子',
      desc: '斜线上比象数，平手再比段长。',
      icon: { t: 'B', p: 0 },
      steps: [
        {
          lead: '斜线相撞，比较象。',
          text: '白段 <code>c2–e4</code> 沿对角线顶着黑段 <code>f5–g6</code>。' +
            '选中白段，向右上冲撞。<br><br>斜线先比<b>象</b>的数量：白方 2 象，黑方 1 象。',
          setup: { size: 9, pieces: ['wK@a1', 'wB@c2,d3', 'wP@e4', 'bK@a9', 'bB@f5', 'bP@g6'] },
          focus: ['c2', 'd3', 'e4'],
          task: {
            kind: 'action', text: '沿斜线冲撞黑段。',
            match: { type: 'capture', dir: 'ne', cells: ['c2', 'd3', 'e4'] }
          },
          hint: '点 c2，再点 e4；然后点红色敌段。',
          after: '2 象 &gt; 1 象，斜线对撞成立。斜线和正交的判定完全对称，只是把“车”换成“象”。'
        },
        {
          lead: '斜线也会比长度。',
          text: '白段 2 子（1 象），黑段 3 子（1 象）。象数相等，长度 2 &lt; 3。试着冲撞。',
          setup: { size: 9, pieces: ['wK@a1', 'wB@c2', 'wP@d3', 'bK@a9', 'bB@e4', 'bP@f5,g6'] },
          focus: ['c2', 'd3'],
          task: { kind: 'probe', reason: 'weak', text: '试着用更短的斜段冲撞。' },
          hint: '点 c2，再点 d3，然后点红段。',
          after: '失败。斜线对撞的比较顺序与正交一致：先比象数，相等再比段长。'
        },
        {
          lead: '必须先在同一直线上。',
          text: '只有<b>头尾相接、位于同一直线</b>的两条线段才能对撞。' +
            '如果敌段在旁边或斜对角，即使紧贴着也不能吃——先把线段转到同一条线上。',
          task: { kind: 'free', text: '继续学习吃子的结果。' },
          after: ''
        }
      ]
    },

    /* ---------------------------------------------------------------- 8 */
    {
      id: 'capture-result',
      title: '吃子的结果',
      tag: '吃子',
      desc: '突进、排头阵亡、其余俘虏入台。',
      icon: { t: 'sword', p: 0 },
      steps: [
        {
          lead: '撞赢之后会发生三件事。',
          text: '白段 <code>e3–e4</code>（2 车）撞向黑段 <code>e5–e7</code>。实战一次，' +
            '然后看棋盘下方的持棋台。',
          setup: {
            size: 9,
            pieces: ['wK@a1', 'wR@e3,e4', 'bK@a9', 'bP@e5', 'bR@e6', 'bB@e7']
          },
          focus: ['e3', 'e4'],
          task: {
            kind: 'action', text: '冲撞黑段，观察持棋台。',
            match: { type: 'capture', dir: 'n', cells: ['e3', 'e4'] }
          },
          hint: '点 e3，再点 e4；然后点红段。',
          after: '<b>突进</b>：整段前进 3 格。<b>排头阵亡</b>：最靠近的兵被移出游戏，不入台。' +
            '<b>其余被俘</b>：车、象按原顺序进入白方持棋台。'
        },
        {
          lead: '俘虏线段保留方向。',
          text: '看棋盘下方的白方持棋台：第 1 段俘虏是 <code>RB</code>，锁定方向为上。' +
            '以后打入时，必须沿着这个方向排开，不能翻转或改变方向。<br><br>' +
            '被俘的棋子会卸除升变，以普通状态进入持棋台。',
          task: { kind: 'free', text: '继续。' },
          after: ''
        },
        {
          lead: '王在敌段里，就是擒王。',
          text: '这次黑王亲自站在敌段里。吃掉这条线段——注意看结果。',
          setup: { size: 9, pieces: ['wK@a1', 'wR@e3,e4', 'bK@e5', 'bP@e6'] },
          focus: ['e3', 'e4'],
          task: {
            kind: 'action', text: '冲撞包含黑王的敌段。',
            match: { type: 'capture', dir: 'n', cells: ['e3', 'e4'] }
          },
          hint: '点 e3，再点 e4；然后点红段。',
          after: '王在敌段中：无论它是排头阵亡还是被俘，只要王失陷，立即判负。这盘棋到此结束。'
        },
        {
          lead: '“王受威胁”意味着什么。',
          text: '如果对方下一步就能吃掉你的王，棋盘上会亮起红色警示。' +
            '本棋没有强制的“应将”规则，但王一旦失陷立即输棋，所以你必须处理这个威胁。',
          task: { kind: 'free', text: '继续学习打入。' },
          after: ''
        }
      ]
    },

    /* ---------------------------------------------------------------- 9 */
    {
      id: 'drop',
      title: '打入：俘虏再上阵',
      tag: '打入',
      desc: '从持棋台截取一段，沿锁定方向放回棋盘。',
      icon: { t: 'P', p: 1 },
      steps: [
        {
          lead: '俘虏可以回到战场。',
          text: '白方持棋台第 1 段俘虏是 <code>PR</code>，方向为上。' +
            '点击 P，再点击 R，截取整段；然后落在 <code>c4</code>。<br><br>' +
            '落点会沿锁定方向依次排开：P 在 c4，R 在 c5。',
          setup: { size: 9, pieces: ['wK@e1', 'wR@a1', 'bK@e9'], trays: { w: ['PR:n'] } },
          task: {
            kind: 'action', text: '把整段 PR 打入到 c4（方向向上）。',
            match: { type: 'drop', ti: 0, start: 0, len: 2, head: 'c4' }
          },
          hint: '先在下方白方持棋台点 P，再点 R；然后点棋盘上的 c4。',
          after: '打入只是放置，不吃子，也不消耗次数。一次行棋可以打入任意一段连续俘虏。'
        },
        {
          lead: '从中间截取，剩余断开。',
          text: '这一段俘虏是 <code>PRBP</code>。从第 2 子开始截取 <code>R、B</code> 两子，' +
            '落在 <code>d4</code>。剩下的 P 会断成两段独立俘虏，留在台上。',
          setup: { size: 9, pieces: ['wK@e1', 'bK@e9'], trays: { w: ['PRBP:n'] } },
          task: {
            kind: 'action', text: '截取 R、B 两子，落在 d4。',
            match: { type: 'drop', ti: 0, start: 1, len: 2, head: 'd4' }
          },
          hint: '点 R，再点 B；然后点 d4。',
          after: '从中间截取后，俘虏线段的剩余部分会断开为两条独立线段，方向仍然锁定。'
        },
        {
          lead: '落入敌阵，立即升变。',
          text: '把这段 <code>RB</code> 落在 <code>e8</code>（方向向上）。两个格子都在黑方阵营里。',
          setup: { size: 9, pieces: ['wK@a1', 'bK@a9'], trays: { w: ['RB:n'] } },
          task: {
            kind: 'action', text: '把 RB 打入黑方阵营。',
            match: { type: 'drop', ti: 0, start: 0, len: 2, head: 'e8' }
          },
          hint: '点 R，再点 B；然后点 e8。',
          after: '打入落入对方阵营的棋子立即升变。俘虏在被俘时卸除升变，打入时再按落点重新判定。'
        },
        {
          lead: '打入的边界。',
          text: '打入不得压子、不得越出棋盘；方向永久锁定，不能翻转。' +
            '打入本身不产生吃子——即使落在敌段旁边，也要等下一手才能冲撞。',
          task: { kind: 'free', text: '继续学习胜负。' },
          after: ''
        }
      ]
    },

    /* ---------------------------------------------------------------- 10 */
    {
      id: 'win',
      title: '王的规则与胜负',
      tag: '胜负',
      desc: '擒王、困毙、三现和棋。',
      icon: { t: 'K', p: 1 },
      steps: [
        {
          lead: '擒王即胜。',
          text: '黑王就在敌段的排头。吃掉它，立即结束对局。',
          setup: { size: 9, pieces: ['wK@a1', 'wR@e3,e4', 'bK@e5', 'bP@f5'] },
          focus: ['e3', 'e4'],
          task: {
            kind: 'action', text: '吃掉包含黑王的敌段。',
            match: { type: 'capture', dir: 'n', cells: ['e3', 'e4'] }
          },
          hint: '点 e3，再点 e4；然后点红段。',
          after: '王阵亡或被俘，立即获胜。这是本棋最主要的胜负方式。'
        },
        {
          lead: '困毙也判负。',
          text: '轮到对方行棋时，如果对方<b>无合法移动、无合法吃子、且无法打入</b>，' +
            '对方即判负。这和国际象棋的“无子可动”类似，但本棋没有将军必须应将的限制。',
          task: { kind: 'free', text: '继续。' },
          after: ''
        },
        {
          lead: '三现和棋。',
          text: '同一局面（双方棋子位置与升变状态 + 双方持棋台全部内容 + 行棋方）第三次出现时判和。' +
            '注意：持棋台上的俘虏也算局面的一部分。',
          task: { kind: 'free', text: '继续。' },
          after: ''
        },
        {
          lead: '最后一道题。',
          text: '以下哪种情况会立即获胜？',
          task: {
            kind: 'quiz',
            options: [
              { label: '吃掉包含对方王的敌段', ok: true },
              { label: '吃掉对方最后一枚车', ok: false },
              { label: '把任意棋子送进对方阵营升变', ok: false },
              { label: '让棋盘上只剩自己的王', ok: false }
            ],
            explain: '王失陷立即输棋，所以吃掉包含王的敌段就是擒王胜。其他情况都只是子力得失。'
          },
          after: '课程完成。你现在可以进入对弈，或去规则页查完整条款。'
        }
      ]
    }
  ];

  LBQ.lessonById = function (id) {
    for (var i = 0; i < LBQ.lessons.length; i++) {
      if (LBQ.lessons[i].id === id) return LBQ.lessons[i];
    }
    return null;
  };
})(window.LBQ = window.LBQ || {});

