#!/usr/bin/env node
// lab.mjs — quản lý tiến độ docs Lab, Node thuần, không dependency.
// Chuẩn file: lab-docs/frameworks/documentation-standards.md §0.
// Chạy từ bất kỳ đâu: node <workspace>/.agents/scripts/lab.mjs <command> [args]
// Biến LAB_ROOT ghi đè workspace root (dùng cho test fixture).

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { execSync, execFileSync } from "node:child_process";
import { dirname, join, relative, sep, basename } from "node:path";
import { fileURLToPath } from "node:url";

// root workspace = hai cấp trên vị trí script (.agents/scripts/lab.mjs)
const ROOT = process.env.LAB_ROOT || join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const LAB_DOCS = join(ROOT, "lab-docs");
const SKILLS_DIR = join(ROOT, ".agents", "skills");
const RESERVED_PREFIXES = ["SETUP", "MAINT", "EXP"];
const STATUS_VALUES = ["open", "in-progress", "blocked", "done", "abandoned"];
const VERDICTS = ["PASS", "NEEDS-WORK", "BLOCK"];
// Bộ gate repo duy nhất — engineering-workflow.md §7 trỏ về đây. Thứ tự là thứ tự chạy.
const REPO_GATES = ["format:check", "lint", "typecheck", "test", "build"];

const TICKET_ID = /^[A-Z]+-[\w.]+-T\d+$/;
const TASK_RE = /^(\s*)-\s\[( |x|X)\]\s*`?((?:[A-Z]+-[\w.]+-)?T\d+)`?:?\s*(.*)$/;

// ---------- tiện ích ----------

const toPosix = (p) => p.split(sep).join("/");
const asList = (v) => (Array.isArray(v) ? v : v ? [v] : []);
const today = () => new Date().toISOString().slice(0, 10);
const ok = (msg) => ({ ok: true, msg });
const err = (msg) => ({ ok: false, msg });

function* walk(dir) {
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir)) {
    if (name === ".git" || name === "node_modules") continue;
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) yield* walk(p);
    else if (name.endsWith(".md")) yield p;
  }
}

function unquote(v) {
  const t = v.trim();
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) return t.slice(1, -1);
  return t;
}

function parseFrontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  const meta = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^(\w[\w-]*):\s*(.*)$/);
    if (!kv) continue;
    let [, k, v] = kv;
    v = v.replace(/\s+#.*$/, "").trim(); // bỏ chú thích cuối dòng
    if (v.startsWith("[") && v.endsWith("]")) {
      v = v.slice(1, -1).split(",").map(s => unquote(s)).filter(Boolean);
    } else v = unquote(v);
    meta[k] = v;
  }
  return { meta, end: m[0].length, raw: m[1] };
}

function setFrontmatterKey(text, key, value) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return text;
  const nl = text.includes("\r\n") ? "\r\n" : "\n";
  const lines = m[1].split(/\r?\n/);
  const i = lines.findIndex(l => new RegExp(`^${key}:`).test(l));
  if (i >= 0) lines[i] = `${key}: ${value}`;
  else lines.push(`${key}: ${value}`);
  return `---${nl}${lines.join(nl)}${nl}---` + text.slice(m[0].length);
}

function parseTasks(text) {
  const tasks = [];
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(TASK_RE);
    if (m) tasks.push({ indent: m[1].length, done: m[2].toLowerCase() === "x", id: m[3], label: m[4], line: i });
  }
  return tasks;
}

// Thư mục product/capability chứa file: cha của stories/ hoặc specs/, hoặc chính thư mục chứa design-*.md
function productDirOf(absPath) {
  const parts = toPosix(relative(LAB_DOCS, absPath)).split("/");
  const i = parts.findIndex(p => p === "stories" || p === "specs");
  if (i > 0) return parts.slice(0, i).join("/");
  return parts.slice(0, -1).join("/");
}

// ---------- nạp dữ liệu ----------

function loadAll() {
  const files = [];
  for (const f of walk(LAB_DOCS)) {
    const text = readFileSync(f, "utf8").replace(/^﻿/, "");
    const fm = parseFrontmatter(text);
    if (!fm || !fm.meta.id) continue;
    files.push({
      path: f,
      show: toPosix(relative(ROOT, f)),
      rel: toPosix(relative(LAB_DOCS, f)),
      product: productDirOf(f),
      meta: fm.meta,
      text,
      tasks: parseTasks(text),
    });
  }
  return files;
}

// Dòng `**Status:** X` hoặc `Status: X` hoặc frontmatter `status: X`
function docStatus(text) {
  const fm = parseFrontmatter(text);
  if (fm && fm.meta.status) return String(fm.meta.status).toUpperCase();
  const m = text.match(/^\W*Status:?\W*\s*([A-Za-z-]+)/mi);
  return m ? m[1].toUpperCase() : "";
}

function loadSpecs() {
  const specs = [];
  for (const f of walk(LAB_DOCS)) {
    const name = basename(f);
    if (!/^spec-(backend|frontend)\.md$/.test(name)) continue;
    const text = readFileSync(f, "utf8");
    const parts = toPosix(relative(LAB_DOCS, f)).split("/");
    const si = parts.lastIndexOf("specs");
    if (si < 0) continue;
    const storiesLine = text.match(/^\*{0,2}Stories:\*{0,2}\s*(.+)$/m);
    const stories = storiesLine ? [...storiesLine[1].matchAll(/[A-Z]+-[\d.]+/g)].map(x => x[0]) : [];
    specs.push({
      path: f,
      show: toPosix(relative(ROOT, f)),
      side: name.includes("backend") ? "backend" : "frontend",
      specId: parts[si + 1],
      dir: parts.slice(0, si + 2).join("/"),
      product: parts.slice(0, si).join("/"),
      status: docStatus(text),
      stories,
      tickets: parseTicketTable(text),
    });
  }
  return specs;
}

// Bảng `## <n>. Tickets`: | ID | Outcome | Repos | Blocked by |
function parseTicketTable(text) {
  const h = text.match(/^##\s+(?:\d+\.\s*)?Tickets\s*$/mi);
  if (!h) return [];
  const rest = text.slice(h.index + h[0].length);
  const end = rest.search(/^## /m);
  const body = end === -1 ? rest : rest.slice(0, end);
  const out = [];
  for (const line of body.split(/\r?\n/)) {
    const cells = line.split("|").slice(1, -1).map(c => c.trim());
    if (cells.length < 2) continue;
    const id = cells[0].replace(/`/g, "");
    if (!TICKET_ID.test(id)) continue;
    const blockedRaw = cells[3] || "";
    out.push({
      id,
      outcome: cells[1],
      repos: cells[2] || "",
      blockedBy: [...blockedRaw.matchAll(/\b([A-Z]+-[\w.]+-T\d+|(?:SETUP|MAINT|EXP)-\d+)\b/g)].map(x => x[1]),
      blockedRaw,
    });
  }
  return out;
}

function loadSmallTickets(files) {
  return files.filter(f => f.meta.type === "ticket" && basename(f.path) === "ticket.md");
}

// progress.md của một spec: frontmatter type progress + ## Tasks theo ticket ID
function progressFiles(files) {
  return files.filter(f => f.meta.type === "progress");
}

function ticketDone(files, ticketId) {
  for (const p of progressFiles(files)) {
    const t = p.tasks.find(x => x.id === ticketId);
    if (t) return t.done;
  }
  const small = loadSmallTickets(files).find(f => f.meta.id === ticketId);
  if (small) return small.meta.status === "done";
  return null; // không theo dõi được
}

// ---------- phân giải ID → spec ----------

function storyOfTicket(ticketId) {
  return ticketId.replace(/-T\d+$/, "");
}

function resolveSpecs(id, files, specs) {
  if (!id) return [];
  const idU = id.toUpperCase();
  // 1. thư mục specs/<ID>/
  let hit = specs.filter(s => s.specId.toUpperCase() === idU);
  if (hit.length) return hit;
  // 2. ticket ID có trong bảng Tickets
  if (TICKET_ID.test(idU)) return specs.filter(s => s.tickets.some(t => t.id === idU));
  // 3. story: nằm trong dòng Stories, hoặc có ticket <story>-T*
  hit = specs.filter(s => s.stories.includes(idU) || s.tickets.some(t => storyOfTicket(t.id) === idU));
  if (hit.length) return hit;
  // 4. epic: spec chứa story con của epic
  const children = files.filter(f => f.meta.parent === idU).map(f => f.meta.id);
  return specs.filter(s => s.stories.some(x => children.includes(x)));
}

// Design Record trong cùng thư mục product
function designRecords(product) {
  const out = [];
  for (const side of ["backend", "frontend"]) {
    const p = join(LAB_DOCS, product, `design-${side}.md`);
    if (existsSync(p)) out.push({ side, path: p, status: docStatus(readFileSync(p, "utf8")) });
  }
  return out;
}

function reviewOf(spec, files) {
  return files.find(f => f.meta.type === "review" && f.rel === `${spec.dir}/review.md`);
}

// ---------- validate ----------

function validate(files, specs) {
  const errors = [];
  const seen = new Map();
  for (const f of files) {
    const { meta, tasks } = f;
    const put = (msg) => errors.push(`${f.show}: ${msg}`);
    if (seen.has(meta.id)) put(`ID trùng "${meta.id}" với ${seen.get(meta.id)}`);
    seen.set(meta.id, f.show);

    if (meta.type === "story" && !meta.brief) put("story thiếu khóa `brief:` — documentation-standards §0d");
    if (meta.type === "story" && !meta.covers) put("story thiếu khóa `covers:` — documentation-standards §0d");
    if (meta.type === "brief" && meta.id.endsWith("-BRIEF") && !meta["brief-version"]) put("brief thiếu khóa `brief-version:` — documentation-standards §0d");
    if (meta.type === "brief" && !/^## Capabilities\s*$/m.test(f.text)) put("brief thiếu section `## Capabilities`");

    if (!meta.type) put("thiếu type");
    if (meta.type === "epic") {
      if (meta.status) put("epic không có status — lifecycle của epic do story con quyết định");
    } else if (!STATUS_VALUES.includes(meta.status)) put(`status "${meta.status ?? ""}" không hợp lệ (${STATUS_VALUES.join("|")})`);
    if (meta.repos === undefined) put("thiếu repos (dùng [] nếu không chạm repo code)");
    if (meta.type === "ticket" && !RESERVED_PREFIXES.includes(meta.id.split("-")[0]) && !meta.parent)
      put("ticket không thuộc tiền tố SETUP/MAINT/EXP phải có parent");
    for (const k of ["id", "parent", "brief"]) {
      if (typeof meta[k] === "string" && /[\s#]/.test(meta[k])) put(`khóa ${k} chứa khoảng trắng hoặc chú thích: "${meta[k]}"`);
    }

    if (meta.type === "review") {
      const v = String(meta.verdict || "").toUpperCase();
      if (!VERDICTS.includes(v)) put(`review thiếu hoặc sai \`verdict:\` (${VERDICTS.join("|")}), đang là "${meta.verdict ?? ""}"`);
      const open = Number(meta["open-questions"] ?? 0);
      if (v === "PASS" && open > 0) put(`verdict PASS nhưng còn ${open} câu hỏi chờ user (open-questions)`);
    }

    const open = tasks.filter(t => !t.done);
    if (meta.status === "done" && open.length) put(`status=done nhưng còn ${open.length} task mở (${open.map(t => t.id).join(", ")})`);
    if (meta.status !== "done" && meta.status !== "abandoned" && !open.length && tasks.length) put(`mọi task đã tick nhưng status="${meta.status}" — chạy lab done ${meta.id}`);
    const ids = new Set();
    for (const t of tasks) {
      if (ids.has(t.id)) put(`task ID lặp "${t.id}"`);
      ids.add(t.id);
    }

    // story không có Tasks: status phải khớp ticket của nó
    if (meta.type === "story" && !tasks.length) {
      const st = storyTicketState(files, specs, meta.id);
      if (st.total && meta.status === "done" && st.done < st.total) put(`status=done nhưng mới ${st.done}/${st.total} ticket xong`);
    }
  }

  // ticket ID không được trùng giữa các spec
  const tseen = new Map();
  for (const s of specs) for (const t of s.tickets) {
    if (tseen.has(t.id) && tseen.get(t.id) !== s.dir) errors.push(`${s.show}: ticket ${t.id} trùng với ${tseen.get(t.id)}`);
    tseen.set(t.id, s.dir);
  }
  // progress.md phải khớp bảng Tickets
  for (const p of progressFiles(files)) {
    const spec = specs.filter(s => s.specId === p.meta.parent);
    if (!spec.length) { errors.push(`${p.show}: parent "${p.meta.parent}" không phải thư mục spec nào`); continue; }
    const want = new Set(spec.flatMap(s => s.tickets.map(t => t.id)));
    const have = new Set(p.tasks.map(t => t.id));
    const missing = [...want].filter(x => !have.has(x));
    if (missing.length) errors.push(`${p.show}: thiếu ticket ${missing.join(", ")} — chạy lab sync ${p.meta.parent}`);
  }

  errors.push(...validateSkills());
  return errors;
}

// Frontmatter SKILL.md: YAML phẳng, name khớp thư mục, có description
function validateSkills() {
  const errors = [];
  if (!existsSync(SKILLS_DIR)) return errors;
  for (const name of readdirSync(SKILLS_DIR)) {
    const p = join(SKILLS_DIR, name, "SKILL.md");
    if (!existsSync(p)) continue;
    const show = toPosix(relative(ROOT, p));
    const text = readFileSync(p, "utf8");
    const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!m) { errors.push(`${show}: thiếu frontmatter`); continue; }
    const fm = parseFrontmatter(text).meta;
    if (fm.name !== name) errors.push(`${show}: name "${fm.name ?? ""}" phải trùng tên thư mục "${name}"`);
    if (!fm.description) errors.push(`${show}: thiếu description`);
    else if (fm.description.length > 1024) errors.push(`${show}: description dài ${fm.description.length} ký tự (tối đa 1024)`);
    m[1].split(/\r?\n/).forEach((line, i) => {
      const kv = line.match(/^\s*[\w-]+:\s+(.+)$/);
      if (!kv) return;
      const v = kv[1].trim();
      if (/^["'[{>|]/.test(v)) return;
      if (/:\s/.test(v) || /\s#/.test(v)) errors.push(`${show}:${i + 2}: giá trị YAML chứa ": " hoặc " #" mà không nằm trong ngoặc kép`);
    });
  }
  return errors;
}

// ---------- trạng thái story từ ticket ----------

function storyTicketState(files, specs, storyId) {
  const ids = specs.flatMap(s => s.tickets.map(t => t.id)).filter(t => storyOfTicket(t) === storyId);
  const uniq = [...new Set(ids)];
  const done = uniq.filter(t => ticketDone(files, t) === true).length;
  return { total: uniq.length, done, ids: uniq };
}

function syncStoryStatus(files, specs, storyId) {
  const f = files.find(x => x.meta.id === storyId && x.meta.type === "story");
  if (!f || f.tasks.length) return null; // story có khối Tasks riêng tự quản status
  const st = storyTicketState(files, specs, storyId);
  if (!st.total || f.meta.status === "abandoned") return null;
  const want = st.done === st.total ? "done" : st.done > 0 ? "in-progress" : f.meta.status === "done" ? "in-progress" : f.meta.status;
  if (want === f.meta.status) return null;
  f.text = setFrontmatterKey(f.text, "status", want);
  writeFileSync(f.path, f.text);
  f.meta.status = want;
  return `${f.show}: status=${want} (${st.done}/${st.total} ticket)`;
}

// ---------- mutation ----------

function writeTask(f, taskId, done) {
  const t = f.tasks.find(x => x.id === taskId);
  const nl = f.text.includes("\r\n") ? "\r\n" : "\n";
  const lines = f.text.split(/\r?\n/);
  lines[t.line] = lines[t.line].replace(/\[( |x|X)\]/, done ? "[x]" : "[ ]");
  f.text = lines.join(nl);
  writeFileSync(f.path, f.text);
  f.tasks = parseTasks(f.text);
}

function updateStatus(f) {
  const open = f.tasks.filter(t => !t.done);
  let s = f.meta.status;
  if (f.tasks.length) {
    if (!open.length) s = "done";
    else if (s === "done" || s === "open") s = open.length < f.tasks.length || s === "done" ? "in-progress" : s;
  }
  if (s !== f.meta.status) {
    f.text = setFrontmatterKey(f.text, "status", s);
    writeFileSync(f.path, f.text);
    f.meta.status = s;
  }
  return `${f.show}: ${f.tasks.length - open.length}/${f.tasks.length} task, status=${s}`;
}

// lab tick <TICKET-ID>  hoặc  lab tick <ID> <Tn>
function setTask(files, specs, a, b, done) {
  let f, taskId;
  if (!b && TICKET_ID.test(a)) {
    taskId = a;
    f = progressFiles(files).find(p => p.tasks.some(t => t.id === a));
    if (!f) {
      const s = resolveSpecs(a, files, specs);
      if (!s.length) return err(`Không ticket nào tên "${a}" trong bảng Tickets của spec.`);
      return err(`${a} chưa có trong progress.md — chạy lab sync ${s[0].specId}`);
    }
  } else {
    if (!b) return err("Dùng: lab tick <TICKET-ID>  hoặc  lab tick <ID> <Tn>");
    f = files.find(x => x.meta.id === a);
    if (!f) return err(`Không tìm thấy ID "${a}". Chạy lab status để xem danh sách.`);
    taskId = b;
  }
  const t = f.tasks.find(x => x.id === taskId);
  if (!t) return err(`${f.meta.id}: không có task "${taskId}". Tasks: ${f.tasks.map(x => x.id).join(", ") || "(không có)"}`);
  if (t.done !== done) writeTask(f, taskId, done);
  const out = [updateStatus(f)];
  if (TICKET_ID.test(taskId)) {
    const s = syncStoryStatus(files, specs, storyOfTicket(taskId));
    if (s) out.push(s);
  }
  return ok(out.join("\n"));
}

function markDone(files, specs, id, force) {
  const f = files.find(x => x.meta.id === id);
  if (!f) return err(`Không tìm thấy ID "${id}".`);
  const open = f.tasks.filter(t => !t.done);
  if (!f.tasks.length) {
    if (f.meta.type === "story") {
      const st = storyTicketState(files, specs, id);
      if (!st.total) return err(`${id}: không có khối Tasks và không có ticket nào trong spec.`);
      if (st.done < st.total) return err(`CHẶN: ${id} mới ${st.done}/${st.total} ticket xong (${st.ids.filter(t => ticketDone(files, t) !== true).join(", ")}).`);
      return ok(syncStoryStatus(files, specs, id) || `${id} đã done.`);
    }
    if (f.meta.type === "ticket") {
      f.text = setFrontmatterKey(f.text, "status", "done");
      writeFileSync(f.path, f.text);
      return ok(`${f.show}: status=done`);
    }
    return err(`${id}: không có khối Tasks — không đánh done được bằng script.`);
  }
  if (open.length && !force) return err(`CHẶN: ${id} còn ${open.length} task mở (${open.map(t => t.id).join(", ")}).`);
  for (const t of open) writeTask(f, t.id, true);
  return ok(updateStatus(f));
}

// lab sync <SPEC-ID>: tạo/cập nhật specs/<SPEC-ID>/progress.md từ bảng Tickets
function syncProgress(files, specs, specId) {
  const ss = specs.filter(s => s.specId === specId);
  if (!ss.length) return err(`Không có thư mục specs/${specId}/ chứa spec-*.md.`);
  const tickets = ss.flatMap(s => s.tickets);
  if (!tickets.length) return err(`specs/${specId}: spec không có bảng "## Tickets" parse được (| <STORY>-T<n> | outcome | repos | blocked by |).`);
  const path = join(LAB_DOCS, ss[0].dir, "progress.md");
  const existing = files.find(f => f.path === path);
  const doneSet = new Set(existing ? existing.tasks.filter(t => t.done).map(t => t.id) : []);
  const repos = [...new Set(tickets.flatMap(t => [...t.repos.matchAll(/(?:services|apps)\/([\w-]+)|\b(lab-[\w-]+)\b/g)].map(m => m[1] || m[2])))];
  const lines = tickets.map(t => `- [${doneSet.has(t.id) ? "x" : " "}] ${t.id}: ${t.outcome.replace(/\s+/g, " ")}`);
  const status = doneSet.size === 0 ? "open" : doneSet.size >= tickets.length ? "done" : "in-progress";
  const text = [
    "---", `id: ${specId}-progress`, "type: progress", `status: ${status}`, `repos: [${repos.join(", ")}]`, `parent: ${specId}`, "---", "",
    `# Tiến độ ticket — ${specId}`, "",
    "> Sinh bởi `lab sync`. Chỉ đổi checkbox bằng `lab tick <TICKET-ID>`; nguồn ticket là bảng Tickets trong spec.", "",
    "## Tasks", ...lines, "",
  ].join("\n");
  writeFileSync(path, text);
  const dropped = existing ? existing.tasks.filter(t => !tickets.some(x => x.id === t.id)).map(t => t.id) : [];
  return ok(`${toPosix(relative(ROOT, path))}: ${tickets.length} ticket, ${doneSet.size} đã xong` + (dropped.length ? `\nCẢNH BÁO: ticket không còn trong spec: ${dropped.join(", ")}` : ""));
}

// lab ship-mark <SPEC-ID> <SHIP-ID>: đánh dấu story đã lên production
function shipMark(files, specs, specId, shipId) {
  const ss = specs.filter(s => s.specId === specId);
  if (!ss.length) {
    // ticket nhỏ ship riêng: lab ship-mark SETUP-001 SETUP-001-ship
    const t = loadSmallTickets(files).find(x => x.meta.id === specId);
    if (!t) return err(`Không có specs/${specId}/ hay ticket nhỏ ${specId}.`);
    if (t.meta.status !== "done") return err(`CHẶN: ${specId} status=${t.meta.status}, chưa done — không ship-mark.`);
    t.text = setFrontmatterKey(t.text, "shipped", `${today()} ${shipId}`);
    writeFileSync(t.path, t.text);
    return ok(`${t.show}: shipped ${today()} ${shipId}`);
  }
  const storyIds = [...new Set(ss.flatMap(s => s.tickets.map(t => storyOfTicket(t.id))))];
  const out = [];
  for (const id of storyIds) {
    const f = files.find(x => x.meta.id === id);
    if (!f) continue;
    if (f.meta.status !== "done") return err(`CHẶN: ${id} status=${f.meta.status}, chưa done — không ship-mark.`);
  }
  for (const id of storyIds) {
    const f = files.find(x => x.meta.id === id);
    if (!f) continue;
    f.text = setFrontmatterKey(f.text, "shipped", `${today()} ${shipId}`);
    writeFileSync(f.path, f.text);
    out.push(`${f.show}: shipped ${today()} ${shipId}`);
  }
  for (const t of loadSmallTickets(files).filter(t => t.meta.parent === specId && t.meta.status === "done")) {
    t.text = setFrontmatterKey(t.text, "shipped", `${today()} ${shipId}`);
    writeFileSync(t.path, t.text);
    out.push(`${t.show}: shipped`);
  }
  return ok(out.join("\n") || "Không có story nào để đánh dấu.");
}

// ---------- coverage ----------

// `## Capabilities`: mỗi dòng `- C1: <mô tả> [DECIDED 2026-10-27]` (nhãn tùy chọn, có thể kèm ngày/ghi chú)
function parseCapabilities(text) {
  const m = text.match(/^## Capabilities\s*$/m);
  if (!m) return null;
  const rest = text.slice(m.index + m[0].length);
  const end = rest.search(/^## /m);
  const body = end === -1 ? rest : rest.slice(0, end);
  const caps = [];
  const re = /^[-*]\s+([A-Z]\d+):\s*(.+)$/gm;
  let c;
  while ((c = re.exec(body))) {
    let desc = c[2].trim();
    let status = "";
    const sm = desc.match(/\[(OPEN|DECIDED|DEFERRED|OUT OF SCOPE)\b[^\]]*\]\s*$/i);
    if (sm) { status = sm[1].toUpperCase(); desc = desc.slice(0, sm.index).trim(); }
    caps.push({ id: c[1], desc, status });
  }
  return caps;
}

function latestBrief(files, prefixU) {
  const briefs = files.filter(f => f.meta.type === "brief" && f.meta.id.toUpperCase().startsWith(prefixU + "-BRIEF"));
  briefs.sort((a, b) => Number(b.meta["brief-version"] || 0) - Number(a.meta["brief-version"] || 0));
  return briefs[0];
}

function coverage(files, prefix) {
  const prefixU = prefix.toUpperCase();
  const brief = latestBrief(files, prefixU);
  if (!brief) return err(`Không tìm thấy brief type=brief với id ${prefixU}-BRIEF*. Chạy grilling để tạo product-brief.md có frontmatter.`);
  const caps = parseCapabilities(brief.text);
  if (!caps || !caps.length) return err(`${brief.rel}: không parse được section "## Capabilities".`);
  const bver = Number(brief.meta["brief-version"] || 0);
  const items = files.filter(f => (f.meta.type === "story" || f.meta.type === "ticket") && f.meta.id.startsWith(prefixU + "-") && f.meta.status !== "abandoned");
  const coveredBy = {};
  for (const it of items) for (const cid of asList(it.meta.covers)) (coveredBy[cid] = coveredBy[cid] || []).push(it);
  const w = [6, 40, 12, 14, 26, 40];
  const line = (c) => c.map((s, i) => String(s).padEnd(w[i])).join(" | ");
  console.log(`Brief: ${brief.meta.id} (version ${bver || "?"}, ${brief.meta.date || "?"}) — ${brief.rel}\n`);
  console.log(line(["CAP", "MÔ TẢ", "TRẠNG THÁI", "COVERAGE", "STORY/TICKET", "GHI CHÚ"]));
  console.log(w.map(n => "-".repeat(n)).join("-+-"));
  // OPEN chưa có story không chặn: breakdown không phân rã việc user chưa chốt
  let covered = 0, uncovered = 0, stale = 0, skipped = 0, open = 0;
  for (const cap of caps) {
    const its = coveredBy[cap.id] || [];
    let cov = "UNCOVERED", note = "";
    if (cap.status === "DEFERRED" || cap.status === "OUT OF SCOPE") { cov = cap.status; skipped++; }
    else if (its.length) {
      // STALE: story ghi brief-version thấp hơn brief hiện tại, hoặc trỏ brief ID khác
      const old = its.filter(it => (it.meta.brief && it.meta.brief !== brief.meta.id) || Number(it.meta["brief-version"] || bver) < bver);
      if (old.length) { cov = "STALE"; stale++; note = `rà lại ${old.map(x => x.meta.id).join(", ")}`; }
      else { cov = "COVERED"; covered++; }
    } else if (cap.status === "OPEN") { cov = "OPEN"; open++; note = "chờ user chốt trong brief"; }
    else uncovered++;
    console.log(line([cap.id, cap.desc.slice(0, w[1] - 1), cap.status || "—", cov, (its.map(x => x.meta.id).join(", ") || "—").slice(0, w[4] - 1), note || (cov === "UNCOVERED" ? "cần breakdown" : "")]));
  }
  const capIds = new Set(caps.map(c => c.id));
  const unknown = Object.keys(coveredBy).filter(cid => !capIds.has(cid));
  for (const cid of unknown) console.log(`! ${coveredBy[cid].map(x => x.meta.id).join(", ")} covers ${cid} — brief không có capability này`);
  console.log(`\n${caps.length} capability: COVERED=${covered} STALE=${stale} UNCOVERED=${uncovered} OPEN=${open} DEFERRED/OUT=${skipped}${unknown.length ? ` COVERS-LẠ=${unknown.length}` : ""}`);
  if (unknown.length) return err(`→ ${unknown.length} mã covers không có trong brief — sửa covers của story.`);
  if (uncovered || stale) return err(`→ ${uncovered} capability UNCOVERED, ${stale} STALE — breakdown chưa đủ.`);
  return ok("→ Phủ đủ.");
}

// ---------- gate: kiểm điều kiện vào skill ----------
// Dùng: lab gate <skill> <ID>. Exit 0 = PASS, 1 = FAIL, 2 = sai cú pháp.

const SKILL_CHAIN = ["grilling", "prototype", "breakdown", "architecture-design", "to-spec", "spec-review", "implement", "ship"];
const NO_GATE = ["grilling", "prototype", "capture", "to-html", "orchestrate"];

function gateCheck(files, specs, skill, id) {
  const lines = [];
  let pass = true;
  const no = (m) => { pass = false; lines.push("✗ " + m); };
  const yes = (m) => lines.push("✓ " + m);
  const idU = (id || "").toUpperCase();
  const prefix = idU.split("-")[0];

  if (NO_GATE.includes(skill)) yes(`${skill} không có điều kiện tiên quyết.`);
  else if (!id) no(`thiếu ID — dùng: lab gate ${skill} <ID>`);
  else switch (skill) {
    case "breakdown": {
      const b = latestBrief(files, prefix);
      if (!b) { no(`chưa có Product Brief ${prefix}-BRIEF — chạy grilling trước`); break; }
      b.meta.status === "done" ? yes(`Product Brief ${b.meta.id} status=done`) : no(`Product Brief ${b.meta.id} status="${b.meta.status}", cần done (user duyệt brief)`);
      parseCapabilities(b.text)?.length ? yes("Product Brief có ## Capabilities") : no("Product Brief thiếu hoặc rỗng section ## Capabilities");
      break;
    }
    case "architecture-design": {
      const target = files.find(f => f.meta.id === idU);
      if (!target && idU !== prefix) { no(`không có story/epic ${idU} — chạy breakdown trước`); break; }
      const stories = target ? [target, ...files.filter(f => f.meta.parent === idU)] : files.filter(f => f.meta.type === "story" && f.meta.id.startsWith(prefix + "-"));
      const real = stories.filter(f => f.meta.type === "story" || f.meta.type === "epic");
      if (!real.length) { no(`không có story/epic ${idU} — chạy breakdown trước`); break; }
      yes(`${real.length} story/epic trong phạm vi ${idU}`);
      const b = latestBrief(files, prefix);
      b && b.meta.status === "done" ? yes(`brief ${b.meta.id} done`) : no(`brief ${prefix}-BRIEF chưa done`);
      break;
    }
    case "to-spec": {
      const target = files.find(f => f.meta.id === idU && (f.meta.type === "story" || f.meta.type === "epic"));
      if (!target) { no(`không có story/epic ${idU} (stories/${idU}.md)`); break; }
      yes(`${target.meta.type} ${idU} tồn tại`);
      const drs = designRecords(target.product);
      const frozen = drs.filter(d => d.status === "FROZEN");
      if (!drs.length) no(`${target.product}/ chưa có design-backend.md hoặc design-frontend.md — chạy architecture-design`);
      else if (!frozen.length) no(`Design Record trong ${target.product}/ chưa FROZEN (${drs.map(d => `${d.side}=${d.status || "?"}`).join(", ")})`);
      else yes(`Design Record FROZEN: ${frozen.map(d => d.side).join(", ")}`);
      for (const d of drs.filter(d => d.status !== "FROZEN")) lines.push(`! design-${d.side}.md status=${d.status || "?"} — spec phía này chưa viết được`);
      break;
    }
    case "spec-review": {
      const ss = resolveSpecs(idU, files, specs);
      if (!ss.length) { no(`không tìm thấy spec cho ${idU} — chạy to-spec trước`); break; }
      yes(`spec: ${ss.map(s => s.show).join(", ")}`);
      const drs = designRecords(ss[0].product);
      for (const s of ss) {
        const d = drs.find(x => x.side === s.side);
        d && d.status === "FROZEN" ? yes(`design-${s.side}.md FROZEN`) : no(`design-${s.side}.md ${d ? "status=" + d.status : "không tồn tại"} — spec ${s.side} không có thiết kế để đối chiếu`);
      }
      break;
    }
    case "implement": {
      const small = loadSmallTickets(files).find(f => f.meta.id === idU);
      if (small) {
        ["done", "abandoned"].includes(small.meta.status) ? no(`ticket ${idU} đã ${small.meta.status}`) : yes(`ticket nhỏ ${idU} (${small.show}) status=${small.meta.status}`);
        if (small.meta.status === "blocked") no(`ticket ${idU} đang blocked`);
        break;
      }
      if (!TICKET_ID.test(idU)) { no(`implement nhận ticket ID (<STORY>-T<n> hoặc SETUP/MAINT/EXP-<n>), không nhận "${idU}"`); break; }
      const ss = resolveSpecs(idU, files, specs);
      if (!ss.length) { no(`ticket ${idU} không có trong bảng Tickets của spec nào`); break; }
      const spec = ss[0];
      yes(`ticket thuộc ${spec.show}`);
      spec.status === "REVIEWED" ? yes("spec status=REVIEWED") : no(`spec status=${spec.status || "?"}, cần REVIEWED (spec-review PASS + user duyệt)`);
      const rv = reviewOf(spec, files);
      if (!rv) no(`chưa có ${spec.dir}/review.md — chạy spec-review`);
      else {
        const v = String(rv.meta.verdict || "").toUpperCase();
        v === "PASS" ? yes("review verdict=PASS") : no(`review verdict=${v || "?"}, cần PASS`);
        Number(rv.meta["open-questions"] || 0) > 0 && no(`review còn ${rv.meta["open-questions"]} câu hỏi chờ user`);
      }
      const prog = progressFiles(files).find(p => p.meta.parent === spec.specId);
      prog ? yes("có progress.md") : no(`chưa có ${spec.dir}/progress.md — chạy lab sync ${spec.specId}`);
      const t = spec.tickets.find(x => x.id === idU);
      if (ticketDone(files, idU) === true) no(`${idU} đã tick xong`);
      for (const dep of t.blockedBy) {
        const d = ticketDone(files, dep);
        d === true ? yes(`phụ thuộc ${dep} xong`) : no(`phụ thuộc ${dep} ${d === null ? "không theo dõi được" : "chưa xong"}`);
      }
      if (t.blockedRaw && t.blockedRaw !== "—" && !t.blockedBy.length) lines.push(`! Blocked by "${t.blockedRaw}" không phải ticket ID — tự kiểm điều kiện này`);
      break;
    }
    case "ship": {
      const ss = resolveSpecs(idU, files, specs);
      const small = loadSmallTickets(files).find(f => f.meta.id === idU);
      if (!ss.length && !small) { no(`không có spec hay ticket nhỏ nào cho ${idU}`); break; }
      if (small) small.meta.status === "done" ? yes(`ticket ${idU} done`) : no(`ticket ${idU} status=${small.meta.status}`);
      const tickets = ss.flatMap(s => s.tickets.map(t => t.id)).filter(t => !TICKET_ID.test(idU) || t === idU);
      const pending = tickets.filter(t => ticketDone(files, t) !== true);
      if (tickets.length) pending.length ? no(`${pending.length}/${tickets.length} ticket chưa xong: ${pending.join(", ")}`) : yes(`${tickets.length} ticket đã xong`);
      const kids = loadSmallTickets(files).filter(t => ss.some(s => s.specId === t.meta.parent) && !["done", "abandoned"].includes(t.meta.status));
      if (kids.length) no(`ticket nhỏ chưa xong: ${kids.map(k => k.meta.id).join(", ")}`);
      break;
    }
    default:
      no(`skill không rõ: ${skill}. Chuỗi: ${SKILL_CHAIN.join(" → ")}`);
  }

  console.log(`\n=== GATE ${skill.toUpperCase()} ${idU} ===`);
  for (const l of lines) console.log(l);
  console.log(pass ? "\n✓ PASS — được chạy skill này" : "\n✗ FAIL — xử lý điều kiện trên trước");
  return pass;
}

// ---------- gate repo code ----------

function listRepos() {
  const repos = [], skipped = [];
  for (const d of ["services", "apps"]) {
    const base = join(ROOT, d);
    if (!existsSync(base)) continue;
    for (const e of readdirSync(base, { withFileTypes: true })) {
      if (!e.isDirectory()) continue;
      const rel = `${d}/${e.name}`;
      existsSync(join(base, e.name, "package.json")) ? repos.push(rel) : skipped.push(rel);
    }
  }
  return { repos: repos.sort(), skipped: skipped.sort() };
}

function repoGate(repo) {
  const repoRoot = join(ROOT, repo);
  const pkgPath = join(repoRoot, "package.json");
  if (!existsSync(pkgPath)) { console.error(`✗ ${repo}: không có package.json`); return false; }
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  const scripts = pkg.scripts || {};
  let good = true;
  console.log(`\n===== ${repo} =====`);
  const missing = REPO_GATES.filter(g => !scripts[g]);
  if (missing.length) { good = false; console.log(`✗ thiếu script: ${missing.join(", ")} — tạo ticket MAINT bổ sung (engineering-workflow §7)`); }
  const ranged = Object.entries({ ...pkg.dependencies, ...pkg.devDependencies }).filter(([, v]) => /^[\^~]|^[<>*]|^latest$/.test(String(v)));
  if (ranged.length) { good = false; console.log(`✗ dependency không pin exact: ${ranged.map(([k, v]) => `${k}@${v}`).join(", ")}`); }
  if (!existsSync(join(repoRoot, "package-lock.json"))) { good = false; console.log("✗ thiếu package-lock.json"); }
  for (const g of REPO_GATES.filter(g => scripts[g])) {
    try {
      execSync(`npm run ${g}`, { cwd: repoRoot, stdio: "inherit", env: { ...process.env, CI: "true" } });
      console.log(`✓ ${g}`);
    } catch {
      good = false;
      console.log(`✗ ${g} FAIL`);
    }
  }
  console.log(good ? `✓ ${repo} đủ gate` : `✗ ${repo} LỖI`);
  return good;
}

// ---------- commit lab-docs ----------

function commitDocs(id, message, push) {
  const g = (args) => execFileSync("git", ["-C", LAB_DOCS, ...args], { encoding: "utf8" });
  const files = loadAll();
  const specs = loadSpecs();
  const errs = validate(files, specs);
  if (errs.length) { errs.forEach(e => console.error("FAIL " + e)); return err("lab check FAIL — không commit."); }
  const changed = g(["status", "--porcelain", "-uall"]).split(/\r?\n/).filter(Boolean).map(l => l.slice(3).replace(/^"|"$/g, ""));
  const idU = id.toUpperCase();
  const related = new Set([idU]);
  for (const f of files) {
    if (f.meta.parent === idU || f.meta.id.startsWith(idU + "-")) related.add(f.meta.id);
  }
  for (const s of resolveSpecs(idU, files, specs)) { related.add(s.specId); s.stories.forEach(x => related.add(x)); }
  const mine = changed.filter(p => {
    const pu = p.toUpperCase();
    if ([...related].some(r => pu.includes(`/${r.toUpperCase()}/`) || pu.endsWith(`/${r.toUpperCase()}.MD`))) return true;
    const f = files.find(x => x.rel === p);
    return f && (related.has(f.meta.id) || related.has(f.meta.parent));
  });
  const ledger = "decisions/decision-ledger.md";
  if (changed.includes(ledger)) {
    const diff = g(["diff", "--", ledger]);
    if (diff.includes(idU)) mine.push(ledger);
  }
  if (!mine.length) return err(`Không có file thay đổi nào thuộc ${idU}. Đang thay đổi: ${changed.join(", ") || "(không có)"}`);
  g(["add", "--", ...mine]);
  g(["commit", "-m", `[${idU}] ${message}`]);
  const left = changed.filter(p => !mine.includes(p));
  let msg = `Đã commit ${mine.length} file:\n  ${mine.join("\n  ")}`;
  if (left.length) msg += `\nKhông thuộc ${idU}, để nguyên:\n  ${left.join("\n  ")}`;
  if (push) {
    const branch = g(["branch", "--show-current"]).trim();
    g(["push", "-u", "origin", branch]);
    msg += `\nĐã push ${branch}.`;
  }
  return ok(msg);
}

// ---------- render ----------

function statusTable(files) {
  const rows = files.map(f => {
    const total = f.tasks.length;
    const doneN = f.tasks.filter(t => t.done).length;
    return [f.meta.id, f.meta.type || "?", f.meta.status || (f.meta.type === "epic" ? "—" : "?"), total ? `${doneN}/${total}` : "—", asList(f.meta.repos).join(",") || "—", f.rel];
  });
  rows.sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true }));
  const w = [16, 9, 12, 9, 26, 60];
  const line = (c) => c.map((s, i) => String(s).padEnd(w[i])).join(" | ");
  console.log(line(["ID", "TYPE", "STATUS", "TASKS", "REPOS", "FILE"]));
  console.log(w.map(n => "-".repeat(n)).join("-+-"));
  for (const r of rows) console.log(line(r));
  const by = {};
  for (const f of files) if (f.meta.type !== "epic") by[f.meta.status] = (by[f.meta.status] || 0) + 1;
  console.log(`\n${files.length} file theo dõi: ` + Object.entries(by).map(([k, v]) => `${k}=${v}`).join(", "));
}

// ---------- main ----------

const USAGE = `Dùng: node .agents/scripts/lab.mjs <lệnh>
  status                      bảng tổng hợp mọi ID
  check                       validate lab-docs + frontmatter skill (bắt buộc trước commit)
  show <ID>                   in một file
  tick <TICKET-ID>            tick ticket trong progress.md, tự cập nhật status story
  tick <ID> <Tn>              tick task trong khối ## Tasks của một file
  untick <TICKET-ID>|<ID> <Tn>
  done <ID> [--force]         đánh done (story: khi mọi ticket đã tick)
  sync <SPEC-ID>              tạo/cập nhật specs/<SPEC-ID>/progress.md từ bảng Tickets
  coverage <PREFIX>           audit brief ↔ stories (exit 1 nếu chưa phủ)
  gate <skill> <ID>           điều kiện vào skill (exit 1 nếu FAIL)
  repo-gate <repo>            ${REPO_GATES.join(" → ")} + pin exact cho một repo (vd services/lab-user)
  all-gate                    repo-gate cho mọi repo services/ và apps/
  ship-mark <SPEC-ID> <SHIP-ID>   ghi shipped: vào story sau khi verify production
  commit <ID> "<mô tả>" [--push]  check + commit file lab-docs thuộc ID`;

function main() {
  const [cmd, ...args] = process.argv.slice(2);
  const finish = (r) => {
    if (r.ok) { console.log(r.msg); process.exit(0); }
    console.error(r.msg); process.exit(1);
  };
  const need = (n) => { if (args.length < n) { console.error(USAGE); process.exit(2); } };
  const files = loadAll();
  const specs = loadSpecs();

  switch (cmd) {
    case "status": case undefined: statusTable(files); return;
    case "check": {
      const errs = validate(files, specs);
      if (errs.length) { errs.forEach(e => console.error("FAIL " + e)); process.exit(1); }
      console.log(`OK — ${files.length} file theo dõi, ${specs.length} spec hợp lệ.`);
      return;
    }
    case "show": {
      need(1);
      const f = files.find(x => x.meta.id === args[0]);
      if (!f) finish(err(`Không tìm thấy ID "${args[0]}".`));
      console.log(`File: ${f.show}\n\n${f.text}`);
      return;
    }
    case "tick": need(1); return finish(setTask(files, specs, args[0], args[1], true));
    case "untick": need(1); return finish(setTask(files, specs, args[0], args[1], false));
    case "done": need(1); return finish(markDone(files, specs, args[0], args.includes("--force")));
    case "sync": need(1); return finish(syncProgress(files, specs, args[0]));
    case "coverage": need(1); return finish(coverage(files, args[0]));
    case "ship-mark": need(2); return finish(shipMark(files, specs, args[0], args[1]));
    case "commit": need(2); return finish(commitDocs(args[0], args[1], args.includes("--push")));
    case "gate": need(1); process.exit(gateCheck(files, specs, args[0], args[1]) ? 0 : 1);
    case "repo-gate": need(1); process.exit(repoGate(args[0]) ? 0 : 1);
    case "all-gate": {
      const { repos, skipped } = listRepos();
      const results = repos.map(r => [r, repoGate(r)]);
      console.log("\n===== KẾT QUẢ =====");
      for (const [r, g] of results) console.log(`${g ? "✓" : "✗"} ${r}`);
      for (const r of skipped) console.log(`- ${r} (bỏ qua: chưa có package.json)`);
      const bad = results.filter(([, g]) => !g).length;
      console.log(bad ? `\n✗ ${bad}/${repos.length} repo lỗi` : `\n✓ ${repos.length} repo đủ gate` + (skipped.length ? `, ${skipped.length} repo chưa dựng bị bỏ qua` : ""));
      process.exit(bad ? 1 : 0);
    }
    default:
      console.error(`Lệnh không rõ: ${cmd}\n\n${USAGE}`);
      process.exit(2);
  }
}

main();
