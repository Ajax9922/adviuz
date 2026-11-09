// Adviuz Hub — build step for Cloudflare Pages.
//
// Copies the site into dist/ and (optionally) makes the browser code hard to read.
//   OBF=0  (default) plain copy — the site is served exactly as it is in the repo.
//   OBF=1  minify: strip comments/whitespace, shorten local variable names.
//   OBF=2  OBF=1 + light obfuscation (strings moved into a lookup table).
// Global names (functions called from onclick="..." or from HTML built in JS)
// are NEVER renamed. No source maps are written.
// If anything fails for one script, that script is kept as-is (logged), so a
// build can never ship broken JS because of this step.
//
// Cloudflare Pages: build command `npm install && node build.mjs`, output directory `dist`.
// The functions/ folder is compiled by Pages from the repo root, not from dist/.

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const DEFAULT_OBF = '1'; // obf-preview branch: minified by default
const OBF = Number(process.env.OBF ?? DEFAULT_OBF) || 0;

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(ROOT, 'dist');

// Never copied (build tooling / repo internals).
const SKIP_ALWAYS = new Set(['.git', '.github', 'node_modules', 'dist', 'build.mjs', 'package.json',
  'package-lock.json', '.gitignore', '.nvmrc', '.node-version', '.DS_Store']);
// Extra things left out of a minified build (notes, server code that Pages compiles from the root).
const SKIP_WHEN_OBF = (rel) =>
  rel === 'functions' || rel.startsWith('functions/') || /\.md$/i.test(rel) || /_backup\.js$/i.test(rel);
// Copied but never transformed (client ad pages written by the admin panel, email templates).
const NO_TRANSFORM = (rel) => /^(ads|ad|brand)\//.test(rel);

let terser, Obfuscator;
const stats = { files: 0, html: 0, js: 0, scripts: 0, kept: 0, inBytes: 0, outBytes: 0 };
const warn = (m) => console.warn('[build] WARN ' + m);

// ---------- JS transform ----------
const TERSER_OPTS = (isModule) => ({
  module: isModule,
  toplevel: false,          // top-level (global) names stay exactly as written
  compress: { passes: 1, toplevel: false, keep_fargs: true, drop_console: false, unsafe: false },
  mangle: { toplevel: false, safari10: true },
  format: { comments: false, inline_script: true, ascii_only: false },
  sourceMap: false,
});

const OBF_OPTS = (prefix) => ({
  compact: true,
  target: 'browser',
  renameGlobals: false,
  identifiersPrefix: prefix,           // keeps helper names unique across script blocks
  identifierNamesGenerator: 'mangled',
  controlFlowFlattening: false,
  deadCodeInjection: false,
  debugProtection: false,
  selfDefending: false,
  disableConsoleOutput: false,
  numbersToExpressions: false,
  splitStrings: false,
  transformObjectKeys: false,
  unicodeEscapeSequence: false,
  stringArray: true,
  stringArrayThreshold: 0.75,
  stringArrayEncoding: [],             // no base64/rc4 decoding cost at runtime
  stringArrayRotate: true,
  stringArrayShuffle: true,
  stringArrayIndexShift: true,
  stringArrayWrappersCount: 1,
  stringArrayWrappersType: 'variable',
  stringArrayCallsTransform: false,
  simplify: true,
  sourceMap: false,
  seed: 0,
});

let blockCounter = 0;
async function transformJs(code, label, isModule) {
  if (!code.trim()) return code;
  try {
    const r = await terser.minify(code, TERSER_OPTS(isModule));
    let out = r.code;
    if (out == null) throw new Error('terser returned no code');
    if (OBF >= 2) {
      const prefix = '_' + (blockCounter++).toString(36) + 'x';
      out = Obfuscator.obfuscate(out, OBF_OPTS(prefix)).getObfuscatedCode();
    }
    if (!isModule) new vm.Script(out, { filename: label }); // syntax check
    return out;
  } catch (e) {
    stats.kept++;
    warn(label + ' kept unminified: ' + String(e && e.message || e).slice(0, 200));
    return code;
  }
}

// ---------- HTML scanning (follows the browser's rules for <script>/<style>/comments) ----------
const JS_TYPES = new Set(['', 'text/javascript', 'application/javascript', 'module', 'text/ecmascript',
  'application/ecmascript', 'application/x-javascript']);

function readTag(html, i) { // returns index just after '>' of the tag starting at i
  let q = null;
  for (let j = i + 1; j < html.length; j++) {
    const c = html[j];
    if (q) { if (c === q) q = null; }
    else if (c === '"' || c === "'") q = c;
    else if (c === '>') return j + 1;
  }
  return -1;
}
const isDelim = (c) => c === undefined || /[\s/>]/.test(c);

// Script content ends at </script, honouring the <!-- <script escape states.
function scriptEnd(html, from) {
  let state = 0; // 0 data, 1 escaped, 2 double-escaped
  const low = html.toLowerCase();
  for (let j = from; j < html.length; j++) {
    if (html[j] === '<') {
      if (state !== 2 && html.startsWith('<!--', j)) { if (state === 0) { state = 1; j += 3; } continue; }
      if (low.startsWith('</script', j) && isDelim(html[j + 8])) {
        if (state === 2) { state = 1; j += 8; continue; }
        return j;
      }
      if (state === 1 && low.startsWith('<script', j) && isDelim(html[j + 7])) { state = 2; j += 7; continue; }
    } else if (state !== 0 && html.startsWith('-->', j)) { state = 0; j += 2; }
  }
  return -1;
}

async function transformHtml(html, rel) {
  const out = [];
  let i = 0, last = 0, n = 0;
  const low = html.toLowerCase();
  while (true) {
    const lt = html.indexOf('<', i);
    if (lt < 0) break;
    if (html.startsWith('<!--', lt)) {
      const end = html.indexOf('-->', lt + 4);
      if (end < 0) break;
      const body = html.slice(lt + 4, end);
      const keep = /^\s*\[if|<!\[endif\]|^\s*!/i.test(body); // conditional / bang comments
      if (!keep) { out.push(html.slice(last, lt)); last = end + 3; }
      i = end + 3; continue;
    }
    const m = /^<(script|style|textarea|title|xmp)(?=[\s/>])/i.exec(html.slice(lt, lt + 12));
    if (!m) { i = lt + 1; continue; }
    const tag = m[1].toLowerCase();
    const tagEnd = readTag(html, lt);
    if (tagEnd < 0) break;
    let close;
    if (tag === 'script') close = scriptEnd(html, tagEnd);
    else { const k = low.indexOf('</' + tag, tagEnd); close = k; }
    if (close < 0) break;
    if (tag === 'script') {
      const open = html.slice(lt, tagEnd);
      const hasSrc = /\ssrc\s*=/i.test(open);
      const tm = /\stype\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(open);
      const type = tm ? (tm[2] ?? tm[3] ?? tm[4] ?? '').trim().toLowerCase() : '';
      if (!hasSrc && JS_TYPES.has(type)) {
        const code = html.slice(tagEnd, close);
        let min = await transformJs(code, rel + ' <script #' + (++n) + '>', type === 'module');
        // The browser must still see this script end exactly where we put </script>.
        if (min !== code && scriptEnd(min + '</script>', 0) !== min.length) {
          // Try writing '<' as \x3c inside those sequences (same meaning in strings and regexes).
          const esc = min.replace(/<(!--|\/?script)/gi, '\\x3c$1');
          try {
            if (type !== 'module') new vm.Script(esc);
            if (scriptEnd(esc + '</script>', 0) === esc.length) min = esc;
          } catch (_) { /* fall through to keep */ }
        }
        if (min !== code && scriptEnd(min + '</script>', 0) !== min.length) {
          stats.kept++; warn(rel + ' script #' + n + ' kept: minified code would end the <script> early');
          min = code;
        }
        out.push(html.slice(last, tagEnd), min);
        last = close; stats.scripts++;
      }
    }
    i = close + 2;
  }
  out.push(html.slice(last));
  return out.join('');
}

// ---------- copy ----------
async function walk(dirRel) {
  const abs = path.join(ROOT, dirRel);
  for (const ent of fs.readdirSync(abs, { withFileTypes: true })) {
    const rel = dirRel ? dirRel + '/' + ent.name : ent.name;
    if (!dirRel && SKIP_ALWAYS.has(ent.name)) continue;
    if (ent.name === '.DS_Store' || ent.name === 'node_modules' || ent.name === '.git') continue;
    if (OBF && SKIP_WHEN_OBF(rel)) continue;
    if (ent.isDirectory()) { fs.mkdirSync(path.join(OUT, rel), { recursive: true }); await walk(rel); continue; }
    if (!ent.isFile()) continue;
    const src = path.join(ROOT, rel), dst = path.join(OUT, rel);
    stats.files++;
    const ext = path.extname(rel).toLowerCase();
    if (OBF && !NO_TRANSFORM(rel) && (ext === '.html' || ext === '.htm' || ext === '.js')) {
      const text = fs.readFileSync(src, 'utf8');
      const res = ext === '.js' ? await transformJs(text, rel, false) : await transformHtml(text, rel);
      if (ext === '.js') stats.js++; else stats.html++;
      stats.inBytes += Buffer.byteLength(text); stats.outBytes += Buffer.byteLength(res);
      fs.writeFileSync(dst, res);
    } else {
      fs.copyFileSync(src, dst);
    }
  }
}

const t0 = Date.now();
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
if (OBF) {
  terser = await import('terser');
  if (OBF >= 2) Obfuscator = (await import('javascript-obfuscator')).default;
}
await walk('');
const kb = (b) => (b / 1024).toFixed(0) + ' KB';
console.log(`[build] OBF=${OBF} — ${stats.files} files copied to dist/ in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
if (OBF) console.log(`[build] ${stats.html} html + ${stats.js} js transformed, ${stats.scripts} inline scripts, ${stats.kept} kept as-is; ${kb(stats.inBytes)} -> ${kb(stats.outBytes)}`);
