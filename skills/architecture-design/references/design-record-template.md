# Design Record — template

> Hai file riêng theo nhánh: `<dir>/design-backend.md`, `<dir>/design-frontend.md`. Mục không áp dụng ghi "Không áp dụng — <lý do>".
> Định dạng bám `design-principles.md` L7b: bảng + một dòng lý do, không văn xuôi, không tường thuật quá trình chọn (lý do chi tiết thuộc `decision-ledger`).
> ID ổn định là thứ `to-spec` (`Theo: <ID>`) và `spec-review` dẫn chiếu — **không đánh số lại**; phần tử bị gọt ghi `REMOVED <ngày>`, không xóa dòng.
> **Dòng 3 luôn là dòng Status** — `lab gate to-spec` đọc dòng này. Chỉ hai giá trị: `**Status:** DRAFT` hoặc `**Status:** FROZEN (user duyệt <yyyy-mm-dd>)`.
> Cột **Trạng thái** của mọi bảng: `PROPOSED` · `DECIDED <yyyy-mm-dd>` · `REMOVED <yyyy-mm-dd>`; thêm `Delta: DL<n>` nếu phần tử vào qua nhật ký delta.

---

## A. `design-backend.md`

```markdown
# <Product/Capability> — Design Record (Backend)

**Status:** DRAFT
**Cụm:** <PLN-E01 — PLN-001..PLN-006>
**Luồng:** FULL | LITE — <lý do một dòng theo bảng chọn luồng>
**Schema:** [db-schema.md](db-schema.md) — nguồn sự thật về bảng/cột/index; file này không chép lại
**Cập nhật:** <yyyy-mm-dd>

## 0. Gói quyết định

**Gói:** <liên kết trang gói quyết định> · **Trả lời:** <yyyy-mm-dd hoặc "chờ">

| Câu | Quyết định | ID bị ảnh hưởng | Kết quả |
|---|---|---|---|
| Q1 | <một dòng> | OWN2, SYNC1 | DECIDED <ngày> — <lựa chọn của user> / PROPOSED |

## 1. Ranh giới và ownership

(Mermaid flowchart: service → dữ liệu nó sở hữu; mũi tên = chiều gọi / sự kiện, ghi tên binding hoặc queue/outbox)

| ID | Dữ liệu | Service sở hữu | Service khác truy cập bằng | Nhãn | Trạng thái |
|---|---|---|---|---|---|
| OWN1 | `events`, `occurrences` | lab-planning | — | core | DECIDED <ngày> |
| OWN2 | múi giờ user | lab-user | Planning gọi qua binding `USER` | core | PROPOSED |

## 2. Quan hệ

(Mermaid `erDiagram`, **một sơ đồ mỗi service**, chỉ khóa + FK + cột quyết định hành vi. Chỉ chứa thứ có trong `db-schema.md`.)

## 3. Invariant — thứ bảng không diễn đạt được

| ID | Invariant | Ai giữ | Cách kiểm bằng máy | Nhãn | Trạng thái |
|---|---|---|---|---|---|
| INV1 | Checklist tối đa 1 cấp | hàm ghi duy nhất `<tên>` | test integration D1 thật | core | PROPOSED |

## 4. Đồng bộ chéo service và failure

| ID | Luồng | Cơ chế (L3: sự kiện → sync → cache) | Khi bên kia lỗi | Idempotency | Nhãn | Trạng thái |
|---|---|---|---|---|---|---|
| SYNC1 | Planning → Notification | outbox `reminders` + Queue | giữ `pending`, phát lại | `reminders.id` | core | PROPOSED |

## 5. Cấu trúc module/file đích

(Cây thư mục. Mỗi file **một trách nhiệm**; spec-review dùng cây này để bắt file nhồi và tách sai.)

| ID | Đường dẫn | Trách nhiệm (một dòng) | Giới hạn | Nhãn | Trạng thái |
|---|---|---|---|---|---|
| FILE1 | `src/handlers/create-event.ts` | một use case: tạo event | ≤ <n> dòng, không import repo khác domain | core | PROPOSED |

## 6. Quyết định

| ID | Quyết định | Ledger | Nhãn | Chi phí khi bỏ | Trạng thái |
|---|---|---|---|---|---|
| D1 | Occurrence là dòng thật, sinh bằng cron | `[PLN-E01/BE-D1]` | core | — | DECIDED <ngày> |
| D2 | Bảng `x` cho Y | — (chưa chốt) | mở rộng | bỏ thì mất Y, sửa `z` | PROPOSED |

Cột Ledger: thẻ của dòng trong `decision-ledger.md` (SKILL.md mục "Ghi ledger"), không dùng số dòng. `—` khi chưa DECIDED hoặc quyết định không khó đảo ngược.

## 7. Giả định hạ tầng

| ID | Cần có | Hiện trạng | Dựng bằng | Trạng thái |
|---|---|---|---|---|
| INFRA1 | cron Worker | chưa | `scheduled` handler | PROPOSED |

## 8. OPEN

| ID | Câu hỏi | Vì sao chặn | Ai quyết | Nếu sai | Trạng thái |
|---|---|---|---|---|---|
| OPEN1 | <câu hỏi> | <một dòng> | user (Q<n>) | <một dòng> | MỞ · ĐÓNG <ngày> — <kết quả> · thuộc `<dir khác>/design-<nhánh>.md` |

FROZEN chỉ khi mọi dòng ở đây là `ĐÓNG` hoặc `thuộc` Design Record khác.

## 9. Nhật ký delta

| ID | Ngày | Story | Loại | Delta | ID thêm/sửa | Spec phải làm lại | User duyệt |
|---|---|---|---|---|---|---|---|
| DL1 | <ngày> | PLN-007 | LITE | <một dòng> | FILE12, D9 | — | — (không đổi cấu trúc) |
| DL2 | <ngày> | PLN-008 | REOPENED | <một dòng> | OWN2, SYNC1 | `specs/PLN-E01/` | <ngày> (Q<n>) |
```

---

## B. `design-frontend.md`

```markdown
# <Product/Feature> — Design Record (Frontend)

**Status:** DRAFT
**Cụm:** <stories> · **Luồng:** FULL | LITE — <lý do một dòng>
**Backend Design Record:** [design-backend.md](design-backend.md) — endpoint/shape lấy từ đây
**Prototype:** <đường dẫn nếu APPROVED, chỉ tham chiếu giao diện>
**Cập nhật:** <yyyy-mm-dd>

## 0. Gói quyết định

(Cùng định dạng bản backend; một gói chung cho cả hai nhánh của cụm.)

## 1. Ranh giới màn hình

| ID | Route | Màn hình | Search params (zod) | Bốn trạng thái (default/loading/empty/error) | Nhãn | Trạng thái |
|---|---|---|---|---|---|---|
| SCR1 | `/` | <một dòng> | không | <một dòng> | core | PROPOSED |

## 2. Cây module/component

(Mermaid flowchart: route → container → component. Mỗi nút một dòng trách nhiệm. Không nested tab.)

| ID | Component/module | Trách nhiệm | Dùng ở | Primitive mới? (≥2 nơi dùng thật) | Nhãn | Trạng thái |
|---|---|---|---|---|---|---|
| CMP1 | `EventList` | <một dòng> | SCR1 | không | core | PROPOSED |

## 3. State ownership — mọi state một dòng, không state mồ côi

| ID | State | Loại (server/url/auth/local) | Chủ sở hữu | Ai đọc | Nhãn | Trạng thái |
|---|---|---|---|---|---|---|
| ST1 | danh sách event | server | query `['events']` | CMP1 | core | PROPOSED |

## 4. Luồng dữ liệu chính

(Mermaid `sequenceDiagram` cho vài luồng quan trọng: tải danh sách, submit, lỗi. Ghi query key gốc và invalidate.)

| ID | Luồng | Query key gốc | Mutation: optimistic? invalidate? rollback? | Trạng thái |
|---|---|---|---|---|
| FLOW1 | tạo event | `['events']` | không · `['events']` · — | PROPOSED |

## 5. Cây file đích

| ID | Đường dẫn | Trách nhiệm (một dòng) | Giới hạn | Nhãn | Trạng thái |
|---|---|---|---|---|---|
| FILE1 | `src/features/<name>/...` | <một dòng> | <giới hạn> | core | PROPOSED |

Không import chéo feature; chỉ qua `src/shared/`.

## 6. Quyết định · 7. Giả định hạ tầng · 8. OPEN · 9. Nhật ký delta

(Cùng định dạng bản backend; thẻ ledger dùng `FE`, vd. `[PLN-E01/FE-D2]`.)
```

---

## Quy tắc chung

- **Tiền tố ID** — backend: `OWN`, `INV`, `SYNC`, `FILE`, `D`, `INFRA`, `OPEN`, `DL`; frontend: `SCR`, `CMP`, `ST`, `FLOW`, `FILE`, `D`, `INFRA`, `OPEN`, `DL`. Không dùng `C<n>` trần (trùng mã capability của brief và mã lệch của `spec-review`). Design Record cũ giữ ID đã có, không đánh số lại.
- **Ledger:** mỗi quyết định khó đảo ngược DECIDED có dòng `decision-ledger` mang thẻ `[<CỤM>/<BE|FE>-<ID>]`; Design Record chỉ dẫn thẻ, không chép lý do dài.
- **Sơ đồ ↔ bảng:** sơ đồ sinh từ bảng nguồn; không phần tử nào chỉ có trong sơ đồ; phần tử `PROPOSED` không vẽ như đã chốt.
- **FROZEN:** chỉ sau khi user duyệt gói quyết định, không còn `core` nào `PROPOSED`, OPEN đã đóng hoặc thuộc Design Record khác.
- **LITE không đổi cấu trúc:** thêm dòng `DL<n>` + phần tử mới mang `Delta: DL<n>`, giữ FROZEN. Có đổi cấu trúc hoặc sửa dòng đã DECIDED: Status về DRAFT, dòng `DL<n>` loại `REOPENED`, gói quyết định, đóng băng lại (SKILL.md mục "Mở lại Design Record").
- **Gọt:** phần tử bị bỏ đổi Trạng thái `REMOVED <ngày>`; giữ dòng để ID không bị tái sử dụng.
