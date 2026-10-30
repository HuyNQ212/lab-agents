#!/usr/bin/env node
// Hook PreToolUse(Bash): lớp thứ hai sau permissions.ask/deny trong settings.json.
// Lệnh không hoàn tác được (merge main, deploy, migration/execute remote, secret, rollback)
// luôn hỏi user. Lệnh phá hủy (force push, xóa Worker/D1) bị chặn.

let raw = "";
process.stdin.on("data", (c) => (raw += c));
process.stdin.on("end", () => {
  let input = {};
  try { input = JSON.parse(raw || "{}"); } catch { process.exit(0); }
  const cmd = String((input.tool_input || {}).command || "");
  const cwd = String(input.cwd || "").replace(/\\/g, "/");

  const DENY = [
    [/\bgit\s+push\b[^|;&]*\s(--force\b|-f\b|--force-with-lease\b)/, "force push"],
    [/\bwrangler\s+(delete|d1\s+delete)\b/, "xóa Worker hoặc D1"],
    [/\bgit\s+push\b[^|;&]*\s--delete\s+(main|master)\b/, "xóa nhánh main"],
  ];
  const ASK = [
    [/\bgh\s+pr\s+merge\b/, "merge PR vào main"],
    [/\bwrangler\s+(deploy|versions\s+deploy|rollback)\b/, "deploy/rollback Worker production"],
    [/\bnpm\s+run\s+deploy\b/, "deploy Worker production"],
    [/\bwrangler\s+d1\s+(migrations\s+apply|execute)\b[^|;&]*--remote\b/, "ghi D1 production"],
    [/\bwrangler\s+d1\s+time-travel\s+restore\b/, "khôi phục D1 production"],
    [/\bwrangler\s+secret\s+(put|delete|bulk)\b/, "đổi secret production"],
  ];
  for (const [re, why] of DENY) if (re.test(cmd)) deny(`Bị chặn (${why}). Việc này chỉ user tự làm.`);
  // git push lên main: chỉ lab-docs được push main (quyết định 2026-10-30); repo code đi qua ship
  const pushMain = /\bgit\b[^|;&]*\bpush\b[^|;&]*\b(main|master)\b/.test(cmd) || (/\bgit\b[^|;&]*\bpush\b/.test(cmd) && /:(main|master)\b/.test(cmd));
  if (pushMain && !/lab-docs/.test(cmd) && !/\/lab-docs$/.test(cwd)) ask("push thẳng main của repo code — repo code chỉ lên main qua ship (gh pr merge)");
  for (const [re, why] of ASK) if (re.test(cmd)) ask(why);
  process.exit(0);
});

function ask(why) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "ask",
      permissionDecisionReason: `Thao tác không hoàn tác được: ${why}. Cần user xác nhận.`,
    },
  }));
  process.exit(0);
}

function deny(msg) {
  process.stderr.write(msg + "\n");
  process.exit(2);
}
