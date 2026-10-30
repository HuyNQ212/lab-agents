// Test hồi quy cho lab.mjs trên fixture lab-docs nhỏ. Chạy: node --test .agents/scripts/test/
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const LAB = join(dirname(fileURLToPath(import.meta.url)), "..", "lab.mjs");

function fixture(overrides = {}) {
  const root = mkdtempSync(join(tmpdir(), "lab-"));
  const files = {
    "lab-docs/products/demo/product-brief.md": `---\nid: DMO-BRIEF\ntype: brief\nstatus: done\nrepos: []\nbrief-version: 2\ndate: 2026-10-30\n---\n\n## Capabilities\n- C1: Tạo việc [DECIDED 2026-10-27]\n- C2: Nhắc việc [DECIDED]\n- C3: Xuất lịch [DEFERRED]\n`,
    "lab-docs/products/demo/design-backend.md": `# Design\n\n**Status:** FROZEN (user duyệt 2026-10-29)\n`,
    "lab-docs/products/demo/stories/DMO-E01.md": `---\nid: DMO-E01\ntype: epic\nrepos: [lab-demo]\n---\n# epic\n`,
    "lab-docs/products/demo/stories/DMO-001.md": `---\nid: DMO-001\ntype: story\nstatus: open\nrepos: [lab-demo]\nparent: DMO-E01\nbrief: DMO-BRIEF\nbrief-version: 2\ncovers: [C1]\n---\n# story 1\n`,
    "lab-docs/products/demo/stories/DMO-002.md": `---\r\nid: DMO-002\r\ntype: story\r\nstatus: open\r\nrepos: [lab-demo]\r\nparent: DMO-E01\r\nbrief: DMO-BRIEF\r\nbrief-version: 2\r\ncovers: [C2]\r\n---\r\n# story 2 (CRLF)\r\n`,
    "lab-docs/products/demo/specs/DMO-E01/spec-backend.md": `# Spec\n\n**Status:** REVIEWED\n**Stories:** DMO-001, DMO-002\n\n## 8. Tickets\n\n| ID | Outcome | Repo | Blocked by |\n|---|---|---|---|\n| DMO-001-T1 | Tạo việc | \`services/lab-demo\` | — |\n| DMO-002-T1 | Nhắc việc | \`services/lab-demo\` | DMO-001-T1 |\n\n## 9. Khác\n`,
    "lab-docs/products/demo/specs/DMO-E01/review.md": `---\nid: DMO-E01-review\ntype: review\nstatus: done\nrepos: [lab-demo]\nverdict: PASS\nopen-questions: 0\n---\n# review\n`,
    "lab-docs/products/other/design-backend.md": `**Status:** DRAFT\n`,
    "lab-docs/products/other/stories/OTH-001.md": `---\nid: OTH-001\ntype: story\nstatus: open\nrepos: []\nbrief: OTH-BRIEF\ncovers: [C1]\n---\n`,
    "lab-docs/platform/setup/specs/SETUP-001/ticket.md": `---\nid: SETUP-001\ntype: ticket\nstatus: open\nrepos: [lab-demo]\nparent: DMO-E01\n---\n# ticket nhỏ\n`,
    ...overrides,
  };
  for (const [p, c] of Object.entries(files)) {
    if (c === null) continue;
    mkdirSync(dirname(join(root, p)), { recursive: true });
    writeFileSync(join(root, p), c);
  }
  return root;
}

function lab(root, ...args) {
  const r = spawnSync(process.execPath, [LAB, ...args], { env: { ...process.env, LAB_ROOT: root }, encoding: "utf8" });
  return { code: r.status, out: r.stdout + r.stderr };
}

const read = (root, p) => readFileSync(join(root, p), "utf8");

test("check OK trên fixture hợp lệ", () => {
  const root = fixture();
  const r = lab(root, "check");
  assert.equal(r.code, 0, r.out);
  rmSync(root, { recursive: true });
});

test("to-spec: nhận **Status:** FROZEN trong cùng product, không mượn product khác", () => {
  const root = fixture();
  assert.equal(lab(root, "gate", "to-spec", "DMO-001").code, 0);
  assert.equal(lab(root, "gate", "to-spec", "DMO-E01").code, 0);
  const r = lab(root, "gate", "to-spec", "OTH-001");
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /chưa FROZEN/);
  rmSync(root, { recursive: true });
});

test("spec-review: phân giải spec từ epic, story và ticket", () => {
  const root = fixture();
  for (const id of ["DMO-E01", "DMO-001", "DMO-002-T1"]) assert.equal(lab(root, "gate", "spec-review", id).code, 0, id);
  assert.equal(lab(root, "gate", "spec-review", "DMO-999").code, 1);
  rmSync(root, { recursive: true });
});

test("implement: đòi progress, verdict PASS, phụ thuộc xong", () => {
  const root = fixture();
  let r = lab(root, "gate", "implement", "DMO-001-T1");
  assert.equal(r.code, 1);
  assert.match(r.out, /lab sync DMO-E01/);
  assert.equal(lab(root, "sync", "DMO-E01").code, 0);
  assert.equal(lab(root, "gate", "implement", "DMO-001-T1").code, 0);
  r = lab(root, "gate", "implement", "DMO-002-T1");
  assert.equal(r.code, 1);
  assert.match(r.out, /DMO-001-T1 chưa xong/);
  assert.equal(lab(root, "gate", "implement", "DMO-001").code, 1, "story ID không phải ticket");
  rmSync(root, { recursive: true });
});

test("implement: verdict khác PASS hoặc còn câu hỏi thì FAIL", () => {
  const rv = (v, q) => `---\nid: DMO-E01-review\ntype: review\nstatus: done\nrepos: []\nverdict: ${v}\nopen-questions: ${q}\n---\n`;
  for (const [v, q] of [["NEEDS-WORK", 0], ["PASS", 2]]) {
    const root = fixture({ "lab-docs/products/demo/specs/DMO-E01/review.md": rv(v, q) });
    lab(root, "sync", "DMO-E01");
    assert.equal(lab(root, "gate", "implement", "DMO-001-T1").code, 1, `${v}/${q}`);
    assert.equal(lab(root, "check").code, v === "PASS" ? 1 : 0);
    rmSync(root, { recursive: true });
  }
});

test("implement: spec chưa REVIEWED thì FAIL", () => {
  const root = fixture();
  const p = join(root, "lab-docs/products/demo/specs/DMO-E01/spec-backend.md");
  writeFileSync(p, readFileSync(p, "utf8").replace("REVIEWED", "DRAFT"));
  lab(root, "sync", "DMO-E01");
  assert.equal(lab(root, "gate", "implement", "DMO-001-T1").code, 1);
  rmSync(root, { recursive: true });
});

test("tick ticket cập nhật story; ship gate và ship-mark", () => {
  const root = fixture();
  lab(root, "sync", "DMO-E01");
  assert.equal(lab(root, "gate", "ship", "DMO-E01").code, 1);
  assert.equal(lab(root, "tick", "DMO-001-T1").code, 0);
  assert.match(read(root, "lab-docs/products/demo/stories/DMO-001.md"), /status: done/);
  assert.match(read(root, "lab-docs/products/demo/specs/DMO-E01/progress.md"), /status: in-progress/);
  assert.equal(lab(root, "gate", "implement", "DMO-002-T1").code, 0, "phụ thuộc đã xong");
  assert.equal(lab(root, "ship-mark", "DMO-E01", "DMO-E01-ship").code, 1, "DMO-002 chưa done");
  assert.equal(lab(root, "tick", "DMO-002-T1").code, 0);
  const s2 = read(root, "lab-docs/products/demo/stories/DMO-002.md");
  assert.match(s2, /status: done/);
  assert.match(s2, /\r\n/, "giữ CRLF");
  let r = lab(root, "gate", "ship", "DMO-E01");
  assert.equal(r.code, 1, "ticket nhỏ SETUP-001 có parent DMO-E01 chưa xong");
  assert.equal(lab(root, "done", "SETUP-001").code, 0);
  r = lab(root, "gate", "ship", "DMO-E01");
  assert.equal(r.code, 0, r.out);
  assert.equal(lab(root, "ship-mark", "DMO-E01", "DMO-E01-ship").code, 0);
  assert.match(read(root, "lab-docs/products/demo/stories/DMO-001.md"), /shipped: \d{4}-\d\d-\d\d DMO-E01-ship/);
  assert.equal(lab(root, "check").code, 0, lab(root, "check").out);
  rmSync(root, { recursive: true });
});

test("ticket nhỏ đi thẳng vào implement", () => {
  const root = fixture();
  assert.equal(lab(root, "gate", "implement", "SETUP-001").code, 0);
  lab(root, "done", "SETUP-001");
  assert.equal(lab(root, "gate", "implement", "SETUP-001").code, 1);
  rmSync(root, { recursive: true });
});

test("done story bị chặn khi còn ticket mở", () => {
  const root = fixture();
  lab(root, "sync", "DMO-E01");
  const r = lab(root, "done", "DMO-001");
  assert.equal(r.code, 1);
  assert.match(r.out, /CHẶN/);
  rmSync(root, { recursive: true });
});

test("coverage: nhãn kèm ngày, STALE theo brief-version, exit 1 khi chưa phủ", () => {
  let root = fixture();
  let r = lab(root, "coverage", "dmo");
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /DEFERRED\/OUT=1/);
  rmSync(root, { recursive: true });
  root = fixture({ "lab-docs/products/demo/stories/DMO-001.md": `---\nid: DMO-001\ntype: story\nstatus: open\nrepos: []\nparent: DMO-E01\nbrief: DMO-BRIEF\nbrief-version: 1\ncovers: [C1]\n---\n` });
  r = lab(root, "coverage", "DMO");
  assert.equal(r.code, 1);
  assert.match(r.out, /STALE=1/);
  rmSync(root, { recursive: true });
  root = fixture({ "lab-docs/products/demo/stories/DMO-002.md": null });
  r = lab(root, "coverage", "DMO");
  assert.equal(r.code, 1);
  assert.match(r.out, /UNCOVERED=1/);
  rmSync(root, { recursive: true });
});

test("check bắt lỗi: review thiếu verdict, progress thiếu ticket, story done khi ticket mở", () => {
  const root = fixture({
    "lab-docs/products/demo/specs/DMO-E01/review.md": `---\nid: DMO-E01-review\ntype: review\nstatus: done\nrepos: []\n---\n**Verdict:** APPROVE\n`,
    "lab-docs/products/demo/specs/DMO-E01/progress.md": `---\nid: DMO-E01-progress\ntype: progress\nstatus: open\nrepos: []\nparent: DMO-E01\n---\n## Tasks\n- [ ] DMO-001-T1: x\n`,
  });
  const p = join(root, "lab-docs/products/demo/stories/DMO-001.md");
  writeFileSync(p, readFileSync(p, "utf8").replace("status: open", "status: done"));
  const r = lab(root, "check");
  assert.equal(r.code, 1);
  assert.match(r.out, /verdict/);
  assert.match(r.out, /thiếu ticket DMO-002-T1/);
  assert.match(r.out, /mới 0\/1 ticket/);
  rmSync(root, { recursive: true });
});

test("lỗi trả exit khác 0", () => {
  const root = fixture();
  assert.equal(lab(root, "tick", "DMO-404-T1").code, 1);
  assert.equal(lab(root, "tick", "DMO-001", "T9").code, 1);
  assert.equal(lab(root, "show", "NOPE").code, 1);
  assert.equal(lab(root, "lệnh-lạ").code, 2);
  assert.equal(lab(root, "gate", "implement").code, 1);
  rmSync(root, { recursive: true });
});

test("check bắt SKILL.md sai: tên lệch thư mục, YAML không quote", () => {
  const root = fixture({
    ".agents/skills/good/SKILL.md": `---\nname: good\ndescription: "Mô tả: có dấu hai chấm nhưng đã quote"\n---\n`,
    ".agents/skills/bad/SKILL.md": `---\nname: khac\ndescription: Mô tả: chưa quote\n---\n`,
  });
  const r = lab(root, "check");
  assert.equal(r.code, 1);
  assert.match(r.out, /bad/);
  assert.doesNotMatch(r.out, /skills[\/]good/);
  rmSync(root, { recursive: true });
});

test("coverage: capability OPEN chưa có story không chặn", () => {
  const p = "lab-docs/products/demo/product-brief.md";
  const root = fixture();
  writeFileSync(join(root, p), read(root, p).replace("- C3: Xuất lịch [DEFERRED]", "- C3: Xuất lịch [OPEN]"));
  const r = lab(root, "coverage", "DMO");
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /OPEN=1/);
  rmSync(root, { recursive: true });
});

test("ship-mark ticket nhỏ ship riêng", () => {
  const root = fixture();
  assert.equal(lab(root, "ship-mark", "SETUP-001", "SETUP-001-ship").code, 1, "chưa done");
  lab(root, "done", "SETUP-001");
  assert.equal(lab(root, "ship-mark", "SETUP-001", "SETUP-001-ship").code, 0);
  assert.match(read(root, "lab-docs/platform/setup/specs/SETUP-001/ticket.md"), /shipped: .* SETUP-001-ship/);
  rmSync(root, { recursive: true });
});
