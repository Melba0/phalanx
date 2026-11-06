#!/usr/bin/env node
'use strict';

/*
 * 构建时把宿主平台的环境变量 PHALANX_TOKEN 注入到前端配置。
 * 用法：PHALANX_TOKEN=github_pat_xxx node scripts/inject-token.js
 * 生成的文件 assets/js/puzzles-config.js 已被 .gitignore 忽略，不会进入仓库。
 */

const fs = require('fs');
const path = require('path');

const token = (process.env.PHALANX_TOKEN || '').trim();
const name = (process.env.PHALANX_NAME || '同学').trim();

if (!token) {
  console.error('PHALANX_TOKEN is not set. Add it to the hosting provider environment variables.');
  process.exit(1);
}

const esc = s => String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
const out = [
  '/* Generated at build time from PHALANX_TOKEN. Do not commit. */',
  'window.PHALANX_DEFAULT_AUTH = {',
  "  token: '" + esc(token) + "',",
  "  name: '" + esc(name) + "',",
  '  push: true,',
  '  builtin: true',
  '};',
  ''
].join('\n');

const target = path.join(__dirname, '..', 'assets', 'js', 'puzzles-config.js');
fs.writeFileSync(target, out, 'utf8');
console.log('Injected default puzzle token into assets/js/puzzles-config.js');
