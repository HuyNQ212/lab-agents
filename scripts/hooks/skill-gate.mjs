#!/usr/bin/env node
// Hook PreToolUse(Skill): ép điều kiện vào skill bằng máy.
// Skill trong chuỗi phải được gọi kèm ID; hook chạy `lab check` rồi `lab gate <skill> <ID>`.
// Exit 2 + stderr = chặn, Claude thấy lý do. Exit 0 = cho chạy.

import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const LAB = join(dirname(fileURLToPath(import.meta.url)), "..", "lab.mjs");
const NEED_ID = ["breakdown", "architecture-design", "to-spec", "spec-review", "implement", "ship"];

let raw = "";
process.stdin.on("data", (c) => (raw += c));
process.stdin.on("end", () => {
  let input = {};
  try { input = JSON.parse(raw || "{}"); } catch { process.exit(0); }
  const ti = input.tool_input || {};
  const skill = String(ti.skill || ti.name || "").split(":").pop();
  if (!NEED_ID.includes(skill)) process.exit(0);

  const text = Object.entries(ti).filter(([k, v]) => k !== "skill" && typeof v === "string").map(([, v]) => v).join(" ");
  const full = text.match(/\b([A-Za-z]{2,6}-[A-Za-z0-9.]+(?:-[A-Za-z0-9.]+)*)\b/);
  const bare = text.match(/\b([A-Z]{2,6})\b/);
  const id = full ? full[1].toUpperCase() : bare ? bare[1] : "";
  if (!id) block(`Skill "${skill}" phải gọi kèm ID trong args (ví dụ: ${skill === "implement" ? "GTW-001-T1" : skill === "breakdown" ? "PLN" : "PLN-E01"}).`);

  const run = (args) => {
    try { return { ok: true, out: execFileSync(process.execPath, [LAB, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }) }; }
    catch (e) { return { ok: false, out: `${e.stdout || ""}${e.stderr || ""}` }; }
  };
  const check = run(["check"]);
  if (!check.ok) block(`lab check FAIL — sửa tài liệu trước khi chạy ${skill} (dùng skill capture nếu cần ghi việc):\n${check.out}`);
  const gate = run(["gate", skill, id]);
  if (!gate.ok) block(gate.out);
  process.exit(0);
});

function block(msg) {
  process.stderr.write(msg.trim() + "\n");
  process.exit(2);
}
