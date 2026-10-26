'use strict';
const test = require('node:test');
const assert = require('node:assert');
const CS = require('../modules/character-style.js');

test('T2 resolveStyle() equals DEFAULT_STYLE, different reference', () => {
  const s = CS.resolveStyle();
  assert.deepStrictEqual(s, CS.DEFAULT_STYLE);
  assert.notStrictEqual(s, CS.DEFAULT_STYLE);
});

test('T2 partial override keeps other defaults', () => {
  const s = CS.resolveStyle({ top: { color: 0xff0000 } });
  assert.strictEqual(s.top.color, 0xff0000);
  assert.strictEqual(s.top.roughness, 0.8);
  assert.strictEqual(s.bottom.color, 0x1e293b);
});

test('T2 invalid values throw with path', () => {
  assert.throws(() => CS.resolveStyle({ top: { color: -1 } }), (e) => e instanceof TypeError && e.message.includes('top.color'));
  assert.throws(() => CS.resolveStyle({ top: { color: 0x1000000 } }), TypeError);
  assert.throws(() => CS.resolveStyle({ top: { color: 1.5 } }), TypeError);
  assert.throws(() => CS.resolveStyle({ face: { expression: 'angry' } }), RangeError);
  assert.throws(() => CS.resolveStyle({ shoes: {} }), TypeError);
  assert.throws(() => CS.resolveStyle({ top: { sleeve: 1 } }), TypeError);
  assert.throws(() => CS.resolveStyle({ skin: { roughness: 2 } }), (e) => e instanceof RangeError && e.message.includes('skin.roughness'));
  assert.throws(() => CS.resolveStyle({ xray: { baseOpacity: NaN } }), RangeError);
});

test('T2 EXPRESSIONS and frozen defaults', () => {
  assert.deepStrictEqual([...CS.EXPRESSIONS], ['neutral', 'smile']);
  assert.ok(Object.isFrozen(CS.DEFAULT_STYLE));
  assert.ok(Object.isFrozen(CS.DEFAULT_STYLE.top));
  assert.ok(Object.isFrozen(CS.resolveStyle().top));
});

test('T2 resolveStyle does not mutate input', () => {
  const input = { top: { color: 0x123456 }, face: { expression: 'neutral' } };
  const before = JSON.stringify(input);
  CS.resolveStyle(input);
  assert.strictEqual(JSON.stringify(input), before);
});

test('T2 regression of existing skin values', () => {
  assert.strictEqual(CS.DEFAULT_STYLE.skin.color, 0x2f7a3e); // 우람이: 짙은 초록 무광
  assert.strictEqual(CS.DEFAULT_STYLE.skin.roughness, 0.9);
  assert.strictEqual(CS.DEFAULT_STYLE.bottom.color, 0x1e293b);
  assert.strictEqual(CS.DEFAULT_STYLE.bottom.roughness, 0.8);
  assert.strictEqual(CS.DEFAULT_STYLE.xray.baseOpacity, 0.35);
  assert.strictEqual(CS.DEFAULT_STYLE.xray.overlayOpacity, 0.2);
});
