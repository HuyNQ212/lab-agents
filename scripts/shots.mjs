#!/usr/bin/env node
/**
 * shots.mjs — chụp ảnh mọi trang prototype ở desktop + mobile, tất định.
 *
 *   node .agents/scripts/shots.mjs                 # tự dựng server, chụp hết theo manifest
 *   node .agents/scripts/shots.mjs --only planning # chỉ chụp một trang
 *   node .agents/scripts/shots.mjs --width desktop # chỉ một width
 *
 * Vì sao cần script này thay vì agent tự bấm Playwright MCP:
 *   - tất định, một lệnh, chạy lại cho ra đúng bộ ảnh cũ
 *   - không tốn token, không phụ thuộc agent nhớ bấm đúng
 *   - mọi trạng thái (empty / archived / create / popover) đều có ảnh, không bỏ sót
 *
 * Nguồn quyết định: lab-docs/architecture/frontend.md §6 (Playwright-as-code, không dùng MCP
 * để điều hướng), §4 (prototype không build pipeline — script này nằm ở .agents, KHÔNG ở
 * lab-prototype, để repo prototype vẫn không có toolchain).
 *
 * Không dependency: dùng Playwright CLI qua `npx playwright screenshot`.
 * Manifest: lab-prototype/shots.json. Ảnh ra: lab-prototype/.artifacts/shots/.
 */

import { spawn } from 'node:child_process';
import { readFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const WORKSPACE = resolve(HERE, '..', '..');
const MANIFEST = join(WORKSPACE, 'lab-prototype', 'shots.json');
const OUT_DIR = join(WORKSPACE, 'lab-prototype', '.artifacts', 'shots');

const argv = process.argv.slice(2);
const flag = (name) => {
  const i = argv.indexOf('--' + name);
  return i === -1 ? null : argv[i + 1] ?? true;
};
const only = flag('only');
const onlyWidth = flag('width');

function fail(msg) {
  console.error('\n  shots FAIL — ' + msg + '\n');
  process.exit(1);
}

if (!existsSync(MANIFEST)) fail('không thấy manifest: ' + MANIFEST);
const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));

const root = join(WORKSPACE, manifest.server.root);
const port = manifest.server.port;
const base = `http://127.0.0.1:${port}`;

/* ---------- 1. server tĩnh, tự dựng và tự dọn ---------- */
async function isUp() {
  try {
    const res = await fetch(base + '/', { signal: AbortSignal.timeout(800) });
    return res.ok || res.status === 404;
  } catch {
    return false;
  }
}

function startServer() {
  const child = spawn('python', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], {
    cwd: root,
    stdio: 'ignore',
    windowsHide: true,
  });
  child.on('error', () => fail('không chạy được `python -m http.server`. Cần Python trong PATH.'));
  return child;
}

/* ---------- 2. chụp từng ảnh ---------- */
function shoot(url, size, file) {
  return new Promise((res, rej) => {
    const args = [
      '--yes', 'playwright', 'screenshot',
      '--viewport-size=' + size,
      '--full-page',
      '--wait-for-timeout=600',
      url, file,
    ];
    const p = spawn('npx', args, { stdio: ['ignore', 'pipe', 'pipe'], shell: process.platform === 'win32', windowsHide: true });
    let err = '';
    p.stderr.on('data', (d) => { err += d; });
    p.on('error', rej);
    p.on('close', (code) => (code === 0 ? res() : rej(new Error(err.trim() || 'exit ' + code))));
  });
}

/* ---------- 3. main ---------- */
let server = null;
let shots = 0;

try {
  if (!(await isUp())) {
    console.log('  dựng server tĩnh: python -m http.server ' + port + ' (root: ' + manifest.server.root + ')');
    server = startServer();
    for (let i = 0; i < 40 && !(await isUp()); i++) await new Promise((r) => setTimeout(r, 250));
    if (!(await isUp())) fail('server không lên được ở ' + base);
  }

  mkdirSync(OUT_DIR, { recursive: true });

  const pages = manifest.pages.filter((p) => !only || p.name === only);
  if (pages.length === 0) fail('--only ' + only + ' không khớp trang nào trong manifest');

  const widths = manifest.viewports.filter((v) => !onlyWidth || v.label === onlyWidth);

  for (const page of pages) {
    for (const state of page.states) {
      const qs = state ? '?state=' + encodeURIComponent(state) : '';
      for (const w of widths) {
        const suffix = state ? '-' + state : '';
        const file = join(OUT_DIR, `${page.name}${suffix}-${w.label}.png`);
        try {
          await shoot(base + '/' + page.path + qs, w.size, file);
          shots++;
          console.log('  ✓ ' + page.name + suffix + '-' + w.label);
        } catch (e) {
          fail('chụp ' + page.name + suffix + ' @ ' + w.label + ': ' + e.message);
        }
      }
    }
  }

  console.log('\n  shots OK — ' + shots + ' ảnh → lab-prototype/.artifacts/shots/\n');
} finally {
  if (server) server.kill();
}
