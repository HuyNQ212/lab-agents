#!/usr/bin/env node
/**
 * shots.mjs — chụp ảnh mọi trang prototype ở desktop + mobile, tất định.
 *
 *   node .agents/scripts/shots.mjs                     # tự dựng server, chụp hết theo manifest
 *   node .agents/scripts/shots.mjs --only planning     # chỉ chụp một trang (tên trong manifest)
 *   node .agents/scripts/shots.mjs --width 390         # chỉ một width (nhãn trong manifest: 1280 | 390)
 *
 * Vì sao cần script này thay vì agent tự bấm Playwright MCP:
 *   - tất định, một lệnh, chạy lại cho ra đúng bộ ảnh cũ
 *   - không tốn token, không phụ thuộc agent nhớ bấm đúng
 *   - mọi trạng thái (empty / archived / create / popover) đều có ảnh, không bỏ sót
 *
 * Báo FAIL (exit 1) khi: server ở cổng không phục vụ lab-prototype/, trang trả khác 200,
 * cờ không khớp manifest, hoặc không chụp được ảnh nào. Không bao giờ in OK với 0 ảnh.
 * Server do script dựng luôn được tắt, kể cả khi lỗi giữa chừng.
 *
 * Nguồn quyết định: lab-docs/architecture/frontend.md §6 (Playwright-as-code, không dùng MCP
 * để điều hướng), §4 (prototype không build pipeline — script này nằm ở .agents, KHÔNG ở
 * lab-prototype, để repo prototype vẫn không có toolchain).
 *
 * Không dependency npm: dùng Playwright CLI qua `npx playwright@<PLAYWRIGHT>` (ghim phiên bản)
 * và `python -m http.server`. Manifest: lab-prototype/shots.json.
 * Ảnh ra: lab-prototype/.artifacts/shots/<trang>[-<state>]-<width>.png.
 */

import { spawn } from 'node:child_process';
import { readFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const PLAYWRIGHT = '1.64.1'; // ghim: bản mới có thể đòi bản chromium chưa cài

const HERE = dirname(fileURLToPath(import.meta.url));
const WORKSPACE = resolve(HERE, '..', '..');
const MANIFEST = join(WORKSPACE, 'lab-prototype', 'shots.json');
const OUT_DIR = join(WORKSPACE, 'lab-prototype', '.artifacts', 'shots');

class ShotsError extends Error {}
const fail = (msg) => { throw new ShotsError(msg); };

const argv = process.argv.slice(2);
function flag(name) {
  const i = argv.indexOf('--' + name);
  if (i === -1) return null;
  const v = argv[i + 1];
  if (!v || v.startsWith('--')) fail('--' + name + ' cần giá trị');
  return v;
}

let server = null;
const stopServer = () => { if (server && !server.killed) server.kill(); };
process.on('exit', stopServer);

async function status(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(1500) });
    await res.arrayBuffer(); // đọc hết body; bỏ dở thì undici có thể crash khi server đóng socket
    return res.status;
  } catch {
    return 0;
  }
}

/* ---------- 1. server tĩnh, tự dựng và tự dọn ---------- */
/** Server đúng gốc khi phục vụ được shots.json (file nằm ở gốc lab-prototype/). */
const isOurs = async (base) => (await status(base + '/shots.json')) === 200;

function startServer(root, port) {
  const python = process.platform === 'win32' ? 'python' : 'python3';
  const child = spawn(python, ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], {
    cwd: root,
    stdio: 'ignore',
    windowsHide: true,
  });
  child.on('error', () => {
    console.error('\n  shots FAIL — không chạy được `' + python + ' -m http.server`. Cần Python trong PATH.\n');
    process.exit(1);
  });
  return child;
}

/* ---------- 2. chụp từng ảnh ---------- */
function shoot(url, size, file) {
  return new Promise((res, rej) => {
    const args = [
      '--yes', 'playwright@' + PLAYWRIGHT, 'screenshot',
      '--viewport-size=' + size,
      '--full-page',
      '--wait-for-timeout=600',
      url, file,
    ];
    // Một chuỗi lệnh đã quote (npx trên Windows là .cmd nên cần shell); đối số do script tự dựng.
    // Không quote chính "npx": cmd.exe quote tên lệnh làm npx.cmd tìm sai thư mục của nó.
    const cmd = 'npx ' + args.map((a) => '"' + a + '"').join(' ');
    const p = spawn(cmd, { stdio: ['ignore', 'pipe', 'pipe'], shell: true, windowsHide: true });
    let err = '';
    p.stderr.on('data', (d) => { err += d; });
    p.on('error', rej);
    p.on('close', (code) => (code === 0 ? res() : rej(new Error(err.trim() || 'exit ' + code))));
  });
}

/* ---------- 3. main ---------- */
async function main() {
  const only = flag('only');
  const onlyWidth = flag('width');

  if (!existsSync(MANIFEST)) fail('không thấy manifest: ' + MANIFEST);
  const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));
  const root = join(WORKSPACE, manifest.server.root);
  const port = manifest.server.port;
  const base = `http://127.0.0.1:${port}`;

  const pages = manifest.pages.filter((p) => !only || p.name === only);
  if (pages.length === 0) {
    fail('--only ' + only + ' không khớp trang nào trong manifest (có: ' + manifest.pages.map((p) => p.name).join(', ') + ')');
  }
  const widths = manifest.viewports.filter((v) => !onlyWidth || v.label === onlyWidth);
  if (widths.length === 0) {
    fail('--width ' + onlyWidth + ' không khớp nhãn nào trong manifest (có: ' + manifest.viewports.map((v) => v.label).join(', ') + ')');
  }

  if ((await status(base + '/')) !== 0) {
    if (!(await isOurs(base))) {
      fail('cổng ' + port + ' đã có server khác không phục vụ lab-prototype/ — tắt nó, hoặc chạy server trong thư mục lab-prototype/');
    }
  } else {
    console.log('  dựng server tĩnh: python -m http.server ' + port + ' (root: ' + manifest.server.root + ')');
    server = startServer(root, port);
    for (let i = 0; i < 40 && !(await isOurs(base)); i++) await new Promise((r) => setTimeout(r, 250));
    if (!(await isOurs(base))) fail('server không lên được ở ' + base);
  }

  mkdirSync(OUT_DIR, { recursive: true });

  let shots = 0;
  for (const page of pages) {
    const code = await status(base + '/' + page.path);
    if (code !== 200) fail('trang ' + page.path + ' trả HTTP ' + (code || 'lỗi kết nối') + ' — sai đường dẫn trong manifest?');
    for (const state of page.states) {
      const qs = state ? '?state=' + encodeURIComponent(state) : '';
      for (const w of widths) {
        const suffix = state ? '-' + state : '';
        const file = join(OUT_DIR, `${page.name}${suffix}-${w.label}.png`);
        try {
          await shoot(base + '/' + page.path + qs, w.size, file);
        } catch (e) {
          fail('chụp ' + page.name + suffix + ' @ ' + w.label + ': ' + e.message +
            '\n  Thiếu trình duyệt thì cài một lần: npx --yes playwright@' + PLAYWRIGHT + ' install chromium');
        }
        shots++;
        console.log('  ✓ ' + page.name + suffix + '-' + w.label);
      }
    }
  }

  if (shots === 0) fail('không chụp được ảnh nào');
  console.log('\n  shots OK — ' + shots + ' ảnh → lab-prototype/.artifacts/shots/\n');
}

try {
  await main();
} catch (e) {
  console.error('\n  shots FAIL — ' + (e instanceof ShotsError ? e.message : e.stack || e) + '\n');
  process.exitCode = 1;
} finally {
  stopServer();
}
