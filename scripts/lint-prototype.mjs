#!/usr/bin/env node
/**
 * lint-prototype.mjs — kiểm tra tất định các luật prototype. CHẶN CỨNG.
 *
 *   node .agents/scripts/lint-prototype.mjs            # kiểm cả repo prototype
 *   node .agents/scripts/lint-prototype.mjs --page workspace/planning.html
 *
 * Vì sao chặn cứng: prototype KHÔNG có test, typecheck, Storybook. Với prototype,
 * lint + review bằng ảnh là toàn bộ hàng rào chất lượng (lab-docs/architecture/frontend.md §6).
 * Luật nào kiểm được bằng máy thì máy kiểm, không để agent tự khai.
 *
 * Phạm vi quét: mọi .html, .css, .js trong lab-prototype/ — gồm <style>, <script>,
 * thuộc tính style="..." và chuỗi CSS gán vào .style trong JS. Chú thích được bỏ qua.
 *
 * Chín luật (mỗi luật ứng với một lỗi đã thực sự xảy ra hoặc một lỗ đã được chứng minh):
 *   L1 Cấm emoji trong nội dung UI            — 🔔 từng được dùng làm nút thông báo
 *   L2 Cấm gradient                           — slop đặc trưng của dashboard AI
 *   L3 Màu chỉ khai trong shared/tokens.css   — 5 badge pastel từng phá Quiet Evergreen;
 *                                               bắt hex, rgb()/hsl()/…, và tên màu CSS
 *   L4 Cấm request/asset ngoài                — prototype phải chạy offline (kể cả //cdn…)
 *   L5 Link nội bộ resolve được, đúng hoa/thường — đổi tên file làm chết nav; Windows không
 *                                               phân biệt hoa thường nhưng host thì có
 *   L6 [hidden] phải thắng display            — pane ẩn bị `display:grid` đè
 *   L7 Trang có shell phải đúng hợp đồng       — shell.js dựng sidebar/topbar theo id cố định
 *   L8 Trang phải có trong shots.json và README — trang mới không có trong manifest thì
 *                                               shots.mjs bỏ qua im lặng, không ai review;
 *                                               dòng **Approval:** phải đúng dạng máy đọc
 *   L9 Mock không dùng ngày tuyệt đối          — ngày cứng thành quá khứ theo thời gian,
 *                                               trang đã duyệt tự vi phạm B6
 *
 * Cảnh báo (không chặn): prototype duyệt theo brief-version cũ hơn brief hiện tại.
 *
 * Nguồn quyết định: lab-docs/architecture/frontend.md §2, §4, §6;
 *                   .agents/skills/prototype/references/checklist.md
 * Không dependency.
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { resolve, join, dirname, relative, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const WORKSPACE = resolve(HERE, '..', '..');
const PROTOTYPE = join(WORKSPACE, 'lab-prototype');
const SHARED = join(PROTOTYPE, 'shared');
const TOKENS = join(SHARED, 'tokens.css');
const MANIFEST = join(PROTOTYPE, 'shots.json');
const README = join(PROTOTYPE, 'README.md');
const LAB_DOCS = join(WORKSPACE, 'lab-docs');

/*
 * Hex được phép trong shared/shell.css. Rỗng nghĩa là shell.css cũng chỉ dùng var(--…).
 * Muốn thêm một hex ở đây thì phải có lý do không khai được thành token (hiện không có).
 */
const SHELL_HEX_ALLOW = [];

const argv = process.argv.slice(2);
const pageFlag = (() => {
  const i = argv.indexOf('--page');
  if (i === -1) return null;
  const v = argv[i + 1];
  if (!v || v.startsWith('--')) {
    console.error('lint-prototype: --page cần đường dẫn, ví dụ --page workspace/planning.html');
    process.exit(1);
  }
  return v;
})();

const findings = [];
const warnings = [];
const add = (file, rule, line, msg) => findings.push({ file, rule, line, msg });
const warn = (file, line, msg) => warnings.push({ file, line, msg });

/* ---------- quét file ---------- */
function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    if (name === '.artifacts' || name === '.git' || name === 'node_modules') continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, acc);
    else if (['.html', '.css', '.js'].includes(extname(name))) acc.push(p);
  }
  return acc;
}

if (!existsSync(PROTOTYPE)) {
  console.error('lint-prototype: không thấy thư mục lab-prototype/');
  process.exit(1);
}

const files = pageFlag ? [resolve(PROTOTYPE, pageFlag)] : walk(PROTOTYPE);
for (const f of files) {
  if (!existsSync(f)) {
    console.error('lint-prototype: không thấy file ' + f);
    process.exit(1);
  }
}

/* ---------- tiện ích ---------- */
const lineOf = (src, index) => src.slice(0, index).split('\n').length;
const blank = (s) => s.replace(/[^\n]/g, ' '); // giữ nguyên offset và số dòng

const stripCssComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, blank);
const stripHtmlComments = (s) => s.replace(/<!--[\s\S]*?-->/g, blank);
// Chú thích JS: /* … */ và // tới cuối dòng (không đụng "//" trong "http://", "'//'").
const stripJsComments = (s) =>
  s
    .replace(/\/\*[\s\S]*?\*\//g, blank)
    .replace(/(^|[^:"'`\\])\/\/[^\n]*/g, (m, pre) => pre + blank(m.slice(pre.length)));

/** Thay nội dung <style>/<script> bằng khoảng trắng để còn lại phần hiển thị. */
const blankBlocks = (src, tag) =>
  src.replace(new RegExp(`(<${tag}[^>]*>)([\\s\\S]*?)(</${tag}>)`, 'gi'), (m, a, body, z) => a + blank(body) + z);

/** Các khối <tag>…</tag> kèm offset tuyệt đối của phần thân. */
function blocks(src, tag) {
  const out = [];
  for (const m of src.matchAll(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'gi'))) {
    out.push({ body: m[1], offset: m.index + m[0].indexOf('>') + 1 });
  }
  return out;
}

/* ---------- màu ---------- */
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{1F000}-\u{1F02F}]/gu;
const HEX = /#[0-9a-fA-F]{3,8}\b/g;
const COLOR_FN = /\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\s*\(/gi;
const GRADIENT = /gradient\s*\(/i;
const COLOR_PROP =
  /^(?:color|background(?:-color|-image)?|border(?:-(?:top|right|bottom|left|block|inline)(?:-(?:start|end))?)?(?:-color)?|outline(?:-color)?|fill|stroke|box-shadow|text-shadow|text-decoration(?:-color)?|caret-color|accent-color|column-rule(?:-color)?|scrollbar-color|stop-color|flood-color|lighting-color)$/i;
const NAMED_COLORS = new Set(
  ('aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue blueviolet brown ' +
    'burlywood cadetblue chartreuse chocolate coral cornflowerblue cornsilk crimson cyan darkblue darkcyan ' +
    'darkgoldenrod darkgray darkgreen darkgrey darkkhaki darkmagenta darkolivegreen darkorange darkorchid ' +
    'darkred darksalmon darkseagreen darkslateblue darkslategray darkslategrey darkturquoise darkviolet ' +
    'deeppink deepskyblue dimgray dimgrey dodgerblue firebrick floralwhite forestgreen fuchsia gainsboro ' +
    'ghostwhite gold goldenrod gray green greenyellow grey honeydew hotpink indianred indigo ivory khaki ' +
    'lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan lightgoldenrodyellow ' +
    'lightgray lightgreen lightgrey lightpink lightsalmon lightseagreen lightskyblue lightslategray ' +
    'lightslategrey lightsteelblue lightyellow lime limegreen linen magenta maroon mediumaquamarine ' +
    'mediumblue mediumorchid mediumpurple mediumseagreen mediumslateblue mediumspringgreen ' +
    'mediumturquoise mediumvioletred midnightblue mintcream mistyrose moccasin navajowhite navy oldlace ' +
    'olive olivedrab orange orangered orchid palegoldenrod palegreen paleturquoise palevioletred ' +
    'papayawhip peachpuff peru pink plum powderblue purple rebeccapurple red rosybrown royalblue ' +
    'saddlebrown salmon sandybrown seagreen seashell sienna silver skyblue slateblue slategray slategrey ' +
    'snow springgreen steelblue tan teal thistle tomato turquoise violet wheat white whitesmoke yellow ' +
    'yellowgreen')
    .split(' '),
);

/**
 * Kiểm một đoạn CSS (khối style, file .css, thuộc tính style="", chuỗi gán vào .style).
 * `base` là offset của đoạn trong file `src` để báo đúng dòng.
 */
function checkCss(f, src, css, base, { allowHex = false, hexAllow = [] } = {}) {
  const text = stripCssComments(css);
  if (GRADIENT.test(text)) {
    const i = text.search(GRADIENT);
    add(f, 'L2', lineOf(src, base + i), 'dùng gradient — Quiet Evergreen không có gradient');
  }
  for (const d of text.matchAll(/([a-zA-Z-]+)\s*:\s*([^;{}]+)/g)) {
    const prop = d[1];
    const value = d[2];
    const at = lineOf(src, base + d.index);
    if (!allowHex) {
      for (const h of value.matchAll(HEX)) {
        if (hexAllow.includes(h[0].toLowerCase())) continue;
        add(f, 'L3', at, `màu "${h[0]}" khai ngoài shared/tokens.css — dùng var(--…)`);
      }
      for (const c of value.matchAll(COLOR_FN)) {
        add(f, 'L3', at, `màu "${c[0].replace(/\s+/g, '')}…)" khai ngoài shared/tokens.css — dùng var(--…)`);
      }
    }
    if (COLOR_PROP.test(prop)) {
      const words = value
        .replace(/var\([^)]*\)/gi, ' ')
        .replace(/url\([^)]*\)/gi, ' ')
        .match(/(?<![-\w])[a-zA-Z]+(?![-\w])/g) || [];
      for (const w of words) {
        if (NAMED_COLORS.has(w.toLowerCase())) {
          add(f, 'L3', at, `tên màu "${w}" ở ${prop} — dùng var(--…) từ shared/tokens.css`);
        }
      }
    }
  }
}

/** style="…" trong HTML hoặc trong chuỗi template của JS. */
function checkInlineStyles(f, src) {
  for (const m of src.matchAll(/\bstyle\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)) {
    const css = m[1] ?? m[2];
    checkCss(f, src, css, m.index + m[0].indexOf(css));
  }
}

/** el.style.x = '…', el.style.setProperty('x', '…'), el.style.cssText = '…' trong JS. */
function checkJsStyle(f, src, js, base) {
  for (const m of js.matchAll(/\.style\.([a-zA-Z]+)\s*=\s*(["'`])([^"'`]*)\2/g)) {
    if (m[1] === 'cssText') {
      checkCss(f, src, m[3], base + m.index);
      continue;
    }
    const prop = m[1].replace(/[A-Z]/g, (c) => '-' + c.toLowerCase());
    checkCss(f, src, `${prop}: ${m[3]}`, base + m.index);
  }
  for (const m of js.matchAll(/\.style\.setProperty\(\s*(["'])([^"']+)\1\s*,\s*(["'`])([^"'`]*)\3/g)) {
    checkCss(f, src, `${m[2]}: ${m[4]}`, base + m.index);
  }
}

/* ---------- L4 + L5: tài nguyên ---------- */
const EXTERNAL = /\b(?:src|href)\s*=\s*["']((?:https?:)?\/\/[^"']+)["']/gi;
const CSS_EXTERNAL = /(?:url\(\s*["']?|@import\s+["'])((?:https?:)?\/\/[^)"']+)/gi;

/** existsSync không phân biệt hoa thường trên Windows; so từng đoạn đường dẫn. */
function existsExact(target) {
  if (!existsSync(target)) return false;
  const rel = relative(WORKSPACE, target);
  if (rel.startsWith('..')) return true;
  let dir = WORKSPACE;
  for (const seg of rel.split(sep)) {
    if (!readdirSync(dir).includes(seg)) return false;
    dir = join(dir, seg);
  }
  return true;
}

function checkResources(f, src) {
  for (const m of src.matchAll(EXTERNAL)) {
    add(f, 'L4', lineOf(src, m.index), `tài nguyên ngoài "${m[1]}" — prototype phải chạy offline`);
  }
  for (const m of src.matchAll(CSS_EXTERNAL)) {
    add(f, 'L4', lineOf(src, m.index), `tài nguyên ngoài "${m[1]}" trong CSS — prototype phải chạy offline`);
  }
  if (!f.endsWith('.html')) return;
  const LOCAL = /\b(?:href|src)\s*=\s*["']([^"'#?:]+\.(?:html|css|js|png|jpe?g|svg|webp|gif|ico|woff2?))(?:[?#][^"']*)?["']/gi;
  for (const m of src.matchAll(LOCAL)) {
    if (m[1].includes('${') || m[1].startsWith('//')) continue; // dựng động trong template JS, hoặc ngoài (L4)
    if (!existsExact(resolve(dirname(f), m[1]))) {
      add(f, 'L5', lineOf(src, m.index), `link nội bộ "${m[1]}" không tồn tại (so đúng hoa/thường)`);
    }
  }
}

/* ---------- L9: mock ngày tuyệt đối ---------- */
function checkMockDates(f, src, js, base) {
  for (const m of js.matchAll(/new\s+Date\(\s*(?:\d{4}\s*,|["'`]\d{4}-)/g)) {
    add(f, 'L9', lineOf(src, base + m.index),
      'mock dùng ngày tuyệt đối — tính tương đối từ today (ví dụ at(-30)) để trang không tự thành quá khứ');
  }
}

/* ---------- HTML ---------- */
for (const f of files.filter((p) => p.endsWith('.html'))) {
  const raw = readFileSync(f, 'utf8');
  const src = stripHtmlComments(raw);
  const usesShell = /shared\/shell\.js/.test(src);

  // L1: phần hiển thị (ngoài style/script/tag)
  const visible = blankBlocks(blankBlocks(src, 'style'), 'script').replace(/<[^>]+>/g, blank);
  for (const m of visible.matchAll(EMOJI)) {
    add(f, 'L1', lineOf(src, m.index), `emoji "${m[0]}" trong nội dung UI — dùng SVG inline như shared/shell.js`);
  }

  for (const b of blocks(src, 'style')) {
    checkCss(f, src, b.body, b.offset);
    const text = stripCssComments(b.body);
    if (/\[hidden\][^{]*\{[^}]*display\s*:(?!\s*none)/.test(text) && !/\[hidden\][^{]*\{[^}]*!important/.test(text)) {
      add(f, 'L6', lineOf(src, b.offset), 'rule [hidden] đặt display khác none mà thiếu !important — pane sẽ không ẩn được');
    }
  }

  for (const b of blocks(src, 'script')) {
    const js = stripJsComments(b.body);
    for (const m of js.matchAll(EMOJI)) {
      add(f, 'L1', lineOf(src, b.offset + m.index), `emoji "${m[0]}" trong JS sinh UI — dùng SVG`);
    }
    checkJsStyle(f, src, js, b.offset);
    checkMockDates(f, src, js, b.offset);
  }

  checkInlineStyles(f, src);
  checkResources(f, src);

  // L7: hợp đồng shell
  if (usesShell) {
    if (!/<main\s+class\s*=\s*["']main["']/.test(src)) {
      add(f, 'L7', null, 'nạp shared/shell.js nhưng thiếu <main class="main"> — renderShell cần nó');
    }
    if (!/Workspace\.renderShell\s*\(/.test(src)) {
      add(f, 'L7', null, 'nạp shared/shell.js nhưng không gọi Workspace.renderShell({...})');
    }
    if (!/shared\/tokens\.css/.test(src)) {
      add(f, 'L7', null, 'thiếu <link> tới shared/tokens.css — trang sẽ không có token Quiet Evergreen');
    }
  }
}

/* ---------- JS dùng chung (shared/shell.js …) ---------- */
for (const f of files.filter((p) => p.endsWith('.js'))) {
  const raw = readFileSync(f, 'utf8');
  const js = stripJsComments(raw);
  for (const m of js.matchAll(EMOJI)) {
    add(f, 'L1', lineOf(raw, m.index), `emoji "${m[0]}" trong JS sinh UI — dùng SVG`);
  }
  checkJsStyle(f, raw, js, 0);
  checkInlineStyles(f, js);
  checkResources(f, js);
  checkMockDates(f, raw, js, 0);
}

/* ---------- CSS dùng chung ---------- */
for (const f of files.filter((p) => p.endsWith('.css'))) {
  const src = readFileSync(f, 'utf8');
  const isTokens = f === TOKENS;
  const isShell = f === join(SHARED, 'shell.css');
  checkCss(f, src, src, 0, { allowHex: isTokens, hexAllow: isShell ? SHELL_HEX_ALLOW : [] });
  for (const m of stripCssComments(src).matchAll(EMOJI)) {
    add(f, 'L1', lineOf(src, m.index), `emoji "${m[0]}" trong CSS — dùng SVG`);
  }
  checkResources(f, src);
}

/* ---------- L3 phụ: tokens.css phải là nơi khai palette ---------- */
if (existsSync(TOKENS)) {
  const tokens = readFileSync(TOKENS, 'utf8');
  for (const required of ['--primary', '--forest', '--background', '--surface', '--text', '--muted']) {
    if (!tokens.includes(required + ':')) {
      add(TOKENS, 'L3', null, `thiếu token "${required}" — palette Quiet Evergreen không đầy đủ`);
    }
  }
} else {
  add(PROTOTYPE, 'L3', null, 'không thấy shared/tokens.css — palette không có nguồn duy nhất');
}

/* ---------- L8: manifest + README + dòng Approval ---------- */
function briefVersions() {
  const map = new Map();
  for (const area of ['products', 'platform']) {
    const dir = join(LAB_DOCS, area);
    if (!existsSync(dir)) continue;
    for (const name of readdirSync(dir)) {
      const p = join(dir, name, 'product-brief.md');
      if (!existsSync(p)) continue;
      const fm = readFileSync(p, 'utf8').split(/^---$/m)[1] || '';
      const id = fm.match(/^id:\s*(\S+)/m)?.[1];
      const v = Number(fm.match(/^brief-version:\s*(\d+)/m)?.[1]);
      if (id) map.set(id, Number.isFinite(v) ? v : null);
    }
  }
  return map;
}

if (!pageFlag) {
  const pages = walk(join(PROTOTYPE, 'workspace')).filter((p) => p.endsWith('.html'));
  const relP = (p) => relative(PROTOTYPE, p).split(sep).join('/');

  let manifestPaths = [];
  if (!existsSync(MANIFEST)) {
    add(PROTOTYPE, 'L8', null, 'không thấy shots.json — trang không có ảnh review');
  } else {
    try {
      const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));
      manifestPaths = (manifest.pages || []).map((p) => p.path);
      for (const p of manifestPaths) {
        if (!existsExact(join(PROTOTYPE, p))) add(MANIFEST, 'L8', null, `trang "${p}" trong manifest không tồn tại`);
      }
    } catch (e) {
      add(MANIFEST, 'L8', null, 'shots.json không phải JSON hợp lệ: ' + e.message);
    }
  }

  const readme = existsSync(README) ? readFileSync(README, 'utf8') : '';
  if (!readme) add(PROTOTYPE, 'L8', null, 'không thấy README.md — trạng thái duyệt không có chỗ ghi');

  for (const p of pages) {
    const r = relP(p);
    if (!manifestPaths.includes(r)) {
      add(p, 'L8', null, `trang chưa có trong shots.json — shots.mjs sẽ bỏ qua, không ai review`);
    }
    if (readme && !readme.includes('`' + r + '`')) {
      add(p, 'L8', null, `trang chưa được liệt kê trong README.md (cột File)`);
    }
  }

  // Mỗi mục "## <PREFIX> — <tên>" có đúng một dòng Approval đúng dạng.
  const APPROVAL = /^\*\*Approval:\*\* (?:APPROVED (\d{4}-\d{2}-\d{2}) — brief ([A-Z][A-Z0-9]*)-BRIEF v(\d+)|PENDING)$/;
  const briefs = briefVersions();
  const sections = readme.split(/^(?=## )/m);
  for (const sec of sections) {
    const head = sec.match(/^## ([A-Z][A-Z0-9]*) — /);
    const lines = sec.split('\n').filter((l) => l.startsWith('**Approval:**'));
    const at = lineOf(readme, readme.indexOf(sec));
    if (!head) {
      if (lines.length) add(README, 'L8', at, 'dòng **Approval:** nằm ngoài mục "## <PREFIX> — <tên>"');
      continue;
    }
    const prefix = head[1];
    if (lines.length !== 1) {
      add(README, 'L8', at, `mục ${prefix} cần đúng một dòng **Approval:** (đang có ${lines.length})`);
      continue;
    }
    const m = lines[0].match(APPROVAL);
    if (!m) {
      add(README, 'L8', at, `mục ${prefix}: dòng Approval sai dạng — "**Approval:** APPROVED <yyyy-mm-dd> — brief ${prefix}-BRIEF v<n>" hoặc "**Approval:** PENDING"`);
      continue;
    }
    if (!m[1]) continue; // PENDING
    if (m[2] !== prefix) add(README, 'L8', at, `mục ${prefix} ghi duyệt theo brief ${m[2]}-BRIEF — phải là ${prefix}-BRIEF`);
    const id = prefix + '-BRIEF';
    if (!briefs.has(id)) {
      add(README, 'L8', at, `mục ${prefix}: không thấy ${id} trong lab-docs`);
    } else {
      const cur = briefs.get(id);
      const v = Number(m[3]);
      if (cur !== null && v > cur) add(README, 'L8', at, `mục ${prefix}: duyệt theo v${v} nhưng brief hiện là v${cur}`);
      else if (cur !== null && v < cur) {
        warn(README, at, `mục ${prefix}: prototype duyệt theo ${id} v${v}, brief hiện là v${cur} — đối chiếu lại các capability đổi từ v${v}`);
      }
    }
  }
}

/* ---------- báo cáo ---------- */
const rel = (p) => {
  try { return relative(WORKSPACE, p).replace(/\\/g, '/'); } catch { return String(p); }
};

for (const w of warnings) {
  console.log('  cảnh báo: ' + rel(w.file) + (w.line ? ':' + w.line : '') + ' — ' + w.msg);
}

if (findings.length === 0) {
  console.log('\n  lint-prototype OK — ' + files.length + ' file, 0 vi phạm' +
    (warnings.length ? ', ' + warnings.length + ' cảnh báo' : '') + '\n');
  process.exit(0);
}

const byRule = findings.reduce((acc, f) => {
  (acc[f.rule] ||= []).push(f);
  return acc;
}, {});

console.error('\n  lint-prototype FAIL — ' + findings.length + ' vi phạm\n');
for (const [rule, list] of Object.entries(byRule).sort()) {
  console.error('  ' + rule + ' (' + list.length + ')');
  for (const f of list) {
    console.error('    ' + rel(f.file) + (f.line ? ':' + f.line : '') + ' — ' + f.msg);
  }
  console.error('');
}
process.exit(1);
