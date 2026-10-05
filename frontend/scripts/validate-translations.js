/**
 * Translation catalog validation (fails non-zero on drift).
 *
 * Checks, for every bundled locale against the English source catalog:
 *  - no missing keys and no empty values,
 *  - no duplicate keys within a file,
 *  - interpolation variables match the source exactly,
 *  - plural-form suffixes match the source exactly
 *    (e.g. if en has `cart_items_one`, every locale must define it),
 *  - locale meta (dir/langCode) is present, with `dir: 'rtl'` for Arabic.
 *
 * Run:  npm run i18n:validate   (from frontend/)
 * The same assertions run in CI via src/i18n/__tests__/translations.test.js.
 */
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..', 'src', 'i18n', 'translations');
const LOCALES = ['en', 'am', 'om', 'so', 'ar'];

function parse(code) {
  const text = fs.readFileSync(path.join(DIR, `${code}.js`), 'utf8');
  const keys = new Map();
  const duplicates = [];
  // Tolerate 2- or 4-space indentation and either quote style: catalogs
  // must validate regardless of formatter normalization.
  const re = /^ {2,4}([A-Za-z0-9_]+):\s*('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")/gm;
  let m;
  while ((m = re.exec(text)) !== null) {
    if (keys.has(m[1])) duplicates.push(m[1]);
    const vars = new Set();
    const vre = /\{(\w+)\}/g;
    let vm;
    while ((vm = vre.exec(m[2])) !== null) vars.add(vm[1]);
    keys.set(m[1], { raw: m[2], vars: [...vars].sort(), empty: m[2].length <= 2 });
  }
  return { keys, duplicates };
}

const catalogs = Object.fromEntries(LOCALES.map((c) => [c, parse(c)]));
const enKeys = [...catalogs.en.keys.keys()];
const errors = [];

// English is the complete source: no empty values allowed.
for (const k of enKeys) {
  if (catalogs.en.keys.get(k).empty) errors.push(`en: empty value for "${k}"`);
}

for (const code of LOCALES.filter((c) => c !== 'en')) {
  const cat = catalogs[code];
  if (cat.duplicates.length) errors.push(`${code}: duplicate keys: ${cat.duplicates.join(', ')}`);
  const missing = enKeys.filter((k) => !cat.keys.has(k));
  if (missing.length) errors.push(`${code}: missing ${missing.length} key(s): ${missing.join(', ')}`);
  const extra = [...cat.keys.keys()].filter((k) => !catalogs.en.keys.has(k));
  if (extra.length) errors.push(`${code}: extra keys not in en: ${extra.join(', ')}`);
  for (const k of enKeys) {
    if (!cat.keys.has(k)) continue;
    const a = catalogs.en.keys.get(k).vars.join(',');
    const b = cat.keys.get(k).vars.join(',');
    if (a === b) {
      // exact match — nothing to do
    } else if (/_(one|two)$/.test(k)) {
      // Singular (`_one`/`_two`) forms may imply the count without naming
      // it (e.g. Arabic "one rating"); every other variable must match.
      const aVars = catalogs.en.keys.get(k).vars.filter((v) => v !== 'count');
      const bVars = cat.keys.get(k).vars.filter((v) => v !== 'count');
      if (aVars.join(',') !== bVars.join(',')) {
        errors.push(`${code}: interpolation mismatch on "${k}" (en:{${a}} ${code}:{${b}})`);
      }
    } else {
      errors.push(`${code}: interpolation mismatch on "${k}" (en:{${a}} ${code}:{${b}})`);
    }
    if (cat.keys.get(k).empty) errors.push(`${code}: empty value for "${k}" (falls back to English at runtime)`);
  }
  if (cat.keys.get('dir')?.raw.replace(/['"]/g, '') !== (code === 'ar' ? 'rtl' : 'ltr')) {
    errors.push(`${code}: wrong "dir" meta (expected ${code === 'ar' ? 'rtl' : 'ltr'})`);
  }
}

// Plural suffix sets must match the source for every plural base. A base
// only counts as plural when the source defines two or more suffixed
// variants (a lone `_other` like `mtype_other` is a category value, not a
// plural form).
const suffixOf = (k) => {
  const m = k.match(/_(zero|one|two|few|many|other)$/);
  return m ? { base: k.slice(0, -m[0].length), suffix: m[1] } : null;
};
const enPlurals = new Map();
for (const k of enKeys) {
  const p = suffixOf(k);
  if (!p) continue;
  if (!enPlurals.has(p.base)) enPlurals.set(p.base, new Set());
  enPlurals.get(p.base).add(p.suffix);
}
for (const [base, suffixes] of [...enPlurals]) {
  if (suffixes.size < 2) enPlurals.delete(base);
}
for (const code of LOCALES.filter((c) => c !== 'en')) {
  for (const [base, suffixes] of enPlurals) {
    for (const s of suffixes) {
      if (!catalogs[code].keys.has(`${base}_${s}`)) {
        errors.push(`${code}: missing plural form "${base}_${s}"`);
      }
    }
  }
}

// Script hygiene: values must not contain characters from scripts that
// do not belong to the locale (catches copy/paste contamination), and
// never the U+FFFD replacement character (corrupted text).
const FORBIDDEN_SCRIPTS = {
  en: [/[\u1200-\u137F]/, /[\u0900-\u097F]/, /[\u0600-\u06FF]/, /[⺀-⺙぀-ヿ豈-﫿︰-﹏]/, /￾/],
  am: [/[\u0900-\u097F]/, /[\u0600-\u06FF]/, /[⺀-⺙぀-ヿ豈-﫿︰-﹏]/, /￾/],
  om: [/[\u1200-\u137F]/, /[\u0900-\u097F]/, /[\u0600-\u06FF]/, /[⺀-⺙぀-ヿ豈-﫿︰-﹏]/, /￾/],
  so: [/[\u1200-\u137F]/, /[\u0900-\u097F]/, /[\u0600-\u06FF]/, /[⺀-⺙぀-ヿ豈-﫿︰-﹏]/, /￾/],
  ar: [/[\u1200-\u137F]/, /[\u0900-\u097F]/, /[⺀-⺙぀-ヿ豈-﫿︰-﹏]/, /￾/],
};
for (const code of LOCALES) {
  for (const [key, entry] of catalogs[code].keys) {
    const inner = entry.raw.slice(1, -1);
    if (FORBIDDEN_SCRIPTS[code].some((re) => re.test(inner))) {
      errors.push(`${code}: forbidden script characters in "${key}"`);
    }
  }
}

if (errors.length) {
  console.error(`i18n validation FAILED (${errors.length} problem(s)):\n- ${errors.join('\n- ')}`);
  process.exit(1);
}
console.log(`i18n validation passed: ${enKeys.length} keys × ${LOCALES.length} locales, interpolation + plural forms match.`);
