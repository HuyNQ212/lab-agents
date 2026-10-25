---
name: capture
description: Bắt và phân loại vấn đề lộ ra trong quá trình làm (lỗi, việc phát hiện thêm, việc nhỏ). Quyết định: xếp vào story sẵn có (dù nhỏ), hay sinh ticket nhỏ SETUP-/MAINT-/EXP-. Dùng khi user nói "ghi lại việc này", "có lỗi này", "phát hiện thêm", hoặc khi implement gặp việc ngoài ticket. Không dùng để viết spec đầy đủ, không dùng để sửa lỗi.
metadata:
  short-description: Vấn đề lộ ra → story có sẵn hoặc ticket nhỏ mới
---

# capture — Bắt vấn đề lộ ra

Vấn đề xuất hiện giữa chừng có ba số phận: **bỏ qua** (ghi lý do), **xếp vào story có sẵn** (dù nhỏ), hoặc **sinh ticket nhỏ**. Skill này ra quyết định và ghi file — không sửa code, không viết spec dài.

## Đọc trước

- `lab-docs/frameworks/documentation-standards.md` §0 (frontmatter), §0b (script), §3 (ticket nhỏ)
- `node .agents/scripts/lab.mjs status` — xem việc đang mở

## 1. Phân loại

| Dấu hiệu | Xếp vào | Ghi ở đâu |
|---|---|---|
| Liên quan trực tiếp đến outcome của một story/ticket đang mở, là điều kiện để nó done | **Story có sẵn** — thêm task vào khối Tasks của nó, rồi `lab tick` khi xong | File story đó |
| Lỗi thật của code đang chạy hoặc làm sai ràng buộc DECIDED | **Story có sẵn** (nếu là bug của story đang làm) hoặc ticket `MAINT-` mới | Bug không được nuốt vào "việc nhỏ" khi nó vi phạm luật cứng |
| Setup, cấu hình, toolchain, repo mới | Ticket `SETUP-<n>` mới | `lab-docs/platform/<cap>/specs/<ID>/ticket.md` hoặc `lab-docs/specs/<ID>/ticket.md` nếu không thuộc capability nào |
| Bảo trì, nâng version, dọn nợ kỹ thuật | Ticket `MAINT-<n>` mới | Như trên |
| Cần verify một điểm ⚠️ CHƯA VERIFY | Ticket `EXP-<n>` mới | Như trên — kết quả EXP phải dẫn đến dòng ledger |
| Việc ngoài scope, chỉ là ý tưởng | **Bỏ qua** — ghi một dòng vào ledger `OUT OF SCOPE` nếu đáng nhớ, còn không thì thôi | `decision-ledger.md` |

**Nguyên tắc quyết:** nếu việc này cần sửa để story hiện tại pass gate → nó thuộc story hiện tại. Nếu có thể ship story mà không cần nó → ticket riêng hoặc bỏ qua.

## 2. Sinh ticket nhỏ — template

Đường dẫn file: nếu thuộc product/capability → `lab-docs/products|platform/<tên>/specs/<ID>/ticket.md`; nếu không thuộc → `lab-docs/specs/<ID>/ticket.md`. ID phải **trống** — kiểm bằng `lab status` trước khi đặt.

```markdown
---
id: SETUP-001        # SETUP | MAINT | EXP + số, không trùng
type: ticket
status: open
repos: [lab-planning] # mọi repo bị chạm; [] nếu chỉ doc
parent:              # ID story nếu có liên quan, để trống nếu không
---

# SETUP-001 — <tên ngắn>

**Bối cảnh:** <tại sao có việc này — nêu nguồn: lỗi nào, phát hiện ở đâu>
**Outcome:** <khi nào coi là xong, một câu>
**Bỏ qua gì:** <skill nào của chuỗi bị bỏ qua và vì sao — ví dụ "không cần spec-backend vì chỉ đổi cấu hình">

## Tasks
- [ ] T1: <việc — một câu, bắt đầu bằng ID task>
- [ ] T2: <nếu nhiều hơn, mỗi dòng một task>
```

Sửa xong chạy `node .agents/scripts/lab.mjs check` để xác nhận ID hợp lệ.

## 3. Thêm task vào story có sẵn

Mở file của story, thêm dòng vào khối `## Tasks` **giữ đúng format** `- [ ] T<n>: <mô tả>` với số `<n>` tiếp theo, rồi chạy `node .agents/scripts/lab.mjs check`. Nếu việc thay đổi phạm vi outcome của story → **không phải task**, phải ESCALATE cho user trước.

## 4. Bất biến

1. Không sinh ticket trùng ID — luôn kiểm trước.
2. Không tự nâng ticket nhỏ thành story, không tự phá một story thành nhiều — việc đó là của user.
3. Ticket bug vi phạm luật cứng **không** được ghi kiểu "nice to have" — ghi rõ luật nào bị vi phạm.
4. Mọi ticket đều có ít nhất một task, mỗi task bắt đầu bằng `T<n>:`.
5. Ghi xong phải chạy `lab check`; fail thì sửa trước khi báo user.

## Không làm

- Không sửa code (việc đó là `implement`).
- Không chốt thiết kế trong ticket — ghi câu hỏi OPEN nếu mơ hồ.
- Không nhân bản ticket per-repo — một ID, trường `repos` liệt kê hết.
