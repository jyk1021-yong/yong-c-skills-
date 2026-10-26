'use strict';
// 프레임 CSS가 너비 기준으로도 9:16을 지키는지 소스로 확인한다. 실제 비율은 브라우저에서 따로 잰다.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const rule = html.match(/#frame\s*\{([^}]*)\}/)[1];

test('frame keeps 9:16 by sizing width from both viewport axes', () => {
  assert.match(rule, /aspect-ratio:\s*9\s*\/\s*16/);
  assert.match(rule, /width:\s*min\([^;]*100vw[^;]*100vh[^;]*\)/);
  assert.doesNotMatch(rule, /max-width:\s*100vw/);
  assert.doesNotMatch(rule, /\bheight:\s*min\(/);
});
