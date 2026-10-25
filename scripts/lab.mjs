#!/usr/bin/env node
// lab.mjs — quản lý tiến độ docs Lab, Node thuần, không dependency.
// Chuẩn file: lab-docs/frameworks/documentation-standards.md §0.
// Chạy từ workspace root: node .agents/scripts/lab.mjs <command> [args]

import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

// root workspace = hai cấp trên vị trí script (.agents/scripts/lab.mjs)
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const LAB_DOCS = join(ROOT, "lab-docs");
const RESERVED_PREFIXES = ["SETUP", "MAINT", "EXP"];
const STATUS_VALUES = ["open", "in-progress", "blocked", "done", "abandoned"];

// ---------- quét file ----------

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    if (name === ".git" || name === "node_modules") continue;
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) yield* walk(p);
    else if (name.endsWith(".md")) yield p;
  }
}

function parseFrontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  const meta = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^(\w[\w-]*):\s*(.*)$/);
    if (!kv) continue;
    let [, k, v] = kv;
    if (v.startsWith("[") && v.endsWith("]")) {
      v = v.slice(1, -1).split(",").map(s => s.trim()).filter(Boolean);
    }
    meta[k] = v;
  }
  return { meta, end: m[0].length, raw: m[1] };
}

function parseTasks(text) {
  const tasks = [];
  const re = /^(\s*)-\s\[( |x|X)\]\s*(T\d+):?\s*(.*)$/gm;
  let m;
  while ((m = re.exec(text))) {
    tasks.push({ indent: m[1].length, done: m[2].toLowerCase() === "x", id: m[3], label: m[4], index: m.index });
  }
  return tasks;
}

function loadAll() {
  const files = [];
  for (const f of walk(LAB_DOCS)) {
    const text = readFileSync(f, "utf8");
    const fm = parseFrontmatter(text);
    if (!fm) continue;
    const { meta } = fm;
    if (!meta.id) continue;
    files.push({
      path: relative(ROOT, f),
      rel: relative(LAB_DOCS, f).split(sep).join("/"),
      meta,
      text,
      tasks: parseTasks(text),
    });
  }
  return files;
}

// ---------- validate ----------

function validate(files) {
  const errors = [];
  const seen = new Map();
  for (const f of files) {
    const { meta, tasks, path } = f;
    const put = (msg) => errors.push(`${path}: ${msg}`);
    if (seen.has(meta.id)) put(`ID trùng "${meta.id}" với ${seen.get(meta.id)}`);
    seen.set(meta.id, path);

    if (!meta.type) put("thiếu type");
    if (!meta.status) put("thiếu status");
    else if (!STATUS_VALUES.includes(meta.status)) put(`status "${meta.status}" không hợp lệ (open|in-progress|blocked|done|abandoned)`);
    if (!meta.repos) put("thiếu repos (dùng [] nếu không chạm repo code)");
    if (meta.type === "ticket" && meta.parent && !RESERVED_PREFIXES.includes(meta.id.split("-")[0]) && !meta.parent) put("ticket không thuộc prefix reserved mà thiếu parent");

    const open = tasks.filter(t => !t.done);
    if (meta.status === "done" && open.length) put(`status=done nhưng còn ${open.length} task mở (${open.map(t => t.id).join(", ")})`);
    if (meta.status !== "done" && !open.length && tasks.length) put(`mọi task đã tick nhưng status="${meta.status}" — chạy lab done ${meta.id}`);

    const ids = new Set();
    for (const t of tasks) {
      if (ids.has(t.id)) put(`task ID lặp "${t.id}"`);
      ids.add(t.id);
    }
  }
  return errors;
}

// ---------- mutation ----------

function setTask(files, id, taskId, done, force = false) {
  const f = files.find(x => x.meta.id === id);
  if (!f) return `Không tìm thấy ID "${id}". Chạy lab status để xem danh sách.`;
  const t = f.tasks.find(x => x.id === taskId);
  if (!t) return `${id}: không có task "${taskId}". Tasks: ${f.tasks.map(x => x.id).join(", ") || "(none)"}`;

  const lines = f.text.split(/\r?\n/);
  // tìm đúng dòng của task (checkbox có thể không ở đầu dòng do thụt lề đã match)
  for (let i = 0; i < lines.length; i++) {
    const re = /^(\s*)-\s\[( |x|X)\]\s*(`?T\d+`?):?\s*(.*)$/;
    const m = lines[i].match(re);
    if (m && m[3].replace(/`/g, "") === taskId) {
      if (done === t.done && !force) return `${id}/${taskId} đã ở trạng thái ${done ? "done" : "open"}.`;
      lines[i] = lines[i].replace(/\[( |x|X)\]/, done ? "[x]" : "[ ]");
      f.text = lines.join("\n");
      writeFileSync(f.path, f.text);
      break;
    }
  }
  return updateStatus(f, force);
}

function updateStatus(f, force = false) {
  // parse lại task sau khi ghi
  f.tasks = parseTasks(f.text);
  const open = f.tasks.filter(t => !t.done);
  let newStatus = f.meta.status;
  if (f.tasks.length) {
    if (!open.length) newStatus = "done";
    else if (f.meta.status === "done") newStatus = force ? "done" : "in-progress";
    else if (f.meta.status === "open") newStatus = "in-progress";
  }
  if (newStatus !== f.meta.status) {
    f.text = f.text.replace(/^(status:\s*)(\S+)/m, `$1${newStatus}`);
    writeFileSync(f.path, f.text);
    f.meta.status = newStatus;
  }
  const total = f.tasks.length;
  const doneN = total - open.length;
  return `${f.path}: ${doneN}/${total} task, status=${newStatus}`;
}

function markDone(files, id, force = false) {
  const f = files.find(x => x.meta.id === id);
  if (!f) return `Không tìm thấy ID "${id}".`;
  f.tasks = parseTasks(f.text);
  const open = f.tasks.filter(t => !t.done);
  if (open.length && !force) {
    return `CHẶN: ${id} còn ${open.length} task mở (${open.map(t => t.id).join(", ")}). Tick hết hoặc dùng --force.`;
  }
  if (!f.tasks.length) return `${id}: không có khối Tasks — không thể đánh done bằng script. Sửa status tay nếu chắc chắn.`;
  let msg = "";
  for (const t of f.tasks.filter(t => !t.done)) msg += setTask(files, id, t.id, true, true) + "\n";
  return msg.trimEnd();
}

// ---------- render ----------

function statusTable(files) {
  const rows = files.map(f => {
    const total = f.tasks.length;
    const doneN = f.tasks.filter(t => t.done).length;
    const pct = total ? Math.round((doneN / total) * 100) : "";
    return [f.meta.id, f.meta.type || "?", f.meta.status || "?", total ? `${doneN}/${total} (${pct}%)` : "—", Array.isArray(f.meta.repos) ? f.meta.repos.join(",") : f.meta.repos || "—", f.rel];
  });
  rows.sort((a, b) => a[0].localeCompare(b[0]));
  const w = [10, 9, 12, 14, 22, 60];
  const line = (c) => c.map((s, i) => String(s).padEnd(w[i])).join(" | ");
  console.log(line(["ID", "TYPE", "STATUS", "PROGRESS", "REPOS", "FILE"]));
  console.log(w.map(n => "-".repeat(n)).join("-+-"));
  for (const r of rows) console.log(line(r));
  const byStatus = {};
  for (const f of files) byStatus[f.meta.status] = (byStatus[f.meta.status] || 0) + 1;
  console.log(`\n${files.length} tracked file(s): ` + Object.entries(byStatus).map(([k, v]) => `${k}=${v}`).join(", "));
}

function show(files, id) {
  const f = files.find(x => x.meta.id === id);
  if (!f) return `Không tìm thấy ID "${id}".`;
  console.log(`File: ${f.path}\n`);
  console.log(f.text);
}

// ---------- main ----------

const [cmd, ...args] = process.argv.slice(2);
const files = loadAll();

switch (cmd) {
  case "status":
  case undefined:
    statusTable(files);
    break;
  case "check": {
    const errs = validate(files);
    if (errs.length) {
      for (const e of errs) console.error("FAIL " + e);
      process.exit(1);
    }
    console.log(`OK — ${files.length} file hợp lệ.`);
    break;
  }
  case "tick": {
    if (!args[0] || !args[1]) { console.error("Dùng: lab tick <ID> <Tn>"); process.exit(2); }
    console.log(setTask(files, args[0], args[1], true));
    break;
  }
  case "untick": {
    if (!args[0] || !args[1]) { console.error("Dùng: lab untick <ID> <Tn>"); process.exit(2); }
    console.log(setTask(files, args[0], args[1], false));
    break;
  }
  case "done": {
    if (!args[0]) { console.error("Dùng: lab done <ID> [--force]"); process.exit(2); }
    console.log(markDone(files, args[0], args.includes("--force")));
    break;
  }
  case "show": {
    if (!args[0]) { console.error("Dùng: lab show <ID>"); process.exit(2); }
    console.log(show(files, args[0]));
    break;
  }
  default:
    console.error(`Lệnh lạ "${cmd}". Có: status | check | tick <ID> <Tn> | untick <ID> <Tn> | done <ID> [--force] | show <ID>`);
    process.exit(2);
}
