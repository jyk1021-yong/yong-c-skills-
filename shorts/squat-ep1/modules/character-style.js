// 순수 데이터 모듈: 캐릭터 스타일 기본값, 검증, 병합.
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.CharacterStyle = api;
})(this, function () {
  const EXPRESSIONS = Object.freeze(['neutral', 'smile']);

  function deepFreeze(o) {
    for (const v of Object.values(o)) if (v && typeof v === 'object') deepFreeze(v);
    return Object.freeze(o);
  }

  const DEFAULT_STYLE = deepFreeze({
    skin: { color: 0x2f7a3e, roughness: 0.9 },
    hair: { color: 0x2a1d14, roughness: 0.9 },
    face: { eyeColor: 0xffffff, mouthColor: 0x1b4a26, expression: 'neutral' },
    top: { color: 0xe5e7eb, roughness: 0.8 },
    bottom: { color: 0x1e293b, roughness: 0.8 },
    xray: { baseOpacity: 0.35, overlayOpacity: 0.2 },
  });

  // 각 값의 종류: color | unit | expression
  const KINDS = {
    skin: { color: 'color', roughness: 'unit' },
    hair: { color: 'color', roughness: 'unit' },
    face: { eyeColor: 'color', mouthColor: 'color', expression: 'expression' },
    top: { color: 'color', roughness: 'unit' },
    bottom: { color: 'color', roughness: 'unit' },
    xray: { baseOpacity: 'unit', overlayOpacity: 'unit' },
  };

  function isPlain(o) {
    return o !== null && typeof o === 'object' && !Array.isArray(o);
  }

  function check(kind, value, path) {
    if (kind === 'color') {
      if (!Number.isInteger(value) || value < 0 || value > 0xffffff) {
        throw new TypeError(`${path}: color must be an integer in 0..0xffffff`);
      }
    } else if (kind === 'unit') {
      if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1) {
        throw new RangeError(`${path}: must be a finite number in 0..1`);
      }
    } else if (!EXPRESSIONS.includes(value)) {
      throw new RangeError(`${path}: must be one of ${EXPRESSIONS.join(', ')}`);
    }
  }

  function resolveStyle(overrides) {
    const out = {};
    for (const g of Object.keys(DEFAULT_STYLE)) out[g] = { ...DEFAULT_STYLE[g] };
    if (overrides !== undefined) {
      if (!isPlain(overrides)) throw new TypeError('style: must be an object');
      for (const g of Object.keys(overrides)) {
        if (!KINDS[g]) throw new TypeError(`${g}: unknown style key`);
        const group = overrides[g];
        if (!isPlain(group)) throw new TypeError(`${g}: must be an object`);
        for (const k of Object.keys(group)) {
          if (!KINDS[g][k]) throw new TypeError(`${g}.${k}: unknown style key`);
          check(KINDS[g][k], group[k], `${g}.${k}`);
          out[g][k] = group[k];
        }
      }
    }
    return deepFreeze(out);
  }

  return Object.freeze({ DEFAULT_STYLE, EXPRESSIONS, resolveStyle });
});
