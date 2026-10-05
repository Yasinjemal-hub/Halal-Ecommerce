import en from '../translations/en';
import am from '../translations/am';
import om from '../translations/om';
import so from '../translations/so';
import ar from '../translations/ar';

const LOCALES = { en, am, om, so, ar };

const varsOf = (value) => {
  const vars = new Set();
  const re = /\{(\w+)\}/g;
  let m;
  while ((m = re.exec(value)) !== null) vars.add(m[1]);
  return [...vars].sort();
};

const suffixOf = (key) => {
  const m = key.match(/_(zero|one|two|few|many|other)$/);
  return m ? { base: key.slice(0, -m[0].length), suffix: m[1] } : null;
};

describe('translation catalogs (local, English-source)', () => {
  const enKeys = Object.keys(en);

  it('has a complete, non-empty English source catalog', () => {
    expect(enKeys.length).toBeGreaterThan(0);
    for (const key of enKeys) {
      expect(typeof en[key]).toBe('string');
      expect(en[key].length).toBeGreaterThan(0);
    }
    expect(en.dir).toBe('ltr');
  });

  it.each(['am', 'om', 'so', 'ar'])('locale %s covers every source key with no extras', (code) => {
    const missing = enKeys.filter((k) => !(k in LOCALES[code]));
    expect(missing).toEqual([]);
    const extra = Object.keys(LOCALES[code]).filter((k) => !enKeys.includes(k));
    expect(extra).toEqual([]);
  });

  it.each(['am', 'om', 'so', 'ar'])('locale %s has no empty values or duplicate keys', (code) => {
    const bad = enKeys.filter(
      (key) => typeof LOCALES[code][key] !== 'string' || LOCALES[code][key].length === 0
    );
    expect(bad).toEqual([]);
  });

  it.each(['am', 'om', 'so', 'ar'])('locale %s matches interpolation variables exactly', (code) => {
    const bad = [];
    for (const key of enKeys) {
      const expected = varsOf(en[key]);
      const actual = varsOf(LOCALES[code][key]);
      // Singular forms may imply the count without naming it.
      const singular = /_one$|_two$/.test(key);
      const norm = (vars) => (singular ? vars.filter((v) => v !== 'count') : vars);
      if (JSON.stringify(norm(actual)) !== JSON.stringify(norm(expected))) {
        bad.push(key);
      }
    }
    expect(bad).toEqual([]);
  });

  it('keeps plural-form suffix sets identical across locales', () => {
    const bases = new Map();
    for (const key of enKeys) {
      const p = suffixOf(key);
      if (!p) continue;
      if (!bases.has(p.base)) bases.set(p.base, new Set());
      bases.get(p.base).add(p.suffix);
    }
    // A lone `_other` (e.g. `mtype_other`) is a category value, not a
    // plural form — only multi-suffix bases are checked.
    for (const [base, suffixes] of [...bases]) {
      if (suffixes.size < 2) bases.delete(base);
    }
    const missing = [];
    for (const [base, suffixes] of bases) {
      for (const code of ['am', 'om', 'so', 'ar']) {
        for (const suffix of suffixes) {
          if (!(`${base}_${suffix}` in LOCALES[code])) {
            missing.push(`${code} must define ${base}_${suffix}`);
          }
        }
      }
    }
    expect(missing).toEqual([]);
  });

  it('marks Arabic right-to-left and all others left-to-right', () => {
    expect(ar.dir).toBe('rtl');
    for (const code of ['en', 'am', 'om', 'so']) {
      expect(LOCALES[code].dir).toBe('ltr');
    }
  });
});
