# Design Record — template

> Hai file riêng theo nhánh. Mục không áp dụng ghi "Không áp dụng — <lý do>".
> Định dạng bám `design-principles.md` L7b: bảng + một dòng lý do, không văn xuôi, không tường thuật quá trình chọn (lý do chi tiết thuộc `decision-ledger`).
> ID ổn định là thứ `spec-review` dẫn chiếu — **không đánh số lại**; phần tử bị gọt ghi `REMOVED`, không xóa dòng.

---

## A. `design-backend.md`

```markdown
# <Product/Capability> — Design Record (Backend)

**Status:** DRAFT | FROZEN (user đặt)
**Cụm:** <PLN-E01 — PLN-001..PLN-006>
**Luồng:** FULL | LITE
**Schema:** [db-schema.md](db-schema.md) — nguồn sự thật về bảng/cột/index; file này không chép lại
**Cập nhật:** <ngày> · **Gate đã qua:** G0 G1 G2 G3 G4

## 1. Ranh giới và ownership

(Mermaid flowchart: service → dữ liệu nó sở hữu; mũi tên = chiều gọi / sự kiện, ghi tên binding hoặc outbox)

| ID | Dữ liệu | Service sở hữu | Service khác truy cập bằng | Nhãn |
|---|---|---|---|---|
| OWN1 | `events`, `occurrences` | lab-planning | — | core |
| OWN2 | múi giờ user | lab-user | Planning gọi qua binding `USER` | core |

## 2. Quan hệ

(Mermaid `erDiagram`, **một sơ đồ mỗi service**, chỉ khóa + FK + cột quyết định hành vi. Chỉ chứa thứ có trong `db-schema.md`.)

## 3. Invariant — thứ bảng không diễn đạt được

| ID | Invariant | Ai giữ | Cách kiểm bằng máy | Nhãn |
|---|---|---|---|---|
| INV1 | Checklist tối đa 1 cấp | hàm ghi duy nhất `<tên>` | test integration D1 thật | core |

## 4. Đồng bộ chéo service và failure

| ID | Luồng | Cơ chế (L3: sự kiện → sync → cache) | Khi bên kia lỗi | Idempotency | Nhãn |
|---|---|---|---|---|---|
| SYNC1 | Planning → Notification | outbox `reminders` + cron | giữ `pending`, cron chạy lại | `reminders.id` | core |

## 5. Cấu trúc module/file đích

(Cây thư mục. Mỗi file **một trách nhiệm**; spec-review dùng cây này để bắt file nhồi và tách sai.)

| ID | Đường dẫn | Trách nhiệm (một dòng) | Giới hạn | Nhãn |
|---|---|---|---|---|
| FILE1 | `src/handlers/create-event.ts` | một use case: tạo event | ≤ <n> dòng, không import repo khác domain | core |

## 6. Quyết định

| ID | Quyết định | Ledger | Nhãn | Chi phí khi bỏ |
|---|---|---|---|---|
| D1 | Occurrence là dòng thật, sinh bằng cron | <ledger row> | core | — |
| D2 | Bảng `x` cho Y | <ledger row> | mở rộng | bỏ thì mất Y, sửa `z` |

## 7. Giả định hạ tầng

| ID | Cần có | Hiện trạng | Dựng bằng |
|---|---|---|---|
| INFRA1 | cron Worker | chưa | `scheduled` handler |

## 8. OPEN

| ID | Câu hỏi | Vì sao chặn | Ai quyết | Nếu sai |
|---|---|---|---|---|

## 9. Nhật ký delta (LITE nối vào đây, không sửa phần trên khi đã FROZEN)

| Ngày | Story | Delta | Quyết định mới | User duyệt |
|---|---|---|---|---|
```

---

## B. `design-frontend.md`

```markdown
# <Product/Feature> — Design Record (Frontend)

**Status:** DRAFT | FROZEN (user đặt)
**Cụm:** <stories> · **Luồng:** FULL | LITE
**Backend Design Record:** [design-backend.md](design-backend.md) — endpoint/shape thật lấy từ đây và backend spec
**Prototype:** <đường dẫn nếu APPROVED, chỉ tham chiếu giao diện>
**Gate đã qua:** G0 G1 G2 G3 G4

## 1. Ranh giới màn hình

| ID | Route | Màn hình | Search params (zod) | Nhãn |
|---|---|---|---|---|

## 2. Cây module/component

(Mermaid flowchart: route → container → component. Mỗi nút một dòng trách nhiệm. Không nested tab.)

| ID | Component/module | Trách nhiệm | Dùng ở | Primitive mới? (≥2 nơi dùng thật) | Nhãn |
|---|---|---|---|---|---|

## 3. State ownership — mọi state một dòng, không state mồ côi

| ID | State | Loại (server/url/auth/local) | Chủ sở hữu | Ai đọc | Nhãn |
|---|---|---|---|---|---|

## 4. Luồng dữ liệu chính

(Mermaid `sequenceDiagram` cho vài luồng quan trọng: tải danh sách, submit, lỗi. Ghi query key gốc và invalidate.)

| ID | Luồng | Query key gốc | Mutation: optimistic? invalidate? rollback? |
|---|---|---|---|

## 5. Cây file đích

| ID | Đường dẫn | Trách nhiệm (một dòng) | Giới hạn | Nhãn |
|---|---|---|---|---|

Không import chéo feature; chỉ qua `src/shared/`.

## 6. Quyết định · 7. Giả định hạ tầng · 8. OPEN · 9. Nhật ký delta

(Cùng định dạng bản backend.)
```

---

## Quy tắc chung

- **Ledger:** mỗi quyết định DECIDED có dòng `decision-ledger`; Design Record chỉ dẫn, không chép lý do dài.
- **Sơ đồ ↔ bảng:** sơ đồ sinh từ bảng nguồn; không phần tử nào chỉ có trong sơ đồ.
- **FROZEN:** chỉ user đặt. Sửa phần FROZEN = quay lại gate tương ứng, user chốt lại, ghi vào nhật ký delta.
- **Gọt (G4):** phần tử bị bỏ đổi nhãn `REMOVED` kèm ngày; giữ dòng để ID không bị tái sử dụng.
