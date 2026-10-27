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
 * Bảy luật (mỗi luật ứng với một lỗi đã thực sự xảy ra trong repo này):
 *   L1 Cấm emoji trong nội dung UI            — 🔔 từng được dùng làm nút thông báo
 *   L2 Cấm gradient                           — slop đặc trưng của dashboard AI
 *   L3 Màu chỉ khai trong shared/             — 5 badge pastel từng phá Quiet Evergreen
 *   L4 Cấm request/asset ngoài                — prototype phải chạy offline
 *   L5 Link nội bộ phải resolve được          — đổi tên file làm chết nav
 *   L6 [hidden] phải thắng display            — pane ẩn bị `display:grid` đè
 *   L7 Trang có shell phải đúng hợp đồng       — shell.js dựng sidebar/topbar theo id cố định
 *
 * Nguồn quyết định: lab-docs/architecture/frontend.md §2, §4, §6;
 *                   .agents/skills/prototype/references/checklist.md
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { resolve, join, dirname, relative, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const WORKSPACE = resolve(HERE, '..', '..');
const PROTOTYPE = join(WORKSPACE, 'lab-prototype');
const SHARED = join(PROTOTYPE, 'shared');
const TOKENS = join(SHARED, 'tokens.css');

const argv = process.argv.slice(2);
const pageFlag = (() => {
  const i = argv.indexOf('--page');
  return i === -1 ? null : argv[i + 1];
})();

const findings = [];
const add = (file, rule, line, msg) => findings.push({ file, rule, line, msg });

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

const files = pageFlag
  ? [resolve(PROTOTYPE, pageFlag)]
  : walk(PROTOTYPE);

/* ---------- tách <style> và <script> khỏi nội dung hiển thị ---------- */
const styleBlocks = (src) => [...src.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]);
const scriptBlocks = (src) => [...src.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]);
const visibleText = (src) =>
  src
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]+>/g, ' ');

const lineOf = (src, index) => src.slice(0, index).split('\n').length;

/* ---------- L1: emoji trong UI ---------- */
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{1F000}-\u{1F02F}]/gu;
for (const f of files.filter((p) => p.endsWith('.html'))) {
  const src = readFileSync(f, 'utf8');
  const text = visibleText(src);
  for (const m of text.matchAll(EMOJI)) {
    add(f, 'L1', null, `emoji "${m[0]}" trong nội dung UI — dùng SVG inline như shared/shell.js`);
  }
}

/* ---------- L2 + L3 + L4 + L6: HTML ---------- */
for (const f of files.filter((p) => p.endsWith('.html'))) {
  const src = readFileSync(f, 'utf8');
  const usesShell = /shared\/shell\.js/.test(src);

  for (const block of styleBlocks(src)) {
    const offset = src.indexOf(block);

    if (/gradient\s*\(/i.test(block)) {
      add(f, 'L2', lineOf(src, offset), 'dùng gradient — Quiet Evergreen không có gradient');
    }

    const hexes = [...block.matchAll(/#[0-9a-fA-F]{3,8}\b/g)];
    for (const h of hexes) {
      add(f, 'L3', lineOf(src, offset), `màu "${h[0]}" khai trong trang — token phải nằm ở shared/tokens.css`);
    }

    if (/\[hidden\][^{]*\{[^}]*display\s*:(?!\s*none)/.test(block) && !/\[hidden\][^{]*\{[^}]*!important/.test(block)) {
      add(f, 'L6', lineOf(src, offset), 'rule [hidden] đặt display khác none mà thiếu !important — pane sẽ không ẩn được');
    }
  }

  // L4: tài nguyên ngoài
  for (const m of src.matchAll(/\b(?:src|href)\s*=\s*["'](https?:\/\/[^"']+)["']/gi)) {
    add(f, 'L4', lineOf(src, m.index), `tài nguyên ngoài "${m[1]}" — prototype phải chạy offline`);
  }
  // link trong CSS cũng phải local
  for (const block of styleBlocks(src)) {
    for (const m of block.matchAll(/url\(\s*["']?(https?:\/\/[^)"']+)/gi)) {
      add(f, 'L4', null, `url() ngoài "${m[1]}" trong CSS`);
    }
  }

  // L5: link nội bộ resolve được
  for (const m of src.matchAll(/href\s*=\s*["']([^"'#?]+\.(?:html|css|js))["']/gi)) {
    const target = resolve(dirname(f), m[1]);
    if (!existsSync(target)) {
      add(f, 'L5', lineOf(src, m.index), `link nội bộ "${m[1]}" không tồn tại`);
    }
  }
  for (const m of src.matchAll(/<script[^>]+src\s*=\s*["']([^"']+)["']/gi)) {
    const target = resolve(dirname(f), m[1]);
    if (!existsSync(target)) {
      add(f, 'L5', lineOf(src, m.index), `script "${m[1]}" không tồn tại`);
    }
  }

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

  // L1 lần hai: emoji trong JS sinh ra UI (textContent / innerHTML / title)
  for (const block of scriptBlocks(src)) {
    const offset = src.indexOf(block);
    for (const m of block.matchAll(EMOJI)) {
      add(f, 'L1', lineOf(src, offset), `emoji "${m[0]}" trong JS sinh UI — dùng SVG`);
    }
  }
}

/* ---------- L2 + L3 áp cho CSS dùng chung ---------- */
for (const f of files.filter((p) => p.endsWith('.css'))) {
  const src = readFileSync(f, 'utf8');
  if (/gradient\s*\(/i.test(src)) {
    add(f, 'L2', null, 'dùng gradient');
  }
  if (f !== TOKENS) {
    // shell.css được phép có vài hex cho overlay/focus — nhưng phải khai báo ở đây, không rải trang.
    // Chỉ chặn khi file không phải shell.css/tokens.css.
    const isShell = f === join(SHARED, 'shell.css');
    if (!isShell) {
      for (const m of src.matchAll(/#[0-9a-fA-F]{3,8}\b/g)) {
        add(f, 'L3', lineOf(src, m.index), `màu "${m[0]}" khai ngoài tokens.css`);
      }
    }
  }
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

/* ---------- báo cáo ---------- */
const rel = (p) => {
  try { return relative(WORKSPACE, p).replace(/\\/g, '/'); } catch { return String(p); }
};

if (findings.length === 0) {
  console.log('\n  lint-prototype OK — ' + files.length + ' file, 0 vi phạm\n');
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
