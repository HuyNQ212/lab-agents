---
name: spec-review
description: "Kiểm spec do to-spec viết có bám Design Record đã duyệt hay không, và quét lỗi thiết kế còn lại. Pass 1 — độ tuân thủ (schema lệch, vượt ranh giới service, workaround/giải pháp tricky không có trong thiết kế, nhồi một file, tách file/module sai, state ownership lệch). Pass 2 — checklist backend/frontend cho failure mode, AuthZ, contract, UX states, test seam. Chỉ báo điểm lệch, không bắt user đọc lại từng dòng spec. Dùng khi user nói \"review spec\", \"spec-review\", \"kiểm spec\", \"review spec frontend\". Không dùng để thiết kế (đó là architecture-design), không sửa spec, không review code đã viết."
metadata:
  short-description: "Spec ↔ Design Record: báo điểm lệch + checklist"
---

# spec-review

Spec đã sinh ra từ thiết kế mà user ngồi duyệt rồi. Việc của skill này: **tìm chỗ spec lệch khỏi thiết kế đó**, để user chỉ duyệt một danh sách điểm lệch, không đọc lại cả spec.

Trước đây là `architecture-review`. Việc **tạo** quyết định (boundary, schema, tách module) đã chuyển sang [`architecture-design`](../architecture-design/SKILL.md); skill này **không** phản biện lại quyết định đã DECIDED trong Design Record, và không thiết kế.

## Hai nhánh, không trộn

| Nhánh | Checklist (Pass 2) | Ràng buộc nền | Tiêu chí chấm |
|---|---|---|---|
| **Backend** | [`references/backend/checklist.md`](references/backend/checklist.md) | `backend.md` §10, luật 1–16 | User **đọc code/SQL/schema bằng mắt** → lỗi hiển nhiên khi nhìn |
| **Frontend** | [`references/frontend/checklist.md`](references/frontend/checklist.md) | `frontend.md` §0/§5/§6, luật 17–30 | User **không đọc code**, chỉ xem giao diện → lỗi vô hình chấm nặng hơn |

Pass 1 dùng chung [`references/conformance.md`](references/conformance.md) (có phần riêng cho từng nhánh). Artifact chạm cả hai phía → review cả hai, **trình bày hai phần riêng**.

## Điều kiện vào

Cần đủ: **spec draft** + **Design Record FROZEN** (`design-backend.md` / `design-frontend.md`, kèm nhật ký delta) + `db-schema.md` (BE).

Thiếu Design Record FROZEN → **dừng**, báo: *"chưa có Design Record phủ phần này — chạy `architecture-design` (FULL hoặc LITE) trước"*. Không review spec dựa trên thiết kế tự đoán. Spec còn dòng nào không truy được về ID Design Record → đó chính là finding (SR-C7), không phải lý do để im lặng.

## Quy trình

1. **Đọc:** spec; Design Record + delta; `db-schema.md`; `decision-ledger.md` (chỉ DECIDED là ràng buộc); với FE: backend spec cùng story. Đọc thật, không kết luận khi chưa đọc.
2. **Kiểm bằng máy trước, đọc bằng mắt sau.** Phần nào kiểm được bằng lệnh (grep tên bảng/cột/endpoint trong spec đối với `db-schema.md` và Design Record; đếm số dòng/trách nhiệm trong cây file đề xuất so với cây file đích) thì **chạy lệnh**, không đọc lướt rồi kết luận. Ghi lại lệnh/cách đối chiếu trong mục "Đã kiểm tra".
3. **Pass 1 — Tuân thủ:** theo `references/conformance.md`. Mỗi phần tử spec phải truy được về một ID Design Record (D/INV/OWN/SYNC/FILE… hoặc ID FE tương ứng); và ngược lại, mỗi phần tử `core` của Design Record phải có chỗ trong spec/ticket.
4. **Pass 2 — Checklist** của đúng nhánh, **chỉ các trục Design Record chưa quyết**: failure mode chi tiết, AuthZ từng endpoint, contract/error code, test seam, UX states, bundle, token. Trục đã có quyết định trong Design Record (boundary, ownership, schema, state ownership, cây file) → đối chiếu ở Pass 1, không hỏi lại ở đây, trừ khi spec **mâu thuẫn với chính nó**.
5. **Báo cáo:** chỉ **điểm lệch + câu hỏi**. Không tóm tắt lại spec, không liệt kê điều đúng ngoài mục "Đã kiểm tra".

## Ranh giới

- **Không sửa** spec, Design Record, schema, ledger. Chỉ báo cáo.
- **Không tự chốt** câu hỏi thuộc user: ownership, hành vi product, công nghệ chưa DECIDED.
- **Không nâng** PROPOSED/ASSUMED/DEFERRED/OPEN thành ràng buộc.
- **Không đề xuất** KV/Queues/DO/Redis, shared package, DI container, event bus, global store — trừ khi user đã DECIDED.
- Spec lệch Design Record mà **Design Record có vẻ sai**: vẫn báo là lệch; thêm một QUESTION "Design Record có cần mở lại?" để user quyết — **không** coi spec đúng.
- **Một lượt.** User sửa xong muốn review lại là lượt mới.

## Mức nghiêm trọng

| Mức | Nghĩa | Hệ quả |
|---|---|---|
| **BLOCKER** | Lệch quyết định/invariant **đã FROZEN**; vi phạm ràng buộc DECIDED; làm dữ liệu không migrate/phục hồi được; lộ dữ liệu giữa service; hoặc lỗi **không thể phát hiện** khi không đọc code | Sửa trước khi code |
| **MAJOR** | Gây bug hoặc chi phí sửa lớn về sau, có đường vòng; phần tử `core` của Design Record không có trong spec | Nên sửa trước khi code |
| **MINOR** | Thiếu rõ ràng, không đổi hành vi (ví dụ đặt tên lệch nhưng cùng nghĩa) | Sửa khi tiện |
| **QUESTION** | Cần user quyết; chưa phải lỗi | Ghi OPEN, không tự trả lời |

Không dùng MINOR để né một vi phạm rõ ràng là BLOCKER; không dùng BLOCKER cho sở thích. **Nâng mức ở nhánh frontend** cho lỗi không nhìn thấy trên giao diện — ghi lý do ngay trong cột "Vì sao".

## Verdict

| Verdict | Điều kiện |
|---|---|
| **PASS** | Không BLOCKER, không MAJOR |
| **NEEDS WORK** | Có MAJOR, không BLOCKER |
| **BLOCK** | Có ít nhất một BLOCKER |

MINOR và QUESTION không tự hạ verdict.

## Định dạng output

Ghi vào `specs/<ID>/review.md` (chuẩn `documentation-standards.md` §2 dòng 6) nếu user yêu cầu lưu; mặc định trả trong chat.

```markdown
## Verdict: BLOCK

### Đối tượng
- Spec: specs/PLN-003/spec-backend.md
- Design Record: design-backend.md (FROZEN, delta đến 2026-10-27) · db-schema.md

### Điểm lệch — backend

| ID | Mức | Mã | Vị trí spec | Design Record | Lệch gì | Hướng sửa |
|---|---|---|---|---|---|---|
| SR-C1 | BLOCKER | C1 Schema | spec §3 `reminders.notified_at` | db-schema §4 (không có cột này) | Spec thêm cột chưa có trong schema | Bỏ cột, hoặc mở lại schema qua architecture-design |
| SR-C6 | MAJOR | C6 Cấu trúc file | spec §6 `handlers/events.ts` | FILE1–FILE4 | Gộp 4 use case vào một file | Tách đúng FILE1–FILE4 |

### Điểm lệch — frontend

(cùng cột; mã C8–C11; ID `SR-C<n>`)

### Findings Pass 2

| ID | Mức | Trục | Vị trí | Vấn đề | Vì sao | Hướng sửa |
|---|---|---|---|---|---|---|
| SR-B1 | MAJOR | Failure mode | spec §5 | Cron chạy lại gửi trùng | không có dedup | dùng `reminders.id` làm idempotency key |

### Độ phủ ngược (Design Record → spec)

| ID Design Record | Nhãn | Có trong spec/ticket? |
|---|---|---|
| INV1 | core | ❌ không có test nào |

### Câu hỏi cần user quyết

| ID | Câu hỏi | Vì sao chặn | Nếu sai |
|---|---|---|---|

### Đã kiểm tra, không thấy vấn đề
- <mục + cách kiểm, ví dụ: "mọi tên bảng/cột trong spec §3 — grep đối chiếu db-schema.md">
```

Yêu cầu mỗi finding: **vị trí cụ thể** (file + section) · **dẫn ID Design Record hoặc ràng buộc** (không dẫn sở thích) · **hướng sửa 1–2 câu**. FE: nêu thêm lỗi **nhìn thấy** hay **không nhìn thấy**. ID: `SR-C<n>` (tuân thủ), `SR-B<n>` / `SR-F<n>` (Pass 2).

## Không làm

- Không thiết kế, không đề xuất kiến trúc mới (đó là `architecture-design`).
- Không tạo ticket hay sửa file, trừ khi user yêu cầu rõ.
- Không đề xuất endpoint/tính năng ngoài story.
- Không review chất lượng code (đó là vòng review trong `implement`).
- Không đánh giá lại quyết định DECIDED trừ khi spec mâu thuẫn với chính nó.
- Không kết luận PASS khi chưa đọc spec thật và chưa chạy đối chiếu Pass 1.
- **Không áp checklist frontend cho artifact backend hoặc ngược lại.**

## Checklist trước khi trả

- [ ] Có Design Record FROZEN; nếu không → đã dừng và báo.
- [ ] Pass 1 chạy bằng đối chiếu thật (lệnh/grep), cách kiểm ghi ở "Đã kiểm tra".
- [ ] Mỗi phần tử spec truy được về ID Design Record, hoặc có finding SR-C7.
- [ ] Độ phủ ngược: mọi phần tử `core` đã được đối chiếu.
- [ ] Mỗi finding có vị trí cụ thể + ID dẫn chiếu; mỗi BLOCKER dẫn quyết định FROZEN/ràng buộc DECIDED/hậu quả cụ thể.
- [ ] Đúng checklist đúng nhánh; không finding nào chỉ dựa trên preference.
- [ ] QUESTION không bị trả lời thay user; verdict khớp mức cao nhất.

## Vị trí trong chuỗi

```text
to-spec → spec-review → implement → ship
```

**Đầu ra tài liệu:** `specs/<ID>/review.md` (`Verdict: PASS`) → **bước tiếp theo:** implement → invoke `implement <ticket-ID>`

**Điều kiện vào:** `lab gate spec-review <ID>` — yêu cầu spec tồn tại + Design Record `Status: FROZEN`. Nếu FAIL, chạy `to-spec` trước.
