---
name: orchestrate
description: "Chạy cả chuỗi Lab từ yêu cầu tới production: xác định ID đang ở bước nào bằng lab.mjs, gọi lần lượt grilling → prototype (khi user muốn) → breakdown → architecture-design → to-spec → spec-review → implement → ship, tự lặp vòng sửa có trần, chỉ dừng ở gói quyết định cho user và trước mỗi lệnh production không hoàn tác được. Dùng khi user nói \"làm hết\", \"chạy tiếp\", \"orchestrate PLN-E01\", \"từ ý tưởng tới ship\", hoặc đưa yêu cầu mới mà không chỉ định skill. Không tự quyết thay user, không bỏ qua gate."
metadata:
  short-description: "Điều phối cả chuỗi skill, chỉ dừng ở quyết định và production"
---

# orchestrate — Điều phối cả chuỗi

Đọc trước: `.agents/AGENTS.md`, hợp đồng bàn giao ở `.agents/skills/README.md`, cách hỏi user ở `.agents/references/decision-packet.md`.

User chỉ đưa yêu cầu và quyết định. Skill này biến một yêu cầu thành chuỗi lời gọi skill, mỗi bước qua gate bằng máy (`lab gate`, hook `skill-gate.mjs`), và chỉ trả quyền cho user ở hai chỗ:

1. **Gói quyết định** — một skill cần user chốt (duyệt brief, scope, Design Record, spec, câu hỏi mở).
2. **Lệnh production không hoàn tác được** — merge vào `main`, migration D1 remote, deploy, secret, rollback. Hook `bash-guard.mjs` và luật `permissions.ask` bắt hỏi; skill nói trước lệnh nào, vì sao, và verify gì theo sau.

Mọi việc khác chạy tiếp không hỏi.

## 1. Xác định điểm bắt đầu

| User đưa | Bắt đầu ở |
|---|---|
| Ý tưởng thô, chưa có brief | `grilling` |
| Thay đổi yêu cầu giữa chừng | `capture` (luồng change request) — nó chỉ ra bước phải quay lại |
| `<PREFIX>`, hoặc ID story/epic/spec/ticket | bảng ở mục 2 |

Không đoán trạng thái bằng cách đọc tay nhiều file. Chạy:

```bash
node .agents/scripts/lab.mjs check
node .agents/scripts/lab.mjs status
node .agents/scripts/lab.mjs coverage <PREFIX>
node .agents/scripts/lab.mjs gate <skill> <ID>   # cho từng bước ứng viên
```

## 2. Bước kế tiếp cho một ID

Đi từ trên xuống, dừng ở dòng đầu tiên còn đúng:

| Điều kiện (đọc bằng lab.mjs) | Bước |
|---|---|
| Không có `<PREFIX>-BRIEF`, hoặc brief chưa `done` | `grilling` |
| User đã yêu cầu prototype và README prototype chưa `**Approval:** APPROVED` | `prototype` |
| `lab coverage <PREFIX>` exit 1 (UNCOVERED, STALE, covers lạ) | `breakdown <PREFIX>` |
| `lab gate to-spec <ID>` FAIL vì Design Record chưa có hoặc chưa FROZEN | `architecture-design <ID>` |
| Story/epic chưa nằm trong dòng `**Stories:**` của spec nào | `to-spec <ID>` |
| Spec chưa có `review.md`, hoặc spec đã sửa sau review | `spec-review <SPEC-ID>` |
| `verdict: NEEDS-WORK` hoặc `BLOCK` | `to-spec <SPEC-ID>` vòng REVISE, rồi `spec-review` lại |
| `verdict: PASS` nhưng spec chưa `**Status:** REVIEWED` | gói quyết định duyệt spec (do `spec-review` gửi) |
| Có ticket chưa tick mà `lab gate implement <TICKET-ID>` PASS | `implement <TICKET-ID>` — lần lượt theo thứ tự bảng Tickets |
| Ticket chưa tick nhưng mọi ticket còn lại đều bị chặn | đọc lý do: ticket nhỏ SETUP/MAINT/EXP → `implement` ticket đó trước; chờ user → gói quyết định |
| `lab gate ship <SPEC-ID>` PASS | `ship <SPEC-ID>` |
| Story đã có `shipped:` | xong |

Gate FAIL ở bước đã chọn → đọc dòng `✗`, quay lại bước tạo ra thứ còn thiếu. Không sửa tài liệu để gate qua mà không làm việc thật.

## 3. Vòng lặp và trần

| Vòng | Trần | Hết trần thì |
|---|---|---|
| to-spec REVISE ↔ spec-review | 2 vòng | gói quyết định: findings còn lại, phương án |
| implement: review → sửa | theo `implement/SKILL.md` | ticket ghi `blocked.md`, gói quyết định |
| prototype tự phê | 3 vòng | gói quyết định duyệt |
| ship: plan review | 2 vòng | gói quyết định |
| Gate FAIL cùng một lý do sau khi đã làm bước khắc phục | 1 lần | dừng, báo nguyên văn output gate |

## 4. Khi dừng

- Gom mọi câu hỏi của bước hiện tại vào **một** gói quyết định (`.agents/references/decision-packet.md`). Không dừng nhiều lần cho cùng một bước.
- Trước khi dừng: `lab check` OK, tài liệu của bước đã `lab commit <ID> "..."`, nhánh code đã push. Phiên sau đọc lại trạng thái từ lab.mjs và git, không cần trí nhớ của phiên này.
- Báo: ID, bước vừa xong, bước kế tiếp, liên kết gói quyết định (nếu có).

Khi user trả lời: ghi quyết định theo gói, rồi quay lại mục 2 với cùng ID.

## 5. Không được

- Gọi skill trong chuỗi mà không có ID (hook chặn).
- Tự nâng OPEN/PROPOSED/DEFERRED thành DECIDED, tự đặt spec `REVIEWED`, tự đặt Design Record `FROZEN`.
- Chạy song song hai ticket sửa cùng repo trên cùng nhánh.
- Bỏ qua câu hỏi `ask` của hook bằng cách đổi cách viết lệnh.
- Push `main` của repo code ngoài `ship`.

## Đầu ra / bước tiếp theo

Không có artifact riêng. Đầu ra là đầu ra của từng skill đã chạy. Kết thúc khi mọi story trong phạm vi có `shipped:`, hoặc khi đang chờ user ở một gói quyết định hay một lệnh production.
