# personal-lab

Workspace multi-repo, không có git root. Luật cho agent nằm ở repo `.agents`:

@.agents/AGENTS.md

Mở phiên Claude Code tại thư mục gốc `personal-lab/` để `.claude/settings.json` (hook gate, luật ask/deny) có hiệu lực. File này và `.claude/settings.json` được sinh từ `.agents/workspace/` — sửa ở đó rồi chạy lại bước cài trong `.agents/setup.md`.
