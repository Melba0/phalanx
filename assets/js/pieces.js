/* ==========================================================================
   棋子造型 — 内联 SVG（象牙 / 黑曜石 / 鎏金）
   ========================================================================== */
(function (LBQ) {
  'use strict';

  var SHAPES = {
    P: [
      '<circle cx="50" cy="29" r="14.5"/>',
      '<path d="M38.5 41.5h23c0 6.4 3.2 10.6 5.6 15.1 3.3 6.2 4.9 13.6 6.4 22.4H26.5c1.5-8.8 3.1-16.2 6.4-22.4 2.4-4.5 5.6-8.7 5.6-15.1Z"/>',
      '<rect x="24" y="77.5" width="52" height="10" rx="4.5"/>',
      '<path class="detail" d="M33 72.5h34" />'
    ],
    R: [
      '<path d="M27 16.5h11v8.5h7v-8.5h10v8.5h7v-8.5h11v22.2c0 3.3-2.1 5.5-5.2 6.3l-3.8 1v7.2l4.4 7.3V79H31v-18.5l4.4-7.3v-7.2l-3.8-1c-3.1-.8-5.2-3-5.2-6.3V16.5Z"/>',
      '<rect x="24.5" y="78" width="51" height="10" rx="3.5"/>',
      '<path class="detail" d="M36 27.5h28M36 70.5h28" />'
    ],
    B: [
      '<circle cx="50" cy="17.5" r="5.4"/>',
      '<path d="M50 22c8.4 9 17.5 17 17.5 29.4 0 9.6-7 15.6-12.2 17.6l3.2 4.9H41.5l3.2-4.9c-5.2-2-12.2-8-12.2-17.6C32.5 39 41.6 31 50 22Z"/>',
      '<rect x="37" y="71.5" width="26" height="7" rx="2.5"/>',
      '<rect x="26.5" y="78" width="47" height="10" rx="4"/>',
      '<path class="detail" d="M50 34.5v14M50 48.5l8.5 7.5" />'
    ],
    K: [
      '<path d="M45.5 6h9v9.5H64v9h-9.5V34h-9v-9.5H36v-9h9.5V6Z"/>',
      '<path d="M50 33c10.4 0 18.4 6.4 20.6 15.6l6 4.2-4.4 6.3 2.2 5.6-3 18.3H28.6l-3-18.3 2.2-5.6-4.4-6.3 6-4.2C31.6 39.4 39.6 33 50 33Z"/>',
      '<rect x="22" y="77.5" width="56" height="10.5" rx="4.5"/>',
      '<circle class="gold" cx="50" cy="52" r="5.4"/>',
      '<path class="detail" d="M39 70.5h22" />'
    ]
  };

  var DETAIL = '<path class="hl" d="M38 46.5c-2.4 5.2-3.4 10.2-4.2 15.4"/>';

  function pieceSVG(type, side, opts) {
    opts = opts || {};
    var white = side === 0;
    var fill = white ? 'url(#gIvory)' : 'url(#gObsidian)';
    var stroke = white ? '#6a5130' : '#05070c';
    var detail = white ? 'rgba(120,92,52,.55)' : 'rgba(190,205,230,.30)';
    var hl = white ? 'rgba(255,255,255,.72)' : 'rgba(180,200,235,.24)';
    var shapes = SHAPES[type] || SHAPES.P;
    var body = shapes.map(function (s) {
      return s.replace(/class="detail"/g, 'class="detail" stroke="' + detail + '" fill="none" stroke-width="2.4" stroke-linecap="round"');
    }).join('');
    body = body.replace(/<circle class="gold"/g,
      '<circle class="gold" fill="url(#gGold)" stroke="' + (white ? '#8a6420' : '#e2bd74') + '" stroke-width="2"');
    return '<svg class="pc-svg" viewBox="0 0 100 100" aria-hidden="true">' +
      '<g fill="' + fill + '" stroke="' + stroke + '" stroke-width="2.9" stroke-linejoin="round" stroke-linecap="round">' +
      body +
      '</g>' +
      '</svg>';
  }

  var GRADS = '<svg class="svg-defs" width="0" height="0" aria-hidden="true" focusable="false"><defs>' +
    '<linearGradient id="gIvory" gradientUnits="userSpaceOnUse" x1="22" y1="8" x2="76" y2="94">' +
    '<stop offset="0" stop-color="#fffdf6"/><stop offset=".42" stop-color="#f6ecd8"/>' +
    '<stop offset=".75" stop-color="#e6d3ac"/><stop offset="1" stop-color="#cdb587"/></linearGradient>' +
    '<linearGradient id="gObsidian" gradientUnits="userSpaceOnUse" x1="24" y1="6" x2="78" y2="94">' +
    '<stop offset="0" stop-color="#59657c"/><stop offset=".35" stop-color="#333c4e"/>' +
    '<stop offset=".72" stop-color="#1c222e"/><stop offset="1" stop-color="#0c1017"/></linearGradient>' +
    '<linearGradient id="gGold" gradientUnits="userSpaceOnUse" x1="40" y1="30" x2="62" y2="60">' +
    '<stop offset="0" stop-color="#fff0c9"/><stop offset=".5" stop-color="#e8b566"/>' +
    '<stop offset="1" stop-color="#a6742a"/></linearGradient>' +
    '<linearGradient id="gGoldSoft" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0" stop-color="#f3d59a"/><stop offset="1" stop-color="#b98a42"/></linearGradient>' +
    '</defs></svg>';

  LBQ.pieceSVG = pieceSVG;
  LBQ.pieceGradients = GRADS;
})(window.LBQ = window.LBQ || {});

